// PPTX text-extraction smoke: build a minimal real PPTX (stored zip with
// ppt/slides/slide1.xml), run the bundle's pptxText against it, and assert the
// slide text comes back.
import vm from "node:vm";
import { readFileSync } from "node:fs";

// ---- minimal zip writer (stored entries) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function makeZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const enc = new TextEncoder();
  for (const e of entries) {
    const name = enc.encode(e.name);
    const data = enc.encode(e.data);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local, data);
    central.push({ name, crc, size: data.length, offset });
    offset += local.length + data.length;
  }
  const cdStart = offset;
  const cdParts = [];
  for (const c of central) {
    const rec = new Uint8Array(46 + c.name.length);
    const dv = new DataView(rec.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint32(16, c.crc, true);
    dv.setUint32(20, c.size, true);
    dv.setUint32(24, c.size, true);
    dv.setUint16(28, c.name.length, true);
    dv.setUint32(42, c.offset, true);
    rec.set(c.name, 46);
    cdParts.push(rec);
  }
  const cdBytes = concat(cdParts);
  const eocd = new Uint8Array(22);
  const dv2 = new DataView(eocd.buffer);
  dv2.setUint32(0, 0x06054b50, true);
  dv2.setUint16(8, central.length, true);
  dv2.setUint16(10, central.length, true);
  dv2.setUint32(12, cdBytes.length, true);
  dv2.setUint32(16, cdStart, true);
  return concat([...chunks, cdBytes, eocd]);
}

const SLIDE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>
<p:sp><p:txBody><a:p><a:r><a:t>Hello PPTX</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:txBody><a:p><a:r><a:t>第二页内容</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld>
</p:sld>`;
const zip = makeZip([
  { name: "[Content_Types].xml", data: `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>` },
  { name: "ppt/slides/slide1.xml", data: SLIDE }
]);
const base64 = Buffer.from(zip).toString("base64");

// ---- load the bundle in a vm (react shim) ----
let captured = null;
const sandbox = {
  window: { __ModuleLoader__: { load(entry) { captured = entry; } } },
  document: undefined,
  navigator: undefined,
  console,
  setTimeout,
  clearTimeout,
  Promise,
  Symbol,
  TextEncoder,
  TextDecoder,
  atob,
  Blob,
  Response,
  DecompressionStream,
  Uint8Array,
  DataView
};
vm.createContext(sandbox);
const source = readFileSync(new URL("./client.js", import.meta.url), "utf8");
vm.runInContext(source, sandbox, { filename: "client.js" });
const mod = captured.factory((spec) => {
  if (spec === "react") return { createElement: () => null };
  if (spec === "react-dom") return {};
  if (spec === "@deepseek-ai/dsh-client-ui-primitives") return {};
  throw new Error(`unexpected require ${spec}`);
});

const text = await mod._pptx.pptxText(base64);
if (!text.includes("Hello PPTX")) throw new Error(`slide text missing: ${JSON.stringify(text.slice(0, 80))}`);
if (!text.includes("第二页内容")) throw new Error(`CJK slide text missing: ${JSON.stringify(text.slice(0, 80))}`);
if (!text.includes("幻灯片 1")) throw new Error(`slide header missing: ${JSON.stringify(text.slice(0, 80))}`);
console.log("pptx text extraction OK:", JSON.stringify(text.slice(0, 100)));

// Corrupt input must fail gracefully.
try {
  await mod._pptx.pptxText(Buffer.from("not a zip").toString("base64"));
  throw new Error("corrupt pptx should reject");
} catch (e) {
  if (String(e && e.message ? e.message : e).includes("not a zip") === false &&
      String(e && e.message ? e.message : e).includes("zip") === false) {
    throw new Error(`unexpected error message: ${e.message}`);
  }
}
console.log("pptx corrupt-input error path OK");
console.log("PPTX SMOKE OK");

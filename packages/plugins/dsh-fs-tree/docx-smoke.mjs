// End-to-end docx pipeline test: build a minimal real .docx (stored zip),
// run it through the exact same conversion call the browser half uses
// (base64 → Uint8Array → mammoth.convertToHtml({ arrayBuffer })), and assert
// the extracted text comes back.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

// The bundle is a browserify UMD; load it in a browser-like sandbox exactly
// as a `<script>` tag would (plain `require` hits the CJS branch and is not
// representative of the browser).
const source = readFileSync(new URL("./lib/assets/mammoth.browser.min.js", import.meta.url), "utf8");
const sandbox = {
  module: { exports: {} },
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  URL, TextEncoder, TextDecoder, Blob, Uint8Array, ArrayBuffer, DataView,
  crypto, performance
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "mammoth.browser.min.js" });
const mammoth = sandbox.window.mammoth;
if (!mammoth || typeof mammoth.convertToHtml !== "function") {
  throw new Error("mammoth global did not materialize in the browser-like sandbox");
}

// ---- minimal zip writer (stored entries, no compression) ----
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

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>Hello docx test</w:t></w:r></w:p>
<w:p><w:r><w:t>Second paragraph with 中文</w:t></w:r></w:p>
</w:body>
</w:document>`;

const zipBytes = makeZip([
  { name: "[Content_Types].xml", data: CONTENT_TYPES },
  { name: "_rels/.rels", data: RELS },
  { name: "word/document.xml", data: DOCUMENT_XML }
]);
if (zipBytes.length < 100) throw new Error("zip too small — writer broken");

// The exact browser-half call path: base64 round-trip, then mammoth.
const base64 = Buffer.from(zipBytes).toString("base64");
const bin = Buffer.from(base64, "base64");
// Mirror the browser helper exactly: a fresh zero-offset Uint8Array.
const bytes = new Uint8Array(bin.length);
bytes.set(bin);
const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
const html = result.value;
if (!html.includes("Hello docx test")) throw new Error(`converted html missing text: ${html}`);
if (!html.includes("中文")) throw new Error(`converted html missing CJK text: ${html}`);
console.log("docx → mammoth → HTML OK:", JSON.stringify(html.slice(0, 120)));
console.log("DOCX SMOKE OK");

// Host half test: capture the /fs-tree handler and the asset route through
// fake connection/webServer services, and exercise list/home/read against the
// real filesystem.
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const mod = await import("./lib/index.js");
if (typeof mod.apply !== "function" || mod.inject.join(",") !== "connection,webServer,workspaceRegistry") {
  throw new Error(`unexpected host module shape ${JSON.stringify(mod.inject)}`);
}

let registration = null;
const routes = [];
const fakeCtx = {
  effect(fn) { const d = fn(); return typeof d === "function" ? d : () => {}; },
  workspaceRegistry: {
    list() {
      return [
        { id: "ws-1", title: "My Work", path: "C:/work" },
        { id: "ws-2", title: "Second", path: "C:/second" }
      ];
    }
  },
  connection: {
    rpc: {
      handle(channel, handler, options) {
        registration = { channel, handler, options };
        return () => {};
      }
    }
  },
  webServer: {
    register(routeDef) { routes.push(routeDef); return () => {}; }
  }
};
mod.apply(fakeCtx);
if (!registration || registration.channel !== "/fs-tree" || registration.options.authority !== "loopback") {
  throw new Error("channel registration missing or not loopback-fenced");
}
const route = routes.find((r) => r.path === "/fs-tree-assets");
const rawRoute = routes.find((r) => r.path === "/fs-tree-raw");
if (!route || route.kind !== "prefix") throw new Error("asset route registration wrong");
if (!rawRoute || rawRoute.kind !== "prefix") throw new Error("raw route registration wrong");
console.log("channel registration OK:", registration.channel, JSON.stringify(registration.options));
console.log("asset + raw routes OK");

// Fake node:http response recorder (streams collect chunks via pipe/write).
function fakeRes() {
  const calls = [];
  return {
    calls,
    writeHead(status, headers) { calls.push(["head", status, headers]); },
    write(chunk) { calls.push(["data", chunk]); return true; },
    end(body) { calls.push(["end", body]); },
    destroy() {},
    once() { return this; },
    on() { return this; },
    emit() { return true; },
    pipe(stream) {
      stream.on("data", (d) => calls.push(["data", d]));
      stream.on("end", () => calls.push(["end", undefined]));
      return stream;
    }
  };
}
function fakeReq(url, headers, method = "GET") {
  return { url, headers, method };
}

// Asset route: whitelisted file served, unknown 404, non-loopback 403.
const resOkObj = fakeRes();
await route.handler(fakeReq("/fs-tree-assets/mammoth.browser.min.js", { host: "127.0.0.1:3080" }), resOkObj);
const resOk = resOkObj.calls;
if (resOk[0][0] !== "head" || resOk[0][1] !== 200) throw new Error(`asset 200 expected: ${JSON.stringify(resOk)}`);
const body = String(resOk[1][1]);
if (!body.includes("mammoth")) throw new Error("asset body does not look like mammoth");
console.log("asset 200 OK (", body.length, "bytes )");

const res404Obj = fakeRes();
await route.handler(fakeReq("/fs-tree-assets/evil.js", { host: "127.0.0.1:3080" }), res404Obj);
if (res404Obj.calls[0][1] !== 404) throw new Error("unknown asset should be 404");
const res403Obj = fakeRes();
await route.handler(fakeReq("/fs-tree-assets/mammoth.browser.min.js", { host: "evil.example" }), res403Obj);
if (res403Obj.calls[0][1] !== 403) throw new Error("non-loopback host should be 403");
const res403bObj = fakeRes();
await route.handler(fakeReq("/fs-tree-assets/mammoth.browser.min.js", { host: "127.0.0.1:3080", origin: "https://evil.example" }), res403bObj);
if (res403bObj.calls[0][1] !== 403) throw new Error("cross-origin should be 403");
console.log("asset fence OK (404 / 403 / cross-origin 403)");

// Raw media route: stream + content-type + Range + fence.
const picPath = join(tmpdir(), "dsh-fs-tree-raw-test.png");
writeFileSync(picPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]));
const rawOk = fakeRes();
await rawRoute.handler(fakeReq(`/fs-tree-raw?path=${encodeURIComponent(picPath)}`, { host: "127.0.0.1:3080" }), rawOk);
await new Promise((r) => setTimeout(r, 150)); // let the stream drain
if (rawOk.calls[0][0] !== "head" || rawOk.calls[0][1] !== 200 || rawOk.calls[0][2]["content-type"] !== "image/png") {
  throw new Error(`raw 200 mismatch: ${JSON.stringify(rawOk.calls[0])}`);
}
const rawBytes = Buffer.concat(rawOk.calls.filter((c) => c[0] === "data").map((c) => Buffer.from(c[1])));
if (rawBytes.length !== 11) throw new Error(`raw body length wrong: ${rawBytes.length}`);
console.log("raw route OK (200 image/png, streamed bytes)");

const rawRange = fakeRes();
await rawRoute.handler(fakeReq(`/fs-tree-raw?path=${encodeURIComponent(picPath)}`, { host: "127.0.0.1:3080", range: "bytes=2-5" }), rawRange);
if (rawRange.calls[0][0] !== "head" || rawRange.calls[0][1] !== 206 || !String(rawRange.calls[0][2]["content-range"]).startsWith("bytes 2-5/11")) {
  throw new Error(`raw range mismatch: ${JSON.stringify(rawRange.calls[0])}`);
}
console.log("raw route OK (206 range)");

const rawBad = fakeRes();
await rawRoute.handler(fakeReq("/fs-tree-raw?path=C%3A%5Cevil.txt", { host: "127.0.0.1:3080" }), rawBad);
if (rawBad.calls[0][1] !== 404 && rawBad.calls[0][1] !== 415) throw new Error(`raw bad path mismatch: ${JSON.stringify(rawBad.calls[0])}`);
const raw403 = fakeRes();
await rawRoute.handler(fakeReq(`/fs-tree-raw?path=${encodeURIComponent(picPath)}`, { host: "evil.example" }), raw403);
if (raw403.calls[0][1] !== 403) throw new Error("raw non-loopback should be 403");
console.log("raw route fence OK (404/415 + 403)");
rmSync(picPath, { force: true });

// Fixture tree: one dir, two files (one hidden), one binary file, one huge file.
const root = mkdtempSync(join(tmpdir(), "dsh-fs-tree-test-"));
try {
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "b.txt"), "line1\nline2\n");
  writeFileSync(join(root, "a.md"), "a");
  writeFileSync(join(root, ".hidden"), "h");
  writeFileSync(join(root, "blob.bin"), Buffer.from([0, 1, 2, 0, 255]));
  writeFileSync(join(root, "huge.bin"), Buffer.alloc(33 * 1024 * 1024, 0));

  const list = await registration.handler("list", { path: root });
  if (!list.ok) throw new Error(`list failed: ${JSON.stringify(list.error)}`);
  const names = list.value.entries.map((e) => e.name);
  const expected = ["src", ".hidden", "a.md", "b.txt", "blob.bin", "huge.bin"]; // dirs first, then name-sorted (dotfiles sort first)
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`sort/dirs-first mismatch: ${JSON.stringify(names)}`);
  }
  const src = list.value.entries.find((e) => e.name === "src");
  if (src.kind !== "dir" || src.hidden) throw new Error("src kind/hidden wrong");
  const hidden = list.value.entries.find((e) => e.name === ".hidden");
  if (!hidden.hidden) throw new Error("hidden flag wrong");
  console.log("list OK:", JSON.stringify(names));

  const missing = await registration.handler("list", { path: join(root, "nope") });
  if (missing.ok || missing.error.code !== "not-found") throw new Error("missing path should be not-found");

  const fileAsDir = await registration.handler("list", { path: join(root, "a.md") });
  if (fileAsDir.ok || fileAsDir.error.code !== "not-directory") throw new Error("file path should be not-directory");

  const relative = await registration.handler("list", { path: "src" });
  if (relative.ok || relative.error.code !== "invalid-path") throw new Error("relative path should be invalid-path");

  const home = await registration.handler("home", {});
  if (!home.ok || home.value.path !== homedir()) throw new Error("home mismatch");

  const text = await registration.handler("read", { path: join(root, "b.txt") });
  if (!text.ok || text.value.text !== "line1\nline2\n" || text.value.truncated || text.value.binary) {
    throw new Error(`read text mismatch: ${JSON.stringify(text)}`);
  }
  if (typeof text.value.mtimeMs !== "number") throw new Error("read should carry mtimeMs");

  // write: create a new file, then overwrite it.
  const newFile = join(root, "new.txt");
  const w1 = await registration.handler("write", { path: newFile, content: "hello" });
  if (!w1.ok) throw new Error(`write create failed: ${JSON.stringify(w1)}`);
  const w2 = await registration.handler("write", { path: newFile, content: "hello\nworld\n" });
  if (!w2.ok) throw new Error(`write overwrite failed: ${JSON.stringify(w2)}`);
  const wRead = await registration.handler("read", { path: newFile });
  if (!wRead.ok || wRead.value.text !== "hello\nworld\n") throw new Error(`write round-trip mismatch: ${JSON.stringify(wRead)}`);
  const wBad = await registration.handler("write", { path: newFile, content: 42 });
  if (wBad.ok || wBad.error.code !== "invalid-content") throw new Error("write non-string content should fail");
  const wMissingParent = await registration.handler("write", { path: join(root, "nope", "x.txt"), content: "x" });
  if (wMissingParent.ok || wMissingParent.error.code !== "parent-missing") throw new Error("write with missing parent should fail");
  const wDir = await registration.handler("write", { path: root, content: "x" });
  if (wDir.ok || wDir.error.code !== "not-file") throw new Error("write over a directory should fail");
  console.log("write OK: create / overwrite round-trip / invalid-content / parent-missing / not-file");

  // stat: existence/kind probe.
  const sFile = await registration.handler("stat", { path: join(root, "a.md") });
  if (!sFile.ok || !sFile.value.exists || sFile.value.kind !== "file") throw new Error(`stat file mismatch: ${JSON.stringify(sFile)}`);
  const sDir = await registration.handler("stat", { path: root });
  if (!sDir.ok || !sDir.value.exists || sDir.value.kind !== "dir") throw new Error(`stat dir mismatch: ${JSON.stringify(sDir)}`);
  const sMissing = await registration.handler("stat", { path: join(root, "nope") });
  if (!sMissing.ok || sMissing.value.exists !== false) throw new Error(`stat missing mismatch: ${JSON.stringify(sMissing)}`);
  console.log("stat OK: file / dir / not-found");

  const binary = await registration.handler("read", { path: join(root, "blob.bin") });
  if (!binary.ok || binary.value.binary !== true || binary.value.size !== 5 || typeof binary.value.base64 !== "string") {
    throw new Error(`read binary mismatch: ${JSON.stringify(binary)}`);
  }
  const decoded = Buffer.from(binary.value.base64, "base64");
  if (decoded.toString("hex") !== "00010200ff") throw new Error(`base64 round-trip mismatch: ${decoded.toString("hex")}`);
  console.log("read OK: text + binary base64 round-trip");

  const huge = await registration.handler("read", { path: join(root, "huge.bin") });
  if (!huge.ok || huge.value.binary !== true || huge.value.tooLarge !== true || huge.value.base64 !== undefined) {
    throw new Error(`read tooLarge mismatch: ${JSON.stringify({ ok: huge.ok, value: huge.value })}`);
  }
  console.log("read OK: 33 MiB binary → tooLarge (no base64)");

  const readDir = await registration.handler("read", { path: root });
  if (readDir.ok || readDir.error.code !== "not-file") throw new Error("read on dir should be not-file");

  const readMissing = await registration.handler("read", { path: join(root, "nope") });
  if (readMissing.ok || readMissing.error.code !== "not-found") throw new Error("read missing should be not-found");

  const unknown = await registration.handler("bogus", {});
  if (unknown.ok || unknown.error.code !== "unknown-endpoint") throw new Error("unknown endpoint should fail");
  console.log("error paths OK (not-found / not-directory / not-file / invalid-path / unknown-endpoint)");

  // reveal: error paths only — the success path spawns the OS file manager.
  const rBad = await registration.handler("reveal", { path: "relative" });
  if (rBad.ok || rBad.error.code !== "invalid-path") throw new Error("reveal relative should be invalid-path");
  const rMissing = await registration.handler("reveal", { path: join(root, "nope") });
  if (rMissing.ok || rMissing.error.code !== "not-found") throw new Error("reveal missing should be not-found");
  console.log("reveal OK (invalid-path / not-found; success path spawns the OS file manager)");

  // workspaces: registry list is surfaced with id/title/path.
  const ws = await registration.handler("workspaces", {});
  if (!ws.ok || ws.value.items.length !== 2 || ws.value.items[0].path !== "C:/work") {
    throw new Error("workspaces endpoint failed");
  }
  console.log("workspaces OK (registry list)");

  console.log("home OK:", home.value.path);
} finally {
  rmSync(root, { recursive: true, force: true });
}
console.log("HOST SMOKE OK");

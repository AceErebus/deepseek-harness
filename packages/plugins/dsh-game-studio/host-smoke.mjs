// Host half smoke: channel registration, project discovery, codegen, assets,
// config guards, and the full ComfyUI generate flow against a MOCK ComfyUI
// server (status -> prompt -> history poll -> view -> file written).
import http from "node:http";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_DIR = fileURLToPath(new URL(".", import.meta.url));
const CONFIG_FILE = join(PLUGIN_DIR, "game-studio.config.json");

const mod = await import("./lib/index.js");
if (mod.inject.join(",") !== "connection") throw new Error(`unexpected inject ${JSON.stringify(mod.inject)}`);

let handler = null;
const fakeCtx = {
  effect(fn) { const d = fn(); if (typeof d === "function") return d; return () => {}; },
  connection: {
    rpc: { handle(channel, fn) { handler = { channel, fn }; return () => { handler = null; }; } },
  },
};
mod.apply(fakeCtx);
if (!handler || handler.channel !== "/game-studio") throw new Error("channel not registered");
const call = (endpoint, payload) => handler.fn(endpoint, payload || {});

let pass = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { pass++; console.log("  PASS", label); }
  else { fail++; console.log("  FAIL", label, extra !== undefined ? JSON.stringify(extra) : ""); }
}

// ---- fixture: a fake Cocos project + a non-project dir ----
const root = mkdtempSync(join(tmpdir(), "gs-smoke-"));
const proj = join(root, "MyGame");
mkdirSync(join(proj, "assets", "textures"), { recursive: true });
mkdirSync(join(proj, "assets", "scripts"), { recursive: true });
writeFileSync(join(proj, "package.json"), JSON.stringify({ name: "MyGame", creator: { version: "3.8.0" } }));
writeFileSync(join(proj, "assets", "textures", "hero.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(proj, "assets", "textures", "bg.jpg"), Buffer.from([0xff, 0xd8]));
writeFileSync(join(proj, "assets", "scripts", "Player.ts"), "export class Player {}");
mkdirSync(join(root, "NotAGame", "src"), { recursive: true });
writeFileSync(join(root, "NotAGame", "package.json"), JSON.stringify({ name: "x" }));

const storedConfig = existsSync(CONFIG_FILE) ? readFileSync(CONFIG_FILE, "utf8") : null;

try {
  let r = await call("projects", { root });
  check("projects discovers the cocos project", r.ok && Array.isArray(r.value.projects) && r.value.projects.length === 1, r);
  const projInfo = r.value.projects[0];
  check("project name + creator", projInfo.name === "MyGame" && projInfo.creator === "3.8.0", projInfo);

  r = await call("codegen", { project: proj });
  check("codegen writes starter files", r.ok && Array.isArray(r.value.files) && r.value.files.length === 3, r);
  check("GameMain.ts on disk", existsSync(join(proj, "assets", "scripts", "game", "GameMain.ts")));
  check("GameConfig.ts on disk", existsSync(join(proj, "assets", "scripts", "game", "GameConfig.ts")));

  r = await call("assets", { project: proj });
  check("assets lists images", r.ok && r.value.assets.length === 2 && r.value.assets.includes("assets/textures/hero.png"), r.value.assets);

  r = await call("build", { project: proj, platform: "wechatgame" });
  check("build without creatorExe fails config-missing", r.ok === false && r.error.details.code === "config-missing", r);

  r = await call("openDevtools", { project: proj, platform: "wechatgame" });
  check("devtools without cli fails config-missing", r.ok === false, r);

  r = await call("comfyui/status", {});
  check("comfyui status graceful offline", r.ok === true && r.value.available === false, r);

  r = await call("wat", {});
  check("unknown endpoint fails", r.ok === false);

  // ---- mock ComfyUI server: full generate flow ----
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/system_stats") { res.end(JSON.stringify({ system: { comfyui_version: "mock" } })); return; }
    if (url.pathname === "/prompt") {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => { res.end(JSON.stringify({ prompt_id: "p1" })); });
      return;
    }
    if (url.pathname.startsWith("/history/")) {
      res.end(JSON.stringify({ p1: { status: { completed: true }, outputs: { "9": { images: [{ filename: "mock.png", subfolder: "", type: "output" }] } } } }));
      return;
    }
    if (url.pathname === "/view") {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      return;
    }
    res.writeHead(404); res.end("{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  writeFileSync(CONFIG_FILE, JSON.stringify({ comfyuiUrl: `http://127.0.0.1:${port}`, checkpoint: "mock.safetensors" }, null, 2));

  r = await call("comfyui/status", {});
  check("comfyui status online against mock", r.ok === true && r.value.available === true, r);

  const outDir = join(root, "out");
  r = await call("comfyui/generate", { prompt: "1girl", outputDir: outDir, filename: "hero.png", seed: 42 });
  check("generate ok + file written", r.ok === true && existsSync(join(outDir, "hero.png")), r);
  check("generate dataUrl", r.ok === true && typeof r.value.dataUrl === "string" && r.value.dataUrl.startsWith("data:image/png;base64,"), r.value?.dataUrl?.slice(0, 30));

  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  console.log(`\n${pass} passed, ${fail} failed`);
  rmSync(root, { recursive: true, force: true });
  if (storedConfig === null) rmSync(CONFIG_FILE, { force: true });
  else writeFileSync(CONFIG_FILE, storedConfig, "utf8");
  if (fail > 0) process.exitCode = 1;
} finally {
  if (storedConfig === null) rmSync(CONFIG_FILE, { force: true });
  else writeFileSync(CONFIG_FILE, storedConfig, "utf8");
}

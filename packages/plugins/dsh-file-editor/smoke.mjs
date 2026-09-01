// Smoke test for the dsh-file-editor client bundle (built from src/client/index.ts
// by tsdown into client.js): materialize it in a vm, stub the fsTree service,
// and verify the fsTree.fileView chain registration, the text-file predicate,
// and the component's loading render.
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const STORE_MODULES = fileURLToPath(new URL("../../node_modules/.pnpm", import.meta.url));
const toUrl = (p) => pathToFileURL(p).href;
const react = await import(toUrl(
  `${STORE_MODULES}/react@18.3.1/node_modules/react/index.js`,
)).then((m) => m.default ?? m);
const { renderToString } = await import(toUrl(
  `${STORE_MODULES}/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/server.js`,
)).then((m) => m.default ?? m);
const { createRoot } = await import(toUrl(
  `${STORE_MODULES}/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/client.js`,
)).then((m) => m.default ?? m);
const { act } = await import(toUrl(
  `${STORE_MODULES}/react@18.3.1/node_modules/react/index.js`,
)).then((m) => m.default ?? m);
const { JSDOM } = await import(toUrl(
  `${STORE_MODULES}/jsdom@29.1.1/node_modules/jsdom/lib/api.js`,
)).then((m) => m.default ?? m);

let captured = null;
const sandbox = {
  window: { __ModuleLoader__: { load(entry) { captured = entry; } } },
  document: undefined,
  navigator: undefined,
  console,
  setTimeout,
  clearTimeout,
  Promise,
  Symbol
};vm.createContext(sandbox);
const source = readFileSync(new URL("./client.js", import.meta.url), "utf8");
vm.runInContext(source, sandbox, { filename: "client.js" });
if (!captured || captured.id !== "dsh-file-editor") throw new Error("bundle did not register");

const mod = captured.factory((spec) => {
  if (spec === "react") return react;
  throw new Error(`unexpected require ${spec}`);
});
if (typeof mod.apply !== "function") throw new Error("exports.apply missing");
if (mod.inject.join(",") !== "slots,locale,fsTree") {
  throw new Error(`unexpected inject ${JSON.stringify(mod.inject)}`);
}
console.log("module shape OK:", JSON.stringify(mod.inject));

// Fake fsTree service + slots.
const registrations = [];
const calls = [];
const fakeCtx = {
  effect(fn) { const d = fn(); return typeof d === "function" ? d : () => {}; },
  locale: {
    register(ns, dicts) { console.log(`locale registered: ${ns} (${Object.keys(dicts).length} keys)`); },
    bind(ns) { return (key) => `[${ns}:${key}]`; }
  },
  get(name) {
    if (name === "fsTree") return {
      selectionStore: {
        getSnapshot: () => null,
        subscribe: () => () => {},
        select: () => {}
      },
      call: async (endpoint, payload) => {
        calls.push([endpoint, payload]);
        if (endpoint === "read") return { ok: true, value: { path: payload.path, text: "int x;", binary: false, truncated: false, size: 6, mtimeMs: 1 } };
        return { ok: true, value: {} };
      },
      openPath: () => Promise.resolve({ ok: true, value: {} }),
      openFile: () => {}
    };
    return undefined;
  },
  slots: {
    register(opts, Component) { registrations.push({ opts, Component }); return () => {}; },
    inject(name, fn) {
      if (name !== "fsTree.fileView") throw new Error(`unexpected slot ${name}`);
      fn();
      return () => {};
    }
  }
};
mod.apply(fakeCtx);

const entry = registrations.find((r) => r.opts.name === "fsTree.fileView");
if (!entry) throw new Error("fsTree.fileView registration missing");
if (typeof entry.opts.select !== "function") throw new Error("chain entry needs a select function");
if (!entry.opts.select({ path: "C:\\a.c" })) throw new Error("select must match .c");
if (entry.opts.select({ path: "C:\\a.pdf" }) !== null) throw new Error("select must reject .pdf");
if (entry.opts.select({ path: "C:\\x" }) !== null) throw new Error("select must reject extension-less files");
console.log("fsTree.fileView chain registration OK (select claims text, rejects pdf)");

// Text-file predicate.
const { isEditableText } = mod;
if (!isEditableText("C:\\a.c") || !isEditableText("C:\\a.h") || !isEditableText("C:\\a.py") || !isEditableText("C:\\Dockerfile")) {
  throw new Error("isEditableText should accept c/h/py/Dockerfile");
}
if (isEditableText("C:\\a.pdf") || isEditableText("C:\\a.docx") || isEditableText("C:\\a.zip")) {
  throw new Error("isEditableText should reject pdf/docx/zip");
}
console.log("isEditableText OK");

// Media predicates + chain claim (image/video preview support).
const { isMedia } = mod;
if (!isMedia("C:\\a.png") || !isMedia("C:\\a.JPG") || !isMedia("C:\\a.webp")) {
  throw new Error("isMedia should accept png/jpg/webp");
}
if (!isMedia("C:\\a.mp4") || !isMedia("C:\\a.mov")) {
  throw new Error("isMedia should accept mp4/mov");
}
if (isMedia("C:\\a.c") || isMedia("C:\\a.md") || isMedia("C:\\a.zip")) {
  throw new Error("isMedia should reject text/archive files");
}
if (entry.opts.select({ path: "C:\\a.png" }) === null) throw new Error("select must claim images");
if (entry.opts.select({ path: "C:\\a.mp4" }) === null) throw new Error("select must claim videos");
console.log("media predicates OK (isMedia + chain claim)");

// Markdown renderer: headings, GFM tables, fenced code, inline bold, and
// HTML escaping (raw markup in the document must never reach the DOM).
const { renderMarkdown, isMarkdown } = mod;
const mdSource = [
  "## 严重程度统计",
  "",
  "| 级别 | 数量 | 编号 |",
  "|---|---|---|",
  "| 🔴 高危 | 6 | H1 - H6 |",
  "| 🟠 中危 | 14 | M1 - M14 |",
  "",
  "```js",
  "const a = 1;",
  "```",
  "",
  "**bold** and <script>alert(1)</script>"
].join("\n");
const mdHtml = renderMarkdown(mdSource);
const mdChecks = [
  ["heading", mdHtml.includes("<h2>严重程度统计</h2>")],
  ["table header", mdHtml.includes("<table>") && mdHtml.includes("<th>级别</th>")],
  ["table cell", mdHtml.includes("<td>🔴 高危</td>")],
  ["fenced code", mdHtml.includes("<pre><code>") && mdHtml.includes("const a = 1;")],
  ["bold", mdHtml.includes("<strong>bold</strong>")],
  ["escaped script", mdHtml.includes("&lt;script&gt;") && !mdHtml.includes("<script>alert")],
  ["isMarkdown predicate", isMarkdown("C:\\a.md") && isMarkdown("C:\\README.markdown") && !isMarkdown("C:\\a.c")]
];
for (const [name, ok] of mdChecks) {
  if (!ok) throw new Error(`renderMarkdown ${name} check failed`);
}
console.log("renderMarkdown OK (headings/tables/fences/bold/escaping)");

// Loading render of the editor (chain props).
const face = entry.opts.inject();
if (!face.fsTree || typeof face.getCLang !== "function") throw new Error("inject face incomplete");
const html = renderToString(react.createElement(entry.Component, {
  path: "C:\\a.c",
  onDirtyChange: () => {},
  t: (k) => `[${k}]`,
  fsTree: face.fsTree,
  getCLang: face.getCLang
}));
if (!html.includes("[editor.loading]")) throw new Error("loading render missing hint");
console.log("FileEditor loading renderToString OK");

// Media render: mount with jsdom + act so the load effect runs (for media
// files it short-circuits to "ready" WITHOUT calling the text read RPC), and
// the image/video preview renders the raw streaming route.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
sandbox.window = dom.window;
sandbox.document = dom.window.document;
sandbox.navigator = dom.window.navigator;

const mounted = [];
const mountMedia = (path) => {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push(() => root.unmount());
  act(() => {
    root.render(react.createElement(entry.Component, {
      path,
      onDirtyChange: () => {},
      t: (k) => `[${k}]`,
      fsTree: face.fsTree,
      getCLang: face.getCLang
    }));
  });
  act(() => {}); // flush the load effect's synchronous state update
  return container;
};

const callsBefore = calls.length;
const imgNode = mountMedia("C:\\a.png");
const img = imgNode.querySelector(".dsh-editor-media-img");
if (!img) throw new Error("image render must produce an img element");
if (img.getAttribute("src") !== `/fs-tree-raw?path=${encodeURIComponent("C:\\a.png")}`) {
  throw new Error("img must use the raw streaming route");
}
if (imgNode.querySelector("[data-primary]")) throw new Error("image toolbar must omit save/build");
if (!imgNode.textContent.includes("[editor.imageHint]")) throw new Error("image toolbar must show the image hint");
if (calls.length !== callsBefore) throw new Error("media files must not trigger the text read RPC");

const videoNode = mountMedia("C:\\a.mp4");
const video = videoNode.querySelector(".dsh-editor-media-video");
if (!video) throw new Error("video render must produce a video element");
if (!video.hasAttribute("controls")) throw new Error("video element must have controls");
if (!videoNode.textContent.includes("[editor.videoHint]")) throw new Error("video toolbar must show the video hint");
act(() => { for (const unmount of mounted) unmount(); });
console.log("FileEditor media jsdom mount OK (img + video, no read RPC)");
console.log("EDITOR SMOKE OK");

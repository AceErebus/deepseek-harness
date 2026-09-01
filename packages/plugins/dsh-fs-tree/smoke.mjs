// Smoke test for the dsh-fs-tree client bundle (built from src/client/index.ts
// by tsdown into lib/client.js): materialize it in a vm with the same global
// shape the web shell provides (window.__ModuleLoader__), stub the primitives
// peer (its real module imports CSS, which Node cannot load outside a
// bundler), then exercise the plugin entry, both slot registrations, and
// render both components.
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
const reactDom = await import(toUrl(
  `${STORE_MODULES}/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/index.js`,
)).then((m) => m.default ?? m);

// Icons used by the bundle, verified against the real primitives export map.
const ICONS = [
  "IconChevronDownOutline14", "IconChevronRightOutline14",
  "IconFolderOpen16", "IconFolderClose16", "IconCopyOutline16",
  "IconFolderOpenOutline16", "IconRefreshOutline14"
];
const primitivesStub = Object.fromEntries(ICONS.map((name) => [name, () => null]));
primitivesStub.ReadBlock = ({ label, lines }) =>
  react.createElement("pre", null, `RB:${label}:${lines.map((l) => l.number).join(",")}`);

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
};
vm.createContext(sandbox);
const source = readFileSync(new URL("./client.js", import.meta.url), "utf8");
vm.runInContext(source, sandbox, { filename: "client.js" });

if (!captured) throw new Error("bundle did not register with __ModuleLoader__");
if (captured.id !== "dsh-fs-tree") throw new Error(`unexpected id ${captured.id}`);

const mod = captured.factory((spec) => {
  if (spec === "react") return react;
  if (spec === "react-dom") return reactDom;
  if (spec === "@deepseek-ai/dsh-client-ui-primitives") return primitivesStub;
  throw new Error(`unexpected require ${spec}`);
});
if (typeof mod.apply !== "function") throw new Error("exports.apply missing");
if (mod.inject.join(",") !== "slots,connection,locale") {
  throw new Error(`unexpected inject ${JSON.stringify(mod.inject)}`);
}
console.log("module shape OK:", JSON.stringify(mod.inject));

const calls = [];
const call = async (endpoint, payload) => {
  calls.push([endpoint, payload]);
  if (endpoint === "home") return { ok: true, value: { path: "C:\\Users\\test" } };
  if (endpoint === "list") {
    return {
      ok: true,
      value: {
        path: payload.path,
        entries: [
          { name: "src", kind: "dir", hidden: false },
          { name: "package.json", kind: "file", hidden: false },
          { name: ".gitignore", kind: "file", hidden: true }
        ],
        truncated: false
      }
    };
  }
  if (endpoint === "read") {
    return { ok: true, value: { path: payload.path, text: "line1\nline2\n", truncated: false, size: 13 } };
  }
  return { ok: false, error: { code: "unknown-endpoint", message: endpoint } };
};

let registered = null;
const registrations = [];
let provided = null;
const fakeCtx = {
  effect(fn) { const d = fn(); return typeof d === "function" ? d : () => {}; },
  locale: {
    register(ns, dicts) { registered = { ns, keys: Object.keys(dicts) }; },
    bind(ns) { return (key) => `[${ns}:${key}]`; }
  },
  slots: {
    register(opts, Component) { registrations.push({ opts, Component }); return () => {}; },
    inject(name, fn) {
      if (name !== "sidebar.workspaces.tree" && name !== "conversation.view") {
        throw new Error(`unexpected slot ${name}`);
      }
      fn();
      return () => {};
    }
  },
  provide(name, handle) { provided = { name, handle }; },
  get() { return undefined; },
  connection: { rpc: { call }, api: { host: { openPath: async () => ({ ok: true, value: {} }) } } }
};
mod.apply(fakeCtx);
if (!registered || registered.ns !== "fs-tree" || registered.keys.length === 0) {
  throw new Error("locale dictionaries were not registered");
}
console.log(`locale registered: ${registered.ns} (${registered.keys.length} keys)`);

// The shared fsTree service must be provided with the cross-plugin face.
if (!provided || provided.name !== "fsTree") throw new Error("fsTree service not provided");
for (const fn of ["call", "openPath", "reveal", "selectionStore", "viewPrefs", "dirActions", "openInViewer", "tabs", "openFile", "closeTab"]) {
  if (!provided.handle[fn]) throw new Error(`fsTree.${fn} missing`);
}
const prefFor = (p) => provided.handle.viewPrefs.viewFor(p);
if (!prefFor("C:\\x.pdf") || prefFor("C:\\x.pdf").viewId !== "file") throw new Error("pdf should prefer the viewer");
if (prefFor("C:\\x.c") !== null) throw new Error("c should have no preference without the editor plugin");
console.log("fsTree service OK (call/openPath/reveal/selectionStore/viewPrefs/tabs/openFile/closeTab; pdf→viewer, c→none)");

const byName = Object.fromEntries(registrations.map((r) => [r.opts.name, r]));
const explorer = byName["sidebar.workspaces.tree"];
const view = byName["conversation.view"];
if (!explorer || !view) throw new Error(`missing registrations: ${JSON.stringify(Object.keys(byName))}`);
if (view.opts.id !== "fs-file" || view.opts.order !== 20) throw new Error(`view registration options wrong: ${JSON.stringify(view.opts)}`);
if (typeof view.opts.label !== "function") throw new Error("view label must be a function");
if (!view.opts.children || !view.opts.children["fsTree.fileView"] || view.opts.children["fsTree.fileView"].kind !== "chain") {
  throw new Error(`fsTree.fileView chain slot must be declared: ${JSON.stringify(view.opts.children)}`);
}
if (!explorer.opts.children || !explorer.opts.children["fsTree.explorer.header"] || explorer.opts.children["fsTree.explorer.header"].kind !== "list") {
  throw new Error(`fsTree.explorer.header list slot must be declared: ${JSON.stringify(explorer.opts.children)}`);
}
console.log("registrations OK: sidebar.workspaces.tree (fsTree.explorer.header child) + conversation.view (id=fs-file, order=20) with fsTree.fileView chain slot");

const panelFace = explorer.opts.inject();
if (typeof panelFace.onOpenFile !== "function" || !panelFace.selectionStore || typeof panelFace.call !== "function" || !panelFace.dirActions) {
  throw new Error("explorer inject face incomplete (needs onOpenFile/selectionStore/call/dirActions)");
}
const viewFace = view.opts.inject("session-1");
if (!viewFace.selectionStore || typeof viewFace.call !== "function" || typeof viewFace.openPath !== "function" || !viewFace.tabs || typeof viewFace.openFile !== "function" || typeof viewFace.closeTab !== "function") {
  throw new Error("view inject face incomplete (needs selectionStore/call/openPath/tabs/openFile/closeTab)");
}

// Render the explorer (root not yet derived — SSR, effects do not run) with
// standard-kit props.
const props = {
  wide: true,
  t: (k) => `[${k}]`,
  call,
  selectionStore: panelFace.selectionStore,
  onOpenFile: panelFace.onOpenFile,
  useSessions: (sel) => sel({ current: "s1" }),
  useWorkspaces: (sel) => sel({ items: [{ workspaceId: "w1", path: "C:\\work\\proj", sessionIds: ["s1"] }] })
};
const html = renderToString(react.createElement(explorer.Component, props));
if (!html.includes("[fsTree.title]")) throw new Error("rendered explorer missing header title");
if (!html.includes("[fsTree.refresh]")) throw new Error("rendered explorer missing refresh button");
console.log("explorer renderToString OK (header)");

// Tree rows carry hover actions for BOTH files and directories: copy path +
// reveal. The row component is exported for tests; inert to the kernel.
const rowT = (k) => `[${k}]`;
const rowProps = (kind) => ({
  dirPath: "C:\\work\\proj", depth: 0, name: kind === "dir" ? "src" : "package.json", kind,
  expanded: false, copied: null, selectedPath: null,
  onToggle: () => {}, onOpen: () => {}, onCopy: () => {}, onReveal: () => {}, T: rowT
});
for (const kind of ["dir", "file"]) {
  const rowHtml = renderToString(react.createElement(mod.TreeRow, rowProps(kind)));
  if (!rowHtml.includes(`title="[fsTree.copy]"`)) throw new Error(`${kind} row missing copy-path button`);
  if (!rowHtml.includes(`title="[fsTree.reveal]"`)) throw new Error(`${kind} row missing reveal button`);
  if (!rowHtml.includes(kind === "dir" ? "src" : "package.json")) throw new Error(`${kind} row missing name`);
}
console.log("TreeRow hover actions OK (copy path + reveal on files AND directories)");

// Render the file view (idle state, no selection) — exercises useSyncExternalStore.
const viewHtml = renderToString(react.createElement(view.Component, { t: (k) => `[${k}]`, call, openPath: viewFace.openPath, selectionStore: viewFace.selectionStore }));
if (!viewHtml.includes("[fsTree.noSelection]")) throw new Error("file view idle render missing hint");
console.log("file view renderToString OK (idle)");

// Select a file and re-render with the store pre-seeded: ready state path.
viewFace.selectionStore.select("C:\\work\\proj\\package.json");
const viewHtml2 = renderToString(react.createElement(view.Component, { t: (k) => `[${k}]`, call, openPath: viewFace.openPath, selectionStore: viewFace.selectionStore }));
if (!viewHtml2.includes("[fsTree.noSelection]")) throw new Error("SSR render should stay idle (effects do not run)");

// Exercise every FileViewBody branch directly (exported for tests; inert to the kernel).
const body = mod.FileViewBody;
const T = (k) => `[${k}]`;
const openPath = () => {};
const idleHtml = renderToString(react.createElement(body, { state: { status: "idle" }, T, openPath }));
if (!idleHtml.includes("[fsTree.noSelection]")) throw new Error("idle branch missing hint");
const readyHtml = renderToString(react.createElement(body, {
  state: { status: "ready", path: "C:\\work\\proj\\package.json", text: "a\nb", binary: false, truncated: false, size: 4, error: null },
  T, openPath
}));
if (!readyHtml.includes("RB:C:\\work\\proj\\package.json:1,2")) throw new Error("ready branch missing ReadBlock with line numbers");
const binaryHtml = renderToString(react.createElement(body, {
  state: { status: "ready", path: "C:\\x.bin", text: "", binary: true, truncated: false, size: 5, error: null },
  T, openPath
}));
if (!binaryHtml.includes("[fsTree.binary]") || !binaryHtml.includes("[fsTree.openInSystem]")) {
  throw new Error("binary branch missing notice or system-open button");
}
// docx WITHOUT bytes (older host / missing base64): must fall back to the
// notice + system-open, never an eternal loading state.
const docxNoBytesHtml = renderToString(react.createElement(body, {
  state: { status: "ready", path: "C:\\doc.docx", text: "", binary: true, truncated: false, size: 100, base64: null, tooLarge: false, error: null },
  T, openPath
}));
if (docxNoBytesHtml.includes("[fsTree.loading]") || !docxNoBytesHtml.includes("[fsTree.binary]")) {
  throw new Error("docx without bytes must fall back to the binary notice, not loading");
}
console.log("docx-without-bytes fallback OK");
const tooLargeHtml = renderToString(react.createElement(body, {
  state: { status: "ready", path: "C:\\x.bin", text: "", binary: true, truncated: false, size: 99999999, error: null, tooLarge: true },
  T, openPath
}));
if (!tooLargeHtml.includes("[fsTree.binaryTooLarge]")) throw new Error("tooLarge branch missing note");
const errHtml = renderToString(react.createElement(body, {
  state: { status: "error", path: "C:\\nope.txt", text: null, binary: false, truncated: false, size: 0, error: { code: "not-found", message: "ENOENT" } },
  T, openPath
}));
if (!errHtml.includes("[fsTree.readError]") || !errHtml.includes("C:\\nope.txt")) throw new Error("error branch missing details");
const truncHtml = renderToString(react.createElement(body, {
  state: { status: "ready", path: "C:\\big.txt", text: "x", binary: false, truncated: true, size: 999999, error: null },
  T, openPath
}));
if (!truncHtml.includes("[fsTree.readTruncated]")) throw new Error("truncated branch missing note");
console.log("FileViewBody branches OK (idle/ready/binary/tooLarge/error/truncated)");

// Conversation path-clicker heuristics (exported for tests; inert to the kernel).
const { looksLikePath, resolveAgainstCwd } = mod._pathClick;
const pathy = ["C:\\proj\\src\\a.c", "src/foo.c", "package.json", ".gitignore", "./main.c", "Makefile"];
for (const p of pathy) {
  if (!looksLikePath(p)) throw new Error(`looksLikePath should accept ${p}`);
}
const notPathy = ["npm install", "hello world", "int main()", "a b c", "x"];
for (const p of notPathy) {
  if (looksLikePath(p)) throw new Error(`looksLikePath should reject ${p}`);
}
if (resolveAgainstCwd("C:\\proj", "src/a.c") !== "C:\\proj/src/a.c") throw new Error("relative resolution wrong");
if (resolveAgainstCwd("C:\\proj", "C:\\abs\\x.c") !== "C:\\abs\\x.c") throw new Error("absolute passthrough wrong");
if (resolveAgainstCwd("C:\\proj", "~/x.c") !== null) throw new Error("tilde should be rejected");
console.log("path-clicker heuristics OK");

// Binary format dispatch (viewer kinds).
const { binaryKind } = mod;
const kindCases = {
  "C:\\a.xlsx": "spreadsheet", "C:\\a.csv": "spreadsheet", "C:\\a.tsv": "spreadsheet", "C:\\a.ods": "spreadsheet",
  "C:\\a.png": "image", "C:\\a.jpg": "image", "C:\\a.gif": "image", "C:\\a.webp": "image",
  "C:\\a.mp3": "audio", "C:\\a.wav": "audio", "C:\\a.flac": "audio",
  "C:\\a.mp4": "video", "C:\\a.webm": "video", "C:\\a.mov": "video",
  "C:\\a.pptx": "pptx", "C:\\a.pdf": "pdf", "C:\\a.docx": "docx",
  "C:\\a.zip": "other", "C:\\a.exe": "other"
};
for (const [p, expected] of Object.entries(kindCases)) {
  const got = binaryKind(p);
  if (got !== expected) throw new Error(`binaryKind(${p}) = ${got}, expected ${expected}`);
}
console.log("binaryKind dispatch OK (spreadsheet/image/audio/video/pptx/pdf/docx/other)");

// Tab context menu renders in the OPEN state (the state reached by clicking
// the toolbar ▾ button) without crashing.
const menuHtml = renderToString(react.createElement(mod.TabMenu, {
  menu: { x: 100, y: 200, path: "C:\\a.c", openedAt: Date.now() },
  onClose: () => {}, onCloseTab: () => {}, onCloseOthers: () => {}, onCloseAll: () => {},
  T: (k) => `[${k}]`
}));
if (!menuHtml.includes("[fsTree.closeTab]") || !menuHtml.includes("[fsTree.closeOthers]") || !menuHtml.includes("[fsTree.closeAll]")) {
  throw new Error("TabMenu open render missing menu items");
}
const menuNoTabHtml = renderToString(react.createElement(mod.TabMenu, {
  menu: { x: 100, y: 200, path: null, openedAt: Date.now() },
  onClose: () => {}, onCloseTab: () => {}, onCloseOthers: () => {}, onCloseAll: () => {},
  T: (k) => `[${k}]`
}));
if (menuNoTabHtml.includes("[fsTree.closeTab]")) throw new Error("TabMenu without path must hide Close tab");
console.log("TabMenu open render OK (with/without tab path)");

console.log("calls:", JSON.stringify(calls.map((c) => c[0])));
console.log("SMOKE OK");

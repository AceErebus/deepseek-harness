// Smoke test for the dsh-erebus-git client bundle (built from
// src/client/index.ts by tsdown into client.js): materialize it in a vm with
// the same global shape the web shell provides (window.__ModuleLoader__),
// stub the primitives peer, then exercise the plugin entry, the
// fsTree.explorer.header registration, the button render, and the hunk
// splitter.
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
  "IconBranchOutline16", "IconChevronDownOutline14", "IconChevronRightOutline14",
  "IconFolderClose16", "IconFolderOpen16"
];
const primitivesStub = Object.fromEntries(ICONS.map((name) => [name, () => null]));

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
if (captured.id !== "dsh-erebus-git") throw new Error(`unexpected id ${captured.id}`);

const mod = captured.factory((spec) => {
  if (spec === "react") return react;
  if (spec === "react-dom") return reactDom;
  if (spec === "@deepseek-ai/dsh-client-ui-primitives") return primitivesStub;
  throw new Error(`unexpected require ${spec}`);
});
if (typeof mod.apply !== "function") throw new Error("exports.apply missing");
if (mod.inject.join(",") !== "slots,locale,connection,fsTree") {
  throw new Error(`unexpected inject ${JSON.stringify(mod.inject)}`);
}
console.log("module shape OK:", JSON.stringify(mod.inject));

const calls = [];
const call = async (endpoint, payload) => {
  calls.push([endpoint, payload]);
  return { ok: true, value: {} };
};

let registered = null;
const registrations = [];
const fakeCtx = {
  effect(fn) { const d = fn(); return typeof d === "function" ? d : () => {}; },
  locale: {
    register(ns, dicts) { registered = { ns, keys: Object.keys(dicts) }; },
    bind(ns) { return (key) => `[${ns}:${key}]`; }
  },
  connection: { rpc: { call } },
  get(name) {
    if (name === "fsTree") return { call, openFile: () => {} };
    return undefined;
  },
  slots: {
    register(opts, Component) { registrations.push({ opts, Component }); return () => {}; },
    inject(name, fn) {
      if (name !== "fsTree.explorer.header") throw new Error(`unexpected slot ${name}`);
      fn();
      return () => {};
    }
  }
};
mod.apply(fakeCtx);
if (!registered || registered.ns !== "dsh-erebus-git" || registered.keys.length === 0) {
  throw new Error("locale dictionaries were not registered");
}
console.log(`locale registered: ${registered.ns} (${registered.keys.length} keys)`);

const entry = registrations.find((r) => r.opts.name === "fsTree.explorer.header");
if (!entry) throw new Error("fsTree.explorer.header registration missing");
if (entry.opts.id !== "dsh-erebus-git-button") throw new Error(`unexpected id ${entry.opts.id}`);
console.log("fsTree.explorer.header registration OK (id=dsh-erebus-git-button)");

// Render the button: icon-only control with the Git title tooltip.
const face = entry.opts.inject();
const html = renderToString(react.createElement(entry.Component, {
  fsTree: face.fsTree,
  call,
  t: (k) => `[${k}]`
}));
if (!html.includes("title=\"[git.title]\"")) throw new Error("button render missing title");
console.log("GitButton renderToString OK");

// Hunk splitter: a two-hunk diff splits into two blocks with bodies.
const { splitHunks } = mod;
const diff = [
  "diff --git a/a.c b/a.c",
  "index 111..222 100644",
  "--- a/a.c",
  "+++ b/a.c",
  "@@ -1,3 +1,4 @@",
  " int main() {",
  "-  return 0;",
  "+  return 1;",
  " }",
  "@@ -10,2 +11,3 @@",
  " void f() {}",
  "+// note"
].join("\n");
const hunks = splitHunks(diff);
if (hunks.length !== 2) throw new Error(`expected 2 hunks, got ${hunks.length}`);
if (!hunks[0].header.startsWith("@@ -1,3")) throw new Error(`bad first hunk header: ${hunks[0].header}`);
if (!hunks[1].lines.includes("+// note")) throw new Error("second hunk body missing");
console.log("splitHunks OK (2 hunks, headers + bodies)");

// Change tree builder: files group under their directories, dirs first then
// files, alphabetical, exactly the 修改/新增 section structure.
const { buildChangeTree } = mod;
const tree = buildChangeTree([
  { path: "a.txt", staged: "", unstaged: "M" },
  { path: "src/b.c", staged: "", unstaged: "M" },
  { path: "src/deep/c.ts", staged: "", unstaged: "?" },
  { path: "src/z.rs", staged: "A", unstaged: "" }
]);
if (tree.length !== 2) throw new Error(`root should have 2 nodes, got ${JSON.stringify(tree.map((n) => n.name))}`);
if (tree[0].kind !== "dir" || tree[0].name !== "src") throw new Error("src directory should come first");
if (tree[1].kind !== "file" || tree[1].name !== "a.txt") throw new Error("root file should follow directories");
const src = tree[0];
if (src.kind !== "dir") throw new Error("src must be a dir node");
if (src.children.length !== 3) throw new Error(`src should have 3 children, got ${src.children.length}`);
if (src.children[0].kind !== "dir" || src.children[0].name !== "deep") throw new Error("nested dir should sort first");
if (src.children[1].kind !== "file" || src.children[1].name !== "b.c") throw new Error("b.c should sort before z.rs");
if (src.children[2].kind !== "file" || src.children[2].name !== "z.rs") throw new Error("z.rs last");
if (src.children[2].kind !== "file" || src.children[2].change.staged !== "A") throw new Error("z.rs should keep its staged letter");
console.log("buildChangeTree OK (dirs first, nested dirs, alphabetical, staged letter kept)");

// Stacked inline diff: a replacement is old (red) then new (green); a pure
// add/del is a single row; context carries both line numbers.
const { inlineHunks } = mod;
const stacked = inlineHunks([
  "diff --git a/a.c b/a.c",
  "index 111..222 100644",
  "--- a/a.c",
  "+++ b/a.c",
  "@@ -1,9 +1,9 @@",
  " int main() {",
  "-  return 0;",
  "+  return 1;",
  " }",
  " void f() {}",
  "+// added only",
  " }",
  "-// removed only",
  " }"
].join("\n"));
if (stacked.length !== 1) throw new Error(`expected 1 hunk, got ${stacked.length}`);
if (!stacked[0].rows.some((r) => r.kind === "ctx" && r.text.includes("int main()"))) {
  throw new Error(`context row missing: ${stacked[0].rows.map((r) => `${r.kind}:${r.text}`).join("|")}`);
}
const changeDel = stacked[0].rows.find((r) => r.kind === "del" && r.text.includes("return 0"));
const changeAdd = stacked[0].rows.find((r) => r.kind === "add" && r.text.includes("return 1"));
if (!changeDel || !changeAdd) throw new Error("paired replacement must stack old then new");
const delIdx = stacked[0].rows.indexOf(changeDel);
const addIdx = stacked[0].rows.indexOf(changeAdd);
if (addIdx !== delIdx + 1) throw new Error("new line must sit immediately under the old line");
if (!stacked[0].rows.some((r) => r.kind === "add" && r.text.includes("added only") && r.oldNo == null)) {
  throw new Error("pure addition must be a single add row");
}
if (!stacked[0].rows.some((r) => r.kind === "del" && r.text.includes("removed only") && r.newNo == null)) {
  throw new Error("pure deletion must be a single del row");
}
if (changeDel.hlStart == null || changeAdd.hlStart == null) {
  throw new Error("paired replacement must highlight the intra-line edit");
}
if (stacked[0].blocks.length !== 3) {
  throw new Error(`expected 3 change blocks (replace, add, del), got ${stacked[0].blocks.length}`);
}
const { blockHunk } = mod;
const second = blockHunk(stacked[0].blocks[1]);
if (!second.header.includes("+") || !second.lines.some((l) => l.includes("added only"))) {
  throw new Error("blockHunk must carry only that block's +/- lines");
}
if (second.lines.some((l) => l.includes("return 0") || l.includes("removed only"))) {
  throw new Error("blockHunk must not include sibling change blocks");
}
console.log("inlineHunks OK (stacked old/new, pure add/del, intra-line highlight, per-block revert)");

const hunked = inlineHunks(diff);
if (hunked.length !== 2) throw new Error(`expected 2 hunked rowsets, got ${hunked.length}`);
if (!hunked[0].header.startsWith("@@ -1,3")) throw new Error(`bad first hunk header: ${hunked[0].header}`);
if (!hunked[1].lines.includes("+// note")) throw new Error("second hunk raw lines missing");
const revertHunkText = `${hunked[0].header}\n${hunked[0].lines.join("\n")}`;
if (!revertHunkText.includes("@@ -1,3 +1,4 @@") || !revertHunkText.includes("-  return 0;")) {
  throw new Error("revert hunk text must carry the @@ header and the raw +/- lines");
}
console.log("inlineHunks hunk split OK (raw lines + rows per hunk, revert text reconstructible)");

const eofHunks = inlineHunks([
  "@@ -1,1 +1,1 @@",
  "-last",
  "\\ No newline at end of file",
  "+last",
].join("\n"));
if (eofHunks.length !== 1 || eofHunks[0].blocks.length !== 1) {
  throw new Error("eof newline hunk should be one change block");
}
if (!eofHunks[0].blocks[0].lines.includes("\\ No newline at end of file")) {
  throw new Error("change block must keep the no-newline marker for revert");
}
const eofBlock = blockHunk(eofHunks[0].blocks[0]);
if (!`${eofBlock.header}\n${eofBlock.lines.join("\n")}`.includes("\\ No newline at end of file")) {
  throw new Error("blockHunk must forward the no-newline marker");
}
console.log("inlineHunks OK (no newline at end of file marker kept on the block)");

console.log("calls:", JSON.stringify(calls.map((c) => c[0])));
console.log("GIT SMOKE OK");

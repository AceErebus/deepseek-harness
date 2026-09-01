// Smoke test for the dsh-unified-skin client bundle: load lib/client.js in a
// jsdom + vm sandbox, apply the plugin against a fake slots/theme context, then
// drive the skin manager through the captured slot inject to verify that
// levels 0..30 mount the liang skin and the negative band mounts maid-atelier,
// with full cleanup when switching.
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const STORE_MODULES = fileURLToPath(new URL("../../node_modules/.pnpm", import.meta.url));
const toUrl = (p) => pathToFileURL(p).href;
const react = await import(toUrl(
  `${STORE_MODULES}/react@18.3.1/node_modules/react/index.js`,
)).then((m) => m.default ?? m);
const jsxRuntime = await import(toUrl(
  `${STORE_MODULES}/react@18.3.1/node_modules/react/jsx-runtime.js`,
)).then((m) => m.default ?? m);
const reactDom = await import(toUrl(
  `${STORE_MODULES}/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/index.js`,
)).then((m) => m.default ?? m);

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const { window } = dom;

for (const key of [
  "window", "document", "navigator", "localStorage", "MutationObserver",
  "requestAnimationFrame", "cancelAnimationFrame", "CustomEvent", "performance",
  "Image", "HTMLVideoElement", "HTMLImageElement", "ResizeObserver", "Element",
]) {
  const value = window[key];
  if (value !== undefined) {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
}
globalThis.setTimeout = setTimeout;
globalThis.clearTimeout = clearTimeout;

let captured = null;
const sandbox = {
  window: Object.assign(window, { __ModuleLoader__: { load(entry) { captured = entry; } } }),
  document: window.document,
  navigator: window.navigator,
  localStorage: window.localStorage,
  MutationObserver: window.MutationObserver,
  requestAnimationFrame: window.requestAnimationFrame,
  cancelAnimationFrame: window.cancelAnimationFrame,
  CustomEvent: window.CustomEvent,
  performance: window.performance,
  Image: window.Image,
  HTMLVideoElement: window.HTMLVideoElement,
  HTMLImageElement: window.HTMLImageElement,
  ResizeObserver: window.ResizeObserver,
  Element: window.Element,
  console,
  setTimeout,
  clearTimeout,
  Promise,
  Symbol,
};
vm.createContext(sandbox);
const source = readFileSync(new URL("./lib/client.js", import.meta.url), "utf8");
vm.runInContext(source, sandbox, { filename: "client.js" });
if (!captured) throw new Error("bundle did not register with __ModuleLoader__");
if (captured.id !== "dsh-erebus-skin") throw new Error(`unexpected id ${captured.id}`);

const mod = captured.factory((spec) => {
  if (spec === "react") return react;
  if (spec === "react/jsx-runtime") return jsxRuntime;
  if (spec === "react-dom") return reactDom;
  if (spec === "@deepseek-ai/dsh-client-runtime/client") return {};
  throw new Error(`unexpected require ${spec}`);
});
if (typeof mod.apply !== "function") throw new Error("exports.apply missing");
if (mod.inject.join(",") !== "slots,theme") throw new Error(`unexpected inject ${JSON.stringify(mod.inject)}`);
if (typeof mod.scaleLeftPx !== "function") throw new Error("exports.scaleLeftPx missing");
const box = (left, right) => ({ getBoundingClientRect: () => ({ left, right }) });
if (mod.scaleLeftPx(box(480, 800), box(0, 260)) !== 264) {
  throw new Error(`scale must hug the sidebar seam, got ${mod.scaleLeftPx(box(480, 800), box(0, 260))}`);
}
if (mod.scaleLeftPx(box(480, 800), null) !== 484) {
  throw new Error(`without a sidebar the scale must hug the main pane, got ${mod.scaleLeftPx(box(480, 800), null)}`);
}
if (mod.scaleLeftPx(null, null) !== 4) throw new Error("empty layout must fall back to the viewport inset");
console.log("module shape OK:", JSON.stringify(mod.inject));
console.log("scale anchor OK (sidebar seam, not chat-flow)");

const registrations = [];
let themePreference = "light";
const theme = {
  getTheme: () => ({ preference: themePreference }),
  setTheme: (id) => { themePreference = id; },
};
let capturedSlot = null;
const fakeCtx = {
  effect(fn) { const d = fn(); return typeof d === "function" ? d : () => {}; },
  get(name) { return name === "theme" ? theme : undefined; },
  slots: {
    inject(name, fn) {
      if (name !== "conversation.input.right") throw new Error(`unexpected slot ${name}`);
      fn();
      return () => {};
    },
    register(opts, Component) {
      capturedSlot = { opts, Component };
      registrations.push({ opts, Component });
      return () => {};
    },
  },
};

mod.apply(fakeCtx);

if (!capturedSlot || capturedSlot.opts.name !== "conversation.input.right" || capturedSlot.opts.id !== "erebus-skin-scale") {
  throw new Error(`slot registration wrong: ${JSON.stringify(capturedSlot?.opts)}`);
}
if (typeof capturedSlot.Component !== "function") throw new Error("slider component must be a function");

const injected = capturedSlot.opts.inject("session-1");
const manager = injected.manager;
if (!manager || typeof manager.setLevel !== "function") throw new Error("slot inject must expose the skin manager");

const styleEl = document.querySelector(`style[data-plugin="dsh-erebus-skin"]`);
if (!styleEl) throw new Error("scoped style element missing");
if (!styleEl.textContent.includes(".liang-skin-backdrop")) throw new Error("liang css missing from style");
if (!styleEl.textContent.includes("data-dsh-maid-atelier")) throw new Error("maid css missing from style");
console.log("scoped styles OK (liang + maid css injected)");

// Default level 30 -> liang dark shell
const body = document.body;
if (body.dataset.liangSkin !== "on") throw new Error("default level must mount the liang skin");
if (body.style.getPropertyValue("--liang-ink") === "") throw new Error("liang palette vars missing");
if (themePreference !== "dark") throw new Error("level 30 must switch the native theme to dark");
console.log("liang mount OK (default level 30, dark shell, palette vars)");

// Level -1 -> the maid skin
manager.setLevel(-1);
if (body.dataset.liangSkin !== undefined) throw new Error("liang visuals must unmount at level -1");
if (body.style.getPropertyValue("--liang-ink") !== "") throw new Error("liang palette vars must be removed");
if (!body.hasAttribute("data-dsh-maid-atelier")) throw new Error("maid skin must activate at level -1");
console.log("maid mount OK (level -1, body[data-dsh-maid-atelier])");

// Back into liang light shell
manager.setLevel(0);
if (body.dataset.liangSkin !== "on") throw new Error("liang must remount at level 0");
if (body.hasAttribute("data-dsh-maid-atelier")) throw new Error("maid must unmount when leaving level 0");
if (themePreference !== "light") throw new Error("level 0 must switch the native theme back to light");
console.log("switch-back OK (level 0 -> liang light, maid cleaned up)");

// Out-of-range values clamp to the axis span (0..30)
manager.setLevel(-999);
if (!body.hasAttribute("data-dsh-maid-atelier")) throw new Error("clamped -999 must clamp to -1 (maid)");
manager.setLevel(999);
if (body.dataset.liangSkin !== "on") throw new Error("clamped 999 must stay at 30 (liang)");
console.log("clamping OK (axis span respected)");

// Persistence
if (window.localStorage.getItem("dsh-erebus-skin.level") !== "30") {
  throw new Error(`level must persist to localStorage, got ${window.localStorage.getItem("dsh-erebus-skin.level")}`);
}
console.log("persistence OK (localStorage)");

console.log("EREBUS SKIN CLIENT SMOKE OK");

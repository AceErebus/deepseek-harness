// Client half smoke: load lib/../client.js in a jsdom + vm sandbox, apply the
// plugin against a fake slots/locale/connection context, and verify the
// conversation.view registration + injected styles.
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
for (const key of ["window", "document", "navigator", "localStorage", "MutationObserver", "CustomEvent"]) {
  Object.defineProperty(globalThis, key, { value: window[key], writable: true, configurable: true });
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
  CustomEvent: window.CustomEvent,
  console,
  setTimeout,
  clearTimeout,
  Promise,
  Symbol,
};
vm.createContext(sandbox);
const source = readFileSync(new URL("./client.js", import.meta.url), "utf8");
vm.runInContext(source, sandbox, { filename: "client.js" });
if (!captured || captured.id !== "dsh-game-studio") throw new Error("bundle did not register as dsh-game-studio");

const mod = captured.factory((spec) => {
  if (spec === "react") return react;
  if (spec === "react/jsx-runtime") return jsxRuntime;
  if (spec === "react-dom") return reactDom;
  if (spec === "@deepseek-ai/dsh-client-ui-primitives") return {};
  throw new Error(`unexpected require ${spec}`);
});
if (typeof mod.apply !== "function") throw new Error("exports.apply missing");
if (mod.inject.join(",") !== "slots,locale,connection") throw new Error(`unexpected inject ${JSON.stringify(mod.inject)}`);
console.log("module shape OK:", JSON.stringify(mod.inject));

let registered = null;
const fakeCtx = {
  effect(fn) { const d = fn(); return typeof d === "function" ? d : () => {}; },
  locale: { register() {} },
  connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
  slots: {
    inject(name, fn) {
      if (name !== "conversation.view") throw new Error(`unexpected slot ${name}`);
      fn();
      return () => {};
    },
    register(opts, Component) {
      registered = { opts, Component };
      return () => {};
    },
  },
};
mod.apply(fakeCtx);

if (!registered || registered.opts.name !== "conversation.view" || registered.opts.id !== "game-studio") {
  throw new Error(`slot registration wrong: ${JSON.stringify(registered?.opts)}`);
}
if (typeof registered.Component !== "function") throw new Error("panel component must be a function");
const styleEl = document.querySelector(`style[data-plugin="dsh-game-studio"]`);
if (!styleEl || !styleEl.textContent.includes(".gs-panel")) throw new Error("panel styles missing");
console.log("conversation.view registration OK (id=game-studio) + styles injected");
console.log("GAME STUDIO CLIENT SMOKE OK");

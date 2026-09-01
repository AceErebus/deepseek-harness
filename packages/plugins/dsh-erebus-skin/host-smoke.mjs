// Host half smoke: the /plugins/dsh-erebus-skin/assets/* routes must register
// for every shipped asset file (liang video + poster + portraits).
import { readFileSync, existsSync } from "node:fs";

const mod = await import("./src/index.js");
if (mod.inject.join(",") !== "webServer") throw new Error(`unexpected inject ${JSON.stringify(mod.inject)}`);
if (typeof mod.apply !== "function") throw new Error("exports.apply missing");

let registration = null;
const routes = [];
const disposers = [];
const fakeCtx = {
  effect(fn) {
    const d = fn();
    disposers.push(d);
    return d;
  },
  webServer: {
    register(opts) {
      routes.push(opts);
      return () => {};
    },
  },
};
mod.apply(fakeCtx);

if (registration === null && routes.length === 0) throw new Error("no routes registered");

const expected = [
  "liang-evolution.webm",
  "liang-evolution.mp4",
  "liang-poster.png",
  "portrait-source-v2/stage-00.png",
  "portrait-source-v2/level-01.png",
  "portrait-source-v2/level-03.png",
  "portrait-source-v2/level-04.png",
  "portrait-source-v2/stage-06.png",
  "portrait-source-v2/level-07.png",
  "portrait-source-v2/level-09.png",
  "portrait-source-v2/level-10.png",
  "portrait-source-v2/stage-12.png",
  "portrait-source-v2/level-13.png",
  "portrait-source-v2/level-14.png",
  "portrait-source-v2/bridge-15.png",
  "portrait-source-v2/level-16.png",
  "portrait-source-v2/level-17.png",
  "portrait-source-v2/stage-18.png",
  "portrait-source-v2/level-19.png",
  "portrait-source-v2/level-21.png",
  "portrait-source-v2/level-22.png",
  "portrait-source-v2/stage-24.png",
  "portrait-source-v2/level-25.png",
  "portrait-source-v2/bridge-27.png",
  "portrait-source-v2/level-28.png",
  "portrait-source-v2/level-29.png",
  "portrait-source-v2/stage-30.png",
];

if (routes.length !== expected.length) {
  throw new Error(`expected ${expected.length} routes, got ${routes.length}`);
}
for (const name of expected) {
  const path = `/plugins/dsh-erebus-skin/assets/${name}`;
  const route = routes.find((r) => r.path === path);
  if (!route || route.kind !== "exact" || typeof route.handler !== "function") {
    throw new Error(`route missing for ${path}`);
  }
  const file = new URL(`./assets/liang/${name}`, import.meta.url);
  if (!existsSync(file)) throw new Error(`asset file missing on disk: ${name}`);
}
console.log(`host routes OK (${routes.length} exact asset routes, all files present)`);

// The effect disposer must unregister every route (HMR / disable safety).
let unregistered = 0;
let fiberDispose = null;
const fakeCtx2 = {
  effect(fn) {
    const d = fn();
    fiberDispose = d;
    return d;
  },
  webServer: {
    register() { return () => { unregistered += 1; }; },
  },
};
mod.apply(fakeCtx2);
fiberDispose();
if (unregistered !== expected.length) {
  throw new Error(`expected ${expected.length} unregistrations, got ${unregistered}`);
}
console.log(`disposal OK (${unregistered} unregistrations)`);
console.log("EREBUS SKIN HOST SMOKE OK");

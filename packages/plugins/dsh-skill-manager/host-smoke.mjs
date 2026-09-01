import fs from "node:fs"; import os from "node:os"; import { fileURLToPath } from "node:url";
import path from "node:path";

const tmp = path.join(os.tmpdir(), ".dskm-test-" + Math.random().toString(36).slice(2, 8));
const root = path.dirname(fileURLToPath(import.meta.url));
const userDsh = path.join(tmp, "dsh-skills");
const userAgents = path.join(tmp, "agents-skills");
const proj = path.join(tmp, "proj");
fs.mkdirSync(path.join(userDsh, "alpha"), { recursive: true });
fs.mkdirSync(userAgents, { recursive: true });
fs.mkdirSync(path.join(proj, ".dsh", "skills", "proj-skill"), { recursive: true });
fs.writeFileSync(path.join(userDsh, "alpha", "SKILL.md"), "---\nname: alpha\ndescription: alpha skill\nwhenToUse: when testing\n---\n\n# Alpha\nbody here\n", "utf8");
fs.writeFileSync(path.join(userAgents, "beta.md"), "---\nname: beta\ndescription: beta skill\ndisable-model-invocation: true\n---\n\nBeta body\n", "utf8");
fs.writeFileSync(path.join(proj, ".dsh", "skills", "proj-skill", "SKILL.md"), "---\nname: proj-skill\ndescription: project skill\n---\n\nProj body\n", "utf8");

const catalog = {
  alpha: { name: "alpha", description: "alpha skill", whenToUse: "when testing", invocation: { modelInvocable: true, userInvocable: true }, content: "# Alpha\nbody here", source: "user-dsh", provider: "filesystem", path: path.join(userDsh, "alpha", "SKILL.md") },
  beta: { name: "beta", description: "beta skill", invocation: { modelInvocable: false, userInvocable: true }, content: "Beta body", source: "user-agents", provider: "filesystem", path: path.join(userAgents, "beta.md") },
  "proj-skill": { name: "proj-skill", description: "project skill", invocation: { modelInvocable: true, userInvocable: true }, content: "Proj body", source: "project-dsh", provider: "filesystem", path: path.join(proj, ".dsh", "skills", "proj-skill", "SKILL.md") },
  bundled: { name: "bundled", description: "bundled skill", invocation: { modelInvocable: true, userInvocable: true }, content: "Bundled body", source: "bundled", provider: "filesystem" }
};
const summaries = Object.values(catalog).map(function (s) { return { name: s.name, description: s.description, whenToUse: s.whenToUse, invocation: s.invocation, source: s.source, provider: s.provider }; });

let libSrc = fs.readFileSync(path.join(root, "lib", "index.js"), "utf8");
libSrc = libSrc.replace('const USER_DSH_DIR = join(homedir(), ".dsh", "skills");', 'const USER_DSH_DIR = ' + JSON.stringify(userDsh) + ';');
libSrc = libSrc.replace('const USER_AGENTS_DIR = join(homedir(), ".agents", "skills");', 'const USER_AGENTS_DIR = ' + JSON.stringify(userAgents) + ';');
const testLibPath = path.join(tmp, "lib-test.mjs");
fs.writeFileSync(testLibPath, libSrc, "utf8");

const mod = await import("file://" + testLibPath.replace(/\\/g, "/"));

let handler = null;
const ctx = {
  connection: {
    rpc: {
      handle: function (channel, fn) {
        handler = { channel: channel, fn: fn };
        return function () { handler = null; };
      }
    }
  },
  skills: {
    snapshot: async function () { return { skills: summaries, complete: true }; },
    get: async function (name) { return catalog[name] || undefined; }
  },
  apiProxy: {
    sessions: {
      list: async function () {
        return { rpcId: "test", result: { ok: true, value: { items: [ { sessionId: "s1", cwd: proj, updatedAt: 2 }, { sessionId: "s2", cwd: proj, updatedAt: 1 } ] } } };
      }
    }
  }
};
const dispose = mod.apply(ctx);
if (!handler) throw new Error("channel not registered");
console.log("channel:", handler.channel);
const call = function (endpoint, payload) { return handler.fn(endpoint, payload || {}); };

let pass = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { pass++; console.log("  PASS", label); }
  else { fail++; console.log("  FAIL", label, extra !== undefined ? JSON.stringify(extra) : ""); }
}


(async function run() {
  let r = await call("roots", {});
  check("roots ok", r.ok === true);
  check("roots include project + user roots", r.value.roots.length === 4 && r.value.roots[0].source === "project-dsh");
  check("roots cwd = project", r.value.cwd === proj);

  r = await call("list", {});
  check("list ok", r.ok === true);
  check("list 4 skills", r.value.skills.length === 4, r.value.skills.map(function (s) { return s.name; }));
  const alpha = r.value.skills.find(function (s) { return s.name === "alpha"; });
  check("alpha located + writable", alpha.writable === true && alpha.path === path.join(userDsh, "alpha", "SKILL.md"));
  const bundled = r.value.skills.find(function (s) { return s.name === "bundled"; });
  check("bundled read-only no path", bundled.writable === false && bundled.path === undefined);
  const beta = r.value.skills.find(function (s) { return s.name === "beta"; });
  check("beta file-layout located", beta.path === path.join(userAgents, "beta.md"));
  check("beta modelInvocable false", beta.invocation.modelInvocable === false);

  r = await call("get", { name: "alpha" });
  check("get ok", r.ok === true && r.value.content === "# Alpha\nbody here" && r.value.whenToUse === "when testing");
  r = await call("get", { name: "nope" });
  check("get missing fails", r.ok === false && r.error.code === "internal");

  r = await call("create", { name: "gamma", description: "gamma skill", whenToUse: "when needed", content: "# Gamma\ninstructions" });
  check("create ok", r.ok === true, r);
  check("create default root = user-dsh", r.value.path === path.join(userDsh, "gamma", "SKILL.md"));
  const gammaFile = fs.readFileSync(path.join(userDsh, "gamma", "SKILL.md"), "utf8");
  check("created file frontmatter", gammaFile.startsWith('---\nname: "gamma"\ndescription: "gamma skill"\nwhenToUse: "when needed"\n'));
  check("created file body", gammaFile.indexOf("# Gamma\ninstructions") !== -1);

  r = await call("create", { name: "alpha", description: "x", content: "y" });
  check("create duplicate fails", r.ok === false && r.error.code === "internal");
  r = await call("create", { name: "Bad Name", description: "x", content: "y" });
  check("create invalid name fails", r.ok === false && r.error.code === "internal");
  r = await call("create", { name: "delta", description: "delta skill", content: "Delta body", root: userAgents });
  check("create explicit root", r.ok === true && r.value.path === path.join(userAgents, "delta", "SKILL.md"));

  fs.writeFileSync(path.join(userDsh, "alpha", "SKILL.md"), "---\nname: alpha\ndescription: alpha skill\nwhenToUse: when testing\nmetadata:\n  icon: star\n---\n\n# Alpha\nbody here\n", "utf8");
  r = await call("update", { name: "alpha", description: "alpha v2", content: "# Alpha\nnew body", modelInvocable: false, userInvocable: false });
  check("update ok", r.ok === true, r);
  const alphaAfter = fs.readFileSync(path.join(userDsh, "alpha", "SKILL.md"), "utf8");
  check("update rewrote fields", alphaAfter.indexOf('description: "alpha v2"') !== -1 && alphaAfter.indexOf("disable-model-invocation: true") !== -1 && alphaAfter.indexOf("user-invocable: false") !== -1);
  check("update kept whenToUse", alphaAfter.indexOf('whenToUse: "when testing"') !== -1);
  check("update kept metadata", alphaAfter.indexOf("metadata:") !== -1 && alphaAfter.indexOf("  icon: star") !== -1);
  check("update new body", alphaAfter.indexOf("# Alpha\nnew body") !== -1);

  r = await call("update", { name: "bundled", description: "x" });
  check("update bundled fails read-only", r.ok === false && r.error.code === "internal");

  r = await call("remove", { name: "gamma" });
  check("remove ok", r.ok === true);
  check("remove deleted file", !fs.existsSync(path.join(userDsh, "gamma", "SKILL.md")));
  check("remove deleted dir", !fs.existsSync(path.join(userDsh, "gamma")));
  r = await call("remove", { name: "gamma" });
  check("remove again fails", r.ok === false && r.error.code === "internal");
  r = await call("remove", { name: "beta" });
  check("remove file-layout ok", r.ok === true && !fs.existsSync(path.join(userAgents, "beta.md")));

  r = await call("wat", {});
  check("unknown endpoint fails", r.ok === false && r.error.code === "internal");

  dispose();
  check("dispose unregisters", handler === null);

  console.log(pass + " passed, " + fail + " failed");
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(fail > 0 ? 1 : 0);
})();

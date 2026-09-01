// dsh-skill-manager host half: the SKILL management backend.
//
// The loader applies this module as a plain `{ apply, inject }` cordis
// plugin. It mounts one loopback-fenced RPC channel, `/skill-manage`, that
// serves the browser half (the "SKILL 管理" settings section):
//
//   POST /skill-manage/list    {}                         -> { ok, value: { cwd, complete, roots, skills } }
//   POST /skill-manage/get     { name }                   -> { ok, value: { name, description, whenToUse?, invocation, content, source, provider, resourceBase?, path?, writable } }
//   POST /skill-manage/create  { name, description, whenToUse?, content, modelInvocable?, userInvocable?, root? } -> { ok, value: record }
//   POST /skill-manage/update  { name, description?, whenToUse?, content?, modelInvocable?, userInvocable? }      -> { ok, value: record }
//   POST /skill-manage/remove  { name }                   -> { ok, value: { name, path } }
//   POST /skill-manage/roots   {}                         -> { ok, value: { cwd, roots } }
//
// The catalog is read LIVE from the `skills` service (the SkillRegistry):
// every call re-runs `snapshot()`, which consults the filesystem provider's
// watchers. Skills dropped into any scanned root are therefore picked up
// automatically — the management UI needs no static list to maintain.
//
// File layout mirrors `@deepseek-ai/dsh-skill-filesystem`: a skill is
// `<root>/<name>.md` or `<root>/<name>/SKILL.md` with YAML frontmatter
// (name/description/whenToUse/disable-model-invocation/user-invocable) and a
// markdown instruction body. Root precedence (lower rank wins) is
// project-dsh(100) < project-agents(200) < custom(300) < ~/.dsh/skills(400)
// < ~/.agents/skills(500) < bundled(600); `locate()` mirrors that order.
// "Custom" roots are configured inside dsh-skill-filesystem and are not
// re-discovered here; skills living there show read-only (content still
// viewable through the registry).
import { randomUUID } from "node:crypto";
import { access, copyFile, mkdir, readFile, readdir, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

/** Atomic text write: tmp file in the same dir + rename (crash-safe). */
async function atomicWrite(filePath, content) {
  const dir = dirname(filePath);
  const tmp = join(dir, "." + basename(filePath) + "." + Date.now() + ".tmp");
  await writeFile(tmp, content, "utf8");
  await rename(tmp, filePath);
}

/** Per-skill-name write lock: serializes concurrent update/create/remove. */
const writeLocks = new Map();
function withSkillLock(name, fn) {
  const prev = writeLocks.get(name) || Promise.resolve();
  const next = prev.then(fn, fn);
  writeLocks.set(name, next.catch(function () {}));
  return next;
}

/** Services required before this plugin applies. */
const inject = ["connection", "skills", "apiProxy"];

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_CONTENT_BYTES = 512 * 1024;
const MAX_DESCRIPTION = 2000;
const MAX_WHEN_TO_USE = 4000;

// Rank order mirrors dsh-skill-filesystem's root table.
const USER_DSH_DIR = join(homedir(), ".dsh", "skills");
const USER_AGENTS_DIR = join(homedir(), ".agents", "skills");
const ROOT_RANK = {
  "project-dsh": 100,
  "project-agents": 200,
  "user-dsh": 400,
  "user-agents": 500
};

function ok(value) {
  return { ok: true, value };
}
function fail(code, message) {
  // DSH 的 rpcErrorSchema 只认标准枚举：自定义码会让浏览器端 serverResponseSchema.parse
  // 抛 ZodError。统一用 "internal" + 消息前缀（客户端按 message 显示，原码可辨识）。
  return { ok: false, error: { code: "internal", message: "[" + code + "] " + message, details: {} } };
}
/** In-process apiProxy RPC envelope (host-side client calls). */
function rpcEnvelope(payload) {
  return { rpcId: randomUUID(), payload };
}

/**
 * Best-effort workspace cwd: the most recently updated session with one.
 * The in-process apiProxy client expects the full RPC envelope
 * ({ rpcId, payload }) and resolves to { rpcId, result: { ok, value } } —
 * NOT the browser's { ok, value } shape.
 */
async function currentCwd(ctx) {
  try {
    const response = await ctx.apiProxy.sessions.list(rpcEnvelope({}));
    const result = response?.result;
    if (result?.ok !== true || !Array.isArray(result.value?.items)) return void 0;
    const items = result.value.items.filter((item) => typeof item.cwd === "string" && item.cwd.length > 0);
    if (items.length === 0) return void 0;
    items.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return items[0].cwd;
  } catch {
    return void 0;
  }
}

/** Mirror of dsh-skill-filesystem's findProjectRoot (git-marker walk). */
async function findProjectRoot(cwd) {
  let current = resolve(cwd);
  for (;;) {
    try {
      await access(join(current, ".git"));
      return current;
    } catch {
      // keep walking up
    }
    const parent = join(current, "..");
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}

/** Candidate scan roots in rank order; missing dirs are reported, not created. */
async function rootsFor(cwd) {
  const roots = [];
  if (typeof cwd === "string" && cwd.length > 0) {
    const projectRoot = await findProjectRoot(cwd);
    roots.push({
      path: join(projectRoot, ".dsh", "skills"),
      source: "project-dsh",
      rank: ROOT_RANK["project-dsh"],
      kind: "project",
      writable: true
    }, {
      path: join(projectRoot, ".agents", "skills"),
      source: "project-agents",
      rank: ROOT_RANK["project-agents"],
      kind: "project",
      writable: true
    });
  }
  roots.push({
    path: USER_DSH_DIR,
    source: "user-dsh",
    rank: ROOT_RANK["user-dsh"],
    kind: "user",
    writable: true
  }, {
    path: USER_AGENTS_DIR,
    source: "user-agents",
    rank: ROOT_RANK["user-agents"],
    kind: "user",
    writable: true
  });
  const resolved = await Promise.all(roots.map(async (root) => {
    let exists = false;
    try {
      const info = await stat(root.path);
      exists = info.isDirectory();
    } catch {
      exists = false;
    }
    return { ...root, exists };
  }));
  return resolved;
}

/** Locate a skill file under the scanned roots, rank order (first wins). */
async function locateSkill(name, roots) {
  for (const root of roots) {
    const forms = [
      { path: join(root.path, name + ".md"), layout: "file" },
      { path: join(root.path, name, "SKILL.md"), layout: "dir" }
    ];
    for (const form of forms) {
      try {
        const info = await stat(form.path);
        if (info.isFile()) return { path: form.path, root, layout: form.layout };
      } catch {
        // keep looking
      }
    }
  }
  return null;
}

/**
 * Scan the filesystem skill roots directly (mirrors the dsh-skill-filesystem
 * root table). The web composition disables the host-plane skill-filesystem
 * row (per-session presets own discovery), so the registry's global layer is
 * usually empty — management must read the directories themselves.
 * Rank order wins: project-dsh(100) < project-agents(200) < user-dsh(400)
 * < user-agents(500); bundled/custom providers are not scanned here and only
 * surface through the registry (read-only).
 */
async function scanSkills(cwd) {
  const roots = await rootsFor(cwd);
  const byName = /* @__PURE__ */ new Map();
  for (const root of roots) {
    let entries;
    try {
      entries = await readdir(root.path, { withFileTypes: true, encoding: "utf8" });
    } catch {
      continue; // missing/unreadable root
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      let target = null;
      let layout = "file";
      if (entry.isFile() && entry.name.endsWith(".md")) {
        target = join(root.path, entry.name);
        layout = "file";
      } else if (entry.isDirectory()) {
        const nested = join(root.path, entry.name, "SKILL.md");
        try {
          const info = await stat(nested);
          if (info.isFile()) {
            target = nested;
            layout = "dir";
          }
        } catch {
          // no SKILL.md inside
        }
      }
      if (target === null) continue;
      let raw;
      try {
        raw = await readFile(target, "utf8");
      } catch {
        continue;
      }
      const parsed = parseFrontmatter(raw);
      if (parsed === null) continue;
      const name = typeof parsed.data.name === "string" ? parsed.data.name : "";
      const description = typeof parsed.data.description === "string" ? parsed.data.description : "";
      if (!SKILL_NAME.test(name) || description.length === 0) continue;
      const expectedName = layout === "dir" ? entry.name : entry.name.replace(/\.md$/, "");
      if (name !== expectedName) continue; // frontmatter name must match the file/dir name
      const record = {
        name,
        description,
        ...(typeof parsed.data.whenToUse === "string" && parsed.data.whenToUse.length > 0 ? { whenToUse: parsed.data.whenToUse } : {}),
        invocation: {
          modelInvocable: parsed.data["disable-model-invocation"] !== true,
          userInvocable: parsed.data["user-invocable"] !== false
        },
        content: parsed.body,
        source: root.source,
        root,
        path: target,
        layout
      };
      const existing = byName.get(name);
      if (existing === void 0 || existing.root.rank > root.rank) byName.set(name, record);
    }
  }
  return [...byName.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Path containment check (absolute target inside an allowed root). */
function withinRoot(rootPath, target) {
  const rel = relative(rootPath, target);
  if (rel === "") return true;
  if (rel.startsWith("..") || isAbsolute(rel)) return false;
  return true;
}

// ---------- minimal YAML frontmatter handling (zero dependencies) ----------
// The skills frontmatter grammar is small (scalars + an optional metadata
// object); this parser/serializer round-trips it without pulling in a YAML
// dependency, mirroring what dsh-skill-filesystem accepts.

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith("\"")) {
    // double-quoted with escapes
    let out = "";
    let i = 1;
    while (i < value.length) {
      const ch = value[i];
      if (ch === "\\" && i + 1 < value.length) {
        const next = value[i + 1];
        if (next === "n") out += "\n";
        else if (next === "r") out += "\r";
        else if (next === "t") out += "\t";
        else out += next;
        i += 2;
        continue;
      }
      if (ch === "\"") break;
      out += ch;
      i += 1;
    }
    return out;
  }
  if (value.startsWith("'")) {
    const end = value.indexOf("'", 1);
    return end === -1 ? value.slice(1) : value.slice(1, end);
  }
  // bare scalar: strip a trailing YAML comment
  const hash = value.indexOf(" #");
  return hash === -1 ? value : value.slice(0, hash).trim();
}

function serializeScalar(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const text = String(value);
  // Always quote strings: avoids YAML comment/colon/multiline pitfalls and
  // round-trips every description safely.
  return "\"" + text.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"").replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "\"";
}

/**
 * Parse frontmatter of a skill file.
 * @returns { data, keyOrder, metadataLines, body } or null when malformed.
 */
function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== "---") return null;
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  const data = {};
  const keyOrder = [];
  let metadataLines = null;
  let inMetadata = false;
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (inMetadata) {
      if (indent > 0) {
        metadataLines.push(line);
        continue;
      }
      inMetadata = false;
    }
    const trimmed = line.trim();
    if (trimmed === "metadata:") {
      inMetadata = true;
      metadataLines = [];
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    if (key === "") continue;
    data[key] = parseScalar(trimmed.slice(colon + 1));
    keyOrder.push(key);
  }
  return {
    data,
    keyOrder,
    metadataLines,
    body: lines.slice(end + 1).join("\n").replace(/^\s*\r?\n/, "").trimEnd()
  };
}

/** Serialize frontmatter lines in the original key order, updating managed keys. */
function serializeFrontmatter(parsed, fields) {
  const managed = new Set(["name", "description", "whenToUse", "disable-model-invocation", "user-invocable"]);
  const out = [];
  const emitted = new Set();
  const push = (key, value) => {
    if (value === void 0 || value === null) return;
    if (typeof value === "string" && value === "") return;
    out.push(key + ": " + serializeScalar(value));
    emitted.add(key);
  };
  // Existing keys keep their position; managed keys take the new values.
  for (const key of parsed.keyOrder) {
    if (key === "metadata") continue;
    if (managed.has(key)) {
      if (key === "name") push("name", fields.name);
      else if (key === "description") push("description", fields.description);
      else if (key === "whenToUse") push("whenToUse", fields.whenToUse);
      else if (key === "disable-model-invocation") push("disable-model-invocation", fields.modelInvocable === void 0 ? parsed.data[key] : !fields.modelInvocable);
      else if (key === "user-invocable") push("user-invocable", fields.userInvocable === void 0 ? parsed.data[key] : fields.userInvocable);
    } else {
      push(key, parsed.data[key]);
    }
  }
  // Newly supplied managed keys that were absent before.
  if (!emitted.has("name")) push("name", fields.name);
  if (!emitted.has("description")) push("description", fields.description);
  if (fields.whenToUse !== void 0 && !emitted.has("whenToUse")) push("whenToUse", fields.whenToUse);
  if (fields.modelInvocable !== void 0 && !emitted.has("disable-model-invocation")) push("disable-model-invocation", !fields.modelInvocable);
  if (fields.userInvocable !== void 0 && !emitted.has("user-invocable")) push("user-invocable", fields.userInvocable);
  if (parsed.metadataLines !== null) {
    out.push("metadata:");
    out.push(...parsed.metadataLines);
  }
  return out;
}

/** Build a full skill markdown file (frontmatter + blank line + body). */
function buildSkillFile(frontmatterLines, content) {
  return "---\n" + frontmatterLines.join("\n") + "\n---\n\n" + (content || "").trimEnd() + "\n";
}

/** Resolve the invocation view a summary/definition carries. */
function invocationOf(skill) {
  const policy = skill.invocation ?? { modelInvocable: true, userInvocable: true };
  return {
    modelInvocable: policy.modelInvocable !== false,
    userInvocable: policy.userInvocable !== false
  };
}

/** The definition's source root record, when it lives under a scanned root. */
function rootOf(path, roots) {
  if (typeof path !== "string") return null;
  for (const root of roots) {
    if (withinRoot(root.path, path)) return root;
  }
  return null;
}

/**
 * Plugin body: mount the loopback-fenced /skill-manage channel.
 * The channel handler runs for the plugin's whole lifetime; the returned
 * disposer unregisters it.
 */
function apply(ctx) {
  const channel = ctx.connection.rpc.handle("/skill-manage", async (endpoint, payload) => {
    try {
      if (endpoint === "roots" || endpoint === "list" || endpoint === "get" || endpoint === "create" || endpoint === "update" || endpoint === "remove") {
        // Shared prelude: workspace cwd + scanned roots.
        const cwd = await currentCwd(ctx);
        const roots = await rootsFor(cwd);

        if (endpoint === "roots") {
          return ok({ cwd, roots });
        }

        const snapshot = await ctx.skills.snapshot({ cwd });

        if (endpoint === "list") {
          // Filesystem scan is authoritative for the management view; the
          // registry's global layer is only a read-only supplement (bundled /
          // custom providers that have no file under the scanned roots).
          const scanned = await scanSkills(cwd);
          const rows = scanned.map((record) => ({
            name: record.name,
            description: record.description,
            ...(record.whenToUse !== void 0 ? { whenToUse: record.whenToUse } : {}),
            invocation: record.invocation,
            source: record.source,
            provider: "filesystem",
            path: record.path,
            writable: true
          }));
          const seen = new Set(rows.map((row) => row.name));
          for (const summary of snapshot.skills) {
            if (seen.has(summary.name)) continue;
            rows.push({
              name: summary.name,
              description: summary.description,
              ...(summary.whenToUse !== void 0 ? { whenToUse: summary.whenToUse } : {}),
              invocation: invocationOf(summary),
              source: summary.source,
              provider: summary.provider,
              ...(summary.resourceBase !== void 0 ? { resourceBase: summary.resourceBase } : {}),
              writable: false
            });
          }
          rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
          return ok({ cwd, complete: snapshot.complete, roots, skills: rows });
        }

        const name = typeof payload?.name === "string" ? payload.name : "";

        if (endpoint === "get") {
          if (!SKILL_NAME.test(name)) return fail("invalid-name", "技能名必须是小写字母/数字/连字符（kebab-case）");
          const scanned = await scanSkills(cwd);
          const record = scanned.find((candidate) => candidate.name === name);
          if (record !== void 0) {
            return ok({
              name: record.name,
              description: record.description,
              ...(record.whenToUse !== void 0 ? { whenToUse: record.whenToUse } : {}),
              invocation: record.invocation,
              content: record.content,
              source: record.source,
              provider: "filesystem",
              path: record.path,
              writable: true
            });
          }
          const definition = await ctx.skills.get(name, { cwd });
          if (definition === void 0) return fail("not-found", `未找到技能 "${name}"`);
          return ok({
            name: definition.name,
            description: definition.description,
            ...(definition.whenToUse !== void 0 ? { whenToUse: definition.whenToUse } : {}),
            invocation: invocationOf(definition),
            content: definition.content,
            source: definition.source,
            provider: definition.provider,
            ...(definition.resourceBase !== void 0 ? { resourceBase: definition.resourceBase } : {}),
            writable: false
          });
        }

        if (endpoint === "create") {
          if (!SKILL_NAME.test(name)) return fail("invalid-name", "技能名必须是小写字母/数字/连字符（kebab-case），例如 health-assistant");
          const description = typeof payload?.description === "string" ? payload.description.trim() : "";
          if (description.length === 0) return fail("invalid-description", "技能描述不能为空");
          if (description.length > MAX_DESCRIPTION) return fail("invalid-description", `技能描述过长（${MAX_DESCRIPTION} 字符上限）`);
          const whenToUse = typeof payload?.whenToUse === "string" ? payload.whenToUse.trim() : "";
          if (whenToUse.length > MAX_WHEN_TO_USE) return fail("invalid-when-to-use", `使用场景过长（${MAX_WHEN_TO_USE} 字符上限）`);
          const content = typeof payload?.content === "string" ? payload.content : "";
          if (content.trim().length === 0) return fail("invalid-content", "技能指令正文不能为空");
          if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) return fail("invalid-content", "技能指令正文过大（512 KiB 上限）");
          const modelInvocable = typeof payload?.modelInvocable === "boolean" ? payload.modelInvocable : true;
          const userInvocable = typeof payload?.userInvocable === "boolean" ? payload.userInvocable : true;

          const existing = await locateSkill(name, roots);
          if (existing !== null) return fail("exists", `技能 "${name}" 已存在（${existing.path}），请直接编辑它`);

          // Choose the write root: explicit request (must be a known writable
          // root) or the highest-precedence user root that exists (default:
          // ~/.dsh/skills, which outranks ~/.agents/skills).
          let targetRoot = null;
          if (typeof payload?.root === "string" && payload.root.length > 0) {
            const requested = roots.find((root) => root.writable && resolve(root.path) === resolve(payload.root));
            if (requested === void 0) return fail("invalid-root", "指定的存放目录不是可写的技能根目录");
            targetRoot = requested;
          } else {
            // Prefer user roots by rank (~/.dsh/skills outranks ~/.agents/skills;
            // missing dirs are created on write). Fall back to an existing
            // writable project root.
            const userRoots = roots.filter((root) => root.kind === "user").sort((a, b) => a.rank - b.rank);
            const projectRoots = roots.filter((root) => root.kind === "project" && root.writable && root.exists).sort((a, b) => a.rank - b.rank);
            targetRoot = userRoots[0] ?? projectRoots[0];
            if (targetRoot === void 0) return fail("no-root", "没有可写的技能目录（请先创建 ~/.dsh/skills 或 ~/.agents/skills）");
          }

          const target = join(targetRoot.path, name, "SKILL.md");
          if (!withinRoot(targetRoot.path, target)) return fail("invalid-root", "目标路径越界");
          const frontmatter = serializeFrontmatter({
            keyOrder: [],
            metadataLines: null
          }, {
            name,
            description,
            ...(whenToUse.length > 0 ? { whenToUse } : {}),
            modelInvocable,
            userInvocable
          });
          await mkdir(join(targetRoot.path, name), { recursive: true });
          await atomicWrite(target, buildSkillFile(frontmatter, content));
          return ok({
            name,
            description,
            ...(whenToUse.length > 0 ? { whenToUse } : {}),
            invocation: { modelInvocable, userInvocable },
            content,
            source: targetRoot.source,
            provider: "filesystem",
            path: target,
            writable: true
          });
        }

        if (endpoint === "update") {
          if (!SKILL_NAME.test(name)) return fail("invalid-name", "技能名必须是小写字母/数字/连字符（kebab-case）");
          const located = await locateSkill(name, roots);
          if (located === null) {
            const registered = await ctx.skills.get(name, { cwd });
            if (registered !== void 0) return fail("read-only", `技能 "${name}" 来自内置/捆绑或外部目录，仅可查看`);
            return fail("not-found", `未找到技能 "${name}" 的可编辑文件`);
          }
          const root = rootOf(located.path, roots);
          if (root === null || root.writable !== true) return fail("read-only", `技能 "${name}" 只读，无法编辑`);

          const raw = await readFile(located.path, "utf8");
          const parsed = parseFrontmatter(raw);
          if (parsed === null) return fail("malformed", `技能文件 ${located.path} 缺少合法的 YAML frontmatter，已拒绝改写`);

          const description = typeof payload?.description === "string" ? payload.description.trim() : parsed.data.description;
          if (typeof description !== "string" || description.length === 0) return fail("invalid-description", "技能描述不能为空");
          if (description.length > MAX_DESCRIPTION) return fail("invalid-description", `技能描述过长（${MAX_DESCRIPTION} 字符上限）`);
          const whenToUseRaw = typeof payload?.whenToUse === "string" ? payload.whenToUse.trim() : (parsed.data.whenToUse ?? "");
          if (whenToUseRaw.length > MAX_WHEN_TO_USE) return fail("invalid-when-to-use", `使用场景过长（${MAX_WHEN_TO_USE} 字符上限）`);
          const contentRaw = typeof payload?.content === "string" ? payload.content : parsed.body;
          if (contentRaw.trim().length === 0) return fail("invalid-content", "技能指令正文不能为空");
          if (Buffer.byteLength(contentRaw, "utf8") > MAX_CONTENT_BYTES) return fail("invalid-content", "技能指令正文过大（512 KiB 上限）");
          const modelInvocable = typeof payload?.modelInvocable === "boolean" ? payload.modelInvocable : (parsed.data["disable-model-invocation"] !== true);
          const userInvocable = typeof payload?.userInvocable === "boolean" ? payload.userInvocable : (parsed.data["user-invocable"] !== false);

          const frontmatter = serializeFrontmatter(parsed, {
            name,
            description,
            ...(whenToUseRaw.length > 0 ? { whenToUse: whenToUseRaw } : { whenToUse: "" }),
            modelInvocable,
            userInvocable
          });
          await withSkillLock(name, async function () {
            const content = buildSkillFile(frontmatter, contentRaw);
            try {
              await copyFile(located.path, located.path + ".bak");
            } catch { /* first write or read-only — ignore */ }
            await atomicWrite(located.path, content);
          });
          return ok({
            name,
            description,
            ...(whenToUseRaw.length > 0 ? { whenToUse: whenToUseRaw } : {}),
            invocation: { modelInvocable, userInvocable },
            content: contentRaw,
            source: root.source,
            provider: "filesystem",
            path: located.path,
            writable: true
          });
        }

        if (endpoint === "remove") {
          if (!SKILL_NAME.test(name)) return fail("invalid-name", "技能名必须是小写字母/数字/连字符（kebab-case）");
          const located = await locateSkill(name, roots);
          if (located === null) {
            const registered = await ctx.skills.get(name, { cwd });
            if (registered !== void 0) return fail("read-only", `技能 "${name}" 来自内置/捆绑或外部目录，仅可删除`);
            return fail("not-found", `未找到技能 "${name}" 的可编辑文件`);
          }
          const root = rootOf(located.path, roots);
          if (root === null || root.writable !== true) return fail("read-only", `技能 "${name}" 只读，无法删除`);
          await rm(located.path, { force: true });
          if (located.layout === "dir") {
            try {
              await rmdir(dirname(located.path));
            } catch {
              // directory not empty — leave it
            }
          }
          return ok({ name, path: located.path });
        }

        return fail("unknown-endpoint", String(endpoint));
      }
      return fail("unknown-endpoint", String(endpoint));
    } catch (error) {
      return fail("internal", String(error?.message ?? error));
    }
  }, { authority: "loopback" });

  return () => {
    channel();
  };
}

export { apply, inject };

// Host half test: capture the /dsh-erebus-git handler through a fake
// connection service, then exercise every endpoint against a REAL temporary
// git repository: discovery, status, stage/unstage, commit, diff, file
// rollback, hunk rollback, and merge-conflict resolution.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mod = await import("./lib/index.js");
if (typeof mod.apply !== "function" || mod.inject.join(",") !== "connection") {
  throw new Error(`unexpected host module shape ${JSON.stringify(mod.inject)}`);
}

let registration = null;
const fakeCtx = {
  effect(fn) { const d = fn(); return typeof d === "function" ? d : () => {}; },
  connection: {
    rpc: {
      handle(channel, handler, options) {
        registration = { channel, handler, options };
        return () => {};
      }
    }
  }
};
mod.apply(fakeCtx);
if (!registration || registration.channel !== "/dsh-erebus-git" || registration.options.authority !== "loopback") {
  throw new Error("channel registration missing or not loopback-fenced");
}
console.log("channel registration OK:", registration.channel, JSON.stringify(registration.options));

const handle = registration.handler;
/** Run an endpoint and assert ok. */
async function ok(endpoint, payload) {
  const r = await handle(endpoint, payload);
  if (!r || !r.ok) throw new Error(`${endpoint} failed: ${JSON.stringify(r)}`);
  return r.value;
}
/** Run an endpoint and assert a failure (the wire envelope must carry `details`, or the client's parse throws). */
async function bad(endpoint, payload) {
  const r = await handle(endpoint, payload);
  if (!r || r.ok) throw new Error(`${endpoint} should have failed: ${JSON.stringify(r)}`);
  if (!r.error || typeof r.error.message !== "string" || r.error.details === undefined) {
    throw new Error(`${endpoint} failure envelope must carry details: ${JSON.stringify(r)}`);
  }
  return r.error;
}

// ---- build a real temp repository ----
const root = mkdtempSync(join(tmpdir(), "dsh-erebus-git-smoke-"));
const repo = join(root, "proj");
mkdirSync(repo);
const git = (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
try {
  git(["init"]);
  git(["config", "user.name", "smoke"]);
  git(["config", "user.email", "smoke@test"]);
  writeFileSync(join(repo, "a.txt"), "line1\nline2\nline3\n");
  writeFileSync(join(repo, "b.txt"), "beeline\n");
  // The nested repo created below must never surface as untracked rows:
  // newer git collapses an embedded repo into one `sub/` ls-files entry, so
  // ignore it from the start (discovery still finds it via direct FS scan).
  writeFileSync(join(repo, ".gitignore"), "sub/\n");
  git(["add", "-A"]);
  git(["commit", "-m", "initial"]);
  console.log("fixture repo ready:", repo);

  // ---- status: clean after the initial commit (checked BEFORE the nested
  // repo exists: newer git collapses an embedded repo into one untracked
  // `sub/` row, which would make this assertion environment-dependent) ----
  let st = await ok("status", { repo });
  if (st.changes.length !== 0 || st.branch !== "master") {
    throw new Error(`clean status wrong: ${JSON.stringify(st)}`);
  }
  console.log("status OK (clean, branch=" + st.branch + ")");

  // ---- discovery: nested repo + root repo ----
  const nested = join(repo, "sub");
  mkdirSync(nested);
  git(["init", nested]);
  const repoList = (await ok("repos", { root })).repos;
  const paths = repoList.map((r) => r.path).sort();
  if (!paths.includes(repo) || !paths.includes(nested)) {
    throw new Error(`repos discovery missing entries: ${JSON.stringify(paths)}`);
  }
  console.log("repos OK (root + nested):", paths.join(" | "));

  // ---- modify + untracked ----
  writeFileSync(join(repo, "a.txt"), "line1\nline2 CHANGED\nline3\n");
  writeFileSync(join(repo, "new.txt"), "fresh\n");
  st = await ok("status", { repo });
  const byPath = Object.fromEntries(st.changes.map((c) => [c.path, c]));
  if (!byPath["a.txt"] || byPath["a.txt"].unstaged !== "M") throw new Error("a.txt should be unstaged-modified");
  if (!byPath["new.txt"] || byPath["new.txt"].unstaged !== "?") throw new Error("new.txt should be untracked");
  console.log("status OK (M a.txt + ?? new.txt)");

  // ---- wholly-untracked DIRECTORY: porcelain collapses it to one `?? dir/`
  // line; the endpoint must list the files inside individually instead ----
  mkdirSync(join(repo, "untracked-dir"));
  writeFileSync(join(repo, "untracked-dir", "inner.txt"), "hi\n");
  writeFileSync(join(repo, "untracked-dir", "深.txt"), "中文\n");
  st = await ok("status", { repo });
  const inner = st.changes.find((c) => c.path === "untracked-dir/inner.txt");
  const chinese = st.changes.find((c) => c.path === "untracked-dir/深.txt");
  if (!inner || inner.unstaged !== "?") throw new Error("files inside untracked dirs must be listed individually");
  if (!chinese) throw new Error("non-ASCII filenames must stay raw (quotePath=false)");
  if (st.changes.some((c) => c.path === "untracked-dir" || c.path === "untracked-dir/")) {
    throw new Error("dir-collapsed entry must not appear");
  }
  console.log("untracked directory expansion OK (inner.txt + 深.txt listed, no dir/ entry)");

  // ---- diff ----
  const d = await ok("diff", { repo, file: "a.txt" });
  if (!d.diff.includes("-line2") || !d.diff.includes("+line2 CHANGED")) {
    throw new Error(`diff content wrong: ${JSON.stringify(d.diff)}`);
  }
  console.log("diff OK (one hunk)");

  // ---- hunk rollback: discard the single modification ----
  const hunks = d.diff.split("\n@@").map((h, i) => (i === 0 ? h : "@@" + h)).filter((h) => h.startsWith("@@"));
  if (hunks.length !== 1) throw new Error(`expected 1 hunk, got ${hunks.length}`);
  await ok("revertHunk", { repo, file: "a.txt", hunk: hunks[0] });
  st = await ok("status", { repo });
  const aAfter = st.changes.find((c) => c.path === "a.txt");
  if (aAfter) throw new Error(`a.txt should be clean after hunk rollback: ${JSON.stringify(aAfter)}`);
  console.log("revertHunk OK (a.txt back to clean)");

  // ---- stageHunk: apply one unstaged hunk into the index only ----
  writeFileSync(join(repo, "a.txt"), "line1\nline2 STAGED\nline3\n");
  const stageDiff = (await ok("diff", { repo, file: "a.txt" })).diff;
  const stageHunks = stageDiff.split("\n@@").map((h, i) => (i === 0 ? h : "@@" + h)).filter((h) => h.startsWith("@@"));
  if (stageHunks.length !== 1) throw new Error(`expected 1 stage hunk, got ${stageHunks.length}`);
  await ok("stageHunk", { repo, file: "a.txt", hunk: stageHunks[0] });
  const unstagedAfter = (await ok("diff", { repo, file: "a.txt" })).diff;
  if (/(^|\n)@@ /.test(unstagedAfter)) throw new Error(`unstaged diff should be empty after stageHunk: ${JSON.stringify(unstagedAfter)}`);
  const cachedAfter = (await ok("diff", { repo, file: "a.txt", cached: true })).diff;
  if (!cachedAfter.includes("+line2 STAGED")) throw new Error(`cached diff missing staged hunk: ${JSON.stringify(cachedAfter)}`);
  st = await ok("status", { repo });
  const aStaged = st.changes.find((c) => c.path === "a.txt");
  if (!aStaged || aStaged.staged !== "M") throw new Error(`a.txt should be staged M: ${JSON.stringify(aStaged)}`);
  await ok("unstage", { repo, paths: ["a.txt"] });
  await ok("revertFile", { repo, file: "a.txt" });
  console.log("stageHunk OK (index advanced, worktree unstaged empty)");

  // ---- hunk rollback on a CRLF file (Windows line endings) ----
  writeFileSync(join(repo, "crlf.txt"), "c1\r\nc2\r\nc3\r\n");
  git(["add", "crlf.txt"]);
  git(["commit", "-m", "crlf init"]);
  writeFileSync(join(repo, "crlf.txt"), "c1\r\nc2 CHANGED\r\nc3\r\n");
  const crlfDiff = (await ok("diff", { repo, file: "crlf.txt" })).diff;
  const crlfHunks = crlfDiff.split("\n@@").map((h, i) => (i === 0 ? h : "@@" + h)).filter((h) => h.startsWith("@@"));
  if (crlfHunks.length !== 1) throw new Error(`expected 1 crlf hunk, got ${crlfHunks.length}`);
  await ok("revertHunk", { repo, file: "crlf.txt", hunk: crlfHunks[0] });
  st = await ok("status", { repo });
  if (st.changes.find((c) => c.path === "crlf.txt")) throw new Error("crlf.txt should be clean after hunk rollback");
  console.log("revertHunk OK (CRLF file)");

  // ---- hunk rollback on a LATER hunk: the walker must start at the hunk's
  // own `@@ -N` line, not at file line 1 ----
  const multiLines = Array.from({ length: 40 }, (_, i) => `m${String(i + 1).padStart(2, "0")}`);
  writeFileSync(join(repo, "multi.txt"), multiLines.join("\n") + "\n");
  git(["add", "multi.txt"]);
  git(["commit", "-m", "multi init"]);
  multiLines[2] = "m03 FIRST-CHANGE";
  multiLines[29] = "m30 SECOND-CHANGE";
  writeFileSync(join(repo, "multi.txt"), multiLines.join("\n") + "\n");
  const multiDiff = (await ok("diff", { repo, file: "multi.txt" })).diff;
  const multiHunks = multiDiff.split("\n@@").map((h, i) => (i === 0 ? h : "@@" + h)).filter((h) => h.startsWith("@@"));
  if (multiHunks.length !== 2) throw new Error(`expected 2 multi hunks, got ${multiHunks.length}`);
  await ok("revertHunk", { repo, file: "multi.txt", hunk: multiHunks[1] });
  st = await ok("status", { repo });
  const multiAfter = st.changes.find((c) => c.path === "multi.txt");
  if (!multiAfter) throw new Error("multi.txt should still be modified after reverting only the second hunk");
  const remaining = (await ok("diff", { repo, file: "multi.txt" })).diff;
  if (!remaining.includes("m03 FIRST-CHANGE")) throw new Error("first hunk change must survive the second-hunk rollback");
  if (remaining.includes("m30 SECOND-CHANGE")) throw new Error("second hunk change must be gone after its rollback");
  await ok("revertHunk", { repo, file: "multi.txt", hunk: multiHunks[0] });
  st = await ok("status", { repo });
  if (st.changes.find((c) => c.path === "multi.txt")) throw new Error("multi.txt should be clean after both hunk rollbacks");
  console.log("revertHunk OK (later hunk of a multi-hunk diff)");

  // ---- per-block rollback inside one git hunk (two change runs) ----
  writeFileSync(join(repo, "blocks.txt"), "line1\nline2\nline3\nline4\nline5\n");
  git(["add", "blocks.txt"]);
  git(["commit", "-m", "blocks init"]);
  writeFileSync(join(repo, "blocks.txt"), "INSERTED\nline1\nline2\nline3\nline4 CHANGED\nline5\n");
  const blocksDiff = (await ok("diff", { repo, file: "blocks.txt" })).diff;
  const blockHunks = blocksDiff.split("\n@@").map((h, i) => (i === 0 ? h : "@@" + h)).filter((h) => h.startsWith("@@"));
  if (blockHunks.length !== 1) throw new Error(`expected 1 combined hunk, got ${blockHunks.length}: ${blocksDiff}`);
  await ok("revertHunk", { repo, file: "blocks.txt", hunk: "@@ -4,1 +5,1 @@\n-line4\n+line4 CHANGED\n" });
  const afterBlock = (await ok("diff", { repo, file: "blocks.txt" })).diff;
  if (!afterBlock.includes("+INSERTED")) throw new Error("first block must survive reverting the second");
  if (afterBlock.includes("line4 CHANGED")) throw new Error("second block must be gone after its rollback");
  await ok("revertHunk", { repo, file: "blocks.txt", hunk: "@@ -1,0 +1,1 @@\n+INSERTED\n" });
  st = await ok("status", { repo });
  if (st.changes.find((c) => c.path === "blocks.txt")) throw new Error("blocks.txt should be clean after both block rollbacks");
  console.log("revertHunk OK (one change block inside a hunk)");

  // ---- EOF newline-only change: git shows identical +/- lines plus
  // `\ No newline at end of file`; reverse-apply must restore the missing EOF newline. ----
  writeFileSync(join(repo, "eof.txt"), "a\nb\nc");
  git(["add", "eof.txt"]);
  git(["commit", "-m", "eof init"]);
  writeFileSync(join(repo, "eof.txt"), "a\nb\nc\n");
  const eofDiff = (await ok("diff", { repo, file: "eof.txt" })).diff;
  if (!eofDiff.includes("\\ No newline at end of file")) {
    throw new Error(`eof diff must carry the no-newline marker: ${JSON.stringify(eofDiff)}`);
  }
  await ok("revertHunk", {
    repo, file: "eof.txt",
    hunk: "@@ -3,1 +3,1 @@\n-c\n\\ No newline at end of file\n+c\n",
  });
  const eofAfter = readFileSync(join(repo, "eof.txt"), "utf8");
  if (eofAfter.endsWith("\n")) throw new Error("eof.txt should have no trailing newline after revert");
  if (eofAfter !== "a\nb\nc") throw new Error(`eof.txt content wrong after revert: ${JSON.stringify(eofAfter)}`);
  st = await ok("status", { repo });
  if (st.changes.find((c) => c.path === "eof.txt")) throw new Error("eof.txt should be clean after newline-only rollback");
  console.log("revertHunk OK (no newline at end of file)");

  // ---- CRLF worktree vs LF index, last line is CR without LF: git shows
  // every line as -/+ with identical text. Revert must restore LF (not copy CR). ----
  writeFileSync(join(repo, "eolcr.txt"), "a\nb\nc");
  git(["add", "eolcr.txt"]);
  git(["commit", "-m", "eolcr init"]);
  writeFileSync(join(repo, "eolcr.txt"), "a\r\nb\r\nc\r");
  const eolcrDiff = (await ok("diff", { repo, file: "eolcr.txt" })).diff;
  const eolcrHunks = eolcrDiff.split("\n@@").map((h, i) => (i === 0 ? h : "@@" + h)).filter((h) => h.startsWith("@@"));
  if (eolcrHunks.length !== 1) throw new Error(`expected 1 eolcr hunk, got ${eolcrHunks.length}: ${JSON.stringify(eolcrDiff)}`);
  await ok("revertHunk", { repo, file: "eolcr.txt", hunk: eolcrHunks[0] });
  st = await ok("status", { repo });
  if (st.changes.find((c) => c.path === "eolcr.txt")) {
    throw new Error(`eolcr.txt should be clean after CR-only rollback, diff was ${JSON.stringify(eolcrDiff)}`);
  }
  console.log("revertHunk OK (CRLF worktree vs LF index)");

  // ---- porcelain-dirty / empty unified diff must not stay in status ----
  // `core.autocrlf` (and racy stat) can leave `git status` listing a path
  // whose `git diff --name-only` is empty. The left list must omit it.
  writeFileSync(join(repo, "ghost.txt"), "same\n");
  git(["add", "ghost.txt"]);
  git(["commit", "-m", "ghost"]);
  git(["config", "core.autocrlf", "true"]);
  writeFileSync(join(repo, "ghost.txt"), "same\r\n");
  const ghostPorc = git(["-c", "core.quotePath=false", "status", "--porcelain", "--", "ghost.txt"]).trim();
  const ghostWorktree = git(["-c", "core.quotePath=false", "diff", "--name-only", "-z", "--", "ghost.txt"]);
  const ghostCached = git(["-c", "core.quotePath=false", "diff", "--cached", "--name-only", "-z", "--", "ghost.txt"]);
  st = await ok("status", { repo });
  const ghostListed = Boolean(st.changes.find((c) => c.path === "ghost.txt"));
  const ghostDirty = ghostWorktree.includes("ghost.txt") || ghostCached.includes("ghost.txt");
  if (ghostDirty !== ghostListed) {
    throw new Error(`status/name-only mismatch for ghost.txt listed=${ghostListed} dirty=${JSON.stringify(ghostWorktree + "|" + ghostCached)} porcelain=${JSON.stringify(ghostPorc)}`);
  }
  git(["config", "core.autocrlf", "false"]);
  git(["checkout", "HEAD", "--", "ghost.txt"]);
  console.log("status OK (empty-diff porcelain path omitted when name-only is empty)", JSON.stringify({ porcelain: ghostPorc, listed: ghostListed }));

  // Staged rename must survive the name-only filter (porcelain path is the new name).
  writeFileSync(join(repo, "ren-src.txt"), "keep\n");
  git(["add", "ren-src.txt"]);
  git(["commit", "-m", "ren src"]);
  git(["mv", "ren-src.txt", "ren-dst.txt"]);
  st = await ok("status", { repo });
  if (!st.changes.find((c) => c.path === "ren-dst.txt")) {
    throw new Error(`staged rename must stay in status: ${JSON.stringify(st.changes)}`);
  }
  git(["reset", "--hard", "HEAD"]);
  try { rmSync(join(repo, "ren-dst.txt")); } catch { /* reset already removed it */ }
  console.log("status OK (staged rename kept)");

  // ---- file rollback ----
  writeFileSync(join(repo, "b.txt"), "changed\n");
  await ok("revertFile", { repo, file: "b.txt" });
  st = await ok("status", { repo });
  if (st.changes.find((c) => c.path === "b.txt")) throw new Error("b.txt should be clean after file rollback");
  console.log("revertFile OK");

  // ---- stage + commit the untracked file ----
  await ok("stage", { repo, paths: ["new.txt"] });
  st = await ok("status", { repo });
  const newStaged = st.changes.find((c) => c.path === "new.txt");
  if (!newStaged || newStaged.staged !== "A") throw new Error("new.txt should be staged-added");
  await ok("commit", { repo, message: "add new.txt" });
  st = await ok("status", { repo });
  const leftovers = st.changes.filter((c) => c.path !== "untracked-dir/inner.txt" && c.path !== "untracked-dir/深.txt");
  if (leftovers.length !== 0) throw new Error(`expected only untracked-dir files after commit: ${JSON.stringify(st.changes)}`);
  if (!st.changes.every((c) => c.unstaged === "?")) throw new Error("remaining changes must be untracked");
  console.log("stage + commit OK");

  // ---- bulk stage: 60 paths in ONE call (host must chunk; a single
  // `git add -- <60 paths>` would overflow the Windows command line) ----
  const bulkDir = join(repo, "bulk");
  mkdirSync(bulkDir);
  const bulkPaths = [];
  for (let i = 0; i < 60; i++) {
    const name = `f${String(i).padStart(2, "0")}.txt`;
    writeFileSync(join(bulkDir, name), `${i}\n`);
    bulkPaths.push(`bulk/${name}`);
  }
  await ok("stage", { repo, paths: bulkPaths });
  st = await ok("status", { repo });
  const stagedBulk = st.changes.filter((c) => c.path.startsWith("bulk/") && c.staged === "A");
  if (stagedBulk.length !== 60) throw new Error(`expected 60 staged bulk files, got ${stagedBulk.length}`);
  console.log("bulk stage OK (60 paths in one call)");
  // unstage everything (also exercises the unstage endpoint)
  await ok("unstage", { repo });
  st = await ok("status", { repo });
  if (st.changes.some((c) => c.staged !== "")) throw new Error("unstage should clear all staged entries");

  // ---- bulk commit: 300 paths in ONE call (host must split the selection
  // into chunks, one commit per chunk; a single `git commit -- <300 paths>`
  // would overflow the Windows command line) ----
  const bulkCommitDir = join(repo, "bulk-commit");
  mkdirSync(bulkCommitDir);
  const commitPaths = [];
  for (let i = 0; i < 300; i++) {
    const name = `g${String(i).padStart(3, "0")}.txt`;
    writeFileSync(join(bulkCommitDir, name), `${i}\n`);
    commitPaths.push(`bulk-commit/${name}`);
  }
  await ok("stage", { repo, paths: commitPaths });
  const commitsBefore = parseInt(git(["rev-list", "--count", "HEAD"]).trim(), 10);
  await ok("commit", { repo, message: "bulk import", paths: commitPaths });
  const commitsAfter = parseInt(git(["rev-list", "--count", "HEAD"]).trim(), 10);
  if (commitsAfter !== commitsBefore + 2) {
    throw new Error(`expected ${commitsBefore + 2} commits after chunked bulk commit (300 paths, 250 per chunk), got ${commitsAfter}`);
  }
  st = await ok("status", { repo });
  if (st.changes.some((c) => c.path.startsWith("bulk-commit/"))) {
    throw new Error("bulk-commit files must be clean after the chunked commit");
  }
  console.log("bulk commit OK (300 paths split into chunks, all committed)");

  // ---- stage a nonexistent path: the failure envelope carries the real
  // git message (pathspec) and the required details field ----
  const stageErr = await bad("stage", { repo, paths: ["does-not-exist.txt"] });
  if (!/pathspec/i.test(stageErr.message)) {
    throw new Error(`stage failure should carry the git pathspec message: ${JSON.stringify(stageErr)}`);
  }
  console.log("stage failure envelope OK (pathspec message + details)");

  // ---- deleteFile: an untracked file can be deleted from disk ----
  await ok("deleteFile", { repo, file: "untracked-dir/inner.txt" });
  if (existsSync(join(repo, "untracked-dir", "inner.txt"))) throw new Error("deleteFile should remove the file");
  st = await ok("status", { repo });
  if (st.changes.some((c) => c.path === "untracked-dir/inner.txt")) throw new Error("deleted file must leave the status");
  console.log("deleteFile OK (untracked file removed from disk)");

  // ---- revertAll: staged adds fall back to untracked (content kept),
  // tracked worktree changes are discarded, untracked files untouched ----
  writeFileSync(join(repo, "a.txt"), "line1\nline2 CHANGED\nline3\n");
  writeFileSync(join(repo, "new2.txt"), "to be staged\n");
  await ok("stage", { repo, paths: ["new2.txt"] });
  await ok("revertAll", { repo });
  st = await ok("status", { repo });
  if (st.changes.some((c) => c.path === "a.txt")) throw new Error("a.txt should be clean after revertAll");
  const new2 = st.changes.find((c) => c.path === "new2.txt");
  if (!new2 || new2.staged !== "" || new2.unstaged !== "?") throw new Error("new2.txt should be untracked after revertAll");
  if (!st.changes.some((c) => c.path === "untracked-dir/深.txt")) throw new Error("untracked files must survive revertAll");
  console.log("revertAll OK (staged add → untracked, worktree change discarded, untracked kept)");

  // ---- stash: mandatory message; all changes stashed, then restored ----
  const stashErr = await bad("stash", { repo, message: "  " });
  if (stashErr.code !== "bad-request") throw new Error(`expected bad-request (mapped from invalid-args) for empty stash message, got ${stashErr.code}`);
  writeFileSync(join(repo, "a.txt"), "stashed change\n");
  await ok("stash", { repo, message: "wip smoke" });
  st = await ok("status", { repo });
  if (st.changes.some((c) => c.path === "a.txt")) throw new Error("a.txt should be clean after stash");
  if (!/wip smoke/.test(git(["stash", "list"]))) throw new Error("stash entry missing from git stash list");
  git(["stash", "pop"]);
  console.log("stash OK (mandatory message, changes stashed and restored via pop)");

  // ---- commit without message must fail ----
  const err = await bad("commit", { repo, message: "  " });
  if (err.code !== "bad-request") throw new Error(`expected bad-request (mapped from invalid-args), got ${err.code}`);
  console.log("commit guard OK (empty message rejected)");

  // ---- merge conflict + resolve ours ----
  git(["checkout", "-b", "feature"]);
  writeFileSync(join(repo, "conflict.txt"), "feature version\n");
  git(["add", "conflict.txt"]);
  git(["commit", "-m", "feature change"]);
  git(["checkout", "master"]);
  writeFileSync(join(repo, "conflict.txt"), "master version\n");
  git(["add", "conflict.txt"]);
  git(["commit", "-m", "master change"]);
  // The merge conflicts on purpose (add/add); a non-zero exit is expected.
  try { git(["merge", "--no-edit", "feature"]); } catch { /* conflict */ }
  st = await ok("status", { repo });
  const conf = st.changes.find((c) => c.path === "conflict.txt");
  const isConflict = (c) => c.staged === "U" || c.unstaged === "U"
    || (c.staged !== "" && c.unstaged !== "" && "ADU".includes(c.staged) && "ADU".includes(c.unstaged));
  if (!conf || !isConflict(conf)) {
    throw new Error(`conflict not detected: ${JSON.stringify(st.changes)}`);
  }
  console.log("conflict detected OK");
  await ok("resolveOurs", { repo, file: "conflict.txt" });
  st = await ok("status", { repo });
  const resolved = st.changes.find((c) => c.path === "conflict.txt");
  if (resolved && resolved.staged !== "A" && resolved.staged !== "M") {
    throw new Error(`conflict not resolved to staged: ${JSON.stringify(st.changes)}`);
  }
  console.log("resolveOurs OK");

  // ---- input guards ----
  await bad("status", { repo: join(root, "missing") });
  await bad("revertFile", { repo, file: "../escape.txt" });
  await bad("diff", { repo, file: "C:\\abs.txt" });
  console.log("input guards OK (bad repo / traversal / absolute path rejected)");

  console.log("GIT HOST SMOKE OK");
} finally {
  try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ }
}

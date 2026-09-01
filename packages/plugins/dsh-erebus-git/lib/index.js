import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { basename, isAbsolute, join } from "node:path";
//#region src/index.ts
/** Services required before this plugin applies. */
const inject = ["connection"];
function fail(code, message) {
	const wireCode = code === "invalid-args" || code === "invalid-repo" || code === "unknown-endpoint" ? "bad-request" : "internal";
	return {
		ok: false,
		error: wireCode === "bad-request" ? {
			code: wireCode,
			message,
			details: { issues: [] }
		} : {
			code: wireCode,
			message,
			details: { code }
		}
	};
}
/** Run one git command in a repo; rejects with the trimmed stderr on failure. */
function runGit(repo, args) {
	return new Promise((resolve, reject) => {
		execFile("git", args, {
			cwd: repo,
			encoding: "utf8",
			maxBuffer: 16 * 1024 * 1024,
			windowsHide: true
		}, (error, stdout, stderr) => {
			if (error) {
				const message = (stderr || "").trim() || (stdout || "").trim() || String(error.message);
				reject(new Error(message));
				return;
			}
			resolve({
				stdout,
				stderr
			});
		});
	});
}
/** Like {@link runGit}, but feeds `stdin` to the child (for `git apply -`). */
function runGitStdin(repo, args, stdin) {
	return new Promise((resolve, reject) => {
		const child = spawn("git", args, {
			cwd: repo,
			windowsHide: true,
			stdio: [
				"pipe",
				"pipe",
				"pipe"
			]
		});
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code !== 0) {
				reject(new Error((stderr || stdout || `git exited ${code}`).trim()));
				return;
			}
			resolve({
				stdout,
				stderr
			});
		});
		child.stdin.end(stdin, "utf8");
	});
}
/** The repo must be an absolute host path. */
function repoArg(repo) {
	if (typeof repo !== "string" || repo.length === 0 || !isAbsolute(repo)) return null;
	return repo;
}
/** A file must be a repo-relative path with no traversal. */
function fileArg(file) {
	if (typeof file !== "string" || file.length === 0) return null;
	if (file.startsWith("/") || file.startsWith("\\") || /^[A-Za-z]:/.test(file)) return null;
	if (file.split(/[\\/]+/).includes("..")) return null;
	return file;
}
/** A list of repo-relative paths; omitted = all ([]), malformed = null (reject). */
function pathsArg(paths) {
	if (paths === void 0) return [];
	if (!Array.isArray(paths)) return null;
	const clean = [];
	for (const p of paths) {
		const file = fileArg(p);
		if (file === null) return null;
		clean.push(file);
	}
	return clean;
}
/** A message must be a non-empty string. */
function messageArg(message) {
	if (typeof message !== "string" || message.trim().length === 0) return null;
	return message;
}
/** Unmerged porcelain letters, including AA / DD which never carry `U`. */
function isConflictChange(change) {
	if (change.staged === "U" || change.unstaged === "U") return true;
	const s = change.staged;
	const u = change.unstaged;
	return s !== "" && u !== "" && "ADU".includes(s) && "ADU".includes(u);
}
/** Split a NUL-delimited git path list (`-z`) into a set. */
function nulPaths(stdout) {
	const names = /* @__PURE__ */ new Set();
	for (const path of stdout.split("\0")) if (path.length > 0) names.add(path);
	return names;
}
/** Parse `git status --porcelain --branch` output into the status model. */
function parseStatus(stdout) {
	const status = {
		branch: "",
		remote: null,
		ahead: 0,
		behind: 0,
		changes: []
	};
	for (const raw of stdout.split("\n")) {
		if (raw.length === 0) continue;
		if (raw.startsWith("## ")) {
			const head = raw.slice(3);
			const bracket = head.indexOf(" [");
			const branchPart = bracket === -1 ? head : head.slice(0, bracket);
			const dot = branchPart.indexOf("...");
			status.branch = dot === -1 ? branchPart : branchPart.slice(0, dot);
			status.remote = dot === -1 ? null : branchPart.slice(dot + 3);
			const meta = bracket === -1 ? "" : head.slice(bracket + 2, head.length - 1);
			const aheadMatch = /ahead (\d+)/.exec(meta);
			const behindMatch = /behind (\d+)/.exec(meta);
			if (aheadMatch) status.ahead = parseInt(aheadMatch[1], 10);
			if (behindMatch) status.behind = parseInt(behindMatch[1], 10);
			continue;
		}
		if (raw.startsWith("?? ")) continue;
		const x = raw.charAt(0);
		const y = raw.charAt(1);
		let path = raw.slice(3);
		const arrow = path.indexOf(" -> ");
		if (arrow !== -1) path = path.slice(arrow + 4);
		status.changes.push({
			path,
			staged: x === " " ? "" : x,
			unstaged: y === " " ? "" : y
		});
	}
	return status;
}
function hasGitDir(dir) {
	return existsSync(join(dir, ".git"));
}
/**
* Discover git repositories under a root: the root itself plus nested repos
* up to two directory levels deep (skipping .git and node_modules). This is
* what makes a multi-repo workspace (IDEA-style) work: one root, many repos —
* including repos embedded inside another repository's subtree.
*/
async function discoverRepos(root) {
	const found = [];
	if (hasGitDir(root)) found.push(root);
	let subs = [];
	try {
		subs = await readdir(root, { withFileTypes: true });
	} catch {}
	for (const sub of subs) {
		if (!sub.isDirectory()) continue;
		if (sub.name === ".git" || sub.name === "node_modules") continue;
		const level1 = join(root, sub.name);
		if (hasGitDir(level1)) found.push(level1);
		let subs2 = [];
		try {
			subs2 = await readdir(level1, { withFileTypes: true });
		} catch {}
		for (const sub2 of subs2) {
			if (!sub2.isDirectory()) continue;
			if (sub2.name === ".git" || sub2.name === "node_modules") continue;
			const level2 = join(level1, sub2.name);
			if (hasGitDir(level2)) found.push(level2);
		}
	}
	return found.map((path) => ({
		path,
		name: basename(path)
	}));
}
async function repos(payload) {
	const root = payload?.root;
	if (typeof root !== "string" || root.length === 0 || !isAbsolute(root)) return fail("invalid-root", "an absolute root path is required");
	return {
		ok: true,
		value: { repos: await discoverRepos(root) }
	};
}
async function status(payload) {
	const repo = repoArg(payload?.repo);
	if (repo === null) return fail("invalid-repo", "an absolute repository path is required");
	try {
		const { stdout } = await runGit(repo, [
			"-c",
			"core.quotePath=false",
			"status",
			"--porcelain",
			"--branch"
		]);
		const { stdout: untrackedOut } = await runGit(repo, [
			"-c",
			"core.quotePath=false",
			"ls-files",
			"--others",
			"--exclude-standard",
			"-z"
		]);
		const result = parseStatus(stdout);
		for (const path of untrackedOut.split("\0")) {
			if (path.length === 0) continue;
			result.changes.push({
				path,
				staged: "",
				unstaged: "?"
			});
		}
		if (result.changes.some((c) => c.unstaged !== "?" && !isConflictChange(c))) {
			const worktree = await runGit(repo, [
				"-c",
				"core.quotePath=false",
				"diff",
				"--name-only",
				"-z"
			]);
			const cached = await runGit(repo, [
				"-c",
				"core.quotePath=false",
				"diff",
				"--cached",
				"--name-only",
				"-z"
			]);
			const dirty = nulPaths(worktree.stdout);
			for (const path of nulPaths(cached.stdout)) dirty.add(path);
			result.changes = result.changes.filter((c) => c.unstaged === "?" || isConflictChange(c) || dirty.has(c.path));
		}
		return {
			ok: true,
			value: result
		};
	} catch (error) {
		return fail("status-failed", error instanceof Error ? error.message : String(error));
	}
}
async function diff(payload) {
	const repo = repoArg(payload?.repo);
	const file = fileArg(payload?.file);
	if (repo === null || file === null) return fail("invalid-args", "repo and file are required");
	try {
		const args = ["diff"];
		if (payload?.cached === true) args.push("--cached");
		args.push("--", file);
		const { stdout } = await runGit(repo, args);
		return {
			ok: true,
			value: { diff: stdout }
		};
	} catch (error) {
		return fail("diff-failed", error instanceof Error ? error.message : String(error));
	}
}
/** Windows CreateProcess caps the command line (~32k chars); large selections
* (e.g. select-all on a fresh clone) must not overflow one git invocation.
* 250 paths stay well under the limit (~12k chars) while keeping big
* select-alls to a handful of git spawns. */
const PATH_CHUNK = 250;
async function stage(payload) {
	const repo = repoArg(payload?.repo);
	const paths = pathsArg(payload?.paths);
	if (repo === null || paths === null) return fail("invalid-args", "repo is required (paths optional)");
	try {
		if (paths.length === 0) await runGit(repo, ["add", "-A"]);
		else for (let i = 0; i < paths.length; i += PATH_CHUNK) await runGit(repo, [
			"add",
			"-A",
			"--",
			...paths.slice(i, i + PATH_CHUNK)
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("stage-failed", error instanceof Error ? error.message : String(error));
	}
}
async function unstage(payload) {
	const repo = repoArg(payload?.repo);
	const paths = pathsArg(payload?.paths);
	if (repo === null || paths === null) return fail("invalid-args", "repo is required (paths optional)");
	try {
		if (paths.length === 0) await runGit(repo, ["reset"]);
		else for (let i = 0; i < paths.length; i += PATH_CHUNK) await runGit(repo, [
			"reset",
			"HEAD",
			"--",
			...paths.slice(i, i + PATH_CHUNK)
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("unstage-failed", error instanceof Error ? error.message : String(error));
	}
}
async function commit(payload) {
	const repo = repoArg(payload?.repo);
	const message = messageArg(payload?.message);
	const paths = payload?.paths === void 0 ? [] : pathsArg(payload?.paths);
	if (repo === null || message === null || paths === null) return fail("invalid-args", "repo and a non-empty message are required (paths optional)");
	try {
		if (paths.length === 0) {
			await runGit(repo, [
				"commit",
				"-m",
				message
			]);
			return {
				ok: true,
				value: {}
			};
		}
		for (let i = 0; i < paths.length; i += PATH_CHUNK) {
			const chunk = paths.slice(i, i + PATH_CHUNK);
			try {
				await runGit(repo, [
					"commit",
					"-m",
					message,
					"--",
					...chunk
				]);
			} catch (error) {
				const why = error instanceof Error ? error.message : String(error);
				return fail("commit-failed", `已提交 ${i}/${paths.length} 个文件后失败: ${why}`);
			}
		}
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("commit-failed", error instanceof Error ? error.message : String(error));
	}
}
async function push(payload) {
	const repo = repoArg(payload?.repo);
	if (repo === null) return fail("invalid-repo", "an absolute repository path is required");
	try {
		const { stdout, stderr } = await runGit(repo, ["push"]);
		return {
			ok: true,
			value: { output: (stdout + stderr).trim() }
		};
	} catch (error) {
		return fail("push-failed", error instanceof Error ? error.message : String(error));
	}
}
async function pull(payload) {
	const repo = repoArg(payload?.repo);
	if (repo === null) return fail("invalid-repo", "an absolute repository path is required");
	try {
		const { stdout, stderr } = await runGit(repo, ["pull"]);
		return {
			ok: true,
			value: { output: (stdout + stderr).trim() }
		};
	} catch (error) {
		return fail("pull-failed", error instanceof Error ? error.message : String(error));
	}
}
async function revertFile(payload) {
	const repo = repoArg(payload?.repo);
	const file = fileArg(payload?.file);
	if (repo === null || file === null) return fail("invalid-args", "repo and file are required");
	try {
		await runGit(repo, [
			"checkout",
			"HEAD",
			"--",
			file
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("revert-failed", error instanceof Error ? error.message : String(error));
	}
}
/**
* Apply one diff hunk in reverse directly to the worktree file bytes.
* Operates on the raw lines (keeping each file's own line endings) instead
* of `git apply`, which on Windows converts line endings and can leave the
* file different from the index. The hunk body walks the CURRENT file: "+"
* lines (the added content) are removed, "-" lines (the removed content) are
* re-inserted, context lines must match.
*/
function applyReverseHunk(filePath, hunk) {
	const content = readFileSync(filePath, "utf8");
	const lines = content.split("\n");
	const lineEol = (idx) => lines[idx]?.endsWith("\r") ? "\r" : "";
	const startMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(hunk) ?? /^@@ -(\d+)/.exec(hunk);
	let cur = startMatch ? parseInt(startMatch[startMatch.length - 1] ?? "1", 10) - 1 : 0;
	const hunkLines = hunk.split("\n");
	const stripCr = (value) => value.endsWith("\r") ? value.slice(0, -1) : value;
	const plusTexts = new Set(hunkLines.filter((line) => line.startsWith("+")).map((line) => stripCr(line.slice(1))));
	let wantTrailing;
	for (let i = 0; i < hunkLines.length; i++) {
		const raw = hunkLines[i] ?? "";
		if (raw.startsWith("@@")) continue;
		if (raw === "" || raw === "\\ No newline at end of file") continue;
		const noNewline = hunkLines[i + 1] === "\\ No newline at end of file";
		const marker = raw.charAt(0);
		const text = raw.slice(1);
		if (marker === " ") {
			const current = lines[cur] ?? "";
			if (current !== text && current !== `${text}\r`) throw new Error(`patch context mismatch at line ${cur + 1}`);
			cur += 1;
		} else if (marker === "-") {
			const restored = plusTexts.has(stripCr(text)) ? stripCr(text) : `${text}${lineEol(cur)}`;
			lines.splice(cur, 0, restored);
			if (noNewline) wantTrailing = false;
			cur += 1;
		} else if (marker === "+") {
			lines.splice(cur, 1);
			if (noNewline && wantTrailing === void 0) wantTrailing = true;
		} else throw new Error(`unexpected patch line: ${raw.slice(0, 40)}`);
	}
	const hadTrailing = content.endsWith("\n");
	const trailing = wantTrailing ?? hadTrailing;
	if (hadTrailing && lines[lines.length - 1] === "") lines.pop();
	if (!trailing && lines.length > 0 && (lines[lines.length - 1] ?? "").endsWith("\r")) {
		const last = lines[lines.length - 1] ?? "";
		lines[lines.length - 1] = last.slice(0, -1);
	}
	writeFileSync(filePath, trailing ? `${lines.join("\n")}\n` : lines.join("\n"), "utf8");
}
/** True when `git diff` stdout contains at least one unified-diff hunk. */
function diffHasHunk(stdout) {
	return /(^|\n)@@ /.test(stdout);
}
async function revertHunk(payload) {
	const repo = repoArg(payload?.repo);
	const file = fileArg(payload?.file);
	const hunk = payload?.hunk;
	if (repo === null || file === null || typeof hunk !== "string" || !hunk.startsWith("@@")) return fail("invalid-args", "repo, file and a valid hunk are required");
	try {
		applyReverseHunk(join(repo, file), hunk);
		const worktree = await runGit(repo, [
			"diff",
			"--",
			file
		]);
		const cached = await runGit(repo, [
			"diff",
			"--cached",
			"--",
			file
		]);
		if (!diffHasHunk(worktree.stdout) && !diffHasHunk(cached.stdout)) await runGit(repo, [
			"checkout",
			"HEAD",
			"--",
			file
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("revert-hunk-failed", error instanceof Error ? error.message : String(error));
	}
}
/**
* Stage one unified-diff hunk into the index (`git apply --cached`), IDEA-style
* line/block staging. The worktree is left unchanged; only the index advances.
*/
async function stageHunk(payload) {
	const repo = repoArg(payload?.repo);
	const file = fileArg(payload?.file);
	const hunk = payload?.hunk;
	if (repo === null || file === null || typeof hunk !== "string" || !hunk.startsWith("@@")) return fail("invalid-args", "repo, file and a valid hunk are required");
	try {
		const normalized = file.replace(/\\/g, "/");
		const body = hunk.endsWith("\n") ? hunk : `${hunk}\n`;
		await runGitStdin(repo, [
			"apply",
			"--cached",
			"--unidiff-zero",
			"--whitespace=nowarn",
			"-"
		], [
			`diff --git a/${normalized} b/${normalized}`,
			`--- a/${normalized}`,
			`+++ b/${normalized}`,
			body
		].join("\n"));
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("stage-hunk-failed", error instanceof Error ? error.message : String(error));
	}
}
async function resolveSide(payload, side) {
	const repo = repoArg(payload?.repo);
	const file = fileArg(payload?.file);
	if (repo === null || file === null) return fail("invalid-args", "repo and file are required");
	try {
		await runGit(repo, [
			"checkout",
			`--${side}`,
			"--",
			file
		]);
		await runGit(repo, [
			"add",
			"--",
			file
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("resolve-failed", error instanceof Error ? error.message : String(error));
	}
}
async function markResolved(payload) {
	const repo = repoArg(payload?.repo);
	const file = fileArg(payload?.file);
	if (repo === null || file === null) return fail("invalid-args", "repo and file are required");
	try {
		await runGit(repo, [
			"add",
			"--",
			file
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("resolve-failed", error instanceof Error ? error.message : String(error));
	}
}
/** Delete one worktree file (untracked-file 删除 button); path stays repo-relative. */
async function deleteFile(payload) {
	const repo = repoArg(payload?.repo);
	const file = fileArg(payload?.file);
	if (repo === null || file === null) return fail("invalid-args", "repo and file are required");
	try {
		await rm(join(repo, file), { force: true });
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("delete-failed", error instanceof Error ? error.message : String(error));
	}
}
/** Stash all workspace changes with a mandatory message. */
async function stash(payload) {
	const repo = repoArg(payload?.repo);
	const message = messageArg(payload?.message);
	if (repo === null || message === null) return fail("invalid-args", "repo and a non-empty stash message are required");
	try {
		await runGit(repo, [
			"stash",
			"push",
			"-m",
			message
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("stash-failed", error instanceof Error ? error.message : String(error));
	}
}
/**
* Roll back every change in the 更改 group: unstage everything staged (added
* files fall back to untracked, content kept) and discard the worktree
* changes of tracked files. Untracked files are never touched.
*/
async function revertAll(payload) {
	const repo = repoArg(payload?.repo);
	if (repo === null) return fail("invalid-repo", "an absolute repository path is required");
	try {
		const { stdout: stagedOut } = await runGit(repo, [
			"diff",
			"--cached",
			"--name-only",
			"-z"
		]);
		if (stagedOut.split("\0").filter((p) => p.length > 0).length > 0) await runGit(repo, ["reset"]);
		const { stdout: unstagedOut } = await runGit(repo, [
			"diff",
			"--name-only",
			"-z"
		]);
		const unstaged = unstagedOut.split("\0").filter((p) => p.length > 0);
		if (unstaged.length > 0) for (let i = 0; i < unstaged.length; i += PATH_CHUNK) await runGit(repo, [
			"checkout",
			"HEAD",
			"--",
			...unstaged.slice(i, i + PATH_CHUNK)
		]);
		return {
			ok: true,
			value: {}
		};
	} catch (error) {
		return fail("revert-failed", error instanceof Error ? error.message : String(error));
	}
}
/**
* Plugin body: mount the `/dsh-erebus-git` shared RPC channel for the lifetime of
* this fiber. Unloading the row removes it.
* @param ctx - host cordis context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.connection.rpc.handle("/dsh-erebus-git", async (endpoint, payload) => {
		const p = payload;
		switch (endpoint) {
			case "repos": return await repos(p);
			case "status": return await status(p);
			case "diff": return await diff(p);
			case "stage": return await stage(p);
			case "unstage": return await unstage(p);
			case "commit": return await commit(p);
			case "push": return await push(p);
			case "pull": return await pull(p);
			case "revertFile": return await revertFile(p);
			case "revertHunk": return await revertHunk(p);
			case "stageHunk": return await stageHunk(p);
			case "resolveOurs": return await resolveSide(p, "ours");
			case "resolveTheirs": return await resolveSide(p, "theirs");
			case "markResolved": return await markResolved(p);
			case "deleteFile": return await deleteFile(p);
			case "stash": return await stash(p);
			case "revertAll": return await revertAll(p);
			default: return fail("unknown-endpoint", `unknown endpoint ${endpoint}`);
		}
	}, { authority: "loopback" }), "dsh-erebus-git: rpc channel");
}
var src_default = {
	apply,
	inject
};
//#endregion
export { apply, src_default as default, inject };

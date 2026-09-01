// dsh-erebus-git host half: a loopback-fenced git backend channel (`/dsh-erebus-git`) that
// drives the local git executable through child_process. Only the local
// browser can reach it (authority: "loopback", the same DNS-rebinding fence
// the privileged `/api` methods get); every mutation happens in the host
// user's own repositories.
//
// Wire contract (shared-channel envelope):
//   POST /dsh-erebus-git/repos      { root }           -> { ok: true, value: { repos: [{ path, name }] } }
//   POST /dsh-erebus-git/status     { repo }           -> { ok: true, value:
//                            { branch, remote, ahead, behind, changes: [{ path, staged, unstaged }] } }
//                            (tracked rows whose worktree and cached name-only
//                             diffs are both empty are omitted; conflicts and
//                             untracked files stay)
//   POST /dsh-erebus-git/diff       { repo, file, cached? } -> { ok: true, value: { diff } }
//   POST /dsh-erebus-git/stage      { repo, paths? }   -> { ok: true, value: {} }   (paths omitted = stage all)
//   POST /dsh-erebus-git/unstage    { repo, paths? }   -> { ok: true, value: {} }
//   POST /dsh-erebus-git/commit     { repo, message, paths? } -> { ok: true, value: {} }
//                            (paths omitted = commit the staged changes; a big
//                             selection is split into several commits with the
//                             same message, one git call per chunk, so the
//                             command line never overflows on Windows)
//   POST /dsh-erebus-git/push       { repo }           -> { ok: true, value: { output } }
//   POST /dsh-erebus-git/pull       { repo }           -> { ok: true, value: { output } }
//   POST /dsh-erebus-git/revertFile { repo, file }     -> { ok: true, value: {} }   (discard all changes of one file)
//   POST /dsh-erebus-git/revertHunk { repo, file, hunk } -> { ok: true, value: {} } (reverse-apply one diff hunk)
//   POST /dsh-erebus-git/stageHunk  { repo, file, hunk } -> { ok: true, value: {} } (git apply --cached one hunk)
//   POST /dsh-erebus-git/resolveOurs   { repo, file }  -> { ok: true, value: {} }   (checkout --ours + add)
//   POST /dsh-erebus-git/resolveTheirs { repo, file }  -> { ok: true, value: {} }   (checkout --theirs + add)
//   POST /dsh-erebus-git/markResolved  { repo, file }  -> { ok: true, value: {} }   (git add, after manual editing)
//   All errors: { ok: false, error: { code, message, details } } (message = git stderr)
import { execFile, spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import { basename, isAbsolute, join } from 'node:path'

/** Services required before this plugin applies. */
export const inject = ['connection']

// ---------- wire types ----------
interface WireOk<T> { ok: true; value: T }
interface WireFail { ok: false; error: { code: string; message: string; details: Record<string, unknown> } }
type WireResult<T> = WireOk<T> | WireFail

function fail(code: string, message: string): WireFail {
  // The wire rpcErrorSchema discriminates on `error.code` against the fixed
  // set of standard DSH codes; any custom code makes the client's envelope
  // parse throw `invalid_union` and the real message never reaches the UI.
  // Validation failures map to `bad-request`, everything else to `internal`;
  // the original code travels in `details` (the client schema strips it, but
  // it stays visible in host-side logs and tests).
  const wireCode = code === 'invalid-args' || code === 'invalid-repo' || code === 'unknown-endpoint'
    ? 'bad-request'
    : 'internal'
  return {
    ok: false,
    error: wireCode === 'bad-request'
      ? { code: wireCode, message, details: { issues: [] } }
      : { code: wireCode, message, details: { code } },
  }
}

// ---------- git runner ----------
/** Run one git command in a repo; rejects with the trimmed stderr on failure. */
function runGit(repo: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile('git', args, {
      cwd: repo,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        const message = (stderr || '').trim() || (stdout || '').trim() || String(error.message)
        reject(new Error(message))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

/** Like {@link runGit}, but feeds `stdin` to the child (for `git apply -`). */
function runGitStdin(repo: string, args: string[], stdin: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: repo,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout += chunk })
    child.stderr.on('data', (chunk: string) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error((stderr || stdout || `git exited ${code}`).trim()))
        return
      }
      resolve({ stdout, stderr })
    })
    child.stdin.end(stdin, 'utf8')
  })
}

// ---------- input validation ----------
/** The repo must be an absolute host path. */
function repoArg(repo: unknown): string | null {
  if (typeof repo !== 'string' || repo.length === 0 || !isAbsolute(repo)) return null
  return repo
}
/** A file must be a repo-relative path with no traversal. */
function fileArg(file: unknown): string | null {
  if (typeof file !== 'string' || file.length === 0) return null
  if (file.startsWith('/') || file.startsWith('\\') || /^[A-Za-z]:/.test(file)) return null
  if (file.split(/[\\/]+/).includes('..')) return null
  return file
}
/** A list of repo-relative paths; omitted = all ([]), malformed = null (reject). */
function pathsArg(paths: unknown): string[] | null {
  if (paths === undefined) return []
  if (!Array.isArray(paths)) return null
  const clean: string[] = []
  for (const p of paths) {
    const file = fileArg(p)
    if (file === null) return null
    clean.push(file)
  }
  return clean
}
/** A message must be a non-empty string. */
function messageArg(message: unknown): string | null {
  if (typeof message !== 'string' || message.trim().length === 0) return null
  return message
}

// ---------- status parsing (porcelain v1) ----------
/** One changed path with its index (X) and worktree (Y) porcelain letters. */
interface GitChange { path: string; staged: string; unstaged: string }
interface GitStatus {
  branch: string
  remote: string | null
  ahead: number
  behind: number
  changes: GitChange[]
}

/** Unmerged porcelain letters, including AA / DD which never carry `U`. */
function isConflictChange(change: GitChange): boolean {
  if (change.staged === 'U' || change.unstaged === 'U') return true
  const s = change.staged
  const u = change.unstaged
  return s !== '' && u !== '' && 'ADU'.includes(s) && 'ADU'.includes(u)
}

/** Split a NUL-delimited git path list (`-z`) into a set. */
function nulPaths(stdout: string): Set<string> {
  const names = new Set<string>()
  for (const path of stdout.split('\0')) {
    if (path.length > 0) names.add(path)
  }
  return names
}

/** Parse `git status --porcelain --branch` output into the status model. */
function parseStatus(stdout: string): GitStatus {
  const status: GitStatus = { branch: '', remote: null, ahead: 0, behind: 0, changes: [] }
  for (const raw of stdout.split('\n')) {
    if (raw.length === 0) continue
    if (raw.startsWith('## ')) {
      const head = raw.slice(3)
      const bracket = head.indexOf(' [')
      const branchPart = bracket === -1 ? head : head.slice(0, bracket)
      const dot = branchPart.indexOf('...')
      status.branch = dot === -1 ? branchPart : branchPart.slice(0, dot)
      status.remote = dot === -1 ? null : branchPart.slice(dot + 3)
      const meta = bracket === -1 ? '' : head.slice(bracket + 2, head.length - 1)
      const aheadMatch = /ahead (\d+)/.exec(meta)
      const behindMatch = /behind (\d+)/.exec(meta)
      if (aheadMatch) status.ahead = parseInt(aheadMatch[1], 10)
      if (behindMatch) status.behind = parseInt(behindMatch[1], 10)
      continue
    }
    // `?? ` entries are skipped: porcelain v1 collapses a wholly-untracked
    // directory into one `?? dir/` line, hiding every file inside. The
    // caller enumerates untracked FILES individually via `ls-files`.
    if (raw.startsWith('?? ')) continue
    const x = raw.charAt(0)
    const y = raw.charAt(1)
    let path = raw.slice(3)
    // Rename entries carry "old -> new"; the new path is the change.
    const arrow = path.indexOf(' -> ')
    if (arrow !== -1) path = path.slice(arrow + 4)
    status.changes.push({ path, staged: x === ' ' ? '' : x, unstaged: y === ' ' ? '' : y })
  }
  return status
}

// ---------- repo discovery ----------
function hasGitDir(dir: string): boolean {
  return existsSync(join(dir, '.git'))
}

/**
 * Discover git repositories under a root: the root itself plus nested repos
 * up to two directory levels deep (skipping .git and node_modules). This is
 * what makes a multi-repo workspace (IDEA-style) work: one root, many repos —
 * including repos embedded inside another repository's subtree.
 */
async function discoverRepos(root: string): Promise<{ path: string; name: string }[]> {
  const found: string[] = []
  if (hasGitDir(root)) found.push(root)
  let subs: import('node:fs').Dirent[] = []
  try {
    subs = await readdir(root, { withFileTypes: true })
  } catch { /* unreadable root: nothing to discover */ }
  for (const sub of subs) {
    if (!sub.isDirectory()) continue
    if (sub.name === '.git' || sub.name === 'node_modules') continue
    const level1 = join(root, sub.name)
    if (hasGitDir(level1)) found.push(level1)
    let subs2: import('node:fs').Dirent[] = []
    try {
      subs2 = await readdir(level1, { withFileTypes: true })
    } catch { /* unreadable level: skip */ }
    for (const sub2 of subs2) {
      if (!sub2.isDirectory()) continue
      if (sub2.name === '.git' || sub2.name === 'node_modules') continue
      const level2 = join(level1, sub2.name)
      if (hasGitDir(level2)) found.push(level2)
    }
  }
  return found.map(path => ({ path, name: basename(path) }))
}

// ---------- endpoints ----------
async function repos(payload: { root?: unknown } | undefined): Promise<WireResult<{ repos: { path: string; name: string }[] }>> {
  const root = payload?.root
  if (typeof root !== 'string' || root.length === 0 || !isAbsolute(root)) {
    return fail('invalid-root', 'an absolute root path is required')
  }
  const items = await discoverRepos(root)
  return { ok: true, value: { repos: items } }
}

async function status(payload: { repo?: unknown } | undefined): Promise<WireResult<GitStatus>> {
  const repo = repoArg(payload?.repo)
  if (repo === null) return fail('invalid-repo', 'an absolute repository path is required')
  try {
    // Tracked changes come from porcelain; untracked FILES are enumerated
    // individually with `ls-files --others` (porcelain collapses a
    // wholly-untracked directory into one `?? dir/` entry). quotePath=false
    // keeps non-ASCII names (中文文件名等) raw instead of C-quoted.
    // Sequential: concurrent git processes contend for the index lock
    // on Windows ("index file open failed: Permission denied"). Porcelain,
    // untracked enumeration, and the two name-only diffs therefore run
    // one after another.
    const { stdout } = await runGit(repo, ['-c', 'core.quotePath=false', 'status', '--porcelain', '--branch'])
    const { stdout: untrackedOut } = await runGit(repo, ['-c', 'core.quotePath=false', 'ls-files', '--others', '--exclude-standard', '-z'])
    const result = parseStatus(stdout)
    for (const path of untrackedOut.split('\0')) {
      if (path.length === 0) continue
      result.changes.push({ path, staged: '', unstaged: '?' })
    }
    // Porcelain can list a tracked path whose unified diff has no hunks
    // (racy stat, `core.autocrlf`). Those rows render an empty right pane
    // after a full hunk rollback; drop them so the left list matches what
    // the diff view can show. Conflicts and untracked files stay.
    if (result.changes.some(c => c.unstaged !== '?' && !isConflictChange(c))) {
      const worktree = await runGit(repo, ['-c', 'core.quotePath=false', 'diff', '--name-only', '-z'])
      const cached = await runGit(repo, ['-c', 'core.quotePath=false', 'diff', '--cached', '--name-only', '-z'])
      const dirty = nulPaths(worktree.stdout)
      for (const path of nulPaths(cached.stdout)) dirty.add(path)
      result.changes = result.changes.filter(c => c.unstaged === '?' || isConflictChange(c) || dirty.has(c.path))
    }
    return { ok: true, value: result }
  } catch (error) {
    return fail('status-failed', error instanceof Error ? error.message : String(error))
  }
}

async function diff(payload: { repo?: unknown; file?: unknown; cached?: unknown } | undefined): Promise<WireResult<{ diff: string }>> {
  const repo = repoArg(payload?.repo)
  const file = fileArg(payload?.file)
  if (repo === null || file === null) return fail('invalid-args', 'repo and file are required')
  try {
    const args = ['diff']
    if (payload?.cached === true) args.push('--cached')
    args.push('--', file)
    const { stdout } = await runGit(repo, args)
    return { ok: true, value: { diff: stdout } }
  } catch (error) {
    return fail('diff-failed', error instanceof Error ? error.message : String(error))
  }
}

/** Windows CreateProcess caps the command line (~32k chars); large selections
 * (e.g. select-all on a fresh clone) must not overflow one git invocation.
 * 250 paths stay well under the limit (~12k chars) while keeping big
 * select-alls to a handful of git spawns. */
const PATH_CHUNK = 250

async function stage(payload: { repo?: unknown; paths?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const paths = pathsArg(payload?.paths)
  if (repo === null || paths === null) return fail('invalid-args', 'repo is required (paths optional)')
  try {
    if (paths.length === 0) {
      await runGit(repo, ['add', '-A'])
    } else {
      for (let i = 0; i < paths.length; i += PATH_CHUNK) {
        // -A: stage new + modified + DELETED paths (plain `add --`
        // would silently skip deletions), and descend into directories.
        await runGit(repo, ['add', '-A', '--', ...paths.slice(i, i + PATH_CHUNK)])
      }
    }
    return { ok: true, value: {} }
  } catch (error) {
    return fail('stage-failed', error instanceof Error ? error.message : String(error))
  }
}

async function unstage(payload: { repo?: unknown; paths?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const paths = pathsArg(payload?.paths)
  if (repo === null || paths === null) return fail('invalid-args', 'repo is required (paths optional)')
  try {
    if (paths.length === 0) {
      await runGit(repo, ['reset'])
    } else {
      for (let i = 0; i < paths.length; i += PATH_CHUNK) {
        await runGit(repo, ['reset', 'HEAD', '--', ...paths.slice(i, i + PATH_CHUNK)])
      }
    }
    return { ok: true, value: {} }
  } catch (error) {
    return fail('unstage-failed', error instanceof Error ? error.message : String(error))
  }
}

async function commit(payload: { repo?: unknown; message?: unknown; paths?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const message = messageArg(payload?.message)
  const paths = payload?.paths === undefined ? [] : pathsArg(payload?.paths)
  if (repo === null || message === null || paths === null) {
    return fail('invalid-args', 'repo and a non-empty message are required (paths optional)')
  }
  try {
    if (paths.length === 0) {
      // No paths: commit everything currently staged.
      await runGit(repo, ['commit', '-m', message])
      return { ok: true, value: {} }
    }
    // A selection can be thousands of paths (e.g. the initial import of a
    // fresh repo), far past the Windows CreateProcess command-line cap
    // (~32K chars). Split it into chunks and commit each chunk as its own
    // commit with the same message — one git invocation per chunk, so no
    // invocation ever overflows. On failure the earlier chunks stay
    // committed, so the error reports exactly how far the batch got.
    for (let i = 0; i < paths.length; i += PATH_CHUNK) {
      const chunk = paths.slice(i, i + PATH_CHUNK)
      try {
        await runGit(repo, ['commit', '-m', message, '--', ...chunk])
      } catch (error) {
        const why = error instanceof Error ? error.message : String(error)
        return fail('commit-failed', `已提交 ${i}/${paths.length} 个文件后失败: ${why}`)
      }
    }
    return { ok: true, value: {} }
  } catch (error) {
    return fail('commit-failed', error instanceof Error ? error.message : String(error))
  }
}

async function push(payload: { repo?: unknown } | undefined): Promise<WireResult<{ output: string }>> {
  const repo = repoArg(payload?.repo)
  if (repo === null) return fail('invalid-repo', 'an absolute repository path is required')
  try {
    const { stdout, stderr } = await runGit(repo, ['push'])
    return { ok: true, value: { output: (stdout + stderr).trim() } }
  } catch (error) {
    return fail('push-failed', error instanceof Error ? error.message : String(error))
  }
}

async function pull(payload: { repo?: unknown } | undefined): Promise<WireResult<{ output: string }>> {
  const repo = repoArg(payload?.repo)
  if (repo === null) return fail('invalid-repo', 'an absolute repository path is required')
  try {
    const { stdout, stderr } = await runGit(repo, ['pull'])
    return { ok: true, value: { output: (stdout + stderr).trim() } }
  } catch (error) {
    return fail('pull-failed', error instanceof Error ? error.message : String(error))
  }
}

async function revertFile(payload: { repo?: unknown; file?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const file = fileArg(payload?.file)
  if (repo === null || file === null) return fail('invalid-args', 'repo and file are required')
  try {
    await runGit(repo, ['checkout', 'HEAD', '--', file])
    return { ok: true, value: {} }
  } catch (error) {
    return fail('revert-failed', error instanceof Error ? error.message : String(error))
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
function applyReverseHunk(filePath: string, hunk: string): void {
  const content = readFileSync(filePath, 'utf8')
  // Line endings are judged PER LINE, not per file: git's diff output is
  // LF-normalized (autocrlf) while the worktree file can be CRLF, LF, or
  // even mixed (e.g. an LF body with a trailing CRLF), so a whole-file
  // `hasCrlf` flag makes every LF line mismatch once any CRLF exists.
  const lines = content.split('\n')
  const lineEol = (idx: number): string => (lines[idx]?.endsWith('\r') ? '\r' : '')
  // The reverse walk starts at the NEW-side line (`+N`): that is the first
  // current-file line this hunk (or one change-block inside it) touches.
  // `@@ -N` is the old-file start and drifts once an earlier block in the
  // same hunk added or removed lines.
  const startMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(hunk) ?? /^@@ -(\d+)/.exec(hunk)
  let cur = startMatch ? parseInt(startMatch[startMatch.length - 1] ?? '1', 10) - 1 : 0
  const hunkLines = hunk.split('\n')
  const stripCr = (value: string): string => (value.endsWith('\r') ? value.slice(0, -1) : value)
  const plusTexts = new Set(
    hunkLines.filter(line => line.startsWith('+')).map(line => stripCr(line.slice(1))),
  )
  // `\ No newline at end of file` belongs to the preceding +/- line. A
  // restored `-` line with that marker is the old last line (no trailing
  // newline); a removed `+` line with that marker (and no such `-`) puts
  // the trailing newline back.
  let wantTrailing: boolean | undefined
  for (let i = 0; i < hunkLines.length; i++) {
    const raw = hunkLines[i] ?? ''
    if (raw.startsWith('@@')) continue
    if (raw === '' || raw === '\\ No newline at end of file') continue
    const noNewline = hunkLines[i + 1] === '\\ No newline at end of file'
    const marker = raw.charAt(0)
    const text = raw.slice(1)
    if (marker === ' ') {
      const current = lines[cur] ?? ''
      // Accept the line with or without the trailing \r (the diff text
      // is LF-normalized) and keep the current line exactly as it is.
      if (current !== text && current !== `${text}\r`) {
        throw new Error(`patch context mismatch at line ${cur + 1}`)
      }
      cur += 1
    } else if (marker === '-') {
      // Same text also appears as a `+` line: the edit is CR/LF only, so
      // restore the index (LF) form. Otherwise keep the worktree's EOL.
      const restored = plusTexts.has(stripCr(text)) ? stripCr(text) : `${text}${lineEol(cur)}`
      lines.splice(cur, 0, restored)
      if (noNewline) wantTrailing = false
      cur += 1
    } else if (marker === '+') {
      lines.splice(cur, 1)
      if (noNewline && wantTrailing === undefined) wantTrailing = true
    } else {
      throw new Error(`unexpected patch line: ${raw.slice(0, 40)}`)
    }
  }
  // split("\n") leaves a trailing "" element when the file ended with a
  // newline; drop it before rejoining so the trailing newline is not doubled.
  const hadTrailing = content.endsWith('\n')
  const trailing = wantTrailing ?? hadTrailing
  if (hadTrailing && lines[lines.length - 1] === '') lines.pop()
  if (!trailing && lines.length > 0 && (lines[lines.length - 1] ?? '').endsWith('\r')) {
    const last = lines[lines.length - 1] ?? ''
    lines[lines.length - 1] = last.slice(0, -1)
  }
  writeFileSync(filePath, trailing ? `${lines.join('\n')}\n` : lines.join('\n'), 'utf8')
}

/** True when `git diff` stdout contains at least one unified-diff hunk. */
function diffHasHunk(stdout: string): boolean {
  return /(^|\n)@@ /.test(stdout)
}

async function revertHunk(payload: { repo?: unknown; file?: unknown; hunk?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const file = fileArg(payload?.file)
  const hunk = payload?.hunk
  if (repo === null || file === null || typeof hunk !== 'string' || !hunk.startsWith('@@')) {
    return fail('invalid-args', 'repo, file and a valid hunk are required')
  }
  try {
    applyReverseHunk(join(repo, file), hunk)
    // Stat/CRLF dirt can leave `git status` listing a path whose `git diff`
    // has no hunks. Restore the HEAD copy so a fully rolled-back file
    // drops out of the change list.
    const worktree = await runGit(repo, ['diff', '--', file])
    const cached = await runGit(repo, ['diff', '--cached', '--', file])
    if (!diffHasHunk(worktree.stdout) && !diffHasHunk(cached.stdout)) {
      await runGit(repo, ['checkout', 'HEAD', '--', file])
    }
    return { ok: true, value: {} }
  } catch (error) {
    return fail('revert-hunk-failed', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Stage one unified-diff hunk into the index (`git apply --cached`), IDEA-style
 * line/block staging. The worktree is left unchanged; only the index advances.
 */
async function stageHunk(payload: { repo?: unknown; file?: unknown; hunk?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const file = fileArg(payload?.file)
  const hunk = payload?.hunk
  if (repo === null || file === null || typeof hunk !== 'string' || !hunk.startsWith('@@')) {
    return fail('invalid-args', 'repo, file and a valid hunk are required')
  }
  try {
    const normalized = file.replace(/\\/g, '/')
    const body = hunk.endsWith('\n') ? hunk : `${hunk}\n`
    const patch = [
      `diff --git a/${normalized} b/${normalized}`,
      `--- a/${normalized}`,
      `+++ b/${normalized}`,
      body,
    ].join('\n')
    await runGitStdin(repo, ['apply', '--cached', '--unidiff-zero', '--whitespace=nowarn', '-'], patch)
    return { ok: true, value: {} }
  } catch (error) {
    return fail('stage-hunk-failed', error instanceof Error ? error.message : String(error))
  }
}

async function resolveSide(payload: { repo?: unknown; file?: unknown } | undefined, side: 'ours' | 'theirs'): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const file = fileArg(payload?.file)
  if (repo === null || file === null) return fail('invalid-args', 'repo and file are required')
  try {
    await runGit(repo, ['checkout', `--${side}`, '--', file])
    await runGit(repo, ['add', '--', file])
    return { ok: true, value: {} }
  } catch (error) {
    return fail('resolve-failed', error instanceof Error ? error.message : String(error))
  }
}

async function markResolved(payload: { repo?: unknown; file?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const file = fileArg(payload?.file)
  if (repo === null || file === null) return fail('invalid-args', 'repo and file are required')
  try {
    await runGit(repo, ['add', '--', file])
    return { ok: true, value: {} }
  } catch (error) {
    return fail('resolve-failed', error instanceof Error ? error.message : String(error))
  }
}

/** Delete one worktree file (untracked-file 删除 button); path stays repo-relative. */
async function deleteFile(payload: { repo?: unknown; file?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const file = fileArg(payload?.file)
  if (repo === null || file === null) return fail('invalid-args', 'repo and file are required')
  try {
    await rm(join(repo, file), { force: true })
    return { ok: true, value: {} }
  } catch (error) {
    return fail('delete-failed', error instanceof Error ? error.message : String(error))
  }
}

/** Stash all workspace changes with a mandatory message. */
async function stash(payload: { repo?: unknown; message?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  const message = messageArg(payload?.message)
  if (repo === null || message === null) return fail('invalid-args', 'repo and a non-empty stash message are required')
  try {
    await runGit(repo, ['stash', 'push', '-m', message])
    return { ok: true, value: {} }
  } catch (error) {
    return fail('stash-failed', error instanceof Error ? error.message : String(error))
  }
}

/**
 * Roll back every change in the 更改 group: unstage everything staged (added
 * files fall back to untracked, content kept) and discard the worktree
 * changes of tracked files. Untracked files are never touched.
 */
async function revertAll(payload: { repo?: unknown } | undefined): Promise<WireResult<{}>> {
  const repo = repoArg(payload?.repo)
  if (repo === null) return fail('invalid-repo', 'an absolute repository path is required')
  try {
    const { stdout: stagedOut } = await runGit(repo, ['diff', '--cached', '--name-only', '-z'])
    const staged = stagedOut.split('\0').filter(p => p.length > 0)
    if (staged.length > 0) {
      await runGit(repo, ['reset'])
    }
    const { stdout: unstagedOut } = await runGit(repo, ['diff', '--name-only', '-z'])
    const unstaged = unstagedOut.split('\0').filter(p => p.length > 0)
    if (unstaged.length > 0) {
      for (let i = 0; i < unstaged.length; i += PATH_CHUNK) {
        await runGit(repo, ['checkout', 'HEAD', '--', ...unstaged.slice(i, i + PATH_CHUNK)])
      }
    }
    return { ok: true, value: {} }
  } catch (error) {
    return fail('revert-failed', error instanceof Error ? error.message : String(error))
  }
}

// ---------- plugin body ----------
/** The host context surface this plugin reads (structural). */
interface HostContext {
  effect(fn: () => unknown, label?: string): unknown
  connection: {
    rpc: {
      handle(
        route: string,
        handler: (endpoint: string, payload: unknown) => Promise<WireResult<unknown>>,
        options: { authority: string },
      ): () => void
    }
  }
}

/**
 * Plugin body: mount the `/dsh-erebus-git` shared RPC channel for the lifetime of
 * this fiber. Unloading the row removes it.
 * @param ctx - host cordis context.
 */
export function apply(ctx: HostContext): void {
  ctx.effect(() => ctx.connection.rpc.handle('/dsh-erebus-git', async (endpoint, payload) => {
    const p = payload as Record<string, unknown> | undefined
    switch (endpoint) {
      case 'repos':
        return await repos(p)
      case 'status':
        return await status(p)
      case 'diff':
        return await diff(p)
      case 'stage':
        return await stage(p)
      case 'unstage':
        return await unstage(p)
      case 'commit':
        return await commit(p)
      case 'push':
        return await push(p)
      case 'pull':
        return await pull(p)
      case 'revertFile':
        return await revertFile(p)
      case 'revertHunk':
        return await revertHunk(p)
      case 'stageHunk':
        return await stageHunk(p)
      case 'resolveOurs':
        return await resolveSide(p, 'ours')
      case 'resolveTheirs':
        return await resolveSide(p, 'theirs')
      case 'markResolved':
        return await markResolved(p)
      case 'deleteFile':
        return await deleteFile(p)
      case 'stash':
        return await stash(p)
      case 'revertAll':
        return await revertAll(p)
      default:
        return fail('unknown-endpoint', `unknown endpoint ${endpoint}`)
    }
  }, { authority: 'loopback' }), 'dsh-erebus-git: rpc channel')
}

export default { apply, inject }

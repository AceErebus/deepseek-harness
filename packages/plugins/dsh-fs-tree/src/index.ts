// dsh-fs-tree host half: a loopback-fenced directory-listing RPC channel plus
// a loopback-fenced static asset route for the browser half's third-party
// library (mammoth, for docx preview).
//
// The loader applies this module as a plain `{ apply, inject }` cordis
// plugin (the same shape `@deepseek-ai/dsh-client-connection` uses). It has
// zero runtime dependencies beyond Node builtins.
//
// The channel is registered through `ctx.connection.rpc.handle` with
// `authority: "loopback"`, which makes the Connection node half wrap the
// route in its DNS-rebinding browser-trust fence — exactly the protection
// the privileged `/api` methods get. Only the local browser can list paths.
//
// The asset route is registered directly on the web server and re-checks the
// same loopback/origin invariant itself before serving anything.
//
// Wire contract (shared-channel envelope):
//   POST /fs-tree/list  { path }  ->  { ok: true,  value: { path, entries, truncated } }
//                                    { ok: false, error: { code, message } }
//   POST /fs-tree/home  {}        ->  { ok: true,  value: { path } }
//   POST /fs-tree/read  { path }  ->  { ok: true,  value: { path, text, truncated, size, mtimeMs }
//                                       | { path, binary: true, size, base64, mtimeMs }     (≤ 32 MiB)
//                                       | { path, binary: true, size, tooLarge: true, mtimeMs } (> 32 MiB) }
//                                    { ok: false, error: { code, message } }
//   POST /fs-tree/write { path, content } ->  { ok: true, value: { path } }  (UTF-8 text, ≤ 16 MiB)
//                                    { ok: false, error: { code, message } }
//   POST /fs-tree/stat  { path }     ->  { ok: true,  value: { exists, kind?, size?, mtimeMs? } }
//                                    { ok: false, error: { code, message } }
// GET  /fs-tree-assets/<name>     ->  whitelisted asset bytes (loopback + origin checked)
// GET  /fs-tree-raw?path=<abs>    ->  media bytes streamed with Range support
//                                    (images/audio/video; loopback + origin checked)
//   POST /fs-tree/reveal { path }  ->  { ok: true, value: { path } }  (open in the OS file manager)
//                                    { ok: false, error: { code, message } }
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createReadStream, unlinkSync, writeFileSync, type Dirent, type Stats } from 'node:fs'
import { readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, extname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir, tmpdir } from 'node:os'

/** Services required before this plugin applies. */
export const inject = ['connection', 'webServer', 'workspaceRegistry']

/** Per-level listing bound: a huge directory must not flood the wire. */
const MAX_ENTRIES = 2000

/** Per-read text cap: previews stream at most this many bytes. */
const MAX_TEXT_BYTES = 512 * 1024

/** Per-read binary cap: base64 previews (pdf/docx) stream at most this many bytes. */
const MAX_BINARY_PREVIEW_BYTES = 32 * 1024 * 1024

/** Per-write cap: saved text files may be at most this many UTF-8 bytes. */
const MAX_WRITE_BYTES = 16 * 1024 * 1024

/** Static assets served to the browser half (same directory as this module). */
const ASSETS_DIR = fileURLToPath(new URL('./assets/', import.meta.url))
const ASSET_MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}
const ASSET_WHITELIST = new Set(['mammoth.browser.min.js', 'xlsx.full.min.js'])

/** Media MIME types served by the raw streaming route (only these extensions). */
const RAW_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.ogv': 'video/ogg',
}

/** The shared-channel wire envelope: a successful value or an error. */
interface WireOk<T> { ok: true; value: T }
interface WireFail { ok: false; error: { code: string; message: string } }
type WireResult<T> = WireOk<T> | WireFail

/** One listed directory entry. */
interface ListEntry { name: string; kind: 'dir' | 'file' | 'other'; hidden: boolean }

/** The `/fs-tree` shared-channel payload of one endpoint (every field optional). */
interface EndpointPayload { [key: string]: unknown }

/** Build a wire error result. */
function fail(code: string, message: string): WireFail {
  return { ok: false, error: { code, message } }
}

/** Normalize a caught unknown into a message string. */
function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Read an optional error code (Node errno codes like ENOENT). */
function errCode(error: unknown): string | undefined {
  return (error as { code?: string }).code
}

/**
 * Same-origin loopback gate for the asset route: the request must come from
 * a loopback authority, and a present Origin must match the Host (the
 * DNS-rebinding defense the /api fence applies).
 */
function isLoopbackRequest(req: IncomingMessage): boolean {
  const host = String(req.headers?.host ?? '')
  const hostname = host.split(':')[0].toLowerCase().replace(/^\[|\]$/g, '')
  const loopback = hostname === 'localhost' || hostname === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  if (!loopback) return false
  const origin = req.headers?.origin
  if (origin) {
    try {
      const url = new URL(origin)
      if (url.host !== host) return false
    } catch {
      return false
    }
  }
  return true
}

/** Serve one whitelisted asset from the package's assets directory. */
async function serveAsset(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }
  if (!isLoopbackRequest(req)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  const name = pathname.startsWith('/fs-tree-assets/') ? pathname.slice('/fs-tree-assets/'.length) : ''
  if (!ASSET_WHITELIST.has(name)) {
    res.writeHead(404)
    res.end()
    return
  }
  try {
    const body = await readFile(join(ASSETS_DIR, name))
    res.writeHead(200, {
      'content-type': ASSET_MIME[extname(name)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
      'content-length': body.length,
    })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end()
  }
}

/**
 * Stream media bytes (images/audio/video) with HTTP Range support so large
 * files play inline without the base64 cap and seeking works. Only media
 * extensions are served; the loopback + origin fence applies.
 */
async function serveRaw(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }
  if (!isLoopbackRequest(req)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  const url = new URL(req.url ?? '/', 'http://x')
  const path = url.searchParams.get('path')
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    res.writeHead(400)
    res.end()
    return
  }
  let resolved: string
  try {
    resolved = await realpath(path)
  } catch {
    res.writeHead(404)
    res.end()
    return
  }
  let info: Stats
  try {
    info = await stat(resolved)
  } catch {
    res.writeHead(404)
    res.end()
    return
  }
  if (!info.isFile()) {
    res.writeHead(404)
    res.end()
    return
  }
  const mime = RAW_MIME[extname(resolved).toLowerCase()]
  if (mime === undefined) {
    res.writeHead(415)
    res.end()
    return
  }
  // Single-range byte serving (what media players send for seeking).
  const range = req.headers?.range
  if (typeof range === 'string') {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (match) {
      const start = match[1] === '' ? null : parseInt(match[1], 10)
      const end = match[2] === '' ? null : parseInt(match[2], 10)
      if (start !== null && Number.isFinite(start) && start < info.size) {
        const s = start
        const e = end !== null && Number.isFinite(end) ? Math.min(end, info.size - 1) : Math.min(info.size - 1, s + 1024 * 1024)
        res.writeHead(206, {
          'content-type': mime,
          'content-range': `bytes ${s}-${e}/${info.size}`,
          'content-length': e - s + 1,
          'accept-ranges': 'bytes',
          'cache-control': 'no-cache',
        })
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        const stream = createReadStream(resolved, { start: s, end: e })
        stream.on('error', () => res.destroy())
        stream.pipe(res)
        return
      }
    }
    res.writeHead(416, { 'content-range': `bytes */${info.size}` })
    res.end()
    return
  }
  res.writeHead(200, {
    'content-type': mime,
    'content-length': info.size,
    'accept-ranges': 'bytes',
    'cache-control': 'no-cache',
  })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = createReadStream(resolved)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

/** List one directory level: canonicalized path, entries sorted directories-first. */
async function list(payload: EndpointPayload | undefined): Promise<WireResult<{ path: string; entries: ListEntry[]; truncated: boolean }>> {
  const path = payload?.path
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    return fail('invalid-path', 'an absolute path is required')
  }
  let resolved: string
  try {
    resolved = await realpath(path)
  } catch (error) {
    return fail(errCode(error) === 'ENOENT' ? 'not-found' : 'read-failed', errMessage(error))
  }
  let info: Stats
  try {
    info = await stat(resolved)
  } catch (error) {
    return fail('read-failed', errMessage(error))
  }
  if (!info.isDirectory()) return fail('not-directory', 'not a directory')
  let dirents: Dirent[]
  try {
    dirents = await readdir(resolved, { withFileTypes: true })
  } catch (error) {
    return fail('read-failed', errMessage(error))
  }
  const entries: ListEntry[] = dirents.map(entry => ({
    name: entry.name,
    kind: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other',
    hidden: entry.name.startsWith('.'),
  }))
  entries.sort((a, b) => {
    const da = a.kind === 'dir' ? 0 : 1
    const db = b.kind === 'dir' ? 0 : 1
    if (da !== db) return da - db
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })
  return {
    ok: true,
    value: {
      path: resolved,
      entries: entries.slice(0, MAX_ENTRIES),
      truncated: entries.length > MAX_ENTRIES,
    },
  }
}

/** The host account's home directory (the explorer's fallback default root). */
function home(): WireResult<{ path: string }> {
  return { ok: true, value: { path: homedir() } }
}

/** A file read result: text, binary base64, or too-large binary. */
type ReadValue =
	| { path: string; text: string; truncated: boolean; size: number; mtimeMs: number }
	| { path: string; binary: true; size: number; base64: string; mtimeMs: number }
	| { path: string; binary: true; size: number; tooLarge: true; mtimeMs: number }

/**
 * Read one file: UTF-8 text capped at MAX_TEXT_BYTES; binary files (NUL
 * detected) return base64 up to MAX_BINARY_PREVIEW_BYTES for in-page
 * preview (pdf/docx), or a tooLarge flag beyond that cap. All variants carry
 * mtimeMs so consumers can cache/refetch by modification time.
 */
async function read(payload: EndpointPayload | undefined): Promise<WireResult<ReadValue>> {
  const path = payload?.path
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    return fail('invalid-path', 'an absolute path is required')
  }
  let resolved: string
  try {
    resolved = await realpath(path)
  } catch (error) {
    return fail(errCode(error) === 'ENOENT' ? 'not-found' : 'read-failed', errMessage(error))
  }
  let info: Stats
  try {
    info = await stat(resolved)
  } catch (error) {
    return fail('read-failed', errMessage(error))
  }
  if (!info.isFile()) return fail('not-file', 'not a file')
  let buffer: Buffer
  try {
    buffer = await readFile(resolved)
  } catch (error) {
    return fail('read-failed', errMessage(error))
  }
  const truncated = buffer.length > MAX_TEXT_BYTES
  const slice = truncated ? buffer.subarray(0, MAX_TEXT_BYTES) : buffer
  if (slice.includes(0)) {
    if (buffer.length > MAX_BINARY_PREVIEW_BYTES) {
      return { ok: true, value: { path: resolved, binary: true, size: buffer.length, tooLarge: true, mtimeMs: info.mtimeMs } }
    }
    return { ok: true, value: { path: resolved, binary: true, size: buffer.length, base64: buffer.toString('base64'), mtimeMs: info.mtimeMs } }
  }
  return { ok: true, value: { path: resolved, text: slice.toString('utf8'), truncated, size: buffer.length, mtimeMs: info.mtimeMs } }
}

/**
 * Write one text file as UTF-8, atomically (temp file + rename). Creates the
 * file when it does not exist; the parent directory must exist.
 */
async function write(payload: EndpointPayload | undefined): Promise<WireResult<{ path: string }>> {
  const path = payload?.path
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    return fail('invalid-path', 'an absolute path is required')
  }
  const content = payload?.content
  if (typeof content !== 'string') return fail('invalid-content', 'content must be a string')
  if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES) {
    return fail('content-too-large', `content exceeds ${MAX_WRITE_BYTES} bytes`)
  }
  let resolved: string | null
  try {
    resolved = await realpath(path)
  } catch (error) {
    if (errCode(error) !== 'ENOENT') return fail('write-failed', errMessage(error))
    resolved = null // new file
  }
  if (resolved !== null) {
    let info: Stats
    try {
      info = await stat(resolved)
    } catch (error) {
      return fail('write-failed', errMessage(error))
    }
    if (!info.isFile()) return fail('not-file', 'not a file')
  } else {
    try {
      await realpath(dirname(path))
    } catch {
      return fail('parent-missing', 'parent directory does not exist')
    }
    resolved = path
  }
  const tmp = `${resolved}.dsh-fs-tree-tmp-${randomUUID()}`
  try {
    await writeFile(tmp, content, 'utf8')
    await rename(tmp, resolved)
  } catch (error) {
    try {
      await rm(tmp, { force: true })
    } catch { /* best effort */ }
    return fail('write-failed', errMessage(error))
  }
  return { ok: true, value: { path: resolved } }
}

/** A stat result: existence plus optional kind/size/mtime for existing paths. */
interface StatValue { exists: boolean; kind?: string; size?: number; mtimeMs?: number }

/**
 * Existence/kind probe: lightweight check used by the conversation path
 * clicker before navigating. `exists: false` is a successful answer, not an
 * error.
 */
async function statFile(payload: EndpointPayload | undefined): Promise<WireResult<StatValue>> {
  const path = payload?.path
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    return fail('invalid-path', 'an absolute path is required')
  }
  let resolved: string
  try {
    resolved = await realpath(path)
  } catch (error) {
    if (errCode(error) === 'ENOENT') return { ok: true, value: { exists: false } }
    return fail('stat-failed', errMessage(error))
  }
  let info: Stats
  try {
    info = await stat(resolved)
  } catch (error) {
    if (errCode(error) === 'ENOENT') return { ok: true, value: { exists: false } }
    return fail('stat-failed', errMessage(error))
  }
  return {
    ok: true,
    value: {
      exists: true,
      kind: info.isFile() ? 'file' : info.isDirectory() ? 'dir' : 'other',
      size: info.size,
      mtimeMs: info.mtimeMs,
    },
  }
}

/**
 * Reveal a file or directory in the OS file manager (Explorer / Finder /
 * file manager), with the item selected where the platform supports it.
 */
async function reveal(payload: EndpointPayload | undefined): Promise<WireResult<{ path: string }>> {
  const path = payload?.path
  if (typeof path !== 'string' || path.length === 0 || !isAbsolute(path)) {
    return fail('invalid-path', 'an absolute path is required')
  }
  let resolved: string
  try {
    resolved = await realpath(path)
  } catch (error) {
    return fail(errCode(error) === 'ENOENT' ? 'not-found' : 'reveal-failed', errMessage(error))
  }
  let info: Stats
  try {
    info = await stat(resolved)
  } catch (error) {
    return fail('reveal-failed', errMessage(error))
  }
  try {
    if (process.platform === 'win32') {
      // explorer.exe only cooperates when launched through ShellExecute:
      // a direct CreateProcess (Node `spawn`) is silently ignored — no
      // window appears, whatever the argument quoting. PowerShell may be
      // no-op'd by third-party security suites when spawned from a
      // background process (both -Command and -EncodedCommand exit 0
      // without ever running). cscript.exe (the system script host)
      // runs reliably, but it requires a script *file* — it does not
      // read stdin. So we write a tiny JScript to the temp dir and
      // delete it when cscript exits. WScript.Shell.Run() performs the
      // ShellExecute for us.
      const jsPath = resolved
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
      const jscript = [
        'try {',
        '  var w = new ActiveXObject("WScript.Shell");',
        `  var r = w.Run('explorer /select,"${jsPath}"', 1, false);`,
        '  WScript.Echo("RUN-RETURN " + r);',
        '} catch (e) {',
        '  WScript.Echo("JS-ERR " + e.number + " " + e.message);',
        '}',
      ].join(' ')
      const scriptFile = join(tmpdir(), `dsh-reveal-${randomUUID()}.js`)
      writeFileSync(scriptFile, jscript, 'utf8')
      const child = spawn('cscript.exe', ['//nologo', '//e:jscript', scriptFile], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })
      child.stdout?.on('data', () => { /* drain */ })
      child.stderr?.on('data', () => { /* drain */ })
      child.on('error', () => {
        try { unlinkSync(scriptFile) } catch { /* best effort */ }
      })
      child.on('exit', () => {
        try { unlinkSync(scriptFile) } catch { /* best effort */ }
      })
      child.unref()
    } else if (process.platform === 'darwin') {
      const child = spawn('open', ['-R', resolved], { detached: true, stdio: 'ignore' })
      child.unref()
    } else if (process.platform === 'linux') {
      const target = info.isDirectory() ? resolved : dirname(resolved)
      const child = spawn('xdg-open', [target], { detached: true, stdio: 'ignore' })
      child.unref()
    } else {
      return fail('unsupported', `reveal is unsupported on ${process.platform}`)
    }
  } catch (error) {
    return fail('reveal-failed', errMessage(error))
  }
  return { ok: true, value: { path: resolved } }
}

/**
 * The host context surface this plugin reads. Structural: the runtime's full
 * cordis Context carries far more; only the members used are declared.
 */
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
  webServer: {
    register(route: { kind: 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void
  }
  workspaceRegistry?: {
    list(): { id: unknown; title: unknown; path: unknown }[]
  }
}

/**
 * Plugin body: mount the `/fs-tree` shared RPC channel and the asset route
 * for the lifetime of this fiber. Unloading the row removes both.
 * @param ctx - host cordis context.
 */
export function apply(ctx: HostContext): void {
  ctx.effect(() => ctx.connection.rpc.handle('/fs-tree', async (endpoint, payload) => {
    switch (endpoint) {
      case 'list':
        return await list(payload as EndpointPayload | undefined)
      case 'home':
        return home()
      case 'read':
        return await read(payload as EndpointPayload | undefined)
      case 'write':
        return await write(payload as EndpointPayload | undefined)
      case 'stat':
        return await statFile(payload as EndpointPayload | undefined)
      case 'reveal':
        return await reveal(payload as EndpointPayload | undefined)
      case 'workspaces': {
        // The dsh workspace registry (fail-soft: no registry, empty list).
        try {
          const registry = ctx.workspaceRegistry
          if (!registry || typeof registry.list !== 'function') return { ok: true, value: { items: [] } }
          const items = registry.list().map(w => ({
            id: String(w.id),
            title: String(w.title),
            path: String(w.path),
          }))
          return { ok: true, value: { items } }
        } catch (error) {
          return fail('workspaces-failed', errMessage(error))
        }
      }
      default:
        return fail('unknown-endpoint', `unknown endpoint ${endpoint}`)
    }
  }, { authority: 'loopback' }), 'fs-tree: rpc channel')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/fs-tree-assets',
    handler: serveAsset,
  }), 'fs-tree: asset route')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/fs-tree-raw',
    handler: serveRaw,
  }), 'fs-tree: raw media route')
}

export default { apply, inject }

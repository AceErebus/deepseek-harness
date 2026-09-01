// dsh-file-editor host half: serves the prebuilt CodeMirror 6 bundle to the
// browser half through a loopback-fenced static asset route.
//
// The loader applies this module as a plain `{ apply, inject }` cordis
// plugin. No RPC endpoints live here — reading and writing files go through
// the dsh-fs-tree core plugin's `/fs-tree` channel; this half only ships the
// editor library locally (no CDN, no build step at install time).
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Services required before this plugin applies. */
export const inject = ['webServer']

/** Static assets served to the browser half (same directory as this module). */
const ASSETS_DIR = fileURLToPath(new URL('./assets/', import.meta.url))
const ASSET_MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}
const ASSET_WHITELIST = new Set(['cm6.bundle.js'])

/** Same-origin loopback gate (the /api fence's invariant, re-checked here). */
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
  const name = pathname.startsWith('/file-editor-assets/') ? pathname.slice('/file-editor-assets/'.length) : ''
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
 * The host context surface this plugin reads. Structural: the runtime's full
 * cordis Context carries far more; only the members used are declared.
 */
interface HostContext {
  effect(fn: () => unknown, label?: string): unknown
  webServer: {
    register(route: { kind: 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }): () => void
  }
}

/**
 * Plugin body: mount the asset route for the lifetime of this fiber.
 * @param ctx - host cordis context.
 */
export function apply(ctx: HostContext): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/file-editor-assets',
    handler: serveAsset,
  }), 'file-editor: asset route')
}

export default { apply, inject }

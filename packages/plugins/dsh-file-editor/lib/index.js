import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/index.ts
/** Services required before this plugin applies. */
const inject = ["webServer"];
/** Static assets served to the browser half (same directory as this module). */
const ASSETS_DIR = fileURLToPath(new URL("./assets/", import.meta.url));
const ASSET_MIME = {
	".js": "text/javascript; charset=utf-8",
	".wasm": "application/wasm",
	".json": "application/json; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".map": "application/json; charset=utf-8"
};
const ASSET_WHITELIST = new Set(["cm6.bundle.js"]);
/** Same-origin loopback gate (the /api fence's invariant, re-checked here). */
function isLoopbackRequest(req) {
	const host = String(req.headers?.host ?? "");
	const hostname = host.split(":")[0].toLowerCase().replace(/^\[|\]$/g, "");
	if (!(hostname === "localhost" || hostname === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname))) return false;
	const origin = req.headers?.origin;
	if (origin) try {
		if (new URL(origin).host !== host) return false;
	} catch {
		return false;
	}
	return true;
}
/** Serve one whitelisted asset from the package's assets directory. */
async function serveAsset(req, res) {
	if (req.method !== "GET" && req.method !== "HEAD") {
		res.writeHead(405);
		res.end();
		return;
	}
	if (!isLoopbackRequest(req)) {
		res.writeHead(403);
		res.end("forbidden");
		return;
	}
	const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
	const name = pathname.startsWith("/file-editor-assets/") ? pathname.slice(20) : "";
	if (!ASSET_WHITELIST.has(name)) {
		res.writeHead(404);
		res.end();
		return;
	}
	try {
		const body = await readFile(join(ASSETS_DIR, name));
		res.writeHead(200, {
			"content-type": ASSET_MIME[extname(name)] ?? "application/octet-stream",
			"cache-control": "no-cache",
			"content-length": body.length
		});
		res.end(body);
	} catch {
		res.writeHead(404);
		res.end();
	}
}
/**
* Plugin body: mount the asset route for the lifetime of this fiber.
* @param ctx - host cordis context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/file-editor-assets",
		handler: serveAsset
	}), "file-editor: asset route");
}
var src_default = {
	apply,
	inject
};
//#endregion
export { apply, src_default as default, inject };

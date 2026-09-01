import { createReadStream, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
//#region src/range.js
function parseSingleRange(value, size) {
	if (value === void 0) return null;
	if (!value.startsWith("bytes=") || value.includes(",")) return false;
	const match = /^bytes=(\d*)-(\d*)$/.exec(value);
	if (match === null || match[1] === "" && match[2] === "") return false;
	let start;
	let end;
	if (match[1] === "") {
		const suffix = Number(match[2]);
		if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
		start = Math.max(0, size - suffix);
		end = size - 1;
	} else {
		start = Number(match[1]);
		end = match[2] === "" ? size - 1 : Number(match[2]);
		if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return false;
		if (start >= size || end < start) return false;
		end = Math.min(end, size - 1);
	}
	return {
		start,
		end
	};
}
//#endregion
//#region src/index.js
const PACKAGE_ID = "dsh-erebus-skin";
const ASSET_PREFIX = `/plugins/${PACKAGE_ID}/assets/`;
const ASSET_SPECS = [
	["liang/liang-evolution.webm", "video/webm"],
	["liang/liang-evolution.mp4", "video/mp4"],
	["liang/liang-poster.png", "image/png"],
	["liang/portrait-source-v2/stage-00.png", "image/png"],
	["liang/portrait-source-v2/level-01.png", "image/png"],
	["liang/portrait-source-v2/level-03.png", "image/png"],
	["liang/portrait-source-v2/level-04.png", "image/png"],
	["liang/portrait-source-v2/stage-06.png", "image/png"],
	["liang/portrait-source-v2/level-07.png", "image/png"],
	["liang/portrait-source-v2/level-09.png", "image/png"],
	["liang/portrait-source-v2/level-10.png", "image/png"],
	["liang/portrait-source-v2/stage-12.png", "image/png"],
	["liang/portrait-source-v2/level-13.png", "image/png"],
	["liang/portrait-source-v2/level-14.png", "image/png"],
	["liang/portrait-source-v2/bridge-15.png", "image/png"],
	["liang/portrait-source-v2/level-16.png", "image/png"],
	["liang/portrait-source-v2/level-17.png", "image/png"],
	["liang/portrait-source-v2/stage-18.png", "image/png"],
	["liang/portrait-source-v2/level-19.png", "image/png"],
	["liang/portrait-source-v2/level-21.png", "image/png"],
	["liang/portrait-source-v2/level-22.png", "image/png"],
	["liang/portrait-source-v2/stage-24.png", "image/png"],
	["liang/portrait-source-v2/level-25.png", "image/png"],
	["liang/portrait-source-v2/bridge-27.png", "image/png"],
	["liang/portrait-source-v2/level-28.png", "image/png"],
	["liang/portrait-source-v2/level-29.png", "image/png"],
	["liang/portrait-source-v2/stage-30.png", "image/png"]
];
function send(res, status, headers = {}) {
	res.writeHead(status, {
		"X-Content-Type-Options": "nosniff",
		...headers
	});
	res.end();
}
function buildAssets() {
	const assetDirectory = fileURLToPath(new URL("../assets/", import.meta.url));
	const assets = /* @__PURE__ */ new Map();
	for (const [name, type] of ASSET_SPECS) {
		const path = fileURLToPath(new URL(`../assets/${name}`, import.meta.url));
		try {
			const info = statSync(path);
			if (!info.isFile()) continue;
			assets.set(`${ASSET_PREFIX}${name.replace(/^liang\//, "")}`, {
				path,
				type,
				size: info.size,
				etag: `W/"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`
			});
		} catch {}
	}
	return {
		assetDirectory,
		assets
	};
}
function createAssetHandler(assets, activeStreams) {
	return (req, res) => {
		const method = req.method ?? "GET";
		if (method !== "GET" && method !== "HEAD") {
			send(res, 405, { Allow: "GET, HEAD" });
			return;
		}
		let pathname;
		try {
			pathname = new URL(req.url ?? "/", "http://dsh.local").pathname;
		} catch {
			send(res, 404);
			return;
		}
		const asset = assets.get(pathname);
		if (asset === void 0) {
			send(res, 404);
			return;
		}
		if (req.headers["if-none-match"] === asset.etag) {
			send(res, 304, { ETag: asset.etag });
			return;
		}
		const ifRange = req.headers["if-range"];
		const range = parseSingleRange(ifRange !== void 0 && ifRange !== asset.etag ? void 0 : req.headers.range, asset.size);
		if (range === false) {
			send(res, 416, { "Content-Range": `bytes */${asset.size}` });
			return;
		}
		const start = range?.start ?? 0;
		const end = range?.end ?? asset.size - 1;
		const status = range === null ? 200 : 206;
		const headers = {
			"Accept-Ranges": "bytes",
			"Cache-Control": "private, max-age=3600, must-revalidate",
			"Content-Length": String(end - start + 1),
			"Content-Type": asset.type,
			ETag: asset.etag,
			...range === null ? {} : { "Content-Range": `bytes ${start}-${end}/${asset.size}` }
		};
		if (method === "HEAD") {
			send(res, status, headers);
			return;
		}
		res.writeHead(status, {
			"X-Content-Type-Options": "nosniff",
			...headers
		});
		const stream = createReadStream(asset.path, {
			start,
			end
		});
		activeStreams.add(stream);
		const release = () => activeStreams.delete(stream);
		stream.once("close", release);
		stream.once("end", release);
		stream.once("error", () => {
			release();
			if (!res.headersSent) send(res, 500);
			else res.destroy();
		});
		res.once("close", () => {
			if (!stream.destroyed) stream.destroy();
		});
		stream.pipe(res);
	};
}
const inject = ["webServer"];
function apply(ctx) {
	const { assets } = buildAssets();
	const activeStreams = /* @__PURE__ */ new Set();
	ctx.effect(() => {
		const handler = createAssetHandler(assets, activeStreams);
		const unregister = [...assets.keys()].map((path) => ctx.webServer.register({
			kind: "exact",
			path,
			handler
		}));
		return () => {
			for (const dispose of unregister) dispose();
			for (const stream of activeStreams) stream.destroy();
			activeStreams.clear();
		};
	}, "dsh-erebus-skin: static media route");
}
//#endregion
export { ASSET_PREFIX, PACKAGE_ID, apply, inject, parseSingleRange };

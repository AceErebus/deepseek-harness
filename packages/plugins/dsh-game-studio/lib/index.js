import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/index.ts
const inject = ["connection", "sessions"];
function fail(code, message) {
	return {
		ok: false,
		error: {
			code: code === "internal" ? "internal" : "bad-request",
			message,
			details: { code }
		}
	};
}
const ok = (value) => ({
	ok: true,
	value
});
const DEFAULT_CONFIG = {
	comfyuiUrl: "http://127.0.0.1:8188",
	checkpoint: "",
	creatorExe: "",
	wechatCli: "",
	douyinCli: ""
};
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = basename(MODULE_DIR) === "lib" ? dirname(MODULE_DIR) : MODULE_DIR;
function loadConfig() {
	try {
		const raw = readFileSync(join(PLUGIN_DIR, "game-studio.config.json"), "utf8");
		const parsed = JSON.parse(raw);
		return {
			comfyuiUrl: typeof parsed.comfyuiUrl === "string" && parsed.comfyuiUrl.length > 0 ? parsed.comfyuiUrl : DEFAULT_CONFIG.comfyuiUrl,
			checkpoint: typeof parsed.checkpoint === "string" ? parsed.checkpoint : "",
			creatorExe: typeof parsed.creatorExe === "string" ? parsed.creatorExe : "",
			wechatCli: typeof parsed.wechatCli === "string" ? parsed.wechatCli : "",
			douyinCli: typeof parsed.douyinCli === "string" ? parsed.douyinCli : ""
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}
function isCocosProject(dir) {
	if (!existsSync(join(dir, "assets"))) return { creator: null };
	try {
		const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
		if (pkg.creator?.version) return { creator: pkg.creator.version };
	} catch {}
	if (existsSync(join(dir, "project.json"))) return { creator: "2.x" };
	return { creator: null };
}
function discoverProjects(root) {
	const found = [];
	const visit = (dir, depth) => {
		let entries = [];
		try {
			entries = readdirSync(dir);
		} catch {
			return;
		}
		if (depth === 0) {
			const self = isCocosProject(dir);
			if (self.creator !== null) found.push({
				path: dir,
				name: dir.split(/[\\/]/).pop() ?? dir,
				creator: self.creator
			});
		}
		if (depth >= 2) return;
		for (const name of entries) {
			if (name === "node_modules" || name === ".git" || name.startsWith(".")) continue;
			const sub = join(dir, name);
			if (existsSync(join(sub, "assets"))) {
				const check = isCocosProject(sub);
				if (check.creator !== null) found.push({
					path: sub,
					name,
					creator: check.creator
				});
				continue;
			}
			visit(sub, depth + 1);
		}
	};
	visit(root, 0);
	return found;
}
const STARTER_FILES = {
	"GameConfig.ts": `// 游戏全局配置：数值平衡、角色、关卡参数都在这里改。
export const GameConfig = {
  title: "我的小游戏",
  version: "0.1.0",
  playerSpeed: 240,
  gravity: -1200,
};
`,
	"GameMain.ts": `// 游戏主入口组件：在编辑器中新建一个空节点，挂上 GameMain 即可。
// 所有游戏逻辑从这里开始组织（角色、关卡、UI）。
import { _decorator, Component, Label, Node } from "cc";
import { GameConfig } from "./GameConfig";

const { ccclass } = _decorator;

@ccclass("GameMain")
export class GameMain extends Component {
  start() {
    const title = new Node("Title");
    const label = title.addComponent(Label);
    label.string = \`\${GameConfig.title} v\${GameConfig.version}\`;
    this.node.addChild(title);
    console.log("game booted:", GameConfig.title);
  }
}
`,
	"README.md": `# 游戏代码目录（assets/scripts/game）

- GameConfig.ts —— 全局配置（数值/角色/关卡参数）
- GameMain.ts —— 主入口组件：编辑器里新建空节点，挂上 GameMain

## 开发流程（配合 dsh-game-studio）

1. 场景搭建在 Cocos Creator 编辑器里做（UI/节点/预制体）
2. 逻辑在编辑器里「关联脚本」或在代码里动态创建
3. 构建小游戏包：插件「构建」按钮（微信/抖音）
4. 用开发者工具打开构建产物实测，把报错反馈给 agent 修复
`
};
function comfyWorkflow(opts) {
	return {
		"3": {
			class_type: "KSampler",
			inputs: {
				cfg: 7,
				denoise: 1,
				seed: opts.seed,
				steps: 20,
				sampler_name: "euler",
				scheduler: "normal",
				latent_image: ["5", 0],
				model: ["4", 0],
				positive: ["6", 0],
				negative: ["7", 0]
			}
		},
		"4": {
			class_type: "CheckpointLoaderSimple",
			inputs: { ckpt_name: opts.checkpoint }
		},
		"5": {
			class_type: "EmptyLatentImage",
			inputs: {
				batch_size: 1,
				height: opts.height,
				width: opts.width
			}
		},
		"6": {
			class_type: "CLIPTextEncode",
			inputs: {
				clip: ["4", 1],
				text: opts.prompt
			}
		},
		"7": {
			class_type: "CLIPTextEncode",
			inputs: {
				clip: ["4", 1],
				text: opts.negativePrompt
			}
		},
		"8": {
			class_type: "VAEDecode",
			inputs: {
				samples: ["3", 0],
				vae: ["4", 2]
			}
		},
		"9": {
			class_type: "SaveImage",
			inputs: {
				filename_prefix: "dsh-game-studio",
				images: ["8", 0]
			}
		}
	};
}
async function fetchJson(url, init, timeoutMs = 15e3) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			...init,
			signal: controller.signal
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} finally {
		clearTimeout(timer);
	}
}
/**
* Best-effort workspace cwd: the most recently attached live session with a
* recorded cwd (mirrors api-proxy's own ctx.sessions.list() usage). Falls
* back to undefined so callers can use the process cwd instead.
*/
function currentSessionCwd(ctx) {
	try {
		const sessions = ctx.sessions?.list() ?? [];
		let latest;
		for (const s of sessions) if (typeof s?.header?.cwd === "string" && s.header.cwd.length > 0) latest = s.header.cwd;
		return latest;
	} catch {
		return;
	}
}
function apply(ctx) {
	ctx.effect(() => ctx.connection.rpc.handle("/game-studio", async (endpoint, payload) => {
		const p = payload ?? {};
		try {
			switch (endpoint) {
				case "config": {
					const config = loadConfig();
					return ok({ config: {
						...config,
						creatorExeExists: config.creatorExe.length > 0 && existsSync(config.creatorExe),
						wechatCliExists: config.wechatCli.length > 0 && existsSync(config.wechatCli),
						douyinCliExists: config.douyinCli.length > 0 && existsSync(config.douyinCli)
					} });
				}
				case "projects": return ok({ projects: discoverProjects(typeof p.root === "string" && p.root.length > 0 ? p.root : currentSessionCwd(ctx) ?? process.cwd()) });
				case "comfyuiUrl/save": {
					const url = typeof p.url === "string" && p.url.trim().length > 0 ? p.url.trim() : "";
					if (url.length === 0) return fail("invalid-args", "ComfyUI 地址不能为空");
					if (!/^https?:\/\//i.test(url)) return fail("invalid-args", "地址需以 http:// 或 https:// 开头");
					const next = {
						...loadConfig(),
						comfyuiUrl: url
					};
					writeFileSync(join(PLUGIN_DIR, "game-studio.config.json"), JSON.stringify(next, null, 2), "utf8");
					return ok({ comfyuiUrl: url });
				}
				case "codegen": {
					const project = typeof p.project === "string" ? p.project : "";
					if (!existsSync(join(project, "assets"))) return fail("invalid-project", `不是 Cocos 项目：${project}`);
					const target = join(project, "assets", "scripts", "game");
					mkdirSync(target, { recursive: true });
					const files = [];
					for (const [name, content] of Object.entries(STARTER_FILES)) {
						writeFileSync(join(target, name), content, "utf8");
						files.push(join("assets", "scripts", "game", name));
					}
					return ok({ files });
				}
				case "assets": {
					const project = typeof p.project === "string" ? p.project : "";
					const assetsDir = join(project, "assets");
					if (!existsSync(assetsDir)) return fail("invalid-project", `不是 Cocos 项目：${project}`);
					const images = [];
					const walk = (dir) => {
						for (const name of readdirSync(dir)) {
							const full = join(dir, name);
							let stat = null;
							try {
								stat = statSync(full);
							} catch {
								continue;
							}
							if (stat.isDirectory()) walk(full);
							else if (/\.(png|jpe?g|webp)$/i.test(name)) images.push(full.slice(project.length + 1).replace(/\\/g, "/"));
						}
					};
					walk(assetsDir);
					let manifest = null;
					try {
						manifest = JSON.parse(readFileSync(join(project, "game-assets.json"), "utf8"));
					} catch {}
					return ok({
						assets: images,
						manifest
					});
				}
				case "build": {
					const project = typeof p.project === "string" ? p.project : "";
					const platform = typeof p.platform === "string" ? p.platform : "wechatgame";
					if (!existsSync(join(project, "assets"))) return fail("invalid-project", `不是 Cocos 项目：${project}`);
					const config = loadConfig();
					if (config.creatorExe.length === 0 || !existsSync(config.creatorExe)) return fail("config-missing", "creatorExe 未配置（game-studio.config.json）");
					if (platform !== "wechatgame" && platform !== "bytedance-mini-game") return fail("invalid-platform", `不支持的构建平台：${platform}`);
					const logFile = join(project, ".dsh-game-studio-build.log");
					const child = spawn(config.creatorExe, [
						"--project",
						project,
						"--build",
						`platform=${platform}`
					], {
						windowsHide: true,
						stdio: [
							"ignore",
							"pipe",
							"pipe"
						]
					});
					child.stdout.on("data", (chunk) => writeFileSync(logFile, chunk, { flag: "a" }));
					child.stderr.on("data", (chunk) => writeFileSync(logFile, chunk, { flag: "a" }));
					return ok({
						started: true,
						logFile,
						platform
					});
				}
				case "buildLog": {
					const logFile = join(typeof p.project === "string" ? p.project : "", ".dsh-game-studio-build.log");
					if (!existsSync(logFile)) return ok({ log: "" });
					return ok({ log: readFileSync(logFile, "utf8").slice(-6e3) });
				}
				case "openDevtools": {
					const project = typeof p.project === "string" ? p.project : "";
					const platform = typeof p.platform === "string" ? p.platform : "wechatgame";
					const config = loadConfig();
					const buildDir = join(project, "build", platform);
					if (!existsSync(buildDir)) return fail("no-build", `构建产物不存在：${buildDir}`);
					const cli = platform === "wechatgame" ? config.wechatCli : config.douyinCli;
					if (cli.length === 0 || !existsSync(cli)) return fail("config-missing", `${platform} 开发者工具 CLI 未配置`);
					spawn(cli, [
						"open",
						"--project",
						buildDir
					], {
						windowsHide: true,
						stdio: "ignore",
						detached: true
					}).unref();
					return ok({});
				}
				case "comfyui/status": {
					const config = loadConfig();
					try {
						return ok({
							available: true,
							version: (await fetchJson(`${config.comfyuiUrl}/system_stats`)).system?.comfyui_version ?? null
						});
					} catch (error) {
						return ok({
							available: false,
							error: error instanceof Error ? error.message : String(error)
						});
					}
				}
				case "comfyui/generate": {
					const config = loadConfig();
					const prompt = typeof p.prompt === "string" && p.prompt.trim().length > 0 ? p.prompt.trim() : "";
					if (prompt.length === 0) return fail("invalid-args", "prompt 不能为空");
					const checkpoint = typeof p.checkpoint === "string" && p.checkpoint.length > 0 ? p.checkpoint : config.checkpoint;
					if (checkpoint.length === 0) return fail("config-missing", "checkpoint 未配置（game-studio.config.json）");
					const width = typeof p.width === "number" ? Math.min(2048, Math.max(256, Math.round(p.width))) : 832;
					const height = typeof p.height === "number" ? Math.min(2048, Math.max(256, Math.round(p.height))) : 1216;
					const seed = typeof p.seed === "number" ? Math.round(p.seed) : Math.floor(Math.random() * 2 ** 31);
					const outputDir = typeof p.outputDir === "string" && p.outputDir.length > 0 ? p.outputDir : process.cwd();
					const filename = typeof p.filename === "string" && p.filename.length > 0 ? p.filename : `art-${Date.now()}.png`;
					const workflow = comfyWorkflow({
						prompt,
						negativePrompt: typeof p.negativePrompt === "string" ? p.negativePrompt : "lowres, bad anatomy, bad hands, text, watermark, blurry",
						width,
						height,
						seed,
						checkpoint
					});
					let promptId;
					try {
						const submitted = await fetchJson(`${config.comfyuiUrl}/prompt`, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ prompt: workflow })
						}, 2e4);
						if (typeof submitted.prompt_id !== "string") throw new Error("提交失败");
						promptId = submitted.prompt_id;
					} catch (error) {
						return fail("comfyui-unavailable", `ComfyUI 不可用：${error instanceof Error ? error.message : String(error)}`);
					}
					const deadline = Date.now() + 18e4;
					let image = null;
					while (Date.now() < deadline) {
						await new Promise((resolve) => setTimeout(resolve, 800));
						try {
							const entry = (await fetchJson(`${config.comfyuiUrl}/history/${promptId}`))[promptId];
							if (entry === void 0) continue;
							if (entry.status?.status_str === "error" || entry.status?.completed === false && entry.status?.status_str === void 0) return fail("comfyui-error", "ComfyUI 执行出错");
							const images = entry.outputs ? Object.values(entry.outputs).flatMap((o) => o.images ?? []) : [];
							if (images.length > 0) {
								image = images[0];
								break;
							}
							if (entry.status?.completed === true) break;
						} catch {}
					}
					if (image === null || typeof image.filename !== "string") return fail("timeout", "ComfyUI 生成超时（180s）");
					const viewUrl = `${config.comfyuiUrl}/view?filename=${encodeURIComponent(image.filename)}` + (typeof image.subfolder === "string" && image.subfolder.length > 0 ? `&subfolder=${encodeURIComponent(image.subfolder)}` : "") + `&type=${encodeURIComponent(image.type ?? "output")}`;
					const res = await fetch(viewUrl);
					if (!res.ok) return fail("comfyui-error", "获取生成图片失败");
					const bytes = Buffer.from(await res.arrayBuffer());
					mkdirSync(outputDir, { recursive: true });
					const outPath = join(outputDir, filename);
					writeFileSync(outPath, bytes);
					return ok({
						path: outPath,
						filename,
						dataUrl: `data:image/png;base64,${bytes.toString("base64")}`
					});
				}
				default: return fail("unknown-endpoint", `unknown endpoint ${endpoint}`);
			}
		} catch (error) {
			return fail("internal", error instanceof Error ? error.message : String(error));
		}
	}, { authority: "loopback" }), "dsh-game-studio: game workbench channel");
}
var src_default = {
	apply,
	inject
};
//#endregion
export { apply, src_default as default, inject };

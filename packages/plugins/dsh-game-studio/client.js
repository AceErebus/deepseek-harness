window.__ModuleLoader__.load({
	id: "dsh-game-studio",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/index.ts
		const NS = "gameStudio";
		const inject = [
			"slots",
			"locale",
			"connection",
			"sessions"
		];
		const PLATFORMS = [{
			id: "wechatgame",
			label: "微信小游戏",
			buildLabel: "构建微信小游戏"
		}, {
			id: "bytedance-mini-game",
			label: "抖音小游戏",
			buildLabel: "构建抖音小游戏"
		}];
		const css = `
.gs-panel{display:flex;flex-direction:column;height:100%;min-height:0;padding:14px 18px;box-sizing:border-box;gap:10px;overflow-y:auto;color:var(--dsw-alias-label-primary)}
.gs-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gs-title{font-size:14px;font-weight:600}
.gs-sub{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.gs-label{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.gs-input{height:26px;box-sizing:border-box;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:0 8px;font-family:inherit;font-size:12px}
.gs-textarea{min-height:64px;box-sizing:border-box;resize:vertical;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 8px;font-family:inherit;font-size:12px}
.gs-btn{flex:none;height:26px;display:inline-flex;align-items:center;cursor:pointer;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:0 10px;font-family:inherit;font-size:12px}
.gs-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}
.gs-btn[disabled]{opacity:.45;cursor:default}
.gs-btn[data-primary]{background:var(--dsw-alias-button-elevated-fill);border:1px solid var(--dsw-alias-border-l1)}
.gs-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.gs-dot[data-on]{background:var(--dsw-alias-state-success-primary)}
.gs-dot[data-off]{background:var(--dsw-alias-state-error-primary)}
.gs-section{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.gs-img{max-width:220px;max-height:260px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px}
.gs-log{flex:1;min-height:80px;max-height:180px;overflow:auto;margin:0;padding:8px 10px;background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;font-family:var(--ds-font-family-code);font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.gs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px 8px}
.gs-notice{font-size:12px}
.gs-notice[data-error]{color:var(--dsw-alias-state-error-primary)}
.gs-notice[data-ok]{color:var(--dsw-alias-state-success-primary)}
`;
		function GameStudioPanel({ call, sessions }) {
			const [projects, setProjects] = (0, react.useState)([]);
			const [active, setActive] = (0, react.useState)("");
			const [config, setConfig] = (0, react.useState)(null);
			const [comfy, setComfy] = (0, react.useState)(null);
			const [comfyUrl, setComfyUrl] = (0, react.useState)("");
			const [assets, setAssets] = (0, react.useState)([]);
			const [busy, setBusy] = (0, react.useState)(false);
			const [notice, setNotice] = (0, react.useState)(null);
			const [checkpoint, setCheckpoint] = (0, react.useState)("");
			const [prompt, setPrompt] = (0, react.useState)("");
			const [negative, setNegative] = (0, react.useState)("lowres, bad anatomy, bad hands, text, watermark, blurry");
			const [width, setWidth] = (0, react.useState)("832");
			const [height, setHeight] = (0, react.useState)("1216");
			const [seed, setSeed] = (0, react.useState)("");
			const [result, setResult] = (0, react.useState)(null);
			const [log, setLog] = (0, react.useState)("");
			const refreshConfig = () => {
				call("config").then((r) => {
					if (r.ok && r.value) {
						const cfg = r.value;
						setConfig(cfg);
						setComfyUrl(cfg.comfyuiUrl);
					}
				});
			};
			const refreshComfy = () => {
				call("comfyui/status").then((r) => {
					if (r.ok && r.value) setComfy(r.value);
				});
			};
			/** Current session cwd from the runtime's list mirror (like dsh-fs-tree). */
			const currentSessionCwd = () => {
				try {
					const snap = sessions && sessions.list ? sessions.list.getSnapshot() : null;
					if (!snap) return null;
					const current = snap.current;
					const summary = current != null && snap.byId ? snap.byId[current] : null;
					return summary && summary.cwd ? summary.cwd : null;
				} catch {
					return null;
				}
			};
			const refreshProjects = () => {
				const root = currentSessionCwd() ?? void 0;
				call("projects", root ? { root } : void 0).then((r) => {
					if (r.ok && r.value) {
						const list = r.value.projects;
						setProjects(list);
						if (list.length > 0 && (active === "" || !list.some((p) => p.path === active))) setActive(list[0].path);
					}
				});
			};
			const refreshAssets = () => {
				if (!active) return;
				call("assets", { project: active }).then((r) => {
					if (r.ok && r.value) setAssets(r.value.assets);
				});
			};
			const refreshLog = () => {
				if (!active) return;
				call("buildLog", { project: active }).then((r) => {
					if (r.ok && r.value) setLog(r.value.log || "(暂无构建日志)");
				});
			};
			(0, react.useEffect)(() => {
				refreshConfig();
				refreshComfy();
				refreshProjects();
				const timer = setInterval(refreshComfy, 3e4);
				return () => clearInterval(timer);
			}, []);
			(0, react.useEffect)(() => {
				refreshAssets();
				refreshLog();
			}, [active]);
			const run = async (action, okText) => {
				setBusy(true);
				setNotice(null);
				try {
					const r = await action();
					if (!r.ok) {
						setNotice({
							kind: "error",
							text: r.error ? r.error.message : "操作失败"
						});
						return;
					}
					setNotice({
						kind: "ok",
						text: okText
					});
				} catch (e) {
					setNotice({
						kind: "error",
						text: e instanceof Error ? e.message : String(e)
					});
				} finally {
					setBusy(false);
				}
			};
			const doCodegen = () => {
				if (!active) return;
				run(() => call("codegen", { project: active }), "代码模板已生成（编辑器刷新后可见）");
			};
			const doBuild = (platform) => {
				if (!active) return;
				run(() => call("build", {
					project: active,
					platform
				}), `构建已启动（${platform}），日志见下方`);
				setTimeout(refreshLog, 1500);
			};
			const doOpen = (platform) => {
				if (!active) return;
				run(() => call("openDevtools", {
					project: active,
					platform
				}), "已调用开发者工具");
			};
			const doGenerate = () => {
				if (!active) return;
				setResult(null);
				const payload = {
					prompt,
					negativePrompt: negative,
					width: Number(width) || 832,
					height: Number(height) || 1216,
					outputDir: `${active}/assets/art`,
					filename: `art-${Date.now()}.png`
				};
				if (checkpoint.trim().length > 0) payload.checkpoint = checkpoint.trim();
				if (seed.trim().length > 0) payload.seed = Number(seed) || void 0;
				run(async () => {
					const r = await call("comfyui/generate", payload);
					if (r.ok && r.value) setResult(r.value);
					return r;
				}, "立绘已生成并存入项目");
			};
			const doSaveComfyUrl = () => {
				const url = comfyUrl.trim();
				if (url.length === 0) {
					setNotice({
						kind: "error",
						text: "请先填写 ComfyUI 地址"
					});
					return;
				}
				run(() => call("comfyuiUrl/save", { url }), "ComfyUI 地址已保存");
			};
			const project = projects.find((p) => p.path === active);
			const activeName = project ? project.name : active.split(/[\\/]/).pop() || "未选择";
			return (0, react.createElement)("div", { className: "gs-panel" }, (0, react.createElement)("div", {
				key: "head",
				className: "gs-row"
			}, (0, react.createElement)("span", {
				key: "t",
				className: "gs-title"
			}, "游戏工作台"), (0, react.createElement)("span", {
				key: "s",
				className: "gs-sub"
			}, `项目：${activeName}`)), (0, react.createElement)("div", {
				key: "proj",
				className: "gs-row"
			}, (0, react.createElement)("label", {
				key: "l",
				className: "gs-label"
			}, "项目"), (0, react.createElement)("select", {
				key: "sel",
				className: "gs-input",
				value: active,
				disabled: busy,
				onChange: (e) => setActive(e.target.value)
			}, projects.length === 0 ? (0, react.createElement)("option", {
				key: "empty",
				value: ""
			}, "（工作区下未发现 Cocos 项目）") : projects.map((p) => (0, react.createElement)("option", {
				key: p.path,
				value: p.path
			}, `${p.name} (${p.creator})`))), (0, react.createElement)("button", {
				key: "rf",
				type: "button",
				className: "gs-btn",
				disabled: busy,
				onClick: refreshProjects
			}, "刷新"), (0, react.createElement)("button", {
				key: "cg",
				type: "button",
				className: "gs-btn",
				disabled: busy || !active,
				onClick: doCodegen
			}, "生成代码模板")), (0, react.createElement)("div", {
				key: "comfy",
				className: "gs-row"
			}, (0, react.createElement)("span", {
				key: "l",
				className: "gs-label"
			}, "ComfyUI"), (0, react.createElement)("span", {
				key: "dot",
				className: "gs-dot",
				"data-on": comfy?.available ? "true" : void 0,
				"data-off": comfy && !comfy.available ? "true" : void 0
			}), (0, react.createElement)("span", {
				key: "txt",
				className: "gs-sub"
			}, comfy === null ? "检测中…" : comfy.available ? `在线 · ${config ? config.comfyuiUrl : ""}` : `离线（${comfy.error ?? "未运行"}）`), (0, react.createElement)("button", {
				key: "rf",
				type: "button",
				className: "gs-btn",
				disabled: busy,
				onClick: refreshComfy
			}, "检测")), (0, react.createElement)("div", {
				key: "comfyu",
				className: "gs-row"
			}, (0, react.createElement)("label", {
				key: "l",
				className: "gs-label"
			}, "ComfyUI 地址"), (0, react.createElement)("input", {
				key: "i",
				className: "gs-input",
				style: { width: 260 },
				value: comfyUrl,
				placeholder: "http://127.0.0.1:8188",
				onChange: (e) => setComfyUrl(e.target.value)
			}), (0, react.createElement)("button", {
				key: "sv",
				type: "button",
				className: "gs-btn",
				disabled: busy,
				onClick: doSaveComfyUrl
			}, "保存地址")), (0, react.createElement)("div", {
				key: "gen",
				className: "gs-section"
			}, (0, react.createElement)("div", {
				key: "t",
				className: "gs-title"
			}, "立绘生成（ComfyUI）"), (0, react.createElement)("div", {
				key: "r1",
				className: "gs-row"
			}, (0, react.createElement)("label", {
				key: "l",
				className: "gs-label"
			}, "checkpoint"), (0, react.createElement)("input", {
				key: "i",
				className: "gs-input",
				style: { width: 200 },
				value: checkpoint,
				placeholder: config?.checkpoint || "默认（config 文件）",
				onChange: (e) => setCheckpoint(e.target.value)
			}), (0, react.createElement)("label", {
				key: "lw",
				className: "gs-label"
			}, "尺寸"), (0, react.createElement)("input", {
				key: "w",
				className: "gs-input",
				style: { width: 60 },
				value: width,
				onChange: (e) => setWidth(e.target.value)
			}), (0, react.createElement)("input", {
				key: "h",
				className: "gs-input",
				style: { width: 60 },
				value: height,
				onChange: (e) => setHeight(e.target.value)
			}), (0, react.createElement)("label", {
				key: "ls",
				className: "gs-label"
			}, "seed"), (0, react.createElement)("input", {
				key: "s",
				className: "gs-input",
				style: { width: 90 },
				value: seed,
				placeholder: "随机",
				onChange: (e) => setSeed(e.target.value)
			})), (0, react.createElement)("textarea", {
				key: "p",
				className: "gs-textarea",
				placeholder: "正向提示词，如：1girl, white dress, long silver hair, standing, full body, game character portrait, anime style",
				value: prompt,
				onChange: (e) => setPrompt(e.target.value)
			}), (0, react.createElement)("input", {
				key: "n",
				className: "gs-input",
				value: negative,
				placeholder: "负向提示词",
				onChange: (e) => setNegative(e.target.value)
			}), (0, react.createElement)("div", {
				key: "r2",
				className: "gs-row"
			}, (0, react.createElement)("button", {
				key: "go",
				type: "button",
				className: "gs-btn",
				"data-primary": "true",
				disabled: busy || !active || prompt.trim().length === 0,
				onClick: doGenerate
			}, "生成并存入项目"), (0, react.createElement)("span", {
				key: "path",
				className: "gs-sub"
			}, result ? `已存：${result.path}` : "产物目录：assets/art/")), result ? (0, react.createElement)("img", {
				key: "img",
				className: "gs-img",
				src: result.dataUrl,
				alt: "生成结果"
			}) : null), (0, react.createElement)("div", {
				key: "build",
				className: "gs-section"
			}, (0, react.createElement)("div", {
				key: "t",
				className: "gs-title"
			}, "构建与预览"), (0, react.createElement)("div", {
				key: "r",
				className: "gs-row"
			}, PLATFORMS.map((p) => (0, react.createElement)("button", {
				key: p.id,
				type: "button",
				className: "gs-btn",
				disabled: busy || !active,
				onClick: () => doBuild(p.id)
			}, p.buildLabel)), PLATFORMS.map((p) => (0, react.createElement)("button", {
				key: `${p.id}-open`,
				type: "button",
				className: "gs-btn",
				disabled: busy || !active,
				onClick: () => doOpen(p.id)
			}, `打开${p.label}开发者工具`))), (0, react.createElement)("pre", {
				key: "log",
				className: "gs-log"
			}, log)), assets.length > 0 ? (0, react.createElement)("div", {
				key: "assets",
				className: "gs-section"
			}, (0, react.createElement)("div", {
				key: "t",
				className: "gs-title"
			}, `美术资源（${assets.length}）`), (0, react.createElement)("div", {
				key: "g",
				className: "gs-grid"
			}, assets.map((a) => (0, react.createElement)("div", {
				key: a,
				className: "gs-sub",
				style: {
					fontSize: 10,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap"
				}
			}, a)))) : null, notice ? (0, react.createElement)("div", {
				key: "notice",
				className: "gs-notice",
				"data-error": notice.kind === "error" ? "true" : void 0,
				"data-ok": notice.kind === "ok" ? "true" : void 0
			}, notice.text) : null);
		}
		function apply(ctx) {
			const style = document.createElement("style");
			style.dataset.plugin = "dsh-game-studio";
			style.textContent = css;
			document.head.append(style);
			ctx.effect(() => () => style.remove(), "dsh-game-studio: panel styles");
			ctx.effect(() => ctx.locale.register(NS, {
				zh: { "gameStudio.title": "游戏" },
				en: { "gameStudio.title": "Game" }
			}), "dsh-game-studio: locale");
			const call = (endpoint, payload) => ctx.connection.rpc.call("/game-studio", endpoint, payload);
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "game-studio",
				order: 30,
				label: () => "游戏",
				locale: NS,
				inject: () => ({
					call,
					sessions: ctx.get?.("sessions")
				})
			}, GameStudioPanel));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
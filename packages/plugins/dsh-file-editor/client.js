window.__ModuleLoader__.load({
	id: "dsh-file-editor",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region src/client/index.ts
		const h = react.createElement;
		const cssTagId = "dsh-file-editor/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-file-editor";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = ".dsh-editor-host{flex:1;min-height:0;overflow:hidden}.dsh-editor-toolbar{flex:none;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2);padding:6px 12px;min-height:38px}.dsh-editor-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary);font-size:12px}.dsh-editor-status{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;white-space:nowrap}.dsh-editor-status[data-error]{color:var(--dsw-alias-state-error-primary)}.dsh-editor-dirty{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-business-primary)}.dsh-editor-output{flex:none;max-height:200px;overflow-y:auto;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-all;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;padding:8px 12px;margin:0}.dsh-editor-btn{flex:none;height:26px;display:inline-flex;align-items:center;cursor:pointer;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:none;border-radius:8px;padding:0 10px;font-family:inherit;font-size:12px}.dsh-editor-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.dsh-editor-btn[disabled]{opacity:.45;cursor:default}.dsh-editor-btn[data-primary]{background:var(--dsw-alias-button-elevated-fill);border:1px solid var(--dsw-alias-border-l1)}.dsh-editor-center{position:absolute;top:0;left:0;right:0;bottom:0;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px}.dsh-editor-hint{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:22px;text-align:center}.dsh-cm-jump{text-decoration:underline;text-underline-offset:2px;cursor:pointer}.dsh-editor-preview{flex:1;min-height:0;overflow-y:auto;box-sizing:border-box;padding:16px 20px 48px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.75;word-break:break-word}.dsh-editor-preview h1,.dsh-editor-preview h2,.dsh-editor-preview h3,.dsh-editor-preview h4,.dsh-editor-preview h5,.dsh-editor-preview h6{margin:20px 0 10px;font-weight:600;line-height:1.35}.dsh-editor-preview h1{font-size:24px;padding-bottom:8px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-editor-preview h2{font-size:20px;padding-bottom:6px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-editor-preview h3{font-size:17px}.dsh-editor-preview h4{font-size:15px}.dsh-editor-preview h5,.dsh-editor-preview h6{font-size:14px;color:var(--dsw-alias-label-secondary)}.dsh-editor-preview p{margin:10px 0}.dsh-editor-preview a{color:var(--dsw-alias-state-business-primary)}.dsh-editor-preview img{max-width:100%;border-radius:6px}.dsh-editor-preview code{background:var(--dsw-alias-interactive-bg-hover);border-radius:5px;padding:1px 5px;font-family:var(--ds-font-family-code);font-size:.92em}.dsh-editor-preview pre{background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;overflow-x:auto;font-family:var(--ds-font-family-code);font-size:12.5px;line-height:1.55;margin:12px 0}.dsh-editor-preview pre code{background:transparent;padding:0;font-size:inherit}.dsh-editor-preview table{border-collapse:collapse;margin:12px 0;width:100%}.dsh-editor-preview th,.dsh-editor-preview td{border:1px solid var(--dsw-alias-border-l2);padding:6px 10px;text-align:left;vertical-align:top}.dsh-editor-preview thead th{background:var(--dsw-alias-interactive-bg-hover)}.dsh-editor-preview blockquote{margin:12px 0;padding:2px 14px;border-left:3px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}.dsh-editor-preview ul,.dsh-editor-preview ol{margin:10px 0;padding-left:24px}.dsh-editor-preview li{margin:4px 0}.dsh-editor-preview hr{border:none;border-top:1px solid var(--dsw-alias-border-l2);margin:18px 0}.dsh-editor-preview del{color:var(--dsw-alias-label-tertiary)}.dsh-editor-media{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:auto;box-sizing:border-box;padding:16px;background:var(--dsw-alias-bg-base)}.dsh-editor-media-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:4px}.dsh-editor-media-video{max-width:100%;max-height:100%;outline:none;border-radius:4px;background:#000}";
			document.head.appendChild(tag);
		}
		const NS = "file-editor";
		const zh = {
			"editor.loading": "加载中…",
			"editor.binary": "二进制文件，无法编辑",
			"editor.readError": "无法读取该文件",
			"editor.save": "保存",
			"editor.saved": "已保存",
			"editor.saving": "保存中…",
			"editor.saveError": "保存失败",
			"editor.reload": "重新加载",
			"editor.openInSystem": "在系统中打开",
			"editor.reveal": "在资源管理器中显示",
			"editor.build": "编译",
			"editor.building": "编译中…",
			"editor.buildError": "编译失败",
			"editor.buildEmpty": "（无输出）",
			"editor.noCompiler": "未检测到 C 编译器（gcc/clang），请安装 MinGW-w64 后重试",
			"editor.tabActions": "标签操作",
			"editor.dirty": "未保存",
			"editor.noDef": "未找到定义",
			"editor.preview": "预览",
			"editor.edit": "编辑",
			"editor.imageHint": "图片预览",
			"editor.videoHint": "视频预览"
		};
		const en = {
			"editor.loading": "Loading…",
			"editor.binary": "Binary file, cannot edit",
			"editor.readError": "Could not read this file",
			"editor.save": "Save",
			"editor.saved": "Saved",
			"editor.saving": "Saving…",
			"editor.saveError": "Save failed",
			"editor.reload": "Reload",
			"editor.openInSystem": "Open in system app",
			"editor.reveal": "Reveal in File Explorer",
			"editor.build": "Build",
			"editor.building": "Building…",
			"editor.buildError": "Build failed",
			"editor.buildEmpty": "(no output)",
			"editor.noCompiler": "No C compiler (gcc/clang) detected — install MinGW-w64 and retry",
			"editor.tabActions": "Tab actions",
			"editor.dirty": "Unsaved",
			"editor.noDef": "Definition not found",
			"editor.preview": "Preview",
			"editor.edit": "Edit",
			"editor.imageHint": "Image preview",
			"editor.videoHint": "Video preview"
		};
		function baseName(path) {
			if (!path) return "";
			const trimmed = path.replace(/[\\/]+$/, "");
			const i = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return i < 0 ? trimmed : trimmed.slice(i + 1);
		}
		const TEXT_EXTS = new Set([
			"c",
			"h",
			"cpp",
			"hpp",
			"cc",
			"cxx",
			"cu",
			"py",
			"js",
			"mjs",
			"cjs",
			"jsx",
			"ts",
			"tsx",
			"json",
			"jsonc",
			"md",
			"markdown",
			"txt",
			"yml",
			"yaml",
			"toml",
			"ini",
			"sh",
			"bash",
			"zsh",
			"ps1",
			"css",
			"scss",
			"less",
			"html",
			"htm",
			"xml",
			"svg",
			"sql",
			"php",
			"rb",
			"rs",
			"go",
			"java",
			"kt",
			"swift",
			"vue",
			"svelte",
			"graphql",
			"diff",
			"log",
			"env",
			"gitignore",
			"editorconfig"
		]);
		const TEXT_NAMES = new Set([
			"dockerfile",
			"makefile",
			"cmakelists.txt",
			"license",
			"readme",
			"readme.md"
		]);
		function isEditableText(path) {
			const base = baseName(path).toLowerCase();
			if (TEXT_NAMES.has(base)) return true;
			const dot = base.lastIndexOf(".");
			return dot > 0 && TEXT_EXTS.has(base.slice(dot + 1));
		}
		function loadScript(src) {
			return new Promise((resolve, reject) => {
				if (typeof window.CM6 !== "undefined") {
					resolve();
					return;
				}
				const existing = document.querySelector(`script[data-editor-src="${src}"]`);
				if (existing) {
					if (existing.dataset.editorState === "loaded") {
						resolve();
						return;
					}
					if (existing.dataset.editorState === "error") {
						reject(/* @__PURE__ */ new Error(`failed to load ${src}`));
						return;
					}
					existing.addEventListener("load", () => {
						existing.dataset.editorState = "loaded";
						resolve();
					}, { once: true });
					existing.addEventListener("error", () => {
						existing.dataset.editorState = "error";
						reject(/* @__PURE__ */ new Error(`failed to load ${src}`));
					}, { once: true });
					return;
				}
				const script = document.createElement("script");
				script.dataset.editorSrc = src;
				script.src = src;
				script.onload = () => {
					script.dataset.editorState = "loaded";
					resolve();
				};
				script.onerror = () => {
					script.dataset.editorState = "error";
					reject(/* @__PURE__ */ new Error(`failed to load ${src}`));
				};
				document.head.appendChild(script);
			});
		}
		function isMarkdown(path) {
			const base = baseName(path).toLowerCase();
			const dot = base.lastIndexOf(".");
			if (dot <= 0) return base === "readme" || base === "readme.md";
			return base.slice(dot + 1) === "md" || base.slice(dot + 1) === "markdown";
		}
		const IMAGE_EXTS = new Set([
			"png",
			"jpg",
			"jpeg",
			"gif",
			"webp",
			"bmp",
			"ico",
			"avif"
		]);
		const VIDEO_EXTS = new Set([
			"mp4",
			"webm",
			"mov",
			"m4v",
			"ogv"
		]);
		function extOf(path) {
			const base = baseName(path).toLowerCase();
			const dot = base.lastIndexOf(".");
			return dot > 0 ? base.slice(dot + 1) : "";
		}
		function isImage(path) {
			return IMAGE_EXTS.has(extOf(path));
		}
		function isVideo(path) {
			return VIDEO_EXTS.has(extOf(path));
		}
		/** Images and videos are previewed inline (raw bytes streamed by fs-tree). */
		function isMedia(path) {
			return isImage(path) || isVideo(path);
		}
		function escapeHtml(text) {
			return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
		}
		/** Only benign URL schemes may reach an href/src; everything else becomes "#". */
		function safeHref(url) {
			const u = url.trim();
			return /^(?:javascript|data|vbscript)\s*:/i.test(u) ? "#" : u;
		}
		/**
		* Render inline tokens (code, links, images, bold, italic, strikethrough)
		* over already-escaped text. Code spans are set aside first so later passes
		* never touch their content.
		*/
		function renderInline(text) {
			const codes = [];
			let out = escapeHtml(text).replace(/(`+)([\s\S]*?)\1/g, (_w, _ticks, body) => {
				codes.push(body);
				return `\u0000${codes.length - 1}\u0000`;
			});
			out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_w, alt, url) => `<img alt="${alt}" src="${safeHref(url)}">`);
			out = out.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_w, label, url) => `<a href="${safeHref(url)}">${label}</a>`);
			out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
			out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
			out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
			return out.replace(/\u0000(\d+)\u0000/g, (_w, id) => `<code>${codes[Number(id)] ?? ""}</code>`);
		}
		/** Split one table row into cells (leading/trailing pipes stripped). */
		function splitRow(line) {
			return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
		}
		/** A GFM delimiter row: `|---|---|` (dashes + pipes, optionally colons). */
		function isDelimiterRow(line) {
			if (line === void 0) return false;
			const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
			return t !== "" && /^[\s:|-]+$/.test(t) && t.includes("-") && t.includes("|");
		}
		/**
		* Render a markdown document to safe HTML. Block grammar: fenced code, GFM
		* tables, ATX headings, blockquotes, lists, hr, paragraphs.
		*/
		function renderMarkdown(source) {
			const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
			const blocks = [];
			let i = 0;
			while (i < lines.length) {
				const line = lines[i];
				if (line.trim() === "") {
					i++;
					continue;
				}
				const fence = /^(`{3,}|~{3,})(.*)$/.exec(line);
				if (fence) {
					const marker = fence[1].charAt(0);
					const close = new RegExp(`^${marker === "`" ? "`" : "~"}{3,}\\s*$`);
					const buf = [];
					i++;
					while (i < lines.length && !close.test(lines[i])) {
						buf.push(lines[i]);
						i++;
					}
					i++;
					blocks.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
					continue;
				}
				if (isDelimiterRow(lines[i + 1])) {
					const header = splitRow(line);
					const rows = [];
					i += 2;
					while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
						rows.push(splitRow(lines[i]));
						i++;
					}
					const head = `<thead><tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
					const body = rows.length > 0 ? `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>` : "";
					blocks.push(`<table>${head}${body}</table>`);
					continue;
				}
				const heading = /^(#{1,6})\s+(.*)$/.exec(line);
				if (heading) {
					const level = heading[1].length;
					blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
					i++;
					continue;
				}
				if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
					blocks.push("<hr>");
					i++;
					continue;
				}
				if (/^\s*>\s?/.test(line)) {
					const buf = [];
					while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
						buf.push(lines[i].replace(/^\s*>\s?/, ""));
						i++;
					}
					blocks.push(`<blockquote>${renderInline(buf.join("<br>"))}</blockquote>`);
					continue;
				}
				if (/^\s*[-*+]\s+/.test(line)) {
					const items = [];
					while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
						items.push(`<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`);
						i++;
					}
					blocks.push(`<ul>${items.join("")}</ul>`);
					continue;
				}
				if (/^\s*\d+[.)]\s+/.test(line)) {
					const items = [];
					while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
						items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, ""))}</li>`);
						i++;
					}
					blocks.push(`<ol>${items.join("")}</ol>`);
					continue;
				}
				const buf = [];
				while (i < lines.length && lines[i].trim() !== "" && !/^(?:#{1,6}\s|>|[-*+]\s|\d+[.)]\s|`{3,}|~{3,})/.test(lines[i]) && !isDelimiterRow(lines[i + 1]) && !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
					buf.push(lines[i]);
					i++;
				}
				if (buf.length > 0) blocks.push(`<p>${renderInline(buf.join("<br>"))}</p>`);
				else i++;
			}
			return blocks.join("\n");
		}
		function FileEditor(props) {
			const path = props.path;
			const onDirtyChange = props.onDirtyChange;
			const fsTree = props.fsTree;
			const getCLang = props.getCLang;
			const T = typeof props.t === "function" ? props.t : (k) => k;
			const [doc, setDoc] = react.useState({
				status: "loading",
				text: "",
				error: null
			});
			const [dirty, setDirty] = react.useState(false);
			const [saveStatus, setSaveStatus] = react.useState(null);
			const [buildState, setBuildState] = react.useState({
				status: "idle",
				output: "",
				error: null
			});
			const [preview, setPreview] = react.useState(isMarkdown(path));
			const hostRef = react.useRef(null);
			const editorRef = react.useRef(null);
			const savedTextRef = react.useRef("");
			const textRef = react.useRef("");
			react.useEffect(() => {
				if (typeof onDirtyChange === "function") onDirtyChange(path, dirty);
			}, [dirty, path]);
			react.useEffect(() => {
				let alive = true;
				setDoc({
					status: "loading",
					text: "",
					error: null
				});
				setDirty(false);
				setSaveStatus(null);
				setBuildState({
					status: "idle",
					output: "",
					error: null
				});
				setPreview(isMarkdown(path));
				if (isMedia(path)) {
					setDoc({
						status: "ready",
						text: "",
						error: null
					});
					return;
				}
				fsTree.call("read", { path }).then((r) => {
					if (!alive) return;
					if (!r || !r.ok) {
						setDoc({
							status: "error",
							text: "",
							error: r && r.error ? r.error : {
								code: "unknown",
								message: String(r)
							}
						});
						return;
					}
					const value = r.value;
					if (value.binary === true) {
						setDoc({
							status: "error",
							text: "",
							error: {
								code: "binary",
								message: T("editor.binary")
							}
						});
						return;
					}
					textRef.current = typeof value.text === "string" ? value.text : "";
					setDoc({
						status: "ready",
						text: textRef.current,
						error: null
					});
				}).catch((e) => {
					if (!alive) return;
					setDoc({
						status: "error",
						text: "",
						error: {
							code: "transport",
							message: String(e && e.message ? e.message : e)
						}
					});
				});
				return () => {
					alive = false;
				};
			}, [
				path,
				fsTree,
				T
			]);
			react.useEffect(() => {
				if (doc.status !== "ready" || preview || isMedia(path)) return;
				let alive = true;
				let instance = null;
				let disposed = false;
				const mount = () => {
					if (!alive || disposed || !hostRef.current) return;
					window.CM6?.create(hostRef.current, {
						value: textRef.current,
						filename: path,
						onChange: () => {
							if (!alive) return;
							textRef.current = instance ? instance.getValue() : textRef.current;
							setDirty(true);
							if (ctrlRef.current) scheduleJumpRanges();
						},
						onSave: () => {
							if (alive) doSave(instance);
						},
						onCtrlClick: (line, col, offset) => {
							if (alive) doJump(instance, line, col, offset);
						}
					}).then((ed) => {
						if (!alive || disposed) {
							ed.destroy();
							return;
						}
						instance = ed;
						editorRef.current = ed;
						textRef.current = doc.text;
						savedTextRef.current = doc.text;
					});
				};
				loadScript("/file-editor-assets/cm6.bundle.js").then(mount).catch((e) => {
					if (alive) setDoc({
						status: "error",
						text: "",
						error: {
							code: "asset",
							message: String(e && e.message ? e.message : e)
						}
					});
				});
				return () => {
					alive = false;
					disposed = true;
					if (instance) {
						instance.destroy();
						instance = null;
					}
					editorRef.current = null;
					if (hostRef.current) hostRef.current.textContent = "";
				};
			}, [
				path,
				doc.text,
				doc.status,
				preview
			]);
			const ctrlRef = react.useRef(false);
			const jumpTimer = react.useRef(null);
			const clearJumpRanges = react.useCallback(() => {
				const instance = editorRef.current;
				if (instance && typeof instance.setJumpRanges === "function") instance.setJumpRanges([]);
				else if (instance && typeof instance.setJumpRanges !== "function") console.warn("[dsh-file-editor] stale CodeMirror bundle: no setJumpRanges — hard-refresh the page (Ctrl+Shift+R) to load the rebuilt asset.");
			}, []);
			const requestJumpRanges = react.useCallback(() => {
				const cLang = getCLang();
				const instance = editorRef.current;
				if (!ctrlRef.current || !cLang || typeof cLang.jumpTargets !== "function" || !instance) {
					clearJumpRanges();
					return;
				}
				const text = instance.getValue();
				cLang.jumpTargets(path, { text }).then((ranges) => {
					if (!ctrlRef.current) return;
					if (typeof instance.setJumpRanges === "function") instance.setJumpRanges(ranges);
					else console.warn("[dsh-file-editor] stale CodeMirror bundle: no setJumpRanges — hard-refresh the page (Ctrl+Shift+R) to load the rebuilt asset.");
				}).catch(() => {
					clearJumpRanges();
				});
			}, [
				path,
				getCLang,
				clearJumpRanges
			]);
			const scheduleJumpRanges = react.useCallback(() => {
				if (jumpTimer.current !== null) clearTimeout(jumpTimer.current);
				jumpTimer.current = setTimeout(requestJumpRanges, 120);
			}, [requestJumpRanges]);
			react.useEffect(() => {
				const sync = (e) => {
					const ev = e;
					const down = ev.ctrlKey === true || ev.metaKey === true;
					if (down === ctrlRef.current) return;
					ctrlRef.current = down;
					if (down) scheduleJumpRanges();
					else clearJumpRanges();
				};
				const onBlur = () => {
					if (!ctrlRef.current) return;
					ctrlRef.current = false;
					clearJumpRanges();
				};
				window.addEventListener("keydown", sync);
				window.addEventListener("keyup", sync);
				window.addEventListener("mousemove", sync);
				window.addEventListener("blur", onBlur);
				return () => {
					window.removeEventListener("keydown", sync);
					window.removeEventListener("keyup", sync);
					window.removeEventListener("mousemove", sync);
					window.removeEventListener("blur", onBlur);
					if (jumpTimer.current !== null) clearTimeout(jumpTimer.current);
				};
			}, [scheduleJumpRanges, clearJumpRanges]);
			const doSave = react.useCallback((instance) => {
				const text = instance ? instance.getValue() : textRef.current;
				setSaveStatus({
					kind: "saving",
					text: T("editor.saving")
				});
				fsTree.call("write", {
					path,
					content: text
				}).then((r) => {
					if (!r || !r.ok) {
						setSaveStatus({
							kind: "error",
							text: `${T("editor.saveError")}${r && r.error && r.error.message ? `：${r.error.message}` : ""}`
						});
						return;
					}
					savedTextRef.current = text;
					setDirty(false);
					setSaveStatus({
						kind: "saved",
						text: T("editor.saved")
					});
					const cLang = getCLang();
					if (cLang && typeof cLang.invalidate === "function") cLang.invalidate(path);
				}).catch((e) => {
					setSaveStatus({
						kind: "error",
						text: `${T("editor.saveError")}：${String(e && e.message ? e.message : e)}`
					});
				});
			}, [
				path,
				doc.text,
				fsTree,
				getCLang,
				T
			]);
			const doJump = react.useCallback((instance, line, col, offset) => {
				const cLang = getCLang();
				if (!cLang || typeof cLang.resolve !== "function") return;
				const text = instance ? instance.getValue() : doc.text;
				cLang.resolve(path, {
					offset,
					line,
					col,
					text
				}).then((target) => {
					if (!target) {
						setSaveStatus({
							kind: "saved",
							text: T("editor.noDef")
						});
						return;
					}
					if (target.path === path) {
						if (instance && typeof instance.scrollTo === "function") instance.scrollTo(target.line);
					} else if (fsTree && typeof fsTree.openFile === "function") fsTree.openFile(target.path);
					else fsTree.selectionStore.select(target.path);
				}).catch((e) => {
					setSaveStatus({
						kind: "error",
						text: String(e && e.message ? e.message : e)
					});
				});
			}, [
				path,
				doc.text,
				getCLang,
				fsTree,
				T
			]);
			const doBuild = react.useCallback(() => {
				const cLang = getCLang();
				if (!cLang || typeof cLang.build !== "function") return;
				setBuildState({
					status: "running",
					output: "",
					error: null
				});
				cLang.build(path).then((r) => {
					if (!r || !r.ok) {
						if ((r && r.error ? r.error.code : "unknown") === "no-compiler") {
							setBuildState({
								status: "error",
								output: "",
								error: T("editor.noCompiler")
							});
							return;
						}
						setBuildState({
							status: "error",
							output: "",
							error: r && r.error ? r.error.message : T("editor.buildError")
						});
						return;
					}
					setBuildState({
						status: "done",
						output: r.value.output,
						error: null
					});
				}).catch((e) => {
					setBuildState({
						status: "error",
						output: "",
						error: String(e && e.message ? e.message : e)
					});
				});
			}, [
				path,
				getCLang,
				T
			]);
			react.useEffect(() => {
				if (!preview) return;
				const onKey = (e) => {
					if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
						e.preventDefault();
						doSave(null);
					}
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [preview, doSave]);
			if (doc.status === "loading") return h("div", { className: "dsh-editor-center" }, h("div", { className: "dsh-editor-hint" }, T("editor.loading")));
			if (doc.status === "error") return h("div", { className: "dsh-editor-center" }, h("div", {
				className: "dsh-editor-hint",
				style: { color: "var(--dsw-alias-state-error-primary)" }
			}, `${T("editor.readError")}：${doc.error ? doc.error.message : ""}`));
			const hasCLang = typeof getCLang === "function" && getCLang() !== void 0;
			const markdownFile = isMarkdown(path);
			const mediaFile = isMedia(path);
			const rawMediaUrl = `/fs-tree-raw?path=${encodeURIComponent(path)}`;
			const toolbar = h("div", {
				key: "toolbar",
				className: "dsh-editor-toolbar"
			}, dirty ? h("span", {
				key: "dot",
				className: "dsh-editor-dirty",
				title: T("editor.dirty")
			}) : null, h("span", {
				key: "path",
				className: "dsh-editor-path",
				title: path
			}, baseName(path)), mediaFile ? h("span", {
				key: "kind",
				className: "dsh-editor-status"
			}, isImage(path) ? T("editor.imageHint") : T("editor.videoHint")) : null, markdownFile ? h("button", {
				key: "toggle",
				type: "button",
				className: "dsh-editor-btn",
				onClick: () => setPreview((p) => !p)
			}, preview ? T("editor.edit") : T("editor.preview")) : null, mediaFile ? null : h("button", {
				key: "save",
				type: "button",
				className: "dsh-editor-btn",
				"data-primary": "true",
				disabled: !dirty,
				onClick: () => doSave(editorRef.current)
			}, T("editor.save")), mediaFile ? null : h("button", {
				key: "reload",
				type: "button",
				className: "dsh-editor-btn",
				onClick: () => {
					setDoc({
						status: "loading",
						text: "",
						error: null
					});
					fsTree.call("read", { path }).then((r) => {
						if (!r || !r.ok) {
							setDoc({
								status: "error",
								text: "",
								error: r && r.error ? r.error : {
									code: "unknown",
									message: String(r)
								}
							});
							return;
						}
						const value = r.value;
						if (value.binary === true) {
							setDoc({
								status: "error",
								text: "",
								error: {
									code: "binary",
									message: T("editor.binary")
								}
							});
							return;
						}
						textRef.current = typeof value.text === "string" ? value.text : "";
						setDoc({
							status: "ready",
							text: textRef.current,
							error: null
						});
						setDirty(false);
						setSaveStatus(null);
					}).catch((e) => setDoc({
						status: "error",
						text: "",
						error: {
							code: "transport",
							message: String(e && e.message ? e.message : e)
						}
					}));
				}
			}, T("editor.reload")), h("button", {
				key: "open",
				type: "button",
				className: "dsh-editor-btn",
				onClick: () => {
					if (fsTree && typeof fsTree.openPath === "function") fsTree.openPath(path);
				}
			}, T("editor.openInSystem")), h("button", {
				key: "reveal",
				type: "button",
				className: "dsh-editor-btn",
				onClick: () => {
					if (fsTree && typeof fsTree.reveal === "function") fsTree.reveal(path);
				}
			}, T("editor.reveal")), hasCLang && !mediaFile ? h("button", {
				key: "build",
				type: "button",
				className: "dsh-editor-btn",
				"data-primary": "true",
				disabled: buildState.status === "running",
				onClick: doBuild
			}, buildState.status === "running" ? T("editor.building") : T("editor.build")) : null, typeof props.onTabMenu === "function" ? h("button", {
				key: "tabs",
				type: "button",
				className: "dsh-editor-btn",
				title: T("editor.tabActions"),
				"aria-label": T("editor.tabActions"),
				onClick: (e) => props.onTabMenu?.(e)
			}, "▾") : null, h("span", {
				key: "status",
				className: "dsh-editor-status",
				"data-error": saveStatus && saveStatus.kind === "error" ? "true" : void 0
			}, saveStatus ? saveStatus.text : ""));
			const output = buildState.status === "done" || buildState.status === "error" || buildState.status === "running" ? h("pre", {
				key: "output",
				className: "dsh-editor-output",
				"data-error": buildState.status === "error" ? "true" : void 0
			}, buildState.error || buildState.output || T("editor.buildEmpty")) : null;
			return h("div", {
				className: "dsh-editor-root",
				style: {
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					boxSizing: "border-box",
					display: "flex",
					flexDirection: "column"
				}
			}, toolbar, mediaFile ? isImage(path) ? h("div", {
				key: "media",
				className: "dsh-editor-media"
			}, h("img", {
				key: "img",
				className: "dsh-editor-media-img",
				src: rawMediaUrl,
				alt: baseName(path)
			})) : h("div", {
				key: "media",
				className: "dsh-editor-media"
			}, h("video", {
				key: "video",
				className: "dsh-editor-media-video",
				src: rawMediaUrl,
				controls: true
			})) : preview && markdownFile ? h("div", {
				key: "preview",
				className: "dsh-editor-preview",
				dangerouslySetInnerHTML: { __html: renderMarkdown(textRef.current) }
			}) : h("div", {
				key: "host",
				className: "dsh-editor-host",
				ref: hostRef
			}), output);
		}
		const inject = [
			"slots",
			"locale",
			"fsTree"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "file-editor: dictionaries");
			ctx.slots.inject("fsTree.fileView", () => ctx.slots.register({
				name: "fsTree.fileView",
				select: ({ path }) => path && (isEditableText(path) || isMedia(path)) ? { path } : null,
				locale: NS,
				inject: () => ({
					fsTree: ctx.get("fsTree"),
					getCLang: () => ctx.get("cLang")
				})
			}, FileEditor));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.isEditableText = isEditableText;
		exports.isMarkdown = isMarkdown;
		exports.isMedia = isMedia;
		exports.renderMarkdown = renderMarkdown;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
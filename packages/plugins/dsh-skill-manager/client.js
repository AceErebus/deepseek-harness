// dsh-skill-manager browser half: the "SKILL 管理" settings section.
//
// Registers one entry into the settings panel's `settings.section` list slot
// (the gear button in the sidebar). The section lists every skill in the live
// DSH catalog — including skills added later, because the host half re-reads
// the registry on every call and the section refreshes on open/mutation —
// with view / create / edit / delete actions, all served by the
// loopback-fenced `/skill-manage` RPC channel (host half).
window.__ModuleLoader__.load({
	id: "dsh-skill-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let h = react.createElement;

		// ---------- owned stylesheet ----------
		const css = ".dskm-root{flex:1;min-height:0;overflow-y:auto;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;padding:4px 2px 20px}.dskm-head{display:flex;flex-direction:column;gap:4px}.dskm-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}.dskm-intro{font-size:12px;line-height:19px;color:var(--dsw-alias-label-tertiary);white-space:normal}.dskm-toolbar{display:flex;align-items:center;gap:8px}.dskm-search{flex:1;min-width:0;display:flex;align-items:center;gap:6px;height:30px;box-sizing:border-box;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary)}.dskm-search input{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px}.dskm-search input::placeholder{color:var(--dsw-alias-label-tertiary)}.dskm-btn{flex:none;height:30px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:0 12px;font-family:inherit;font-size:13px}.dskm-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.dskm-btn[data-primary]{background:var(--dsw-alias-button-elevated-fill);border-color:var(--dsw-alias-border-l1)}.dskm-btn[data-danger]{color:var(--dsw-alias-state-error-primary)}.dskm-btn:disabled{opacity:.55;cursor:default}.dskm-count{font-size:12px;color:var(--dsw-alias-label-tertiary)}.dskm-notice{display:flex;align-items:center;gap:8px;font-size:12px;line-height:17px;padding:7px 10px;border-radius:8px;white-space:normal}.dskm-notice[data-kind=ok]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent)}.dskm-notice[data-kind=error]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}.dskm-card{display:flex;flex-direction:column;gap:8px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2);padding:12px 14px}.dskm-card[data-muted]{opacity:.75}.dskm-card-head{display:flex;align-items:center;gap:8px;min-width:0}.dskm-card-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dskm-badges{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}.dskm-badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;line-height:17px}.dskm-badge[data-muted]{color:var(--dsw-alias-label-tertiary)}.dskm-card-desc{font-size:12px;line-height:19px;color:var(--dsw-alias-label-secondary);white-space:normal;word-break:break-word}.dskm-card-path{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl;text-align:left}.dskm-card-actions{display:flex;align-items:center;gap:6px}.dskm-linkbtn{flex:none;height:24px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;color:var(--dsw-alias-label-secondary);background:none;border:none;border-radius:6px;padding:0 8px;font-family:inherit;font-size:12px}.dskm-linkbtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.dskm-linkbtn[data-danger]{color:var(--dsw-alias-state-error-primary)}.dskm-empty{padding:26px 0;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)}.dskm-field{display:flex;flex-direction:column;gap:5px}.dskm-field label{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary)}.dskm-field .hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:normal}.dskm-input{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px;outline:none}.dskm-input:focus{border-color:var(--dsw-alias-label-secondary)}.dskm-input[data-invalid]{border-color:var(--dsw-alias-state-error-primary)}.dskm-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font-family:inherit;font-size:13px;line-height:1.55;outline:none;resize:vertical;min-height:52px}.dskm-textarea:focus{border-color:var(--dsw-alias-label-secondary)}.dskm-textarea[data-code]{font-family:var(--ds-font-family-code,monospace);font-size:12px;min-height:180px}.dskm-check{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--dsw-alias-label-primary);cursor:pointer}.dskm-check input{accent-color:var(--dsw-alias-brand-primary)}.dskm-pre{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;padding:10px 12px;font-family:var(--ds-font-family-code,monospace);font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:340px;overflow-y:auto;margin:0}.dskm-kv{display:flex;flex-direction:column;gap:2px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);white-space:normal;word-break:break-word}.dskm-kv b{color:var(--dsw-alias-label-tertiary);font-weight:500;margin-right:6px}.dskm-modal-body{display:flex;flex-direction:column;gap:12px}.dskm-modal-footer{display:flex;justify-content:flex-end;gap:8px;align-items:center}.dskm-select{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px;outline:none}.dskm-note{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:normal}";
		const cssTagId = "dsh-skill-manager/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-skill-manager";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		// ---------- locale ----------
		const NS = "skillManage";
		const zh = {
			"skillManage.nav": "SKILL 管理",
			"skillManage.title": "SKILL 管理",
			"skillManage.intro": "管理 DSH 的技能库。技能来自项目目录（.dsh/skills、.agents/skills）和用户目录（~/.dsh/skills、~/.agents/skills），新增的技能会自动出现在列表中，无需维护清单。",
			"skillManage.search": "按名称或描述筛选…",
			"skillManage.refresh": "刷新",
			"skillManage.new": "新建技能",
			"skillManage.count": "{n} 个技能",
			"skillManage.loading": "加载中…",
			"skillManage.error": "加载失败：{message}",
			"skillManage.empty": "暂无技能。点击「新建技能」创建第一个。",
			"skillManage.view": "查看",
			"skillManage.edit": "编辑",
			"skillManage.remove": "删除",
			"skillManage.close": "关闭",
			"skillManage.cancel": "取消",
			"skillManage.save": "保存",
			"skillManage.create": "创建",
			"skillManage.name": "技能名",
			"skillManage.nameHint": "小写字母/数字/连字符（kebab-case），创建后不可修改",
			"skillManage.description": "描述",
			"skillManage.descriptionHint": "一句话说明该技能的用途，模型会据此判断何时加载它",
			"skillManage.whenToUse": "适用场景（可选）",
			"skillManage.whenToUseHint": "说明何时应该使用该技能，可留空",
			"skillManage.invocation": "调用权限",
			"skillManage.modelInvocable": "允许模型自动调用",
			"skillManage.userInvocable": "允许用户显式调用",
			"skillManage.content": "指令正文",
			"skillManage.contentHint": "模型加载技能后看到的 <skill_instructions> 正文（Markdown）",
			"skillManage.root": "存放位置",
			"skillManage.source": "来源",
			"skillManage.provider": "提供方",
			"skillManage.path": "文件路径",
			"skillManage.readOnly": "只读",
			"skillManage.readOnlyHint": "该技能来自内置/捆绑或外部目录，仅可查看",
			"skillManage.copy": "复制正文",
			"skillManage.copied": "已复制",
			"skillManage.removeTitle": "删除技能",
			"skillManage.removeBody": "确定删除技能 {name}？对应的技能文件将被移除，此操作不可撤销。",
			"skillManage.removeConfirm": "删除",
			"skillManage.created": "已创建技能 {name}",
			"skillManage.updated": "已保存技能 {name}",
			"skillManage.removed": "已删除技能 {name}",
			"skillManage.busySave": "保存中…",
			"skillManage.autoNote": "自动收录：技能目录中出现的新文件会被 DSH 自动发现，点击「刷新」即可看到。",
			"skillManage.required": "必填",
			"skillManage.newTitle": "新建技能",
			"skillManage.editTitle": "编辑技能 {name}",
			"skillManage.unknown": "未知",
			"skillManage.modelInvocableOff": "仅手动调用",
			"skillManage.userInvocableOff": "仅模型调用"
		};
		const en = {
			"skillManage.nav": "Skills",
			"skillManage.title": "Skill Manager",
			"skillManage.intro": "Manage the DSH skill library. Skills come from project directories (.dsh/skills, .agents/skills) and user directories (~/.dsh/skills, ~/.agents/skills); newly added skills appear automatically — no list to maintain.",
			"skillManage.search": "Filter by name or description…",
			"skillManage.refresh": "Refresh",
			"skillManage.new": "New skill",
			"skillManage.count": "{n} skills",
			"skillManage.loading": "Loading…",
			"skillManage.error": "Failed to load: {message}",
			"skillManage.empty": "No skills yet. Click “New skill” to create one.",
			"skillManage.view": "View",
			"skillManage.edit": "Edit",
			"skillManage.remove": "Delete",
			"skillManage.close": "Close",
			"skillManage.cancel": "Cancel",
			"skillManage.save": "Save",
			"skillManage.create": "Create",
			"skillManage.name": "Name",
			"skillManage.nameHint": "Lowercase letters/digits/hyphens (kebab-case); cannot be changed after creation",
			"skillManage.description": "Description",
			"skillManage.descriptionHint": "One sentence describing the skill's purpose; the model uses it to decide when to load it",
			"skillManage.whenToUse": "When to use (optional)",
			"skillManage.whenToUseHint": "When this skill should be used; may be left empty",
			"skillManage.invocation": "Invocation",
			"skillManage.modelInvocable": "Model may invoke automatically",
			"skillManage.userInvocable": "User may invoke explicitly",
			"skillManage.content": "Instructions",
			"skillManage.contentHint": "The <skill_instructions> body the model sees when the skill loads (Markdown)",
			"skillManage.root": "Location",
			"skillManage.source": "Source",
			"skillManage.provider": "Provider",
			"skillManage.path": "File path",
			"skillManage.readOnly": "Read-only",
			"skillManage.readOnlyHint": "This skill comes from a bundled/external directory; view only",
			"skillManage.copy": "Copy content",
			"skillManage.copied": "Copied",
			"skillManage.removeTitle": "Delete skill",
			"skillManage.removeBody": "Delete skill {name}? The skill file will be removed. This cannot be undone.",
			"skillManage.removeConfirm": "Delete",
			"skillManage.created": "Skill {name} created",
			"skillManage.updated": "Skill {name} saved",
			"skillManage.removed": "Skill {name} deleted",
			"skillManage.busySave": "Saving…",
			"skillManage.autoNote": "Auto-discovery: new files in the skill directories are picked up by DSH automatically; click “Refresh” to see them.",
			"skillManage.required": "required",
			"skillManage.newTitle": "New skill",
			"skillManage.editTitle": "Edit skill {name}",
			"skillManage.unknown": "unknown",
			"skillManage.modelInvocableOff": "manual only",
			"skillManage.userInvocableOff": "model only"
		};

		// ---------- helpers ----------
		function fmt(template, params) {
			return template.replace(/\{(\w+)\}/g, (_, key) => (params && key in params ? String(params[key]) : "{" + key + "}"));
		}

		function SourceBadges({ skill, t }) {
			const badges = [h("span", { key: "src", className: "dskm-badge" }, skill.source || t("skillManage.unknown"))];
			if (skill.provider && skill.provider !== "filesystem") badges.push(h("span", { key: "prov", className: "dskm-badge" }, skill.provider));
			if (skill.invocation) {
				if (!skill.invocation.modelInvocable) badges.push(h("span", { key: "mi", className: "dskm-badge" }, t("skillManage.modelInvocableOff")));
				if (!skill.invocation.userInvocable) badges.push(h("span", { key: "ui", className: "dskm-badge" }, t("skillManage.userInvocableOff")));
			}
			if (!skill.writable) badges.push(h("span", { key: "ro", className: "dskm-badge", "data-muted": "true" }, t("skillManage.readOnly")));
			return h("span", { className: "dskm-badges" }, badges);
		}

		// ---------- detail modal ----------
		function SkillDetail({ t, api, name, onClose, onEdit }) {
			const [record, setRecord] = react.useState(null);
			const [error, setError] = react.useState(null);
			const [copied, setCopied] = react.useState(false);
			react.useEffect(() => {
				let alive = true;
				api.call("get", { name }).then((response) => {
					if (!alive) return;
					if (response.ok) setRecord(response.value);
					else setError((response.error && response.error.message) || "get failed");
				}).catch((e) => {
					if (alive) setError(String((e && e.message) || e));
				});
				return () => { alive = false; };
			}, [api, name]);
			const copyContent = () => {
				if (!record) return;
				try {
					navigator.clipboard.writeText(record.content || "").then(() => {
						setCopied(true);
						setTimeout(() => setCopied(false), 1600);
					}, () => setCopied(false));
				} catch {
					setCopied(false);
				}
			};
			const body = record === null && error === null
				? h("div", { className: "dskm-empty" }, t("skillManage.loading"))
				: error !== null
					? h("div", { className: "dskm-note" }, error)
					: h("div", { className: "dskm-modal-body" }, [
						h("div", { key: "desc", className: "dskm-kv" }, h("span", null, h("b", null, t("skillManage.description") + "："), record.description)),
						record.whenToUse ? h("div", { key: "wtu", className: "dskm-kv" }, h("span", null, h("b", null, t("skillManage.whenToUse") + "："), record.whenToUse)) : null,
						h("div", { key: "meta", className: "dskm-kv" }, h("span", null, h("b", null, t("skillManage.source") + "："), record.source || t("skillManage.unknown"), " · ", t("skillManage.provider") + "：", record.provider || t("skillManage.unknown"), record.path ? " · " + t("skillManage.path") + "：" : "")),
						record.path ? h("div", { key: "path", className: "dskm-card-path", title: record.path }, record.path) : null,
						h("div", { key: "content-head", style: { display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" } },
							h("span", { className: "dskm-count" }, t("skillManage.content")),
							h("button", { type: "button", className: "dskm-linkbtn", onClick: copyContent }, copied ? t("skillManage.copied") : t("skillManage.copy"))),
						h("pre", { key: "content", className: "dskm-pre" }, record.content || "")
					]);
			return h(primitives.Modal, {
				open: true,
				title: h("span", { style: { fontFamily: "var(--ds-font-family-code,monospace)" } }, name),
				onClose,
				footer: h("div", { className: "dskm-modal-footer" }, [
					h("button", { key: "close", type: "button", className: "dskm-btn", onClick: onClose }, t("skillManage.close")),
					record && record.writable ? h("button", { key: "edit", type: "button", className: "dskm-btn", "data-primary": "true", onClick: () => onEdit(record) }, t("skillManage.edit")) : null
				]),
				children: body
			});
		}

		// ---------- create / edit modal ----------
		function SkillEditor({ t, api, initial, roots, onClose, onSaved }) {
			const isCreate = initial === null;
			const [loading, setLoading] = react.useState(!isCreate);
			const [loadError, setLoadError] = react.useState(null);
			const [name, setName] = react.useState(isCreate ? "" : initial.name);
			const [description, setDescription] = react.useState(isCreate ? "" : (initial.description || ""));
			const [whenToUse, setWhenToUse] = react.useState(isCreate ? "" : (initial.whenToUse || ""));
			const [content, setContent] = react.useState(isCreate ? "" : (initial.content || ""));
			const [modelInvocable, setModelInvocable] = react.useState(!isCreate ? (initial.invocation ? initial.invocation.modelInvocable : true) : true);
			const [userInvocable, setUserInvocable] = react.useState(!isCreate ? (initial.invocation ? initial.invocation.userInvocable : true) : true);
			react.useEffect(() => {
				if (isCreate) return;
				let alive = true;
				api.call("get", { name: initial.name }).then((response) => {
					if (!alive) return;
					if (!response.ok) {
						setLoadError((response.error && response.error.message) || "load failed");
						setLoading(false);
						return;
					}
					const record = response.value;
					setName(record.name);
					setDescription(record.description || "");
					setWhenToUse(record.whenToUse || "");
					setContent(record.content || "");
					setModelInvocable(record.invocation ? record.invocation.modelInvocable : true);
					setUserInvocable(record.invocation ? record.invocation.userInvocable : true);
					setLoading(false);
				}).catch((e) => {
					if (alive) {
						setLoadError(String((e && e.message) || e));
						setLoading(false);
					}
				});
				return () => { alive = false; };
			}, [api, initial, isCreate]);
			const createRoots = react.useMemo(() => {
				if (!isCreate) return [];
				const pool = (roots || []).filter((r) => r.writable && (r.exists || r.kind === "user"));
				pool.sort((a, b) => a.rank - b.rank);
				return pool;
			}, [roots, isCreate]);
			const [root, setRoot] = react.useState(isCreate && createRoots.length > 0 ? createRoots[0].path : "");
			const [busy, setBusy] = react.useState(false);
			const [error, setError] = react.useState(null);
			const [touched, setTouched] = react.useState({});
			const nameValid = isCreate ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name.trim()) : true;
			const descValid = description.trim().length > 0;
			const contentValid = content.trim().length > 0;
			const canSave = !busy && !loading && nameValid && descValid && contentValid;
			const save = async () => {
				setTouched({ name: true, description: true, content: true });
				if (!canSave) return;
				setBusy(true);
				setError(null);
				try {
					const payload = {
						name: name.trim(),
						description: description.trim(),
						whenToUse: whenToUse.trim(),
						content,
						modelInvocable,
						userInvocable
					};
					const response = isCreate ? await api.call("create", Object.assign({}, payload, { root })) : await api.call("update", payload);
					if (!response.ok) {
						setError((response.error && response.error.message) || "save failed");
						return;
					}
					onSaved(response.value);
				} catch (e) {
					setError(String((e && e.message) || e));
				} finally {
					setBusy(false);
				}
			};
			if (loading) return h(primitives.Modal, {
				open: true,
				title: fmt(t("skillManage.editTitle"), { name: initial.name }),
				onClose,
				children: h("div", { className: "dskm-empty" }, t("skillManage.loading"))
			});
			const field = (key, label, hint, control) => h("div", { key: key, className: "dskm-field" }, [
				h("label", { key: "l", htmlFor: "dskm-" + key }, label),
				control,
				hint ? h("span", { key: "h", className: "hint" }, hint) : null
			]);
			const invalid = (cond) => (touched.name || touched.description || touched.content) && cond ? "true" : undefined;
			const body = h("div", { className: "dskm-modal-body" }, [
				isCreate ? field("name", t("skillManage.name") + " *", t("skillManage.nameHint"),
					h("input", { id: "dskm-name", className: "dskm-input", value: name, "data-invalid": invalid(!nameValid), placeholder: "my-skill", autoFocus: true, onChange: (e) => setName(e.target.value), onBlur: () => setTouched({ ...touched, name: true }) })) : null,
				field("description", t("skillManage.description") + " *", t("skillManage.descriptionHint"),
					h("textarea", { id: "dskm-description", className: "dskm-textarea", value: description, "data-invalid": invalid(!descValid), rows: 3, onChange: (e) => setDescription(e.target.value), onBlur: () => setTouched({ ...touched, description: true }) })),
				field("whenToUse", t("skillManage.whenToUse"), t("skillManage.whenToUseHint"),
					h("textarea", { id: "dskm-whenToUse", className: "dskm-textarea", value: whenToUse, rows: 2, onChange: (e) => setWhenToUse(e.target.value) })),
				field("invocation", t("skillManage.invocation"), null, h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, [
					h("label", { key: "mi", className: "dskm-check" }, [
						h("input", { type: "checkbox", checked: modelInvocable, onChange: (e) => setModelInvocable(e.target.checked) }),
						h("span", null, t("skillManage.modelInvocable"))
					]),
					h("label", { key: "ui", className: "dskm-check" }, [
						h("input", { type: "checkbox", checked: userInvocable, onChange: (e) => setUserInvocable(e.target.checked) }),
						h("span", null, t("skillManage.userInvocable"))
					])
				])),
				isCreate && createRoots.length > 0 ? field("root", t("skillManage.root"), null,
					h("select", { id: "dskm-root", className: "dskm-select", value: root, onChange: (e) => setRoot(e.target.value) },
						createRoots.map((r) => h("option", { key: r.path, value: r.path }, r.source + " — " + r.path)))) : null,
				field("content", t("skillManage.content") + " *", t("skillManage.contentHint"),
					h("textarea", { id: "dskm-content", className: "dskm-textarea", "data-code": "true", value: content, "data-invalid": invalid(!contentValid), rows: 14, onChange: (e) => setContent(e.target.value), onBlur: () => setTouched({ ...touched, content: true }) })),
				loadError ? h("div", { key: "loaderr", className: "dskm-notice", "data-kind": "error" }, loadError) : null,
				error ? h("div", { key: "err", className: "dskm-notice", "data-kind": "error" }, error) : null
			]);
			return h(primitives.Modal, {
				open: true,
				title: isCreate ? t("skillManage.newTitle") : fmt(t("skillManage.editTitle"), { name: initial.name }),
				onClose,
				children: body,
				footer: h("div", { className: "dskm-modal-footer" }, [
					h("button", { key: "cancel", type: "button", className: "dskm-btn", onClick: onClose, disabled: busy }, t("skillManage.cancel")),
					h("button", { key: "save", type: "button", className: "dskm-btn", "data-primary": "true", onClick: save, disabled: !canSave }, busy ? t("skillManage.busySave") : (isCreate ? t("skillManage.create") : t("skillManage.save")))
				])
			});
		}

		// ---------- remove confirm ----------
		function RemoveConfirm({ t, name, onConfirm, onClose }) {
			const [busy, setBusy] = react.useState(false);
			const confirm = async () => {
				setBusy(true);
				await onConfirm();
			};
			return h(primitives.Modal, {
				open: true,
				title: t("skillManage.removeTitle"),
				onClose,
				children: h("div", { className: "dskm-modal-body" }, fmt(t("skillManage.removeBody"), { name })),
				footer: h("div", { className: "dskm-modal-footer" }, [
					h("button", { key: "cancel", type: "button", className: "dskm-btn", onClick: onClose, disabled: busy }, t("skillManage.cancel")),
					h("button", { key: "ok", type: "button", className: "dskm-btn", "data-danger": "true", "data-primary": "true", onClick: confirm, disabled: busy }, t("skillManage.removeConfirm"))
				])
			});
		}

		// ---------- section ----------
		function SkillManagerSection({ t, api }) {
			const [view, setView] = react.useState({ phase: "loading", skills: [], roots: [], cwd: null, error: null });
			const [filter, setFilter] = react.useState("");
			const [detailName, setDetailName] = react.useState(null);
			const [editor, setEditor] = react.useState(null);
			const [removeName, setRemoveName] = react.useState(null);
			const [notice, setNotice] = react.useState(null);
			const noticeTimer = react.useRef(null);
			const refresh = react.useCallback(async () => {
				setView((previous) => ({ ...previous, phase: previous.phase === "ready" ? "ready" : "loading" }));
				try {
					const response = await api.call("list", {});
					if (response.ok) setView({ phase: "ready", skills: response.value.skills || [], roots: response.value.roots || [], cwd: response.value.cwd || null, error: null });
					else setView((previous) => ({ ...previous, phase: "error", error: (response.error && response.error.message) || "list failed" }));
				} catch (e) {
					setView((previous) => ({ ...previous, phase: "error", error: String((e && e.message) || e) }));
				}
			}, [api]);
			react.useEffect(() => { refresh(); }, [refresh]);
			react.useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);
			const flash = (kind, text) => {
				setNotice({ kind, text });
				if (noticeTimer.current) clearTimeout(noticeTimer.current);
				noticeTimer.current = setTimeout(() => setNotice(null), 5000);
			};
			const onSaved = (record) => {
				const created = editor !== null && editor.mode === "create";
				setEditor(null);
				flash("ok", fmt(created ? t("skillManage.created") : t("skillManage.updated"), { name: record.name }));
				refresh();
			};
			const onRemoved = (name) => {
				setRemoveName(null);
				flash("ok", fmt(t("skillManage.removed"), { name }));
				refresh();
			};
			const query = filter.trim().toLowerCase();
			const rows = (view.skills || []).filter((skill) => {
				if (!query) return true;
				return skill.name.toLowerCase().includes(query) || (skill.description || "").toLowerCase().includes(query);
			});
			const countLabel = fmt(t("skillManage.count"), { n: String(view.skills ? view.skills.length : 0) });

			let content;
			if (view.phase === "loading" && view.skills.length === 0) {
				content = h("div", { className: "dskm-empty" }, t("skillManage.loading"));
			} else if (view.phase === "error" && view.skills.length === 0) {
				content = h("div", { className: "dskm-empty" }, [
					fmt(t("skillManage.error"), { message: view.error || t("skillManage.unknown") }),
					h("button", { key: "retry", type: "button", className: "dskm-btn", onClick: refresh, style: { marginTop: 10 } }, t("skillManage.refresh"))
				]);
			} else if (rows.length === 0) {
				content = h("div", { className: "dskm-empty" }, query ? "" : t("skillManage.empty"));
			} else {
				content = h("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, rows.map((skill) =>
					h("div", { key: skill.name, className: "dskm-card", "data-muted": !skill.writable && !skill.path ? "true" : undefined }, [
						h("div", { key: "head", className: "dskm-card-head" }, [
							h("span", { key: "name", className: "dskm-card-name", title: skill.name }, skill.name),
							h(SourceBadges, { key: "badges", skill, t })
						]),
						h("div", { key: "desc", className: "dskm-card-desc" }, skill.description || ""),
						skill.path ? h("div", { key: "path", className: "dskm-card-path", title: skill.path }, skill.path) : null,
						h("div", { key: "actions", className: "dskm-card-actions" }, [
							h("button", { key: "view", type: "button", className: "dskm-linkbtn", onClick: () => setDetailName(skill.name) }, t("skillManage.view")),
							skill.writable ? h("button", { key: "edit", type: "button", className: "dskm-linkbtn", onClick: () => setEditor({ mode: "edit", name: skill.name }) }, t("skillManage.edit")) : null,
							skill.writable ? h("button", { key: "remove", type: "button", className: "dskm-linkbtn", "data-danger": "true", onClick: () => setRemoveName(skill.name) }, t("skillManage.remove")) : null
						])
					])
				));
			}

			return h("div", { className: "dskm-root" }, [
				h("div", { key: "head", className: "dskm-head" }, [
					h("div", { key: "title", className: "dskm-title" }, [
						h(primitives.IconSkillOutline16, { key: "i", size: 16 }),
						h("span", { key: "t" }, t("skillManage.title"))
					]),
					h("span", { key: "intro", className: "dskm-intro" }, t("skillManage.intro"))
				]),
				h("div", { key: "toolbar", className: "dskm-toolbar" }, [
					h("div", { key: "search", className: "dskm-search" }, [
						h(primitives.IconSearchOutline16, { key: "i", size: 13 }),
						h("input", { key: "in", type: "text", placeholder: t("skillManage.search"), value: filter, onChange: (e) => setFilter(e.target.value) })
					]),
					h("button", { key: "refresh", type: "button", className: "dskm-btn", onClick: refresh, title: t("skillManage.refresh") },
						h(primitives.IconRefreshOutline14, { key: "i", size: 14 })),
					h("button", { key: "new", type: "button", className: "dskm-btn", "data-primary": "true", onClick: () => setEditor({ mode: "create" }) },
						h(primitives.IconPlusOutline16, { key: "i", size: 14 }),
						t("skillManage.new"))
				]),
				notice ? h("div", { key: "notice", className: "dskm-notice", "data-kind": notice.kind }, notice.text) : null,
				h("div", { key: "count", className: "dskm-count" }, countLabel),
				h("div", { key: "list" }, content),
				h("span", { key: "note", className: "dskm-note" }, t("skillManage.autoNote")),
				detailName !== null ? h(SkillDetail, { key: "detail", t, api, name: detailName, onClose: () => setDetailName(null), onEdit: (record) => { setDetailName(null); setEditor({ mode: "edit", name: record.name }); } }) : null,
				editor !== null ? h(SkillEditor, {
					key: "editor",
					t,
					api,
					initial: editor.mode === "create" ? null : { name: editor.name },
					roots: view.roots,
					onClose: () => setEditor(null),
					onSaved
				}) : null,
				removeName !== null ? h(RemoveConfirm, { key: "remove", t, name: removeName, onClose: () => setRemoveName(null), onConfirm: async () => {
					const response = await api.call("remove", { name: removeName });
					if (!response.ok) flash("error", (response.error && response.error.message) || "remove failed");
					else onRemoved(removeName);
				} }) : null
			]);
		}

		// ---------- plugin entry ----------
		const inject = ["slots", "locale", "connection"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-skill-manager: dictionaries");
			const t = ctx.locale.bind(NS);
			const call = (endpoint, payload) => ctx.connection.rpc.call("/skill-manage", endpoint, payload);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skills",
				order: 30,
				label: () => t("skillManage.nav"),
				locale: NS,
				inject: () => ({ api: { call } })
			}, SkillManagerSection));
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.SkillManagerSection = SkillManagerSection;
		return module.exports;
	}
});

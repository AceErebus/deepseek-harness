window.__ModuleLoader__.load({
	id: "dsh-erebus-git",
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
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let react_dom = require("react-dom");
		//#region src/client/index.ts
		const h = react.createElement;
		const css = ".dsh-git-overlay{position:fixed;inset:0;z-index:1000;background:transparent;display:flex;align-items:center;justify-content:center}.dsh-git-modal{color-scheme:light;width:min(960px,94vw);height:min(640px,90vh);display:flex;flex-direction:column;background:#f4f6fb;border:1px solid var(--dsw-alias-border-l1,#c5cddd);border-radius:12px;box-shadow:var(--dsw-shadow-lv2,0 18px 48px rgba(15,30,72,.28));overflow:hidden;--dsw-alias-bg-base:#f4f6fb;--dsw-alias-bg-layer-1:#f4f6fb;--dsw-alias-bg-layer-2:#eef1f8;--dsw-alias-bg-layer-3:#f4f6fb;--dsw-alias-bg-overlay:#f4f6fb;--dsw-alias-label-primary:#172347;--dsw-alias-label-secondary:#3a4d73;--dsw-alias-label-tertiary:#6b7c9c}.dsh-git-header{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-git-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}.dsh-git-repo{height:26px;max-width:220px;box-sizing:border-box;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:0 8px;font-family:inherit;font-size:12px}.dsh-git-branch{flex:none;font-size:11px;line-height:18px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover);border-radius:6px;padding:2px 8px;white-space:nowrap}.dsh-git-spacer{flex:1}.dsh-git-btn{flex:none;height:26px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;line-height:1;cursor:pointer;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:none;border-radius:8px;padding:0 10px;font-family:inherit;font-size:12px}.dsh-git-btn svg{display:block;flex:none}.dsh-git-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.dsh-git-btn[disabled]{opacity:.45;cursor:default}.dsh-git-btn[data-primary]{background:var(--dsw-alias-button-elevated-fill);border:1px solid var(--dsw-alias-border-l1)}.dsh-git-body{flex:1;min-height:0;display:flex}.dsh-git-changes{flex:none;width:300px;min-width:220px;max-width:40%;border-right:1px solid var(--dsw-alias-border-l2);overflow-y:auto;padding:8px 6px;box-sizing:border-box}.dsh-git-section{margin-bottom:6px}.dsh-git-section-head{display:flex;align-items:center;gap:6px;padding:4px 6px;font-size:11px;color:var(--dsw-alias-label-tertiary);cursor:pointer;user-select:none}.dsh-git-section-head[data-danger]{color:var(--dsw-alias-state-error-primary)}.dsh-git-section-n{flex:none;display:inline-flex;align-items:center;justify-content:center;height:20px;box-sizing:border-box;font-size:10px;background:var(--dsw-alias-interactive-bg-hover);border-radius:8px;padding:0 6px;line-height:1}.dsh-git-row{display:flex;align-items:center;gap:6px;height:26px;padding:0 6px;border-radius:6px;cursor:pointer;box-sizing:border-box}.dsh-git-row:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsh-git-row[data-selected]{background:var(--dsw-alias-interactive-bg-hover-solid)}.dsh-git-row[data-conflict] .dsh-git-glyph{color:var(--dsw-alias-state-error-primary)}.dsh-git-row-check,.dsh-git-inline-stage{appearance:none;-webkit-appearance:none;flex:none;width:14px;height:14px;margin:0;box-sizing:border-box;border:1.5px solid var(--dsw-alias-border-l1,#9aa8c7);border-radius:3px;background:#fff;cursor:pointer}.dsh-git-row-check:checked,.dsh-git-row-check:indeterminate{background-color:var(--dsw-alias-state-business-primary,#4176e6);border-color:var(--dsw-alias-state-business-primary,#4176e6);background-size:10px 10px;background-position:center;background-repeat:no-repeat}.dsh-git-row-check:checked{background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27none%27 stroke=%27%23fff%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 d=%27M2.5 6.2 5 8.7 9.5 3.5%27/%3E%3C/svg%3E')}.dsh-git-row-check:indeterminate{background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27none%27 stroke=%27%23fff%27 stroke-width=%272%27 stroke-linecap=%27round%27 d=%27M2.5 6h7%27/%3E%3C/svg%3E')}.dsh-git-row-check:disabled,.dsh-git-inline-stage:disabled{opacity:.45;cursor:default}.dsh-git-glyph{flex:none;width:16px;text-align:center;font-size:11px;color:var(--dsw-alias-label-tertiary);font-weight:600}.dsh-git-glyph[data-letter='M']{color:var(--dsw-alias-state-success-primary,#16a34a)}.dsh-git-glyph[data-letter='A']{color:var(--dsw-alias-state-success-primary,#16a34a)}.dsh-git-glyph[data-letter='D']{color:var(--dsw-alias-state-error-primary,#dc2626)}.dsh-git-glyph[data-letter='U']{color:var(--dsw-alias-state-error-primary,#dc2626)}.dsh-git-file{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}.dsh-git-base{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--dsw-alias-label-primary);line-height:16px}.dsh-git-dir{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--dsw-alias-label-tertiary);line-height:12px}.dsh-git-row-btn{display:none;flex:none;height:20px;padding:0 6px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:4px;cursor:pointer;font-size:11px}.dsh-git-row:hover .dsh-git-row-btn{display:inline-flex;align-items:center;justify-content:center}.dsh-git-row-btn:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover)}.dsh-git-diff{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}.dsh-git-diff-path{flex:none;display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;min-width:0}.dsh-git-diff-hint{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:13px;padding:24px;text-align:center}.dsh-git-diff-body{flex:1;min-height:0;overflow-y:auto;padding:8px 12px;box-sizing:border-box}.dsh-git-hunk{margin-bottom:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;overflow:hidden}.dsh-git-hunk-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px;background:var(--dsw-alias-interactive-bg-hover);border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-git-hunk-meta{font-size:11px;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-git-hunk-body{margin:0;padding:6px 8px;overflow-x:auto;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}.dsh-git-line{white-space:pre}.dsh-git-line-add{color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent)}.dsh-git-line-del{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}.dsh-git-conflict{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;padding:16px;box-sizing:border-box;overflow-y:auto}.dsh-git-conflict-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.dsh-git-conflict-bar{display:flex;gap:8px;flex-wrap:wrap}.dsh-git-footer{flex:none;display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-top:1px solid var(--dsw-alias-border-l2)}.dsh-git-message{width:100%;box-sizing:border-box;min-height:52px;resize:vertical;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px;font-family:inherit;font-size:12px;outline:none}.dsh-git-actions{display:flex;align-items:center;gap:8px}.dsh-git-notice{flex:1;min-width:0;font-size:12px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-git-notice[data-error]{color:var(--dsw-alias-state-error-primary)}.dsh-git-dirrow{color:var(--dsw-alias-label-secondary)}.dsh-git-tree-chev{flex:none;width:14px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary)}.dsh-git-diricon{flex:none;display:inline-flex;color:var(--dsw-alias-label-tertiary)}.dsh-git-dirname{font-weight:500}.dsh-git-group-label{font-weight:500;white-space:nowrap}.dsh-git-group-rb{width:26px;height:26px;padding:0;line-height:0}.dsh-git-row[data-kind='modified'] .dsh-git-base,.dsh-git-row[data-kind='add'] .dsh-git-base{color:var(--dsw-alias-state-success-primary,#16a34a)}.dsh-git-row[data-kind='untracked'] .dsh-git-base{color:var(--dsw-alias-state-error-primary,#dc2626)}.dsh-git-row[data-kind='conflict'] .dsh-git-base{color:var(--dsw-alias-state-error-primary,#dc2626)}.dsh-git-dirname{color:var(--dsw-alias-label-secondary,#3a4d73)}.dsh-git-row-del{color:var(--dsw-alias-state-error-primary)}.dsh-git-inline{flex:1;min-height:0;overflow:auto;font-family:var(--ds-font-family-code);font-size:12px;line-height:20px}.dsh-git-inline-hunkbar{display:flex;align-items:center;gap:8px;padding:2px 8px;position:sticky;top:0;z-index:1;background:var(--dsw-alias-interactive-bg-hover);border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-git-inline-hdr{flex:1;min-width:0;font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsh-git-inline-revert{flex:none;height:20px;padding:0 8px;font-size:11px}.dsh-git-inline-row{display:grid;grid-template-columns:22px minmax(36px,max-content) minmax(48px,max-content) minmax(max-content,1fr);min-width:100%;align-items:stretch;box-sizing:border-box}.dsh-git-inline-act{display:flex;align-items:center;justify-content:center}.dsh-git-inline-act .dsh-git-btn{width:18px;height:18px;padding:0;line-height:0;background:transparent}.dsh-git-inline-no{padding:0 8px;text-align:right;color:var(--dsw-alias-label-tertiary);user-select:none;border-right:1px solid var(--dsw-alias-border-l2);font-variant-numeric:tabular-nums;white-space:nowrap}.dsh-git-inline-code{padding:0 12px;white-space:pre;min-width:0;color:var(--dsw-alias-label-secondary)}.dsh-git-inline-row[data-kind='del']{background:color-mix(in srgb,var(--dsw-alias-label-tertiary,#94a3b8) 22%,transparent);box-shadow:inset 3px 0 var(--dsw-alias-label-tertiary,#94a3b8)}.dsh-git-inline-row[data-kind='add']{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 16%,transparent);box-shadow:inset 3px 0 var(--dsw-alias-state-success-primary,#16a34a)}.dsh-git-inline-row[data-kind='del'] .dsh-git-inline-code{color:var(--dsw-alias-label-secondary,#64748b)}.dsh-git-inline-row[data-kind='add'] .dsh-git-inline-code{color:var(--dsw-alias-state-success-primary,#16a34a)}.dsh-git-inline-hl{border-radius:2px}.dsh-git-inline-row[data-kind='del'] .dsh-git-inline-hl{background:color-mix(in srgb,var(--dsw-alias-label-tertiary,#94a3b8) 36%,transparent)}.dsh-git-inline-row[data-kind='add'] .dsh-git-inline-hl{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#16a34a) 32%,transparent)}.dsh-git-inline-stage:checked{background-color:var(--dsw-alias-state-success-primary,#16a34a);border-color:var(--dsw-alias-state-success-primary,#16a34a);background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27none%27 stroke=%27%23fff%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 d=%27M2.5 6.2 5 8.7 9.5 3.5%27/%3E%3C/svg%3E');background-size:10px 10px;background-position:center;background-repeat:no-repeat}.dsh-git-content{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}.dsh-git-content-body{flex:1;min-height:0;overflow:auto;margin:0;padding:12px 16px;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-all}.dsh-git-stash-overlay{z-index:1001}.dsh-git-stash-box{color-scheme:light;width:min(420px,90vw);background:#f4f6fb;border:1px solid var(--dsw-alias-border-l1,#c5cddd);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--dsw-shadow-lv2,0 18px 48px rgba(15,30,72,.28))}.dsh-git-stash-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}.dsh-git-stash-input{height:30px;box-sizing:border-box;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:0 8px;font-family:inherit;font-size:12px;outline:none}.dsh-git-addbtn{width:26px;height:26px;padding:0;line-height:0;color:var(--dsw-alias-state-success-primary)}";
		const cssTagId = "dsh-erebus-git/styles";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "dsh-erebus-git";
				tag.dataset.pluginCss = cssTagId;
				document.head.appendChild(tag);
			}
			tag.textContent = css;
		}
		const NS = "dsh-erebus-git";
		const zh = {
			"git.title": "Git 管理",
			"git.close": "关闭",
			"git.repo": "仓库",
			"git.refresh": "刷新",
			"git.push": "推送",
			"git.pull": "拉取",
			"git.commit": "提交",
			"git.commitSelected": "提交所选",
			"git.commitAll": "提交全部",
			"git.commitMessage": "提交信息…",
			"git.commitMessageRequired": "请填写提交信息",
			"git.hunkRevert": "回滚此块",
			"git.hunkReverted": "已回滚此块",
			"git.hunkStage": "暂存此块",
			"git.hunkStaged": "已暂存此块",
			"git.committing": "提交中…",
			"git.staged": "已暂存修改",
			"git.unstaged": "未暂存修改",
			"git.untracked": "未跟踪文件",
			"git.conflicts": "冲突",
			"git.changes": "更改",
			"git.sectionStaged": "更改",
			"git.sectionUntracked": "未进行版本管理的文件",
			"git.addSelected": "git add（选中的文件）",
			"git.stage": "暂存所选",
			"git.stagedOk": "已暂存",
			"git.selectAll": "全选",
			"git.selectHint": "请先勾选文件",
			"git.rollbackAll": "回滚全部",
			"git.rollbackAllConfirm": "确定回滚【更改】分组下全部文件的本地修改？未进行版本管理的文件不受影响。",
			"git.deleteFile": "删除",
			"git.deleteConfirm": "确定删除文件 {path}？此操作不可恢复。",
			"git.commitPush": "提交并推送",
			"git.committedPushed": "已提交并推送",
			"git.stash": "储藏更改",
			"git.stashTitle": "储藏更改",
			"git.stashMessage": "储藏说明（必填）",
			"git.stashHint": "请填写储藏说明",
			"git.stashDone": "已储藏",
			"git.oldVersion": "旧版本",
			"git.newVersion": "新版本",
			"git.binaryNote": "二进制文件，无法预览",
			"git.modifiedKind": "修改",
			"git.addedKind": "新增",
			"git.untrackedKind": "未跟踪",
			"git.rollbackFile": "回滚此文件",
			"git.rollbackConfirm": "确定回滚 {path} 的所有修改？",
			"git.openInEditor": "在编辑器中打开",
			"git.markResolved": "标记已解决",
			"git.keepOurs": "保留我的",
			"git.keepTheirs": "保留他们的",
			"git.conflictHint": "冲突文件：手动合并（在编辑器中打开）或直接选择一侧，然后标记已解决",
			"git.untrackedNote": "未跟踪的新文件（提交后加入版本库）",
			"git.noSelection": "选择左侧的文件查看差异",
			"git.noRepos": "未找到 git 仓库（工作区下没有 .git 目录）",
			"git.noWorkspace": "未找到工作区",
			"git.loading": "加载中…",
			"git.error": "操作失败",
			"git.done": "完成",
			"git.committed": "已提交",
			"git.pushed": "已推送",
			"git.pulled": "已拉取",
			"git.rolledBack": "已回滚",
			"git.resolved": "已标记为已解决",
			"git.ahead": "领先 {n}",
			"git.behind": "落后 {n}",
			"git.modified": "修改",
			"git.added": "新增",
			"git.deleted": "删除",
			"git.renamed": "重命名",
			"git.conflicted": "冲突",
			"git.untrackedShort": "未跟踪",
			"git.stagedShort": "已暂存",
			"git.unstagedShort": "未暂存",
			"git.file": "文件",
			"git.path": "路径"
		};
		const en = {
			"git.title": "Git Management",
			"git.close": "Close",
			"git.repo": "Repository",
			"git.refresh": "Refresh",
			"git.push": "Push",
			"git.pull": "Pull",
			"git.commit": "Commit",
			"git.commitSelected": "Commit Selected",
			"git.commitAll": "Commit All",
			"git.commitMessage": "Commit message…",
			"git.commitMessageRequired": "Please enter a commit message",
			"git.hunkRevert": "Revert hunk",
			"git.hunkReverted": "Hunk reverted",
			"git.hunkStage": "Stage hunk",
			"git.hunkStaged": "Hunk staged",
			"git.committing": "Committing…",
			"git.staged": "Staged changes",
			"git.unstaged": "Unstaged changes",
			"git.untracked": "Untracked files",
			"git.conflicts": "Conflicts",
			"git.changes": "Changes",
			"git.sectionStaged": "Changes",
			"git.sectionUntracked": "Unversioned files",
			"git.addSelected": "git add (selected files)",
			"git.stage": "Stage Selected",
			"git.stagedOk": "Staged",
			"git.selectAll": "Select all",
			"git.selectHint": "Select files first",
			"git.rollbackAll": "Rollback all",
			"git.rollbackAllConfirm": "Discard all local changes in the Changes group? Unversioned files are not affected.",
			"git.deleteFile": "Delete",
			"git.deleteConfirm": "Delete file {path}? This cannot be undone.",
			"git.commitPush": "Commit and Push",
			"git.committedPushed": "Committed and pushed",
			"git.stash": "Stash",
			"git.stashTitle": "Stash changes",
			"git.stashMessage": "Stash message (required)",
			"git.stashHint": "Enter a stash message",
			"git.stashDone": "Stashed",
			"git.oldVersion": "Old",
			"git.newVersion": "New",
			"git.binaryNote": "Binary file, cannot preview",
			"git.modifiedKind": "modified",
			"git.addedKind": "added",
			"git.untrackedKind": "untracked",
			"git.rollbackFile": "Rollback file",
			"git.rollbackHunk": "Rollback hunk",
			"git.rollbackConfirm": "Discard all changes of {path}?",
			"git.hunkConfirm": "Discard this change?",
			"git.openInEditor": "Open in editor",
			"git.markResolved": "Mark resolved",
			"git.keepOurs": "Keep ours",
			"git.keepTheirs": "Keep theirs",
			"git.conflictHint": "Conflicted file: merge manually (open in the editor) or pick a side, then mark resolved",
			"git.untrackedNote": "Untracked new file (added to the repository on commit)",
			"git.noSelection": "Select a file on the left to see its diff",
			"git.noRepos": "No git repository found (no .git under the workspace)",
			"git.noWorkspace": "No workspace found",
			"git.loading": "Loading…",
			"git.error": "Operation failed",
			"git.done": "Done",
			"git.committed": "Committed",
			"git.pushed": "Pushed",
			"git.pulled": "Pulled",
			"git.rolledBack": "Rolled back",
			"git.resolved": "Marked as resolved",
			"git.ahead": "{n} ahead",
			"git.behind": "{n} behind",
			"git.modified": "modified",
			"git.added": "added",
			"git.deleted": "deleted",
			"git.renamed": "renamed",
			"git.conflicted": "conflict",
			"git.untrackedShort": "untracked",
			"git.stagedShort": "staged",
			"git.unstagedShort": "unstaged",
			"git.file": "File",
			"git.path": "Path"
		};
		function baseName(path) {
			const trimmed = path.replace(/[\\/]+$/, "");
			const i = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return i < 0 ? trimmed : trimmed.slice(i + 1);
		}
		function absJoin(repo, file) {
			return `${repo.replace(/[\\/]+$/, "")}/${file}`;
		}
		function isConflicted(change) {
			if (change.staged === "U" || change.unstaged === "U") return true;
			const s = change.staged;
			const u = change.unstaged;
			return s !== "" && u !== "" && "ADU".includes(s) && "ADU".includes(u);
		}
		function isUntracked(change) {
			return change.unstaged === "?";
		}
		function fileChangeKind(change) {
			if (isConflicted(change)) return "conflict";
			if (isUntracked(change)) return "untracked";
			if (change.staged === "A" || change.unstaged === "A") return "add";
			return "modified";
		}
		/** Folder names stay neutral; only leaf files take a status color. */
		function kindColor(kind) {
			if (kind === "untracked" || kind === "conflict") return "var(--dsw-alias-state-error-primary, #dc2626)";
			return "var(--dsw-alias-state-success-primary, #16a34a)";
		}
		/** Split a unified diff into its hunks (each `@@` block with its body lines). */
		function splitHunks(diff) {
			const hunks = [];
			let current = null;
			for (const line of diff.split("\n")) if (line.startsWith("@@")) {
				current = {
					header: line,
					lines: []
				};
				hunks.push(current);
			} else if (current !== null) current.lines.push(line);
			return hunks;
		}
		/**
		* Group a change list into a directory tree (IDEA-style): directories first,
		* then files, both alphabetical; a directory node holds the files (and
		* nested directories) under its path.
		*/
		function buildChangeTree(changes) {
			const root = [];
			const dirLists = /* @__PURE__ */ new Map();
			const childrenOf = (dirPath) => {
				if (dirPath === "") return root;
				let list = dirLists.get(dirPath);
				if (list !== void 0) return list;
				const slash = dirPath.lastIndexOf("/");
				const parentPath = slash <= 0 ? "" : dirPath.slice(0, slash);
				const node = {
					kind: "dir",
					name: baseName(dirPath),
					path: dirPath,
					children: []
				};
				childrenOf(parentPath).push(node);
				list = node.children;
				dirLists.set(dirPath, list);
				return list;
			};
			for (const change of changes) {
				const slash = change.path.lastIndexOf("/");
				if (slash === -1) root.push({
					kind: "file",
					name: change.path,
					path: change.path,
					change
				});
				else childrenOf(change.path.slice(0, slash)).push({
					kind: "file",
					name: change.path.slice(slash + 1),
					path: change.path,
					change
				});
			}
			const sortNodes = (nodes) => {
				nodes.sort((a, b) => {
					if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
					return a.name.localeCompare(b.name);
				});
				for (const node of nodes) if (node.kind === "dir") sortNodes(node.children);
			};
			sortNodes(root);
			return root;
		}
		/** Read the 1-based old/new starts from a unified-diff `@@` header. */
		function hunkStarts(header) {
			const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(header);
			return {
				oldStart: Number(m?.[1] ?? 1),
				newStart: Number(m?.[2] ?? 1)
			};
		}
		/** Shared prefix/suffix lengths of two strings, for intra-line highlight ranges. */
		function sharedAffix(a, b) {
			let pre = 0;
			const n = Math.min(a.length, b.length);
			while (pre < n && a.charCodeAt(pre) === b.charCodeAt(pre)) pre++;
			let suf = 0;
			const maxSuf = n - pre;
			while (suf < maxSuf && a.charCodeAt(a.length - 1 - suf) === b.charCodeAt(b.length - 1 - suf)) suf++;
			return {
				pre,
				suf
			};
		}
		/** Intra-line highlight on `text` against its paired counterpart, or none. */
		function markHl(text, other) {
			if (text.length === 0 || other.length === 0 || text === other) return {};
			const { pre, suf } = sharedAffix(text, other);
			const end = text.length - suf;
			if (pre >= end) return {};
			return {
				hlStart: pre,
				hlEnd: end
			};
		}
		/** Turn one change block into the hunk text `revertHunk` reverse-applies. */
		function blockHunk(block) {
			const oldCount = block.lines.filter((line) => line.startsWith("-")).length;
			const newCount = block.lines.filter((line) => line.startsWith("+")).length;
			return {
				header: `@@ -${block.oldStart},${oldCount} +${block.currentStart},${newCount} @@`,
				lines: block.lines
			};
		}
		/**
		* Parse one hunk into context rows and contiguous change blocks. A replacement
		* is the old line (red) then the new line (green); each run of +/- between
		* context lines is one revertible block.
		*/
		function hunkSegments(header, lines) {
			const { oldStart, newStart } = hunkStarts(header);
			let oldNo = oldStart;
			let newNo = newStart;
			const segs = [];
			let raws = [];
			let rows = [];
			let blockOldStart = oldNo;
			let blockCurrentStart = newNo;
			let oldBlock = [];
			let newBlock = [];
			const flushPairs = () => {
				if (oldBlock.length === 0 && newBlock.length === 0) return;
				const n = Math.max(oldBlock.length, newBlock.length);
				for (let i = 0; i < n; i++) {
					const o = oldBlock[i];
					const nw = newBlock[i];
					if (o && nw) {
						rows.push({
							kind: "del",
							text: o.text,
							oldNo: o.oldNo,
							newNo: null,
							...markHl(o.text, nw.text)
						});
						rows.push({
							kind: "add",
							text: nw.text,
							oldNo: null,
							newNo: nw.newNo,
							...markHl(nw.text, o.text)
						});
					} else if (o) rows.push({
						kind: "del",
						text: o.text,
						oldNo: o.oldNo,
						newNo: null
					});
					else if (nw) rows.push({
						kind: "add",
						text: nw.text,
						oldNo: null,
						newNo: nw.newNo
					});
				}
				oldBlock = [];
				newBlock = [];
			};
			const flushBlock = () => {
				flushPairs();
				if (raws.length === 0) return;
				segs.push({
					kind: "change",
					block: {
						oldStart: blockOldStart,
						currentStart: blockCurrentStart,
						lines: raws,
						rows
					}
				});
				raws = [];
				rows = [];
			};
			for (const raw of lines) {
				if (raw.startsWith("@@")) {
					flushBlock();
					continue;
				}
				if (raw === "\\ No newline at end of file") {
					if (raws.length > 0) raws.push(raw);
					continue;
				}
				const marker = raw.charAt(0);
				const text = raw.slice(1);
				if (marker === " ") {
					flushBlock();
					segs.push({
						kind: "ctx",
						row: {
							kind: "ctx",
							text,
							oldNo,
							newNo
						}
					});
					oldNo++;
					newNo++;
				} else if (marker === "-") {
					if (raws.length === 0) {
						blockOldStart = oldNo;
						blockCurrentStart = newNo;
					}
					raws.push(raw);
					oldBlock.push({
						text,
						oldNo
					});
					oldNo++;
				} else if (marker === "+") {
					if (raws.length === 0) {
						blockOldStart = oldNo;
						blockCurrentStart = newNo;
					}
					raws.push(raw);
					newBlock.push({
						text,
						newNo
					});
					newNo++;
				}
			}
			flushBlock();
			return segs;
		}
		/** Split a unified diff into hunks, each with stacked rows and revertible blocks. */
		function inlineHunks(diff) {
			return splitHunks(diff).map((hunk) => {
				const segments = hunkSegments(hunk.header, hunk.lines);
				const rows = [];
				const blocks = [];
				for (const seg of segments) if (seg.kind === "ctx") rows.push(seg.row);
				else {
					rows.push(...seg.block.rows);
					blocks.push(seg.block);
				}
				return {
					header: hunk.header,
					lines: hunk.lines,
					rows,
					blocks,
					segments
				};
			});
		}
		const gitIconBtnStyle = {
			flex: "none",
			width: 26,
			height: 26,
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			cursor: "pointer",
			color: "var(--dsw-alias-label-secondary)",
			background: "transparent",
			border: "none",
			borderRadius: 8,
			padding: 0
		};
		const rollbackIcon = h("svg", {
			width: 12,
			height: 12,
			viewBox: "0 0 12 12",
			fill: "none",
			"aria-hidden": true
		}, h("path", {
			d: "M1.5 2h5.5a3.5 3.5 0 0 1 0 7H3",
			stroke: "currentColor",
			strokeWidth: 1.5,
			fill: "none",
			strokeLinecap: "round"
		}), h("path", {
			d: "M4.75 6.75 3 8.5 4.75 10.25",
			stroke: "currentColor",
			strokeWidth: 1.5,
			fill: "none",
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}));
		const plusIcon = h("svg", {
			width: 12,
			height: 12,
			viewBox: "0 0 12 12",
			fill: "none",
			"aria-hidden": true
		}, h("path", {
			d: "M6 2.25v7.5M2.25 6h7.5",
			stroke: "currentColor",
			strokeWidth: 1.5,
			fill: "none",
			strokeLinecap: "round"
		}));
		function GitButton(props) {
			const [open, setOpen] = react.useState(false);
			const T = typeof props.t === "function" ? props.t : (key) => key;
			return h("div", {
				className: "dsh-git-button",
				style: { display: "inline-flex" }
			}, h("button", {
				type: "button",
				style: gitIconBtnStyle,
				title: T("git.title"),
				"aria-label": T("git.title"),
				onClick: () => setOpen(true)
			}, h(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size: 14 })), open ? (0, react_dom.createPortal)(h(GitPanel, {
				fsTree: props.fsTree,
				call: props.call,
				t: T,
				useSessions: props.useSessions,
				useWorkspaces: props.useWorkspaces,
				onClose: () => setOpen(false)
			}), document.body) : null);
		}
		function GitPanel(props) {
			const call = props.call;
			const fsTree = props.fsTree;
			const T = props.t;
			const useSessions = typeof props.useSessions === "function" ? props.useSessions : null;
			const useWorkspaces = typeof props.useWorkspaces === "function" ? props.useWorkspaces : null;
			const sessions = useSessions ? useSessions((s) => s) : null;
			const workspaces = useWorkspaces ? useWorkspaces((s) => s && s.items ? s.items : []) : [];
			const [repos, setRepos] = react.useState([]);
			const [active, setActive] = react.useState(null);
			const [statuses, setStatuses] = react.useState({});
			const [expandedDirs, setExpandedDirs] = react.useState({});
			const [message, setMessage] = react.useState("");
			const [selected, setSelected] = react.useState(null);
			const [diffText, setDiffText] = react.useState("");
			const [fileContent, setFileContent] = react.useState(null);
			const [fileContentNote, setFileContentNote] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [notice, setNotice] = react.useState(null);
			const [stashOpen, setStashOpen] = react.useState(false);
			const [stashText, setStashText] = react.useState("");
			const [selectedPaths, setSelectedPaths] = react.useState(/* @__PURE__ */ new Set());
			const [collapsedGroups, setCollapsedGroups] = react.useState({});
			/** Remove a fully rolled-back path from the left list, checkboxes, and the right pane. */
			const dropCleanPath = react.useCallback((repo, file) => {
				setSelected((cur) => cur && cur.repo === repo && cur.file === file ? null : cur);
				setDiffText("");
				setFileContent(null);
				setFileContentNote(null);
				setSelectedPaths((prev) => {
					if (!prev.has(file)) return prev;
					const next = new Set(prev);
					next.delete(file);
					return next;
				});
				setStatuses((prev) => {
					const st = prev[repo];
					if (!st || !st.changes.some((c) => c.path === file)) return prev;
					return Object.assign({}, prev, { [repo]: Object.assign({}, st, { changes: st.changes.filter((c) => c.path !== file) }) });
				});
			}, []);
			react.useEffect(() => {
				if (!selected) return;
				const st = statuses[selected.repo];
				if (st == null) return;
				if (st.changes.some((c) => c.path === selected.file)) return;
				dropCleanPath(selected.repo, selected.file);
			}, [
				selected,
				statuses,
				dropCleanPath
			]);
			const deriveWorkspacePath = react.useCallback(() => {
				let ws;
				if (sessions && sessions.current != null) {
					for (let i = 0; i < workspaces.length; i++) if (workspaces[i].sessionIds.indexOf(sessions.current) !== -1) {
						ws = workspaces[i];
						break;
					}
				}
				if (!ws && workspaces.length > 0) ws = workspaces[0];
				return ws && ws.path ? ws.path : null;
			}, [sessions, workspaces]);
			const loadStatus = react.useCallback((repoPath) => {
				setStatuses((prev) => Object.assign({}, prev, { [repoPath]: null }));
				call("status", { repo: repoPath }).then((r) => {
					if (!r || !r.ok) {
						setStatuses((prev) => Object.assign({}, prev, { [repoPath]: null }));
						setNotice({
							kind: "error",
							text: r && r.error ? r.error.message : T("git.error")
						});
						return;
					}
					setStatuses((prev) => {
						const next = Object.assign({}, prev);
						next[repoPath] = r.value;
						return next;
					});
				}).catch((e) => {
					setStatuses((prev) => Object.assign({}, prev, { [repoPath]: null }));
					setNotice({
						kind: "error",
						text: String(e && e.message ? e.message : e)
					});
				});
			}, [call, T]);
			const selectRepo = react.useCallback((repoPath) => {
				setActive(repoPath);
				setSelected(null);
				setDiffText("");
				setFileContent(null);
				setFileContentNote(null);
				loadStatus(repoPath);
			}, [loadStatus]);
			react.useEffect(() => {
				let alive = true;
				const root = deriveWorkspacePath();
				if (!root) {
					setNotice({
						kind: "error",
						text: T("git.noWorkspace")
					});
					return;
				}
				call("repos", { root }).then((r) => {
					if (!alive) return;
					if (!r || !r.ok) {
						setNotice({
							kind: "error",
							text: r && r.error ? r.error.message : T("git.error")
						});
						return;
					}
					const items = r.value.repos;
					setRepos(items);
					if (items.length === 0) setNotice({
						kind: "error",
						text: T("git.noRepos")
					});
					else selectRepo(items[0].path);
				}).catch((e) => {
					if (alive) setNotice({
						kind: "error",
						text: String(e && e.message ? e.message : e)
					});
				});
				return () => {
					alive = false;
				};
			}, []);
			react.useEffect(() => {
				if (!selected) {
					setDiffText("");
					setFileContent(null);
					setFileContentNote(null);
					return;
				}
				const change = statuses[selected.repo]?.changes.find((c) => c.path === selected.file);
				if (!change || isConflicted(change)) {
					setDiffText("");
					setFileContent(null);
					setFileContentNote(null);
					return;
				}
				let alive = true;
				if (isUntracked(change)) {
					setDiffText("");
					setFileContent(null);
					setFileContentNote(null);
					fsTree.call("read", { path: absJoin(selected.repo, selected.file) }).then((r) => {
						if (!alive) return;
						if (!r || !r.ok) {
							setFileContent(null);
							setFileContentNote(r && r.error ? r.error.message : T("git.error"));
							return;
						}
						const value = r.value;
						if (value.binary === true) {
							setFileContent(null);
							setFileContentNote(T("git.binaryNote"));
							return;
						}
						setFileContent(typeof value.text === "string" ? value.text : "");
						setFileContentNote(null);
					}).catch((e) => {
						if (alive) {
							setFileContent(null);
							setFileContentNote(String(e && e.message ? e.message : e));
						}
					});
					return () => {
						alive = false;
					};
				}
				setFileContent(null);
				setFileContentNote(null);
				const cached = change.staged !== "";
				call("diff", {
					repo: selected.repo,
					file: selected.file,
					cached
				}).then((r) => {
					if (!alive) return;
					if (!r || !r.ok) {
						setDiffText("");
						return;
					}
					setDiffText(r.value.diff || "");
				}).catch(() => {
					if (alive) setDiffText("");
				});
				return () => {
					alive = false;
				};
			}, [
				selected,
				call,
				fsTree,
				statuses,
				T
			]);
			const status = active !== null ? statuses[active] ?? null : null;
			const changes = status ? status.changes : [];
			const conflicted = changes.filter(isConflicted);
			const staged = changes.filter((c) => !isConflicted(c) && c.staged !== "" && c.staged !== "?");
			const unstagedTracked = changes.filter((c) => !isConflicted(c) && !isUntracked(c) && c.staged === "" && c.unstaged !== "");
			const untracked = changes.filter(isUntracked);
			const changeGroup = [
				...conflicted,
				...staged,
				...unstagedTracked
			];
			const refresh = react.useCallback(() => {
				if (!active) return;
				loadStatus(active);
			}, [active, loadStatus]);
			const runAction = react.useCallback(async (action) => {
				setBusy(true);
				try {
					const okText = await action();
					if (okText !== null) setNotice({
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
			}, []);
			const applyToggle = react.useCallback(async (leafPaths, stageThem, gitPaths) => {
				if (!active || leafPaths.length === 0) return;
				const repo = active;
				const send = gitPaths ?? leafPaths;
				await runAction(async () => {
					const r = await call(stageThem ? "stage" : "unstage", {
						repo,
						paths: send
					});
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					setStatuses((prev) => {
						const st = prev[repo];
						if (!st) return prev;
						const next = {
							...st,
							changes: st.changes.map((c) => {
								if (!leafPaths.includes(c.path)) return c;
								if (stageThem) return {
									path: c.path,
									staged: c.unstaged === "?" ? "A" : c.unstaged,
									unstaged: ""
								};
								return c.staged === "A" ? {
									path: c.path,
									staged: "",
									unstaged: "?"
								} : {
									path: c.path,
									staged: "",
									unstaged: c.staged || c.unstaged || "M"
								};
							})
						};
						return Object.assign({}, prev, { [repo]: next });
					});
					return null;
				});
			}, [
				active,
				runAction,
				call,
				T
			]);
			const toggleSelect = react.useCallback((path) => {
				setSelectedPaths((prev) => {
					const next = new Set(prev);
					if (next.has(path)) next.delete(path);
					else next.add(path);
					return next;
				});
			}, []);
			const toggleDirSelect = react.useCallback((paths) => {
				setSelectedPaths((prev) => {
					const next = new Set(prev);
					const allSelected = paths.length > 0 && paths.every((p) => next.has(p));
					for (const p of paths) if (allSelected) next.delete(p);
					else next.add(p);
					return next;
				});
			}, []);
			const doAddSelected = react.useCallback(() => {
				if (!active || selectedPaths.size === 0) return;
				const leaves = [...selectedPaths];
				const toAdd = untracked.filter((c) => selectedPaths.has(c.path));
				if (toAdd.length === 0) return;
				applyToggle(leaves, true, buildChangeTree(toAdd).map((n) => n.path));
			}, [
				active,
				selectedPaths,
				untracked,
				applyToggle
			]);
			const toggleCollapseGroup = react.useCallback((group) => {
				setCollapsedGroups((prev) => Object.assign({}, prev, { [group]: prev[group] !== true }));
			}, []);
			const toggleDir = react.useCallback((path) => {
				setExpandedDirs((prev) => {
					const next = Object.assign({}, prev);
					next[path] = prev[path] === false;
					return next;
				});
			}, []);
			const doRollbackAll = react.useCallback(() => {
				if (!active) return;
				const repo = active;
				if (typeof window !== "undefined" && !window.confirm(T("git.rollbackAllConfirm"))) return;
				runAction(async () => {
					const r = await call("revertAll", { repo });
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					loadStatus(repo);
					setSelected(null);
					return T("git.rolledBack");
				});
			}, [
				active,
				runAction,
				call,
				loadStatus,
				T
			]);
			const doRevertHunk = react.useCallback((hunk) => {
				if (!active || !selected) return;
				const repo = active;
				const file = selected.file;
				const hunkText = `${hunk.header}\n${hunk.lines.join("\n")}`;
				runAction(async () => {
					const r = await call("revertHunk", {
						repo,
						file,
						hunk: hunkText
					});
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					const r2 = await call("diff", {
						repo,
						file
					});
					const remaining = r2 && r2.ok ? r2.value.diff || "" : "";
					if (!/(^|\n)@@ /.test(remaining)) dropCleanPath(repo, file);
					else setDiffText(remaining);
					loadStatus(repo);
					return T("git.hunkReverted");
				});
			}, [
				active,
				selected,
				runAction,
				call,
				loadStatus,
				dropCleanPath,
				T
			]);
			const doStageHunk = react.useCallback((hunk) => {
				if (!active || !selected) return;
				const repo = active;
				const file = selected.file;
				const hunkText = `${hunk.header}\n${hunk.lines.join("\n")}`;
				runAction(async () => {
					const r = await call("stageHunk", {
						repo,
						file,
						hunk: hunkText
					});
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					const r2 = await call("diff", {
						repo,
						file
					});
					const remaining = r2 && r2.ok ? r2.value.diff || "" : "";
					if (!/(^|\n)@@ /.test(remaining)) setDiffText("");
					else setDiffText(remaining);
					loadStatus(repo);
					return T("git.hunkStaged");
				});
			}, [
				active,
				selected,
				runAction,
				call,
				loadStatus,
				T
			]);
			const doDeleteFile = react.useCallback((change) => {
				if (!active) return;
				const repo = active;
				const path = change.path;
				if (typeof window !== "undefined" && !window.confirm(T("git.deleteConfirm").replace("{path}", path))) return;
				runAction(async () => {
					const r = await call("deleteFile", {
						repo,
						file: path
					});
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					loadStatus(repo);
					if (selected && selected.file === path) setSelected(null);
					return T("git.rolledBack");
				});
			}, [
				active,
				runAction,
				call,
				loadStatus,
				selected,
				T
			]);
			const selectedChanges = react.useMemo(() => {
				if (!active) return [];
				return changeGroup.filter((c) => !isConflicted(c) && selectedPaths.has(c.path)).map((c) => c.path);
			}, [
				active,
				changeGroup,
				selectedPaths
			]);
			const doCommit = react.useCallback(() => {
				if (!active || selectedChanges.length === 0) return;
				if (message.trim().length === 0) {
					setNotice({
						kind: "error",
						text: T("git.commitMessageRequired")
					});
					return;
				}
				const repo = active;
				const msg = message;
				runAction(async () => {
					const r = await call("commit", {
						repo,
						message: msg,
						paths: selectedChanges
					});
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					setMessage("");
					setSelectedPaths(/* @__PURE__ */ new Set());
					loadStatus(repo);
					setSelected(null);
					return T("git.committed");
				});
			}, [
				active,
				selectedChanges,
				message,
				runAction,
				call,
				loadStatus,
				T
			]);
			const doCommitPush = react.useCallback(() => {
				if (!active || selectedChanges.length === 0) return;
				if (message.trim().length === 0) {
					setNotice({
						kind: "error",
						text: T("git.commitMessageRequired")
					});
					return;
				}
				const repo = active;
				const msg = message;
				runAction(async () => {
					const r1 = await call("commit", {
						repo,
						message: msg,
						paths: selectedChanges
					});
					if (!r1 || !r1.ok) throw new Error(r1 && r1.error ? r1.error.message : T("git.error"));
					const r2 = await call("push", { repo });
					if (!r2 || !r2.ok) throw new Error(r2 && r2.error ? r2.error.message : T("git.error"));
					setMessage("");
					setSelectedPaths(/* @__PURE__ */ new Set());
					loadStatus(repo);
					setSelected(null);
					return T("git.committedPushed");
				});
			}, [
				active,
				selectedChanges,
				message,
				runAction,
				call,
				loadStatus,
				T
			]);
			const doPush = react.useCallback(() => {
				if (!active) return;
				const repo = active;
				runAction(async () => {
					const r = await call("push", { repo });
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					loadStatus(repo);
					return T("git.pushed");
				});
			}, [
				active,
				runAction,
				call,
				loadStatus,
				T
			]);
			const doPull = react.useCallback(() => {
				if (!active) return;
				const repo = active;
				runAction(async () => {
					const r = await call("pull", { repo });
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					loadStatus(repo);
					return T("git.pulled");
				});
			}, [
				active,
				runAction,
				call,
				loadStatus,
				T
			]);
			const doStash = react.useCallback(() => {
				if (!active) return;
				const repo = active;
				const text = stashText.trim();
				if (text.length === 0) {
					setNotice({
						kind: "error",
						text: T("git.stashHint")
					});
					return;
				}
				setStashOpen(false);
				setStashText("");
				runAction(async () => {
					const r = await call("stash", {
						repo,
						message: text
					});
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					loadStatus(repo);
					setSelected(null);
					return T("git.stashDone");
				});
			}, [
				active,
				stashText,
				runAction,
				call,
				loadStatus,
				T
			]);
			const doResolve = react.useCallback((side) => {
				if (!selected) return;
				const repo = selected.repo;
				const file = selected.file;
				runAction(async () => {
					const r = await call(side === "ours" ? "resolveOurs" : side === "theirs" ? "resolveTheirs" : "markResolved", {
						repo,
						file
					});
					if (!r || !r.ok) throw new Error(r && r.error ? r.error.message : T("git.error"));
					loadStatus(repo);
					setSelected(null);
					return T("git.resolved");
				});
			}, [
				selected,
				runAction,
				call,
				loadStatus,
				T
			]);
			const openInEditor = react.useCallback((change) => {
				if (!active) return;
				fsTree.openFile(absJoin(active, change.path));
			}, [active, fsTree]);
			const fileRow = (change, depth) => {
				const fullPath = change.path;
				const conflict = isConflicted(change);
				const untracked = isUntracked(change);
				const kind = fileChangeKind(change);
				const isChecked = !conflict && selectedPaths.has(fullPath);
				const glyphTitle = kind === "conflict" ? T("git.conflicted") : kind === "untracked" ? T("git.untrackedKind") : kind === "add" ? T("git.addedKind") : T("git.modifiedKind");
				return h("div", {
					key: fullPath,
					className: "dsh-git-row",
					style: { paddingLeft: 10 + depth * 14 },
					"data-selected": selected && selected.file === fullPath ? "true" : void 0,
					"data-kind": kind,
					"data-conflict": conflict ? "true" : void 0,
					onClick: () => {
						if (active) setSelected({
							repo: active,
							file: fullPath
						});
					}
				}, conflict ? h("span", {
					key: "mark",
					className: "dsh-git-glyph",
					title: glyphTitle,
					"data-letter": "U"
				}, "!") : h("input", {
					key: "check",
					type: "checkbox",
					className: "dsh-git-row-check",
					checked: isChecked,
					disabled: busy,
					onClick: (e) => e.stopPropagation(),
					onChange: () => toggleSelect(fullPath),
					"aria-label": fullPath
				}), untracked ? null : h("span", {
					key: "glyph",
					className: "dsh-git-glyph",
					title: glyphTitle
				}, ""), h("span", {
					key: "name",
					className: "dsh-git-base",
					style: { color: kindColor(kind) },
					title: glyphTitle
				}, baseName(fullPath)), untracked ? h("button", {
					key: "delete",
					type: "button",
					className: "dsh-git-row-btn dsh-git-row-del",
					title: T("git.deleteFile"),
					"aria-label": T("git.deleteFile"),
					onClick: (e) => {
						e.stopPropagation();
						doDeleteFile(change);
					}
				}, T("git.deleteFile")) : null);
			};
			const subtreePaths = (node) => {
				if (node.kind === "file") return [node.path];
				const out = [];
				for (const child of node.children) out.push(...subtreePaths(child));
				return out;
			};
			const dirNode = (node, depth) => {
				const paths = subtreePaths(node);
				const selectedUnder = paths.filter((p) => selectedPaths.has(p)).length;
				const all = selectedUnder === paths.length && paths.length > 0;
				const expanded = expandedDirs[node.path] !== false;
				return h("div", { key: node.path }, h("div", {
					className: "dsh-git-row dsh-git-dirrow",
					style: { paddingLeft: 6 + depth * 14 },
					onClick: () => toggleDir(node.path)
				}, h("span", {
					key: "chev",
					className: "dsh-git-tree-chev"
				}, expanded ? h(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 }) : h(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 })), h("input", {
					key: "check",
					type: "checkbox",
					className: "dsh-git-row-check",
					checked: all,
					disabled: busy,
					onClick: (e) => e.stopPropagation(),
					onChange: () => toggleDirSelect(paths),
					ref: (el) => {
						if (el) el.indeterminate = selectedUnder > 0 && !all;
					},
					"aria-label": `${T("git.selectAll")} ${node.path}`
				}), h("span", {
					key: "icon",
					className: "dsh-git-diricon"
				}, expanded ? h(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 }) : h(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, { size: 14 })), h("span", {
					key: "name",
					className: "dsh-git-base dsh-git-dirname"
				}, node.name), h("span", {
					key: "n",
					className: "dsh-git-section-n"
				}, String(paths.length))), expanded ? h("div", { key: "children" }, node.children.map((child) => child.kind === "dir" ? dirNode(child, depth + 1) : fileRow(child.change, depth + 1))) : null);
			};
			const changesGroupView = (items) => {
				if (items.length === 0) return null;
				const paths = items.filter((c) => !isConflicted(c)).map((c) => c.path);
				const selectedUnder = paths.filter((p) => selectedPaths.has(p)).length;
				const all = selectedUnder === paths.length && paths.length > 0;
				const collapsed = collapsedGroups["changes"] === true;
				return h("div", {
					key: "group-changes",
					className: "dsh-git-section"
				}, h("div", {
					key: "head",
					className: "dsh-git-section-head",
					onClick: () => toggleCollapseGroup("changes")
				}, h("span", {
					key: "chev",
					className: "dsh-git-tree-chev"
				}, collapsed ? h(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 }) : h(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 })), h("input", {
					key: "all",
					type: "checkbox",
					className: "dsh-git-row-check",
					checked: all,
					disabled: busy,
					onClick: (e) => e.stopPropagation(),
					onChange: () => toggleDirSelect(paths),
					ref: (el) => {
						if (el) el.indeterminate = selectedUnder > 0 && !all;
					},
					"aria-label": `${T("git.selectAll")} ${T("git.sectionStaged")}`
				}), h("span", {
					key: "label",
					className: "dsh-git-group-label"
				}, T("git.sectionStaged")), h("span", {
					key: "n",
					className: "dsh-git-section-n"
				}, String(items.length)), h("span", {
					key: "spacer",
					className: "dsh-git-spacer"
				}), h("button", {
					key: "rb",
					type: "button",
					className: "dsh-git-btn dsh-git-group-rb",
					title: T("git.rollbackAll"),
					"aria-label": T("git.rollbackAll"),
					disabled: busy,
					onClick: (e) => {
						e.stopPropagation();
						doRollbackAll();
					}
				}, rollbackIcon)), collapsed ? null : buildChangeTree(items).map((node) => node.kind === "dir" ? dirNode(node, 1) : fileRow(node.change, 1)));
			};
			const untrackedGroupView = (items) => {
				if (items.length === 0) return null;
				const paths = items.map((c) => c.path);
				const selectedCount = paths.filter((p) => selectedPaths.has(p)).length;
				const allSelected = selectedCount === paths.length && paths.length > 0;
				const collapsed = collapsedGroups["untracked"] === true;
				return h("div", {
					key: "group-untracked",
					className: "dsh-git-section"
				}, h("div", {
					key: "head",
					className: "dsh-git-section-head",
					"data-danger": "true",
					onClick: () => toggleCollapseGroup("untracked")
				}, h("span", {
					key: "chev",
					className: "dsh-git-tree-chev"
				}, collapsed ? h(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 12 }) : h(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 })), h("input", {
					key: "all",
					type: "checkbox",
					className: "dsh-git-row-check",
					checked: allSelected,
					disabled: busy,
					onClick: (e) => e.stopPropagation(),
					onChange: () => toggleDirSelect(paths),
					ref: (el) => {
						if (el) el.indeterminate = selectedCount > 0 && !allSelected;
					},
					"aria-label": `${T("git.selectAll")} ${T("git.sectionUntracked")}`
				}), h("span", {
					key: "label",
					className: "dsh-git-group-label"
				}, T("git.sectionUntracked")), h("button", {
					key: "add",
					type: "button",
					className: "dsh-git-btn dsh-git-addbtn",
					title: T("git.addSelected"),
					"aria-label": T("git.addSelected"),
					disabled: busy || selectedCount === 0,
					onClick: (e) => {
						e.stopPropagation();
						doAddSelected();
					}
				}, plusIcon), h("span", {
					key: "n",
					className: "dsh-git-section-n"
				}, String(items.length))), collapsed ? null : buildChangeTree(items).map((node) => node.kind === "dir" ? dirNode(node, 1) : fileRow(node.change, 1)));
			};
			const selectedChange = selected ? changes.find((c) => c.path === selected.file) : void 0;
			const stackedHunks = inlineHunks(diffText);
			const numLabel = (row, side) => {
				if (side === "old") return row.oldNo != null ? String(row.oldNo) : "";
				if (row.kind === "del") return "-";
				if (row.newNo == null) return "";
				return row.kind === "add" ? `${row.newNo}+` : String(row.newNo);
			};
			const codeChildren = (row) => {
				if (row.hlStart == null || row.hlEnd == null || row.hlStart >= row.hlEnd) return row.text;
				return [
					row.text.slice(0, row.hlStart),
					h("span", {
						key: "hl",
						className: "dsh-git-inline-hl"
					}, row.text.slice(row.hlStart, row.hlEnd)),
					row.text.slice(row.hlEnd)
				];
			};
			const stackedRow = (row, key, block, opts) => h("div", {
				key,
				className: "dsh-git-inline-row",
				"data-kind": row.kind
			}, h("span", {
				key: "act",
				className: "dsh-git-inline-act"
			}, opts?.showRevert && block ? h("button", {
				type: "button",
				className: "dsh-git-btn",
				title: T("git.hunkRevert"),
				"aria-label": T("git.hunkRevert"),
				disabled: busy,
				onClick: () => doRevertHunk(blockHunk(block))
			}, rollbackIcon) : null, opts?.showStage && block ? h("input", {
				type: "checkbox",
				className: "dsh-git-inline-stage",
				title: T("git.hunkStage"),
				"aria-label": T("git.hunkStage"),
				checked: false,
				disabled: busy,
				onChange: () => doStageHunk(blockHunk(block))
			}) : null), h("span", {
				key: "o",
				className: "dsh-git-inline-no"
			}, numLabel(row, "old")), h("span", {
				key: "n",
				className: "dsh-git-inline-no"
			}, numLabel(row, "new")), h("span", {
				key: "c",
				className: "dsh-git-inline-code"
			}, codeChildren(row)));
			const diffView = !selected ? h("div", {
				key: "hint",
				className: "dsh-git-diff-hint"
			}, T("git.noSelection")) : selectedChange && isConflicted(selectedChange) ? h("div", {
				key: "conflict",
				className: "dsh-git-conflict"
			}, h("div", {
				key: "path",
				className: "dsh-git-diff-path"
			}, selected.file), h("div", {
				key: "hint",
				className: "dsh-git-conflict-hint"
			}, T("git.conflictHint")), h("div", {
				key: "bar",
				className: "dsh-git-conflict-bar"
			}, h("button", {
				type: "button",
				className: "dsh-git-btn",
				"data-primary": "true",
				disabled: busy,
				onClick: () => doResolve("ours")
			}, T("git.keepOurs")), h("button", {
				type: "button",
				className: "dsh-git-btn",
				"data-primary": "true",
				disabled: busy,
				onClick: () => doResolve("theirs")
			}, T("git.keepTheirs")), h("button", {
				type: "button",
				className: "dsh-git-btn",
				disabled: busy,
				onClick: () => openInEditor(selectedChange)
			}, T("git.openInEditor")), h("button", {
				type: "button",
				className: "dsh-git-btn",
				disabled: busy,
				onClick: () => doResolve("mark")
			}, T("git.markResolved")))) : selectedChange && isUntracked(selectedChange) ? h("div", {
				key: "content",
				className: "dsh-git-content"
			}, h("div", {
				key: "path",
				className: "dsh-git-diff-path"
			}, selected.file), fileContent !== null ? h("pre", {
				key: "body",
				className: "dsh-git-content-body"
			}, fileContent) : h("div", {
				key: "note",
				className: "dsh-git-diff-hint"
			}, fileContentNote ?? T("git.loading"))) : h("div", {
				key: "diff",
				className: "dsh-git-diff"
			}, h("div", {
				key: "path",
				className: "dsh-git-diff-path"
			}, h("span", {
				key: "name",
				className: "dsh-git-base"
			}, selected.file)), stackedHunks.length === 0 ? h("div", {
				key: "note",
				className: "dsh-git-diff-hint"
			}, T("git.noSelection")) : h("div", {
				key: "body",
				className: "dsh-git-inline"
			}, stackedHunks.map((hunk, hi) => h("div", { key: hi }, h("div", {
				key: "bar",
				className: "dsh-git-inline-hunkbar"
			}, h("span", {
				key: "hdr",
				className: "dsh-git-inline-hdr"
			}, hunk.header)), hunk.segments.map((seg, si) => seg.kind === "ctx" ? stackedRow(seg.row, hi * 1e3 + si) : h("div", { key: si }, seg.block.rows.map((row, ri) => {
				const firstAdd = seg.block.rows.findIndex((r) => r.kind === "add");
				const hasAdd = firstAdd >= 0;
				return stackedRow(row, hi * 1e3 + si * 100 + ri, seg.block, {
					showRevert: ri === 0,
					showStage: hasAdd ? ri === firstAdd : ri === 0
				});
			})))))));
			const header = h("div", {
				key: "header",
				className: "dsh-git-header"
			}, h("span", {
				key: "title",
				className: "dsh-git-title"
			}, T("git.title")), repos.length > 1 ? h("select", {
				key: "repo",
				className: "dsh-git-repo",
				value: active ?? "",
				title: T("git.repo"),
				onChange: (e) => selectRepo(e.target.value)
			}, repos.map((repo) => h("option", {
				key: repo.path,
				value: repo.path
			}, repo.name))) : null, status && status.branch ? h("span", {
				key: "branch",
				className: "dsh-git-branch"
			}, status.branch, status.ahead > 0 ? ` ↑${status.ahead}` : "", status.behind > 0 ? ` ↓${status.behind}` : "") : null, h("span", {
				key: "spacer",
				className: "dsh-git-spacer"
			}), h("button", {
				key: "pull",
				type: "button",
				className: "dsh-git-btn",
				disabled: busy || !active,
				onClick: doPull
			}, T("git.pull")), h("button", {
				key: "push",
				type: "button",
				className: "dsh-git-btn",
				disabled: busy || !active,
				onClick: doPush
			}, T("git.push")), h("button", {
				key: "refresh",
				type: "button",
				className: "dsh-git-btn",
				disabled: busy || !active,
				onClick: refresh
			}, T("git.refresh")), h("button", {
				key: "close",
				type: "button",
				className: "dsh-git-btn",
				onClick: props.onClose
			}, T("git.close")));
			const changesList = h("div", {
				key: "changes",
				className: "dsh-git-changes"
			}, changesGroupView(changeGroup), untrackedGroupView(untracked), status === null && active !== null ? h("div", {
				key: "loading",
				className: "dsh-git-diff-hint"
			}, T("git.loading")) : null);
			const canCommit = selectedChanges.length > 0;
			const footer = h("div", {
				key: "footer",
				className: "dsh-git-footer"
			}, h("textarea", {
				key: "message",
				className: "dsh-git-message",
				placeholder: T("git.commitMessage"),
				value: message,
				disabled: busy,
				rows: 2,
				onChange: (e) => setMessage(e.target.value),
				onKeyDown: (e) => {
					if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
						e.preventDefault();
						doCommit();
					}
				}
			}), h("div", {
				key: "actions",
				className: "dsh-git-actions"
			}, h("span", {
				key: "notice",
				className: "dsh-git-notice",
				"data-error": notice && notice.kind === "error" ? "true" : void 0
			}, notice ? notice.text : ""), h("span", {
				key: "spacer",
				className: "dsh-git-spacer"
			}), h("button", {
				key: "stash",
				type: "button",
				className: "dsh-git-btn",
				disabled: busy || !active,
				onClick: () => setStashOpen(true)
			}, T("git.stash")), h("button", {
				key: "sel",
				type: "button",
				className: "dsh-git-btn",
				"data-primary": "true",
				disabled: busy || !active || !canCommit,
				onClick: doCommit
			}, T("git.commitSelected")), h("button", {
				key: "push",
				type: "button",
				className: "dsh-git-btn",
				"data-primary": "true",
				disabled: busy || !active || !canCommit,
				onClick: doCommitPush
			}, T("git.commitPush"))));
			const stashModal = stashOpen ? h("div", {
				key: "stash",
				className: "dsh-git-overlay dsh-git-stash-overlay",
				onClick: () => setStashOpen(false)
			}, h("div", {
				key: "box",
				className: "dsh-git-stash-box",
				onClick: (e) => e.stopPropagation()
			}, h("div", {
				key: "title",
				className: "dsh-git-stash-title"
			}, T("git.stashTitle")), h("input", {
				key: "input",
				className: "dsh-git-stash-input",
				value: stashText,
				placeholder: T("git.stashMessage"),
				autoFocus: true,
				onChange: (e) => setStashText(e.target.value),
				onKeyDown: (e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						doStash();
					}
				}
			}), h("div", {
				key: "bar",
				className: "dsh-git-conflict-bar"
			}, h("button", {
				key: "ok",
				type: "button",
				className: "dsh-git-btn",
				"data-primary": "true",
				disabled: busy || stashText.trim().length === 0,
				onClick: doStash
			}, T("git.stash")), h("button", {
				key: "cancel",
				type: "button",
				className: "dsh-git-btn",
				disabled: busy,
				onClick: () => setStashOpen(false)
			}, T("git.close"))))) : null;
			return h("div", {
				className: "dsh-git-overlay",
				onClick: props.onClose
			}, h("div", {
				className: "dsh-git-modal",
				onClick: (e) => e.stopPropagation()
			}, [
				header,
				h("div", {
					key: "body",
					className: "dsh-git-body"
				}, [changesList, diffView]),
				footer,
				stashModal
			]));
		}
		const inject = [
			"slots",
			"locale",
			"connection",
			"fsTree"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-erebus-git: dictionaries");
			ctx.locale.bind(NS);
			const call = (endpoint, payload) => ctx.connection.rpc.call("/dsh-erebus-git", endpoint, payload);
			const fsTree = ctx.get("fsTree");
			ctx.slots.inject("fsTree.explorer.header", () => ctx.slots.register({
				name: "fsTree.explorer.header",
				id: "dsh-erebus-git-button",
				locale: NS,
				inject: () => ({
					fsTree,
					call
				})
			}, GitButton));
		}
		//#endregion
		exports.GitButton = GitButton;
		exports.apply = apply;
		exports.blockHunk = blockHunk;
		exports.buildChangeTree = buildChangeTree;
		exports.inject = inject;
		exports.inlineHunks = inlineHunks;
		exports.splitHunks = splitHunks;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
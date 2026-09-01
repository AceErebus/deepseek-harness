# dsh-erebus-git

dsh web GUI 的 **Git 管理插件**（IDEA 风格）：从文件树头部的一个按钮打开 Git 管理面板，覆盖提交、推送、回滚与冲突合并。

## 功能

**入口**：文件树（侧边栏工作区区域下方）头部右侧的 Git 按钮（分支图标）。点击弹出 **Git 管理** 面板。

**多仓库**：自动发现打开的工作区根目录下的所有 git 仓库（根目录本身 + 两层子目录内的嵌套仓库，跳过 `.git`/`node_modules`），面板头部下拉切换；每个仓库独立显示分支、领先/落后（`↑n`/`↓n`）与变更列表。

**布局**（对标 IDEA 提交面板）：左侧文件树 + 右侧差异预览 + 底部提交消息与操作按钮；顶部拉取 / 推送 / 刷新 / 关闭。

**弹窗是独立的一层，不遮挡原页面**：全屏遮罩为**透明**（原页面保持原样可见，点击遮罩空白处关闭面板），只有弹窗本身（面板与储藏弹窗）为**不透明**表面——用 `--dsw-alias-bg-layer-3`（回退 `--dsw-alias-bg-overlay` / `--dsw-alias-bg-base`），不依赖已废弃的 `--dsw-alias-bg-elevated`，在主题皮肤（如 erebus-skin）把 `--dsw-alias-bg-base` 覆盖为半透明值时面板依然清晰可读。

**两个固定分组（复选框即 git add / git reset）**：

- 【**更改**】：已暂存与未暂存的跟踪文件变更（+ 冲突）。文件颜色：已修改跟踪文件**蓝色**、`git add` 后的新增文件**绿色**。每行带复选框与**单文件回滚**按钮；分组标题右侧有 🔄 **回滚全部**（确认后回滚本组全部本地修改，不触碰未跟踪文件）。点击文件 → 右侧 **VS Code 风格上下对照 diff**（删除行红色、新增行绿色，成对修改先旧后新）；每个红绿改动块左侧有回滚按钮，只还原这一块。没有剩余文本差异的文件（全部块已回滚、或 porcelain 脏但 `git diff` 无 hunk）立刻从左侧列表消失
- 【**未进行版本管理的文件**】：untracked 未 add 的新文件，文字**红色**，带复选框与**删除**按钮。点击文件 → 右侧只展示**完整文件内容**（不分栏）

**核心交互（复选框永远可用，不置灰）**：

- 勾选「未进行版本管理」的文件 → 执行 `git add`，文件移入【更改】，颜色变绿
- 取消勾选【更改】的文件 → 执行 `git reset HEAD <file>`；新增文件移回「未进行版本管理」变回红色，修改文件留在【更改】变回未暂存
- 分组头部与每个目录都有全选复选框（半选显示横杠）

**底部按钮**：

- **提交所选**：仅本地 `git commit`，只提交勾选（已暂存）的文件；提交消息为空时按钮置灰
- **提交并推送**：commit 后执行 `git push`
- **储藏更改**：弹出输入框，强制填写储藏说明后 `git stash push -m` 储藏全部工作区变更

所有提交操作只处理勾选文件，不做自动全量提交。

**推送 / 拉取**：面板头部 **推送**（`git push`，推当前分支的上游）与 **拉取**（`git pull`），操作结果显示在底部状态栏；**刷新** 重新读取工作区状态。

**冲突合并**：冲突文件在【更改】中以 `!` 标记；选中后提供 **保留我的**（`checkout --ours` + `add`）、**保留他们的**（`checkout --theirs` + `add`）、**在编辑器中打开**（在文件树的「文件」页手动合并）与 **标记已解决**（`git add`）。

快捷键：提交信息框内 `Ctrl+Enter`（macOS `Cmd+Enter`）直接提交；`Esc` 关闭面板。

## 架构

双面（dual-face）插件包，源码为 TypeScript（`src/`），由 tsdown 编译到运行时产物：

| 半边 | 源码 | 产物 | 职责 |
|---|---|---|---|
| Host 半边 | `src/index.ts` | `lib/index.js` | `ctx.connection.rpc.handle` 注册 `/dsh-erebus-git` 共享 RPC 通道（`authority: "loopback"`，与特权 `/api` 同一道 DNS-rebinding 信任围栏），用 `child_process` 驱动本机 `git` 可执行文件：`repos`（仓库发现）、`status`（porcelain 解析，分支/领先落后/变更分组）、`diff`、`stage`/`unstage`、`commit`、`push`/`pull`、`revertFile`、`revertHunk`（行级反向应用）、`resolveOurs`/`resolveTheirs`/`markResolved` |
| Browser 半边 | `src/client/index.ts` | `client.js`（`__ModuleLoader__` loader 格式） | 注册进 **`fsTree.explorer.header` 列表槽位**（由 dsh-fs-tree 声明，替代原"显示隐藏文件"按钮位置）；Git 按钮 + 弹窗面板（React，portal 渲染，样式全部走 `--dsw-*` 设计令牌） |

依赖：**`dsh-fs-tree`**（提供 `fsTree.explorer.header` 槽位与 `fsTree` 服务——"在编辑器中打开"复用其文件页）。依赖本机 **git 可执行文件**（在 PATH 中即可）。

## 安装

```sh
dsh plugin add <本目录路径> --profile web
# 然后重启 dsh web（新增 bundle 行需在启动时装载）
```

## 开发

```sh
node ../../node_modules/.bin/tsdown   # 打包 src → client.js + lib/index.js
pnpm exec tsc -p tsconfig.host.json --noEmit && tsc -p tsconfig.client.json --noEmit   # 类型检查
node smoke.mjs                        # 浏览器半边冒烟（槽位注册、按钮渲染、hunk 切分）
node host-smoke.mjs                   # Host 半边冒烟（真实临时 git 仓库：发现/状态/暂存/提交/差异/回滚/冲突）
```

- 修改 Browser 半边（`src/client/index.ts`）后重新打包，**刷新页面**即可；修改 Host 半边（`src/index.ts`）需**重启 dsh web**。

## 安全说明

- `/dsh-erebus-git` 通道走 loopback 信任围栏：非本机来源或跨站 Origin 一律 403。
- 所有路径参数校验：仓库必须是绝对路径，文件必须是仓库相对路径（拒绝绝对路径与 `..` 穿越）。
- git 命令参数均以数组传递（无 shell 拼接）；`commit` 消息作为单参数传入 `-m`。
- 只操作宿主用户自己的仓库状态，不提供远程/写入能力之外的任何能力。

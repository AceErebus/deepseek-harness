# dsh-fs-tree

工作区文件树插件（DeepSeek Harness Web GUI 的插件）。

## 功能

**左侧边栏工作区区域**（会话列表下方）内嵌一个 **文件树**（资源管理器样式），自动以当前打开会话所属工作区为根目录展示目录树：

- **打开哪个工作区就显示哪个工作区的树**：跟随当前会话所属工作区（无会话时取第一个工作区；都没有时回落到主目录）；切换会话后自动重新定位
- 目录按需懒加载（点开才读取该层）；目录在前、文件在后，按名称自然排序
- **点击文件 = 打开文件**：文本文件自动切到「编辑」标签页（安装 `dsh-file-editor` 后），文档/二进制切到「文件」标签页查看
- **悬停行（文件与文件夹都有）显示复制路径按钮与"在资源管理器中显示"按钮**
- 当前打开的文件在树中以高亮标记；头部标题显示当前工作区文件夹名（悬停显示完整路径），并显示项数（如"11 项"）与刷新按钮
- 头部可折叠/展开整个文件树，折叠与展开状态、展开的目录结构持久化到 localStorage，刷新页面后原样恢复
- **头部末尾是跨插件动作槽位**（`fsTree.explorer.header` 列表槽位）：安装 `dsh-erebus-git` 后此处显示 Git 管理按钮（原"显示隐藏文件"按钮已移除；隐藏文件默认隐藏）
- 头部可折叠/展开整个文件树，折叠与展开状态、展开的目录结构持久化到 localStorage，刷新页面后原样恢复
- 单层最多返回 2000 项，超出时树中会提示"目录过大"
- 对话中点击目录路径（模型写出的路径）会把树定位到该目录

**中间视图区**的「文件」标签页（与「对话」「轨迹」并列）：

- **多文件标签条**（VS Code 风格）：打开过的文件保持为标签，点击切换、× 关闭（关闭当前文件后自动选中相邻标签）、未保存文件带蓝点；标签列表持久化到 localStorage，刷新页面后恢复
- **文本文件 = 可直接编辑**：`dsh-file-editor` 通过 `fsTree.fileView` 链式槽位嵌入 CodeMirror（Ctrl+S 保存、CTRL+点击跳转、编译按钮由 `dsh-c-lang` 提供）；未安装编辑器插件时回落到只读查看器
- **底部输入框始终可用**：查看/编辑文件的同时可以继续对话，点「对话」标签随时切回聊天
- 未选文件时显示引导提示

### 格式支持矩阵

| 类别 | 格式 | 预览方式 |
|---|---|---|
| 代码/文本 | c/h/cpp/py/js/ts/json/md/yml/txt/html/css/sql/… 50+ | 编辑器（可编辑、语法高亮） |
| 文档 | **pdf** | 浏览器内置查看器（≤32 MiB） |
| 文档 | **docx** | mammoth 转排版 HTML |
| 演示 | **pptx / ppt** | 本地 zip 解析 + 逐页文本提取 |
| 表格 | **xlsx / xls / ods / csv / tsv** | SheetJS 渲染为表格（多工作表可切换，前 500 行） |
| 图片 | **png / jpg / jpeg / gif / webp / bmp / ico** | 内嵌显示（流式，无大小上限） |
| 音频 | **mp3 / wav / ogg / m4a / flac** | 内嵌播放器（流式 + 进度条） |
| 视频 | **mp4 / webm / mov / m4v / ogv** | 内嵌播放器（流式 + 可拖动） |
| 其他二进制 | doc/zip/rar/exe/dll/… | 提示 + 在系统中打开 |

媒体文件通过新增的 `/fs-tree-raw` 流式路由提供（支持 HTTP Range，大文件可直接播放/拖动进度，不受 32 MiB base64 上限影响）；表格与演示解析库（SheetJS，Apache-2.0）随插件本地分发，无需联网。

**对话中的路径可点击**（纯客户端，无需告知 agent）：

- 模型在消息里写出的路径（行内代码或正文中的路径片段）**点击即打开**并加入标签条；目录则把侧边栏文件树定位到该目录
- 相对路径按当前会话的工作目录（cwd）解析；解析不到的路径不拦截点击
- DHS 自带的"产出文件"提及按钮/标签也被接管（原来是用系统应用打开，现在直接进文件查看器；解析失败时回落到系统打开）
- **任何 agent 都自动生效**——这是浏览器渲染层的功能，与模型无关，把插件给别人、别人的 agent 同样适用（若希望命中率更高，可建议 agent 习惯用反引号行内代码写路径）

## 架构

双面（dual-face）插件包，源码为 **TypeScript**（`src/`），由 tsdown 编译到运行时产物（Host 半边只依赖 Node 内置模块）：

| 半边 | 源码 | 产物 | 职责 |
|---|---|---|---|
| Host 半边 | `src/index.ts` | `lib/index.js` | ① `ctx.connection.rpc.handle` 注册 `/fs-tree` 共享 RPC 通道（`authority: "loopback"`，继承 dsh 的 DNS-rebinding 浏览器信任围栏）：`list`（列一层目录）、`read`（文本 ≤ 512 KiB；二进制 ≤ 32 MiB 返回 base64，更大标记 `tooLarge`；NUL 字节判定二进制；均带 `mtimeMs`）、`write`（UTF-8 文本原子写，≤ 16 MiB，可新建文件）、`stat`（存在性/类型探测，供对话路径点击校验）、`home`（主目录）；② 两个 `ctx.webServer.register` 静态路由（均自带 loopback + Origin 校验）：`/fs-tree-assets`（白名单资源，mammoth + SheetJS）、`/fs-tree-raw`（媒体文件流式输出，支持 HTTP Range 与 seek） |
| Browser 半边 | `src/client/index.ts` | `client.js`（`__ModuleLoader__` loader 格式） | 注册 `sidebar.workspaces.tree`（侧边栏工作区区域下方的内嵌文件树，**需要 ui-workspace 声明该槽位**，并**声明 `fsTree.explorer.header` 列表子槽位**供跨插件头部动作使用）与 `conversation.view`（「文件」标签页，**声明 `fsTree.fileView` 链式槽位**）两个槽位；**提供 `fsTree` 共享客户端服务**（`ctx.provide`）：`call`（RPC）、`openPath`、`selectionStore`（当前打开的文件）、`viewPrefs`（扩展名 → 标签页偏好注册表）、`dirActions`（目录导航钩子）、`tabs`（多文件标签存储，localStorage 持久化）、`openFile`/`closeTab`（标签与选择）、`openInViewer`（路径→查看器，相对路径按会话 cwd 解析）；**接管 `workspaces.openPath`** 与文档级路径点击，让对话中的路径点击直达文件显示 |

**模块化接缝**：其他插件通过 `inject: ["fsTree"]`（或 `ctx.get("fsTree")`）消费核心能力；文件树点击文件时按 `viewPrefs` 决定激活哪个标签页（未注册偏好则回落到「文件」页）。

第三方资源：

- `lib/assets/mammoth.browser.min.js` — [mammoth 0.3.26](https://cdnjs.com/libraries/mammoth/0.3.26) 浏览器版（MIT），随插件本地分发，浏览器从 `/fs-tree-assets/mammoth.browser.min.js` 加载。

包元数据：

- `dsh.bundle.patch` — 作为 profile 的一个组合包（bundle）层，插入 `fs-tree` 行
- `dsh.client.platform: "web"` — 使 `dsh-client-modules` 在启动时扫描到本包、把 `client.js` 编入浏览器启动图（`window.__DSH_BOOT__`）并以 `/plugins/dsh-fs-tree/client.js` 提供

## 安装

已安装到 `~/.dsh/profiles/web`（以 junction 链接到本目录，并加入了 `dsh.profile.bundles`）。

在其他机器上安装：

```sh
# 在 profile 目录执行（等价于下面的 dsh plugin add）
dsh plugin add <本目录路径> --profile web
# 或手动：把 package.json 的 dependencies 加上 file: 依赖、
# 在 dsh.profile.bundles 中追加 "dsh-fs-tree"，并把本包链接进 profile 的 node_modules
```

> 组合包（bundle）在 dsh 进程启动时装载：**新增/移除插件、或修改 Host 半边（`src/index.ts` → `lib/index.js`）后需要重启 `dsh web`**。
> 修改 Browser 半边（`src/client/index.ts`）后运行 `tsdown` 重新打包，然后**只需刷新页面**（bundle 端点 `no-cache`，且产物路径保持 `./client.js`，服务端在启动时按 `exports["./client"]` 解析路径）。
> 内嵌文件树依赖 ui-workspace 声明的 `sidebar.workspaces.tree` 槽位（本仓库 `packages/client/ui-workspace` 已声明）：更换仓库后需先 `pnpm --filter @deepseek-ai/dsh-client-ui-workspace bundle` 重新构建该包，再刷新页面。

## 卸载

```sh
dsh plugin remove dsh-fs-tree --profile web   # 或：从 profile 的 package.json / bundles / 链接中移除
# 然后重启 dsh web
```

## 安全说明

- `/fs-tree` 通道与 dsh 的特权 `/api` 方法走同一道 loopback 信任围栏：非本机来源、或跨站来源（DNS rebinding / 伪造 Origin）的请求一律 403。
- `/fs-tree-assets` 路由自行执行同样的 loopback + Origin 校验，且只服务白名单内的固定文件名（不存在路径穿越面）。
- 端点只读（列目录、读文件、读主目录、发静态资源），不提供任何写入、执行能力；读取范围即宿主进程用户可读的文件系统。
- 面板与文件页只是浏览器 UI，不经过模型、不产生 token 消耗。

## 开发

```sh
pnpm --dir . exec tsdown          # 或 node ../../node_modules/.bin/tsdown（在插件目录执行）：打包 src → client.js + lib/index.js
pnpm --dir . exec tsc -p tsconfig.host.json --noEmit && tsc -p tsconfig.client.json --noEmit   # 类型检查
node smoke.mjs                                        # 浏览器半边冒烟（vm + react-dom/server，覆盖两个槽位注册与文件页各分支）
node host-smoke.mjs                                   # Host 半边冒烟（真实文件系统夹具，覆盖 list/read/home、资源路由与错误分支）
node docx-smoke.mjs && node pptx-smoke.mjs            # docx/pptx 预览解析冒烟
```

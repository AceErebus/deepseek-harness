# dsh-file-editor

dsh web GUI 的**代码编辑插件**：直接嵌入文件树的「文件」视图（`fsTree.fileView` 链式槽位），文本文件在此编辑保存——**没有独立的"编辑"标签页**，查看和编辑是同一个页面，VS Code 风格。

## 功能

- **CodeMirror 6** 编辑器，深色主题跟随 DHS 设计令牌；支持 C/C++/Python/JS/TS/JSON/Markdown/HTML/CSS/Shell/YAML 等 50+ 扩展名的语法高亮、行号、折叠、括号配对、基础补全
- **Ctrl+S 保存**（或点「保存」按钮），通过核心插件的 `/fs-tree` write 端点原子写入；保存后自动失效 C 语言插件的符号缓存
- 未保存时工具栏与标签页显示**蓝色脏标记**
- 工具栏：「保存 / 重新加载 / 在系统中打开」，以及（安装 `dsh-c-lang` 后）**「编译」按钮** + 输出面板
- **Markdown 预览**：`.md`/`.markdown` 文件打开时默认显示**渲染后的预览**（标题、GFM 表格、代码块、列表、引用等，表格带边框）；工具栏「编辑」按钮切回源码编辑，「预览」切回渲染——预览实时反映当前内容（含未保存修改），预览模式下 Ctrl+S 依然可保存。渲染器为插件内置（全部源码先转义、不透传原始 HTML，文档无法注入脚本）
- **CTRL+点击**（macOS ⌘+点击）：若安装了 `dsh-c-lang`，**针对编辑器当前内容**（含未保存修改）解析并跳转定义/头文件
- 非文本文件（pdf/docx/图片等）由文件树自带的只读查看器接管，本插件不参与

## 架构

双面（dual-face）插件包，源码为 **TypeScript**（`src/`），由 tsdown 编译到运行时产物：

| 半边 | 源码 | 产物 | 职责 |
|---|---|---|---|
| Host 半边 | `src/index.ts` | `lib/index.js` | `/file-editor-assets` 静态资源路由（loopback + Origin 校验、白名单），本地提供预编译的 CodeMirror 6 bundle（`cm6.bundle.js`，约 810 KB，用 esbuild 一次打包自 `@codemirror/*` 官方包） |
| Browser 半边 | `src/client/index.ts` | `client.js`（`__ModuleLoader__` loader 格式） | 注册进 **`fsTree.fileView` 链式槽位**（由 `dsh-fs-tree` 声明）：`select` 认领可编辑文本文件（`isEditableText`），其余文件回落到文件树的只读查看器；注入 `fsTree` 服务 |

依赖：**`dsh-fs-tree`**（核心插件，提供 `/fs-tree` 通道、`fsTree` 服务与链式槽位）。可选：`dsh-c-lang`（跳转 + 编译）。

## 安装

```sh
dsh plugin add <本目录路径> --profile web   # 或手动加入 profile 的 bundles + dependencies
# 然后重启 dsh web
```

## 开发

```sh
pnpm --dir . exec tsdown          # 或 node ../../node_modules/.bin/tsdown（在插件目录执行）
pnpm --dir . exec tsc -p tsconfig.host.json --noEmit && tsc -p tsconfig.client.json --noEmit
node smoke.mjs                    # 冒烟测试（链式槽位注册、文本判定、渲染）
```

- 修改 `src/client/index.ts` 后运行 `tsdown` 重新打包，然后**只需刷新页面**；修改 Host 半边（`src/index.ts`）或安装/移除插件需要重启。
- 重新打包 CodeMirror bundle：在 `dsh-plugins-build`（工作台）中 `npx esbuild cm6-entry.mjs --bundle --minify --format=iife --outfile=cm6.bundle.js`，再拷贝到 `lib/assets/`。

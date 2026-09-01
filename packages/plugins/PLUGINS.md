# dsh 插件开发指南（AceErebus 本地插件）

> 基于 dsh 0.1.1-rc.2 官方 Bundle 机制整理，适用于 `packages/plugins/` 下的本地插件。
> 最佳参考模板：`dsh-fs-tree`（最典型的双面插件）。

## 一、插件在哪里

```
D:\work\deepseek-harness\
├── packages\plugins\            ← ★ 本地插件目录（每个插件一个包）
│   ├── dsh-fs-tree              （文件树，最标准模板）
│   ├── dsh-file-editor          （代码编辑器）
│   ├── dsh-game-studio          （游戏工作台：Cocos + ComfyUI）
│   ├── dsh-skill-manager        （SKILL 管理）
│   ├── dsh-erebus-git           （Git 面板）
│   └── dsh-erebus-skin          （皮肤）
├── packages\bundle\ace-plugins\ ← 用户聚合 bundle（@ace/dsh-plugins）
│   ├── package.json             （dsh.bundle.patch + 依赖 6 个插件）
│   └── cordis.patch.yml         （insert 6 个插件行）
├── apps\cli\package.json        ← 依赖 @ace/dsh-plugins（激活入口，不要动）
└── tsdown.config.ts             ← exclude: packages/plugins/**（全量构建跳过，不要动）
```

## 二、插件怎么运作（双面架构）

```
┌─ Host 半面（Node 服务端）────────────────────────────┐
│ src/index.ts → 构建为 lib/index.js                    │
│ 格式：{ apply, inject } 的 cordis 插件                │
│ 职责：文件/进程/网络等重活（fs、git、ComfyUI、spawn）   │
│ 挂载：ctx.connection.rpc.handle("/xxx", handler,     │
│              { authority: "loopback" })               │
│      （loopback = 浏览器信任围栏，防止外部访问）        │
└──────────────────────────────────────────────────────┘
┌─ Client 半面（浏览器）──────────────────────────────┐
│ src/client/index.ts → 构建为 client.js               │
│ 格式：window.__ModuleLoader__.load({id, factory})     │
│ 职责：渲染 UI 面板（侧边栏/设置区/对话视图 tab）        │
│ 通信：通过 connection RPC 调 host 半面                │
│ 注入：package.json 的 dsh.client.inject 声明所需服务   │
└──────────────────────────────────────────────────────┘

加载链路：
apps/cli --profile web
  → 依赖 @ace/dsh-plugins（bundle）
  → bundle 的 cordis.patch.yml insert 插件行
  → host 插件 apply（RPC 通道挂上）
  → web server 服务 /plugins/<包名>/client.js
  → 浏览器 __ModuleLoader__ 注册 → UI 面板出现
```

推荐 copy 一个现有插件改造，别从零写。核心就 3 个文件：

| 文件 | 作用 |
|---|---|
| `package.json` | `dsh.bundle.patch`（注册行）+ `dsh.client`（platform web + inject 列表）+ exports（`./client` 指向 client.js） |
| `cordis.patch.yml` | `- insert: [{ id: <id>, name: '<包名>' }]` |
| `tsdown.config.ts` | client 半面构建（banner 固定格式）+ host 半面构建 |

## 三、新增插件步骤（Checklist）

1. **复制模板**：`xcopy packages\plugins\dsh-fs-tree packages\plugins\dsh-xxx /E` 然后清空 `src/` 与构建产物（client.js、lib/）

2. **改包名**：package.json 的 `name`、tsdown.config.ts 里的 `id`、cordis.patch.yml 的 `id/name`

3. **写 host 半面** `src/index.ts`：参考 fs-tree 的 `ctx.connection.rpc.handle("/xxx", {}, { authority: "loopback" })` 模式（host 侧零 npm 依赖，只用 node 内置模块）

4. **写 client 半面** `src/client/index.ts`：按 inject 声明可用服务（如 `ctx.connection.rpc`, `ctx.uiRenderer` 等），`dsh.client.inject` 的包名要照抄官方声明（runtime/locale/connection/ui-conversation/ui-settings/ui-workspace…）

5. **注册进 bundle**：在 `packages\bundle\ace-plugins\` 里：
   - `cordis.patch.yml` 加一行 `- id: <id>\n  name: '<包名>'`
   - `package.json` dependencies 加 `"<包名>": "workspace:^"`

6. **安装**：`pnpm install`（新 workspace 成员，一次性）

7. **构建**：`pnpm --filter dsh-xxx run bundle`
   （host lib + client.js 生成；skin 类的纯 esbuild 插件用自己 build 脚本）

8. **验证**：`pnpm dsh web` 后检查：
   - `pnpm dsh --profile web --dump-config | grep <id>` （host 行在组合树里）
   - 浏览器 http://127.0.0.1:3080/plugins/dsh-xxx/client.js 返回 200

9. **日常开发**：`pnpm run dev:web`（watch：tsc + tsdown + vite，改 client 源码自动重建，浏览器刷新即生效；**host 半面改动需要重启 dsh**）

## 四、常见坑

- **skill-manager/skin 这类无 tsdown 默认入口的包**：必须有 `tsdown.config.ts`，否则 dev:web 的 watch 模式会报 `Cannot find entry`（已修好，新插件别再踩）
- **package.json 编码**：统一 UTF-8（旧文件有 GBK 乱码先例，写脚本处理时用字节级检测）
- **hot 依赖**：client externals 只允许 react / react-dom / @deepseek-ai/dsh-client-ui-primitives / @deepseek-ai/dsh-client-runtime/client 等官方注入面，其他依赖要么打进 bundle 要么声明到 dsh.client 体系
- **host 侧权限**：RPC 必须 `authority: "loopback"`（信任围栏），静态资源路由要自己再校验 origin
- **不要改**：根 `tsdown.config.ts` 的 exclude、`apps/cli/package.json` 的依赖链（只往里加不动别的）

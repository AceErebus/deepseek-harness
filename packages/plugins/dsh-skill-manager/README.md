# dsh-skill-manager — DSH SKILL 管理插件

在 DSH Web 的**设置**（侧边栏齿轮按钮）内新增「SKILL 管理」分区，集中管理
DSH 的技能库：**查看 / 新建 / 编辑 / 删除**技能。

## 特性

- **自动收录**：列表直接读取 DSH 技能注册表的实时快照（文件系统 provider
  自带目录监视），项目目录（`.dsh/skills`、`.agents/skills`）、用户目录
  （`~/.dsh/skills`、`~/.agents/skills`）以及后续新增的技能都会自动出现在
  列表中，无需维护任何清单。
- **查看**：技能详情（描述、适用场景、调用权限、来源、文件路径、完整指令正文），
  支持一键复制正文。
- **新建**：填写技能名（kebab-case）、描述、适用场景、调用权限、指令正文，
  可选择存放目录（默认 `~/.dsh/skills`，按 DSH 优先级自动选择）。
- **编辑**：修改描述 / 适用场景 / 调用权限 / 正文；保留 frontmatter 中其他
  未知字段（如 `metadata`）。
- **删除**：带确认弹窗；删除后自动清理空目录。
- **只读保护**：内置 / 捆绑 / 外部目录的技能只可查看，不可编辑删除。

## 架构

- **宿主端** `lib/index.js`：cordis 插件（`{ apply, inject }`），注入
  `skills` / `apiProxy` / `connection` 服务，挂载 loopback 防护的
  `/skill-manage` RPC 通道。列表以**文件系统扫描**为准（镜像
  dsh-skill-filesystem 的根目录与 rank 优先级——web 组合中宿主平面的
  skill-filesystem 行被禁用、provider 挂在会话 preset 层，注册表全局层
  通常为空），注册表仅作只读补充（捆绑/外部 provider）：

  | 端点 | 说明 |
  |---|---|
  | `list` | 技能目录快照（含来源/可写性/文件路径） |
  | `get` | 单个技能完整定义（含正文） |
  | `create` | 新建技能文件（`<root>/<name>/SKILL.md`） |
  | `update` | 重写 frontmatter + 正文（保留未知字段） |
  | `remove` | 删除技能文件（并清理空目录） |
  | `roots` | 当前扫描的技能根目录列表 |

  技能文件格式与 `@deepseek-ai/dsh-skill-filesystem` 完全一致：
  Markdown + YAML frontmatter（`name` / `description` / `whenToUse` /
  `disable-model-invocation` / `user-invocable`）。

- **浏览器端** `client.js`：注册 `settings.section` 槽位的 `skills`
  分区（设置弹窗左侧导航），零依赖、无构建步骤，样式走 DSW 设计令牌。

## 安装

```powershell
dsh plugin --profile web add "link:C:/Users/54658/Desktop/plugins/dsh-skill-manager"
# 或手动：在 ~/.dsh/profiles/web/package.json 添加 link 依赖并运行 pnpm install，
# 同时把 "dsh-skill-manager" 加入 dsh.profile.bundles
```

安装后**重启 DSH Web 服务**生效（浏览器刷新即可看到设置里的「SKILL 管理」）。

## 开发

- `lib/index.js` 与 `client.js` 均为手写零依赖 ESM，改完直接生效
  （宿主侧需重启服务；浏览器侧刷新页面即可）。
- `host-smoke.mjs`：宿主端端点独立冒烟测试（`node host-smoke.mjs`）。

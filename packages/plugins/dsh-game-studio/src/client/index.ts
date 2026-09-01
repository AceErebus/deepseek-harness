// dsh-game-studio browser half: a "游戏" tab in the conversation view ring —
// a compact workbench over the /game-studio RPC channel: project discovery,
// starter codegen, ComfyUI portrait generation with inline preview, and
// WeChat/Douyin mini-game builds with devtools launchers.
import { useEffect, useState, type ChangeEvent } from 'react'
import { createElement as h } from 'react'

const NS = 'gameStudio'

export const inject = ['slots', 'locale', 'connection', 'sessions']

// ---------------------------------------------------------------------------
// Wire types (mirror of the host envelope)
// ---------------------------------------------------------------------------
interface RpcError { code: string; message: string; details: Record<string, unknown> }
interface RpcResult<T> { ok: boolean; value?: T; error?: RpcError }
type Call = (endpoint: string, payload?: Record<string, unknown>) => Promise<RpcResult<unknown>>

interface ProjectInfo { path: string; name: string; creator: string }
interface StudioConfig {
  comfyuiUrl: string
  checkpoint: string
  creatorExe: string
  creatorExeExists: boolean
  wechatCli: string
  wechatCliExists: boolean
  douyinCli: string
  douyinCliExists: boolean
}
/** Minimal runtime sessions handle (mirror of dsh-fs-tree's usage). */
interface SessionsHandle {
  list?: { getSnapshot?: () => { current?: string; byId?: Record<string, { cwd?: string }> } }
}

const PLATFORMS = [
  { id: 'wechatgame', label: '微信小游戏', buildLabel: '构建微信小游戏' },
  { id: 'bytedance-mini-game', label: '抖音小游戏', buildLabel: '构建抖音小游戏' },
] as const

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
`

// ---------------------------------------------------------------------------
// The workbench panel
// ---------------------------------------------------------------------------
function GameStudioPanel({ call, sessions }: { call: Call; sessions?: SessionsHandle }) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [active, setActive] = useState('')
  const [config, setConfig] = useState<StudioConfig | null>(null)
  const [comfy, setComfy] = useState<{ available: boolean; error?: string } | null>(null)
  const [comfyUrl, setComfyUrl] = useState('')
  const [assets, setAssets] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  // generate form
  const [checkpoint, setCheckpoint] = useState('')
  const [prompt, setPrompt] = useState('')
  const [negative, setNegative] = useState('lowres, bad anatomy, bad hands, text, watermark, blurry')
  const [width, setWidth] = useState('832')
  const [height, setHeight] = useState('1216')
  const [seed, setSeed] = useState('')
  const [result, setResult] = useState<{ dataUrl: string; path: string } | null>(null)
  const [log, setLog] = useState('')

  const refreshConfig = (): void => {
    call('config').then((r) => {
      if (r.ok && r.value) {
        const cfg = r.value as StudioConfig
        setConfig(cfg)
        setComfyUrl(cfg.comfyuiUrl)
      }
    })
  }
  const refreshComfy = (): void => {
    call('comfyui/status').then((r) => {
      if (r.ok && r.value) setComfy(r.value as { available: boolean; error?: string })
    })
  }
  /** Current session cwd from the runtime's list mirror (like dsh-fs-tree). */
  const currentSessionCwd = (): string | null => {
    try {
      const snap = sessions && sessions.list ? sessions.list.getSnapshot() : null
      if (!snap) return null
      const current = snap.current
      const summary = current != null && snap.byId ? snap.byId[current] : null
      return summary && summary.cwd ? summary.cwd : null
    } catch { return null }
  }
  const refreshProjects = (): void => {
    const root = currentSessionCwd() ?? undefined
    call('projects', root ? { root } : undefined).then((r) => {
      if (r.ok && r.value) {
        const list = (r.value as { projects: ProjectInfo[] }).projects
        setProjects(list)
        if (list.length > 0 && (active === '' || !list.some(p => p.path === active))) setActive(list[0].path)
      }
    })
  }
  const refreshAssets = (): void => {
    if (!active) return
    call('assets', { project: active }).then((r) => {
      if (r.ok && r.value) setAssets((r.value as { assets: string[] }).assets)
    })
  }
  const refreshLog = (): void => {
    if (!active) return
    call('buildLog', { project: active }).then((r) => {
      if (r.ok && r.value) setLog((r.value as { log: string }).log || '(暂无构建日志)')
    })
  }

  useEffect(() => {
    refreshConfig()
    refreshComfy()
    refreshProjects()
    const timer = setInterval(refreshComfy, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    refreshAssets()
    refreshLog()
  }, [active])

  const run = async (action: () => Promise<RpcResult<unknown>>, okText: string): Promise<void> => {
    setBusy(true)
    setNotice(null)
    try {
      const r = await action()
      if (!r.ok) {
        setNotice({ kind: 'error', text: r.error ? r.error.message : '操作失败' })
        return
      }
      setNotice({ kind: 'ok', text: okText })
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const doCodegen = (): void => {
    if (!active) return
    void run(() => call('codegen', { project: active }), '代码模板已生成（编辑器刷新后可见）')
  }
  const doBuild = (platform: string): void => {
    if (!active) return
    void run(() => call('build', { project: active, platform }), `构建已启动（${platform}），日志见下方`)
    setTimeout(refreshLog, 1500)
  }
  const doOpen = (platform: string): void => {
    if (!active) return
    void run(() => call('openDevtools', { project: active, platform }), '已调用开发者工具')
  }
  const doGenerate = (): void => {
    if (!active) return
    setResult(null)
    const payload: Record<string, unknown> = {
      prompt,
      negativePrompt: negative,
      width: Number(width) || 832,
      height: Number(height) || 1216,
      outputDir: `${active}/assets/art`,
      filename: `art-${Date.now()}.png`,
    }
    if (checkpoint.trim().length > 0) payload.checkpoint = checkpoint.trim()
    if (seed.trim().length > 0) payload.seed = Number(seed) || undefined
    void run(async () => {
      const r = await call('comfyui/generate', payload)
      if (r.ok && r.value) setResult(r.value as { dataUrl: string; path: string })
      return r
    }, '立绘已生成并存入项目')
  }

  const doSaveComfyUrl = (): void => {
    const url = comfyUrl.trim()
    if (url.length === 0) { setNotice({ kind: 'error', text: '请先填写 ComfyUI 地址' }); return }
    void run(() => call('comfyuiUrl/save', { url }), 'ComfyUI 地址已保存')
  }

  const project = projects.find(p => p.path === active)
  const activeName = project ? project.name : active.split(/[\\/]/).pop() || '未选择'

  return h('div', { className: 'gs-panel' },
    h('div', { key: 'head', className: 'gs-row' },
      h('span', { key: 't', className: 'gs-title' }, '游戏工作台'),
      h('span', { key: 's', className: 'gs-sub' }, `项目：${activeName}`),
    ),

    // ---- project row ----
    h('div', { key: 'proj', className: 'gs-row' },
      h('label', { key: 'l', className: 'gs-label' }, '项目'),
      h('select', {
        key: 'sel', className: 'gs-input', value: active, disabled: busy,
        onChange: (e: ChangeEvent<HTMLSelectElement>) => setActive(e.target.value),
      },
      projects.length === 0
        ? h('option', { key: 'empty', value: '' }, '（工作区下未发现 Cocos 项目）')
        : projects.map(p => h('option', { key: p.path, value: p.path }, `${p.name} (${p.creator})`))),
      h('button', { key: 'rf', type: 'button', className: 'gs-btn', disabled: busy, onClick: refreshProjects }, '刷新'),
      h('button', { key: 'cg', type: 'button', className: 'gs-btn', disabled: busy || !active, onClick: doCodegen }, '生成代码模板'),
    ),

    // ---- ComfyUI status ----
    h('div', { key: 'comfy', className: 'gs-row' },
      h('span', { key: 'l', className: 'gs-label' }, 'ComfyUI'),
      h('span', { key: 'dot', className: 'gs-dot', 'data-on': comfy?.available ? 'true' : undefined, 'data-off': comfy && !comfy.available ? 'true' : undefined }),
      h('span', { key: 'txt', className: 'gs-sub' },
        comfy === null ? '检测中…' : comfy.available ? `在线 · ${config ? config.comfyuiUrl : ''}` : `离线（${comfy.error ?? '未运行'}）`),
      h('button', { key: 'rf', type: 'button', className: 'gs-btn', disabled: busy, onClick: refreshComfy }, '检测'),
    ),
    h('div', { key: 'comfyu', className: 'gs-row' },
      h('label', { key: 'l', className: 'gs-label' }, 'ComfyUI 地址'),
      h('input', { key: 'i', className: 'gs-input', style: { width: 260 }, value: comfyUrl, placeholder: 'http://127.0.0.1:8188', onChange: (e: ChangeEvent<HTMLInputElement>) => setComfyUrl(e.target.value) }),
      h('button', { key: 'sv', type: 'button', className: 'gs-btn', disabled: busy, onClick: doSaveComfyUrl }, '保存地址'),
    ),

    // ---- portrait generation ----
    h('div', { key: 'gen', className: 'gs-section' },
      h('div', { key: 't', className: 'gs-title' }, '立绘生成（ComfyUI）'),
      h('div', { key: 'r1', className: 'gs-row' },
        h('label', { key: 'l', className: 'gs-label' }, 'checkpoint'),
        h('input', { key: 'i', className: 'gs-input', style: { width: 200 }, value: checkpoint, placeholder: config?.checkpoint || '默认（config 文件）', onChange: (e: ChangeEvent<HTMLInputElement>) => setCheckpoint(e.target.value) }),
        h('label', { key: 'lw', className: 'gs-label' }, '尺寸'),
        h('input', { key: 'w', className: 'gs-input', style: { width: 60 }, value: width, onChange: (e: ChangeEvent<HTMLInputElement>) => setWidth(e.target.value) }),
        h('input', { key: 'h', className: 'gs-input', style: { width: 60 }, value: height, onChange: (e: ChangeEvent<HTMLInputElement>) => setHeight(e.target.value) }),
        h('label', { key: 'ls', className: 'gs-label' }, 'seed'),
        h('input', { key: 's', className: 'gs-input', style: { width: 90 }, value: seed, placeholder: '随机', onChange: (e: ChangeEvent<HTMLInputElement>) => setSeed(e.target.value) }),
      ),
      h('textarea', { key: 'p', className: 'gs-textarea', placeholder: '正向提示词，如：1girl, white dress, long silver hair, standing, full body, game character portrait, anime style', value: prompt, onChange: (e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value) }),
      h('input', { key: 'n', className: 'gs-input', value: negative, placeholder: '负向提示词', onChange: (e: ChangeEvent<HTMLInputElement>) => setNegative(e.target.value) }),
      h('div', { key: 'r2', className: 'gs-row' },
        h('button', { key: 'go', type: 'button', className: 'gs-btn', 'data-primary': 'true', disabled: busy || !active || prompt.trim().length === 0, onClick: doGenerate }, '生成并存入项目'),
        h('span', { key: 'path', className: 'gs-sub' }, result ? `已存：${result.path}` : '产物目录：assets/art/'),
      ),
      result ? h('img', { key: 'img', className: 'gs-img', src: result.dataUrl, alt: '生成结果' }) : null,
    ),

    // ---- build ----
    h('div', { key: 'build', className: 'gs-section' },
      h('div', { key: 't', className: 'gs-title' }, '构建与预览'),
      h('div', { key: 'r', className: 'gs-row' },
        PLATFORMS.map(p =>
          h('button', { key: p.id, type: 'button', className: 'gs-btn', disabled: busy || !active, onClick: () => doBuild(p.id) }, p.buildLabel)),
        PLATFORMS.map(p =>
          h('button', { key: `${p.id}-open`, type: 'button', className: 'gs-btn', disabled: busy || !active, onClick: () => doOpen(p.id) }, `打开${p.label}开发者工具`)),
      ),
      h('pre', { key: 'log', className: 'gs-log' }, log),
    ),

    // ---- assets ----
    assets.length > 0
      ? h('div', { key: 'assets', className: 'gs-section' },
        h('div', { key: 't', className: 'gs-title' }, `美术资源（${assets.length}）`),
        h('div', { key: 'g', className: 'gs-grid' },
          assets.map(a => h('div', { key: a, className: 'gs-sub', style: { fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a))),
      )
      : null,

    notice ? h('div', { key: 'notice', className: 'gs-notice', 'data-error': notice.kind === 'error' ? 'true' : undefined, 'data-ok': notice.kind === 'ok' ? 'true' : undefined }, notice.text) : null,
  )
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------
interface ClientContext {
  effect(fn: () => unknown, label?: string): unknown
  locale: {
    register(ns: string, dicts: Record<string, Dict>): unknown
  }
  connection: {
    rpc: { call(route: string, method: string, payload?: Record<string, unknown>): Promise<RpcResult<unknown>> }
  }
  slots: {
    inject(name: string, fn: () => unknown): unknown
    register(opts: SlotRegisterOptions, component: unknown): () => void
  }
}
interface Dict { [key: string]: string }
interface SlotRegisterOptions {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
  locale?: string
  inject?: (sessionId: string) => Record<string, unknown>
}

export function apply(ctx: ClientContext): void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-game-studio'
  style.textContent = css
  document.head.append(style)
  ctx.effect(() => () => style.remove(), 'dsh-game-studio: panel styles')

  ctx.effect(() => ctx.locale.register(NS, {
    zh: { 'gameStudio.title': '游戏' },
    en: { 'gameStudio.title': 'Game' },
  }), 'dsh-game-studio: locale')

  const call: Call = (endpoint, payload) => ctx.connection.rpc.call('/game-studio', endpoint, payload)

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'game-studio',
    order: 30,
    label: () => '游戏',
    locale: NS,
    inject: () => ({ call, sessions: (ctx as { get?: (id: string) => unknown }).get?.('sessions') as SessionsHandle | undefined }),
  }, GameStudioPanel))
}

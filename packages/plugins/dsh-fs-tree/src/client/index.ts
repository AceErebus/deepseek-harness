// dsh-fs-tree browser half: an inline sidebar explorer ("文件树") under the
// workspace/session region showing the opened workspace's file tree, plus a
// conversation view tab ("文件") that renders the clicked file's content
// (line-numbered, syntax-highlighted).
//
// TypeScript source; tsdown bundles this file into lib/client.js in the
// __ModuleLoader__.load({ id, factory }) format the web shell kernel loads
// (externals answered by the frozen module table). The kernel reads
// `exports.apply` / `exports.inject` exactly like the shipped bundles.
//
// Seams used (all public):
//   - `sidebar.workspaces.tree` single slot (declared by ui-workspace): the
//     inline file-tree explorer under the session list, auto-rooted at the
//     opened workspace.
//   - `conversation.view`      list slot (declared by ui-conversation): the
//     "文件" tab, exactly like ui-trajectory's "轨迹" tab. The tab bar and
//     view switching belong to ui-conversation; the composer below the view
//     area stays mounted, so the user can keep chatting while reading a file.
//     Clicking a file selects it in the shared store and activates the tab
//     (a DOM click on the rendered `[role=tab]` matching the same localized
//     label — the only place this plugin touches foreign DOM).
//   - `ctx.connection.rpc.call("/fs-tree", ...)` — the host channel.
import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { createPortal } from 'react-dom'

const h = React.createElement

// ---------- ambient browser globals from third-party vendored scripts ----------
declare global {
  interface Window {
    /** Docx→HTML converter (vendored mammoth bundle, loaded on demand). */
    mammoth?: { convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }> }
    /** Spreadsheet parser (vendored SheetJS bundle, loaded on demand). */
    XLSX?: unknown
  }
}

// ---------- locale ----------
type Dict = Record<string, string>
const NS = 'fs-tree'
const zh: Dict = {
  'fsTree.open': '文件树',
  'fsTree.title': '文件树',
  'fsTree.viewTab': '文件',
  'fsTree.placeholder': '输入目录路径，回车打开',
  'fsTree.home': '主目录',
  'fsTree.up': '上一级',
  'fsTree.refresh': '刷新',
  'fsTree.hidden': '显示隐藏文件',
  'fsTree.close': '关闭',
  'fsTree.empty': '（空目录）',
  'fsTree.loading': '加载中…',
  'fsTree.truncated': '目录过大，仅显示前 2000 项',
  'fsTree.entries': '{n} 项',
  'fsTree.error': '无法读取该目录',
  'fsTree.noRoot': '未找到工作区，请在输入框中输入目录路径',
  'fsTree.copy': '复制路径',
  'fsTree.copied': '已复制',
  'fsTree.openFile': '点击在「文件」页打开',
  'fsTree.noSelection': '在左侧「文件树」面板中点击文件，即可在此查看内容',
  'fsTree.readError': '无法读取该文件',
  'fsTree.binary': '二进制文件（{size}）',
  'fsTree.binaryTooLarge': '文件过大（{size}），请用系统应用打开',
  'fsTree.openInSystem': '在系统中打开',
  'fsTree.reveal': '在资源管理器中显示',
  'fsTree.docxError': 'docx 解析失败',
  'fsTree.readTruncated': '文件较大，仅预览前 512 KiB',
  'fsTree.closeTab': '关闭标签页',
  'fsTree.closeOthers': '关闭其他标签',
  'fsTree.closeAll': '关闭所有标签',
  'fsTree.confirmCloseOthers': '有标签包含未保存的修改，确定关闭其他标签吗？',
  'fsTree.confirmCloseAll': '有标签包含未保存的修改，确定关闭所有标签吗？',
  'fsTree.tabActions': '标签操作',
  'fsTree.workspaces': '工作区',
  'fsTree.noWorkspaces': '暂无工作区',
  'fsTree.dirty': '未保存',
  'fsTree.sheetError': '表格解析失败',
  'fsTree.sheetTruncated': '表格较大，仅显示前 500 行',
  'fsTree.pptxError': 'PPTX 解析失败',
}
const en: Dict = {
  'fsTree.open': 'Files',
  'fsTree.title': 'File tree',
  'fsTree.viewTab': 'File',
  'fsTree.placeholder': 'Type a directory path and press Enter',
  'fsTree.home': 'Home',
  'fsTree.up': 'Up',
  'fsTree.refresh': 'Refresh',
  'fsTree.hidden': 'Show hidden files',
  'fsTree.close': 'Close',
  'fsTree.empty': '(empty)',
  'fsTree.loading': 'Loading…',
  'fsTree.truncated': 'Directory too large — showing the first 2000 entries',
  'fsTree.entries': '{n} entries',
  'fsTree.error': 'Could not read this directory',
  'fsTree.noRoot': 'No workspace found — type a directory path above',
  'fsTree.copy': 'Copy path',
  'fsTree.copied': 'Copied',
  'fsTree.openFile': 'Click to open in the File tab',
  'fsTree.noSelection': 'Click a file in the Files panel to view it here',
  'fsTree.readError': 'Could not read this file',
  'fsTree.binary': 'Binary file ({size})',
  'fsTree.binaryTooLarge': 'File too large ({size}) — open it with a system app',
  'fsTree.openInSystem': 'Open in system app',
  'fsTree.reveal': 'Reveal in File Explorer',
  'fsTree.docxError': 'Failed to parse docx',
  'fsTree.readTruncated': 'Large file — previewing the first 512 KiB',
  'fsTree.closeTab': 'Close tab',
  'fsTree.closeOthers': 'Close others',
  'fsTree.closeAll': 'Close all',
  'fsTree.confirmCloseOthers': 'Some tabs have unsaved changes — close other tabs anyway?',
  'fsTree.confirmCloseAll': 'Some tabs have unsaved changes — close all tabs anyway?',
  'fsTree.tabActions': 'Tab actions',
  'fsTree.workspaces': 'Workspaces',
  'fsTree.noWorkspaces': 'No workspaces yet',
  'fsTree.dirty': 'Unsaved',
  'fsTree.sheetError': 'Failed to parse spreadsheet',
  'fsTree.sheetTruncated': 'Large sheet — showing the first 500 rows',
  'fsTree.pptxError': 'Failed to parse PPTX',
}

// ---------- wire types (the /fs-tree channel contract) ----------
/** The shared-channel envelope: a successful value or an error. */
interface RpcError { code: string; message: string }
type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }
/** One listed directory entry (host half: `list`). */
interface ListEntry { name: string; kind: 'dir' | 'file' | 'other'; hidden: boolean }
/** `list` value. */
interface ListValue { path: string; entries: ListEntry[]; truncated: boolean }
/** `read` value (loose: the host may return text or binary variants). */
interface ReadValue {
  path: string
  text?: string
  binary?: boolean
  truncated?: boolean
  size?: number
  base64?: string
  tooLarge?: boolean
  mtimeMs?: number
}
/** `stat` value. */
interface StatValue { exists: boolean; kind?: string; size?: number; mtimeMs?: number }
/** `home` value. */
interface HomeValue { path: string }
/** One RPC call: endpoint name + payload → envelope. */
type Call = (endpoint: string, payload?: Record<string, unknown>) => Promise<RpcResult<unknown>>

// ---------- path helpers ----------
function baseName(path: string): string {
  if (!path) return ''
  const trimmed = path.replace(/[\\/]+$/, '')
  const i = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return i < 0 ? trimmed : trimmed.slice(i + 1)
}
function joinPath(parent: string, name: string): string {
  if (!parent) return name
  const last = parent.charAt(parent.length - 1)
  if (last === '/' || last === '\\') return parent + name
  return parent + (parent.indexOf('\\') !== -1 ? '\\' : '/') + name
}
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
}

// ---------- shiki language hints by extension ----------
const LANGS: Record<string, string> = {
  js: 'js', mjs: 'js', cjs: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx', mts: 'ts', cts: 'ts',
  json: 'json', jsonc: 'jsonc', md: 'markdown', markdown: 'markdown',
  css: 'css', scss: 'scss', less: 'less', html: 'html', htm: 'html',
  xml: 'xml', svg: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp',
  php: 'php', sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell',
  kt: 'kotlin', swift: 'swift', vue: 'vue', svelte: 'svelte',
  sql: 'sql', graphql: 'graphql', diff: 'diff',
}
function langFromPath(path: string): string | undefined {
  const base = baseName(path).toLowerCase()
  if (base === 'dockerfile') return 'dockerfile'
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return undefined
  return LANGS[base.slice(dot + 1)]
}

// ---------- binary preview helpers (pdf / docx) ----------
function extOf(path: string): string {
  const base = baseName(path).toLowerCase()
  const dot = base.lastIndexOf('.')
  return dot <= 0 ? '' : base.slice(dot + 1)
}
function base64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
// Load one same-origin script once; resolves when the optional `ready`
// predicate is satisfied (default: window.mammoth, the first consumer).
// Tracks the element's settle state so a later consumer never waits on
// an already-settled script.
function loadScript(src: string, ready?: () => boolean): Promise<void> {
  const isReady = typeof ready === 'function' ? ready : () => typeof window.mammoth !== 'undefined'
  return new Promise((resolve, reject) => {
    if (isReady()) { resolve(); return }
    const existing = document.querySelector<HTMLElement>(`script[data-fs-tree-src="${src}"]`)
    if (existing) {
      if (existing.dataset.fsTreeState === 'loaded') { resolve(); return }
      if (existing.dataset.fsTreeState === 'error') { reject(new Error(`failed to load ${src}`)); return }
      existing.addEventListener('load', () => { existing.dataset.fsTreeState = 'loaded'; resolve() }, { once: true })
      existing.addEventListener('error', () => { existing.dataset.fsTreeState = 'error'; reject(new Error(`failed to load ${src}`)) }, { once: true })
      return
    }
    const script = document.createElement('script')
    script.dataset.fsTreeSrc = src
    script.src = src
    script.onload = () => { script.dataset.fsTreeState = 'loaded'; resolve() }
    script.onerror = () => { script.dataset.fsTreeState = 'error'; reject(new Error(`failed to load ${src}`)) }
    document.head.appendChild(script)
  })
}
async function docxToHtml(base64: string): Promise<string> {
  await loadScript('/fs-tree-assets/mammoth.browser.min.js')
  const mammoth = window.mammoth
  if (!mammoth) throw new Error('mammoth unavailable')
  const result = await mammoth.convertToHtml({ arrayBuffer: base64ToUint8(base64).buffer })
  return result.value
}
// Light sanitization: mammoth emits its own elements, but never trust
// document content for scripts/event handlers.
function sanitizeDocxHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

// ---------- shared selection store (plugin-local) ----------
interface SelectionStore {
  getSnapshot(): string | null
  subscribe(fn: () => void): () => void
  select(next: string | null): void
}
function createSelectionStore(): SelectionStore {
  let path: string | null = null
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => path,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    select: (next) => {
      path = next
      for (const fn of [...listeners]) fn()
    },
  }
}

// ---------- conversation path clicker (agent-agnostic) ----------
// Any path the model writes in a message becomes clickable: existing
// mention buttons/chips call `workspaces.openPath` (wrapped below), and
// bare path tokens (inline code or short path-like text) are caught by
// a document-level click listener that probes the host and opens the
// file in the viewer/editor (or the tree at a directory). No agent
// instructions are needed — this is pure client-side presentation.
const PATH_EXT_RE = new RegExp(
  '\\.(' + [
    'c', 'h', 'cpp', 'hpp', 'cc', 'cxx', 'cu', 'py', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
    'json', 'jsonc', 'md', 'markdown', 'txt', 'yml', 'yaml', 'toml', 'ini', 'sh', 'bash', 'zsh',
    'ps1', 'css', 'scss', 'less', 'html', 'htm', 'xml', 'svg', 'sql', 'php', 'rb', 'rs', 'go', 'java',
    'kt', 'swift', 'vue', 'svelte', 'log', 'csv', 'env', 'gitignore', 'editorconfig', 'pdf', 'docx',
    'doc', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'zip', 'rar', '7z', 'tar', 'gz', 'xz',
    'exe', 'dll', 'bin', 'wasm', 'mp3', 'mp4', 'wav',
  ].join('|') + ')$',
  'i',
)
function looksLikePath(text: string): boolean {
  const t = String(text).trim()
  if (t.length < 2 || t.length > 260) return false
  if (/\s/.test(t)) return false
  if (t.startsWith('~') || t.startsWith('.')) return true
  if (/^[A-Za-z]:[\\/]/.test(t)) return true
  if (t.includes('/') || t.includes('\\')) return true
  if (PATH_EXT_RE.test(t)) return true
  const lower = t.toLowerCase()
  if (lower === 'dockerfile' || lower === 'makefile' || lower === 'cmakelists.txt') return true
  return false
}
function resolveAgainstCwd(cwd: string | null, path: string): string | null {
  if (!path) return null
  if (/^[A-Za-z]:[\\/]/.test(path) || path.startsWith('/') || path.startsWith('\\')) return path
  if (path.startsWith('~')) return null // no home expansion
  if (!cwd) return null
  return `${cwd.replace(/[\\/]+$/, '')}/${path.replace(/^[\\/]+/, '')}`
}
function installConversationPathClicker(onPath: (path: string) => void): void {
  document.addEventListener('click', (event) => {
    try {
      const target = event.target
      if (!(target instanceof Element)) return
      // Never hijack the editor, our own panels, links, fenced
      // code, the composer input, or elements with their own open
      // handling (mention buttons/chips route through the wrapped
      // openPath). The composer's textarea holds the user's draft,
      // so the click that places the caret to keep typing must
      // never open a pasted path as a file.
      if (target.closest('.cm-editor, .dsh-fs-tree-explorer, .dsh-editor-root, a, pre, button, [data-composer-card]')) return
      let el: Element | null = target
      for (let depth = 0; el && depth < 3; el = el.parentElement, depth++) {
        if (el.nodeType !== 1) continue
        const text = el.textContent ? el.textContent.trim() : ''
        if (text.length < 2 || text.length > 260) continue
        if (el.tagName === 'CODE' || looksLikePath(text)) {
          if (!looksLikePath(text)) continue
          onPath(text)
          return
        }
      }
    } catch (_e) { /* never break the page */ }
  })
}

// ---------- open-files tab store (VS Code style, persisted) ----------
interface TabsStore {
  getSnapshot(): string[]
  subscribe(fn: () => void): () => void
  add(path: string): void
  close(path: string): string | null
  closeOthers(keep: string): void
  closeAll(): void
}
function createTabsStore(): TabsStore {
  const KEY = 'dsh.fs-tree.tabs.v1'
  let tabs: string[] = []
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) tabs = parsed.filter(p => typeof p === 'string')
      }
    }
  } catch (_e) { /* storage unavailable/corrupt */ }
  const listeners = new Set<() => void>()
  const persist = () => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(tabs))
    } catch (_e) { /* storage unavailable */ }
  }
  const notify = () => { for (const fn of [...listeners]) fn() }
  return {
    getSnapshot: () => tabs,
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    add(path) {
      if (!tabs.includes(path)) {
        tabs = [...tabs, path]
        persist()
        notify()
      }
    },
    close(path) {
      const at = tabs.indexOf(path)
      if (at === -1) return null
      tabs = tabs.filter(p => p !== path)
      persist()
      notify()
      return tabs[Math.min(at, tabs.length - 1)] ?? null
    },
    closeOthers(keep) {
      tabs = tabs.filter(p => p === keep)
      persist()
      notify()
    },
    closeAll() {
      if (tabs.length === 0) return
      tabs = []
      persist()
      notify()
    },
  }
}

// ---------- explorer state persistence (localStorage) ----------
const EXPLORER_STATE_KEY = 'dsh.fs-tree.explorer.v1'
function loadExplorerState(): Record<string, unknown> | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(EXPLORER_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch (_e) { /* storage unavailable/corrupt */ }
  return null
}
function saveExplorerState(state: { collapsed: boolean; root: string; expanded: string[] }): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(EXPLORER_STATE_KEY, JSON.stringify(state))
  } catch (_e) { /* storage unavailable */ }
}

// ---------- view preference registry (the cross-plugin seam) ----------
// Other plugins (e.g. dsh-file-editor) register which file kinds should
// open in which conversation view tab. Keys are lowercased extensions
// ("c", "pdf", ...) or full basenames ("dockerfile"); `viewFor` checks
// the basename first, then the extension. Later registrations win.
interface ViewPref { viewId: string; label: string }
interface ViewPrefs {
  register(keys: string[], viewId: string, label: string): void
  viewFor(path: string): ViewPref | null
}
function createViewPrefs(): ViewPrefs {
  const byKey: Record<string, ViewPref> = {}
  return {
    register(keys, viewId, label) {
      for (const key of keys) byKey[String(key).toLowerCase()] = { viewId, label }
    },
    viewFor(path) {
      const base = baseName(path).toLowerCase()
      const dot = base.lastIndexOf('.')
      const ext = dot <= 0 ? '' : base.slice(dot + 1)
      return byKey[base] ?? byKey[ext] ?? null
    },
  }
}

// Activate a conversation view by clicking its rendered tab. The tab
// label comes from the same localized dictionary, so the match is exact.
// Graceful: if the tab is not rendered (blank session, locale mismatch),
// the selection still lands for the next visit.
function tryActivateFileView(label: string): boolean {
  try {
    const tabs = document.querySelectorAll<HTMLElement>('[role="tab"]')
    for (const tab of tabs) {
      if ((tab.textContent || '').trim() === label) {
        tab.click()
        return true
      }
    }
  } catch (_e) { /* foreign DOM — never fail the click */ }
  return false
}

// ---------- styles (one owned tag, injected at materialization) ----------
const css = '.dsh-fs-tree-row{display:flex;align-items:center;gap:4px;height:24px;padding-right:6px;border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;box-sizing:border-box;width:100%;background:transparent;border:none;font-family:inherit;font-size:13px;text-align:left;color:var(--dsw-alias-label-primary);position:relative}.dsh-fs-tree-row:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsh-fs-tree-row[data-open] .dsh-fs-tree-name,.dsh-fs-tree-row[data-open] .dsh-fs-tree-fileicon{color:var(--dsw-alias-state-business-primary)}.dsh-fs-tree-copybtn{display:none;flex:none;width:20px;height:20px;align-items:center;justify-content:center;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:4px;cursor:pointer;padding:0;margin-left:2px}.dsh-fs-tree-row:hover .dsh-fs-tree-copybtn{display:inline-flex}.dsh-fs-tree-copybtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.dsh-fs-tree-name{overflow:hidden;text-overflow:ellipsis;min-width:0}.dsh-fs-tree-muted{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:24px;padding:0 8px}.dsh-fs-tree-note{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;padding:2px 8px}.dsh-fs-tree-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:20px;padding:2px 8px;white-space:normal;word-break:break-all}.dsh-fs-tree-count{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;line-height:16px;padding-right:2px;white-space:nowrap}.dsh-fs-tree-hint{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:22px;text-align:center;padding:32px 24px}.dsh-fs-tree-openbtn{flex:none;height:26px;display:inline-flex;align-items:center;cursor:pointer;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:none;border-radius:8px;padding:0 10px;font-family:inherit;font-size:12px}.dsh-fs-tree-openbtn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.dsh-fs-tree-pdf{flex:1;min-height:0;width:100%;border:none;background:var(--dsw-alias-bg-base)}.dsh-fs-tree-docx{flex:1;min-height:0;overflow-y:auto;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.7}.dsh-fs-tree-docx h1,.dsh-fs-tree-docx h2,.dsh-fs-tree-docx h3,.dsh-fs-tree-docx h4{color:var(--dsw-alias-label-primary);margin:0.6em 0 0.3em;line-height:1.3}.dsh-fs-tree-docx p{margin:0.4em 0}.dsh-fs-tree-docx li{margin:0.15em 0}.dsh-fs-tree-docx a{color:var(--dsw-alias-state-business-primary)}.dsh-fs-tree-docx table{border-collapse:collapse}.dsh-fs-tree-docx td,.dsh-fs-tree-docx th{border:1px solid var(--dsw-alias-border-l2);padding:4px 8px}.dsh-fs-tree-docx img{max-width:100%}.dsh-fs-tree-binbar{flex:none;display:flex;align-items:center;gap:10px;padding:0 0 10px;min-height:26px}.dsh-fs-tree-tabs{flex:none;display:flex;align-items:stretch;gap:4px;padding:6px 8px 0;border-bottom:1px solid var(--dsw-alias-border-l2);overflow-x:auto;scrollbar-width:thin}.dsh-fs-tree-tab{display:flex;align-items:center;gap:6px;flex:none;max-width:220px;height:30px;padding:0 6px 0 10px;border-radius:8px 8px 0 0;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}.dsh-fs-tree-tab:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsh-fs-tree-tab-active{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}.dsh-fs-tree-tabname{overflow:hidden;text-overflow:ellipsis}.dsh-fs-tree-tabdot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-business-primary)}.dsh-fs-tree-tabclose{flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:4px;cursor:pointer;padding:0;font-size:14px;line-height:1}.dsh-fs-tree-tabclose:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.dsh-fs-tree-sheetTabs{flex:none;display:flex;gap:4px;padding:6px 0;overflow-x:auto}.dsh-fs-tree-sheetTab{flex:none;height:24px;display:inline-flex;align-items:center;cursor:pointer;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:6px;padding:0 10px;font-family:inherit;font-size:12px}.dsh-fs-tree-sheetTab:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsh-fs-tree-sheetTab-active{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-solid)}.dsh-fs-tree-sheet{flex:1;min-height:0;overflow:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:8px}.dsh-fs-tree-sheet table{border-collapse:collapse;font-size:12px;line-height:18px}.dsh-fs-tree-sheet td{border:1px solid var(--dsw-alias-border-l2);padding:3px 8px;color:var(--dsw-alias-label-primary);white-space:nowrap;max-width:420px;overflow:hidden;text-overflow:ellipsis}.dsh-fs-tree-sheet tr:first-child td{color:var(--dsw-alias-label-secondary);font-weight:500;position:sticky;top:0;background:var(--dsw-alias-bg-base)}.dsh-fs-tree-tabmenu{position:fixed;min-width:140px;display:flex;flex-direction:column;padding:4px;background:var(--dsw-alias-bg-elevated,var(--dsw-alias-bg-base));border:1px solid var(--dsw-alias-border-l2);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18)}.dsh-fs-tree-tabmenu-item{display:block;width:100%;text-align:left;border:none;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12px;line-height:24px;padding:2px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}.dsh-fs-tree-tabmenu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}.dsh-fs-tree-explorer{display:flex;flex-direction:column;width:100%;flex:1;min-height:0;box-sizing:border-box;overflow:hidden}.dsh-fs-tree-explorer-header{flex:none;display:flex;align-items:center;gap:2px;height:30px;padding:0 6px 0 2px;box-sizing:border-box;border-top:1px solid var(--dsw-alias-border-l2);cursor:pointer;user-select:none}.dsh-fs-tree-explorer-toggle{flex:1;min-width:0;height:100%;display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;cursor:pointer;padding:0 4px;text-align:left}.dsh-fs-tree-explorer-toggle:hover{color:var(--dsw-alias-label-primary)}.dsh-fs-tree-explorer-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}.dsh-fs-tree-explorer-body{flex:1;min-height:0;overflow-y:auto;padding:2px 6px 10px;box-sizing:border-box;overscrollBehavior:contain}'
const cssTagId = 'dsh-fs-tree/styles'
if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(cssTagId) + ']') === null) {
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-fs-tree'
  tag.dataset.pluginCss = cssTagId
  tag.textContent = css
  document.head.appendChild(tag)
}

// ---------- inline styles ----------
const iconBtnStyle: React.CSSProperties = {
  flex: 'none', width: 26, height: 26, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  color: 'var(--dsw-alias-label-secondary)',
  background: 'transparent', border: 'none', borderRadius: 8, padding: 0,
}
const chevronWrap: React.CSSProperties = { flex: 'none', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dsw-alias-label-tertiary)' }
// Content fills the (relatively positioned) content wrapper absolutely —
// percentage heights are unreliable inside the flex chain that leads
// back to the conversation's viewArea, and an absolute fill guarantees
// the tab strip above never scrolls away.
const absFill: React.CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }
const fileViewRootStyle: React.CSSProperties = Object.assign({}, absFill, {
  boxSizing: 'border-box', overflowY: 'auto',
  padding: '16px 20px 32px',
})
const fileViewCenterStyle: React.CSSProperties = Object.assign({}, absFill, {
  boxSizing: 'border-box', display: 'flex',
  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: 24,
})

// ---------- tree panel (inline sidebar explorer) ----------
const chevron = (down: boolean) => h(down ? primitives.IconChevronDownOutline14 : primitives.IconChevronRightOutline14, { size: 14 })
const folder = (isOpen: boolean) => h(isOpen ? primitives.IconFolderOpen16 : primitives.IconFolderClose16, { size: 16 })

// One tree row: chevron + icon + name, with hover actions (copy path,
// reveal in the OS file manager) for files AND directories.
interface TreeRowProps {
  dirPath: string
  depth: number
  name: string
  kind: string
  expanded: boolean
  copied: string | null
  selectedPath: string | null
  onToggle: (path: string) => void
  onOpen: (path: string) => void
  onCopy: (path: string) => void
  onReveal: (path: string) => void
  T: (key: string) => string
}
function TreeRow({ dirPath, depth, name, kind, expanded, copied, selectedPath, onToggle, onOpen, onCopy, onReveal, T }: TreeRowProps) {
  const fullPath = joinPath(dirPath, name)
  const padLeft = 8 + depth * 16
  const isDir = kind === 'dir'
  const isOpen = selectedPath === fullPath
  const copiedNow = copied === fullPath
  const cells: React.ReactNode[] = []
  if (isDir) {
    cells.push(h('span', { key: 'chev', style: chevronWrap }, chevron(expanded === true)))
    cells.push(h('span', { key: 'icon', style: { flex: 'none', display: 'inline-flex', color: 'var(--dsw-alias-label-secondary)' } }, folder(expanded === true)))
  } else {
    cells.push(h('span', { key: 'chev', style: chevronWrap }, null))
    cells.push(h('span', {
      key: 'icon', className: 'dsh-fs-tree-fileicon',
      style: { flex: 'none', display: 'inline-flex', color: 'var(--dsw-alias-label-tertiary)' },
    }, h(primitives.IconCopyOutline16, { size: 14 })))
  }
  cells.push(h('span', {
    key: 'name', className: 'dsh-fs-tree-name',
    style: isDir ? undefined : { color: 'var(--dsw-alias-label-secondary)' },
  }, name))
  if (copiedNow) cells.push(h('span', { key: 'copied', className: 'dsh-fs-tree-copied', style: { color: 'var(--dsw-alias-label-tertiary)', fontSize: 11, marginLeft: 'auto', flex: 'none', paddingLeft: 8 } }, T('fsTree.copied')))
  cells.push(h('button', {
    key: 'copy', type: 'button', className: 'dsh-fs-tree-copybtn',
    title: T('fsTree.copy'), 'aria-label': T('fsTree.copy'),
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onCopy(fullPath) },
  }, h(primitives.IconCopyOutline16, { size: 12 })))
  // Reveal in the OS file manager (files and directories).
  cells.push(h('button', {
    key: 'reveal', type: 'button', className: 'dsh-fs-tree-copybtn',
    title: T('fsTree.reveal'), 'aria-label': T('fsTree.reveal'),
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onReveal(fullPath) },
  }, h(primitives.IconFolderOpenOutline16, { size: 12 })))
  return h('div', {
    key: fullPath,
    className: 'dsh-fs-tree-row',
    style: { paddingLeft: padLeft },
    'data-open': isOpen ? 'true' : undefined,
    title: isDir ? fullPath : `${fullPath} — ${T('fsTree.openFile')}`,
    role: 'button',
    tabIndex: 0,
    onClick: (_e: React.MouseEvent<HTMLDivElement>) => { if (isDir) onToggle(fullPath); else onOpen(fullPath) },
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (isDir) onToggle(fullPath); else onOpen(fullPath)
      }
    },
  }, cells)
}

/** The session snapshot the runtime exposes (the fields this plugin reads). */
interface SessionsSnapshot { current: string | null }
/** One host workspace view (the fields this plugin reads). */
interface WorkspaceView { workspaceId: string; path: string; title: string; sessionIds: string[] }
interface FsTreePanelProps {
  wide: boolean
  call: Call
  onOpenFile: (path: string) => void
  t: (key: string) => string
  useSessions?: (selector: (snapshot: SessionsSnapshot) => SessionsSnapshot) => SessionsSnapshot
  useWorkspaces?: (selector: (state: { items: WorkspaceView[] }) => WorkspaceView[]) => WorkspaceView[]
  selectionStore?: SelectionStore
  dirActions?: DirActions
  reveal?: (path: string) => void
  renderSlot?: (name: string, owner: Record<string, unknown>) => unknown
}
/** Directory-navigation hook: other surfaces re-root the explorer. */
interface DirActions {
  handler: ((dirPath: string) => void) | null
  setHandler(fn: (dirPath: string) => void): void
}

function FsTreePanel(props: FsTreePanelProps) {
  const wide = props.wide === true
  const call = props.call
  const onOpenFile = props.onOpenFile
  const renderSlot = props.renderSlot
  const T = typeof props.t === 'function' ? props.t : (k: string) => k
  const useSessions = typeof props.useSessions === 'function' ? props.useSessions : null
  const useWorkspaces = typeof props.useWorkspaces === 'function' ? props.useWorkspaces : null

  const sessions = useSessions ? useSessions(s => s) : null
  const workspaces = useWorkspaces ? useWorkspaces(s => (s && s.items ? s.items : [])) : []

  const [collapsed, setCollapsed] = React.useState(false)
  const [root, setRoot] = React.useState<string | null>(null)
  const [manualRoot, setManualRoot] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<RpcError | null>(null)
  const [entries, setEntries] = React.useState<ListEntry[] | null>(null)
  const [truncated, setTruncated] = React.useState(false)
  const [children, setChildren] = React.useState<Record<string, { entries: ListEntry[]; truncated: boolean }>>({})
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const [_loadingDirs, setLoadingDirs] = React.useState<Record<string, boolean>>({})
  const [dirErrors, setDirErrors] = React.useState<Record<string, boolean>>({})
  const [copied, setCopied] = React.useState<string | null>(null)
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null)
  const seq = React.useRef(0)
  const copyTimer = React.useRef<number | null>(null)
  const prevRoot = React.useRef<string | null>(null)

  React.useEffect(() => () => {
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
  }, [])

  // Mirror the shared selection so rows can mark the open file.
  React.useEffect(() => {
    const store = props.selectionStore
    if (store) {
      return store.subscribe(() => setSelectedPath(store.getSnapshot()))
    }
  }, [props.selectionStore])

  // Register the directory-navigation handler: path clicks on
  // directories navigate the tree to that root (a manual navigation
  // the workspace auto-root does not override until the session
  // switches).
  React.useEffect(() => {
    if (props.dirActions && typeof props.dirActions.setHandler === 'function') {
      props.dirActions.setHandler((dirPath) => {
        setManualRoot(true)
        setRoot(dirPath)
      })
    }
  }, [props.dirActions])

  // Current session's workspace path, else the first workspace, else
  // none (the home fallback below).
  const deriveWorkspacePath = React.useCallback((): string | null => {
    let ws: WorkspaceView | undefined
    if (sessions && sessions.current != null) {
      for (let i = 0; i < workspaces.length; i++) {
        if (workspaces[i].sessionIds.indexOf(sessions.current) !== -1) { ws = workspaces[i]; break }
      }
    }
    if (!ws && workspaces.length > 0) ws = workspaces[0]
    return ws && ws.path ? ws.path : null
  }, [sessions, workspaces])

  // Restore persisted explorer state once, and only when the
  // remembered root matches the derived workspace root — a stale
  // root would re-fetch the wrong directories. Data is always
  // re-fetched; the memory is structure (collapse + expansion) only.
  React.useEffect(() => {
    const saved = loadExplorerState()
    if (!saved) return
    setCollapsed(saved.collapsed === true)
    if (typeof saved.root === 'string' && saved.root !== '' && saved.root === deriveWorkspacePath()) {
      if (Array.isArray(saved.expanded)) {
        const restore: Record<string, boolean> = {}
        for (const p of saved.expanded) if (typeof p === 'string') restore[p] = true
        setExpanded(restore)
        for (const p of Object.keys(restore)) loadDirChildren(p)
      }
    }
  }, [])

  // A session switch drops a manual navigation so the tree follows
  // the newly opened workspace again.
  const sessionId = sessions && sessions.current != null ? sessions.current : null
  React.useEffect(() => { setManualRoot(false) }, [sessionId])

  // Auto-root at the opened workspace while the user has not
  // navigated elsewhere; without any workspace fall back to the host
  // account home.
  React.useEffect(() => {
    if (manualRoot) return
    const wsPath = deriveWorkspacePath()
    if (wsPath) {
      if (wsPath !== root) setRoot(wsPath)
      return
    }
    if (root !== null) return
    let alive = true
    call('home', {}).then((r) => {
      if (!alive) return
      if (r && r.ok && r.value && (r.value as HomeValue).path) setRoot((r.value as HomeValue).path)
      else setError({ code: 'no-root', message: T('fsTree.noRoot') })
    }).catch((e) => {
      if (alive) setError({ code: 'transport', message: String(e && e.message ? e.message : e) })
    })
    return () => { alive = false }
  }, [manualRoot, root, deriveWorkspacePath, call, T])

  // Load one directory level into the root slot.
  const load = React.useCallback((path: string) => {
    const my = ++seq.current
    setBusy(true)
    setError(null)
    call('list', { path }).then((r) => {
      if (my !== seq.current) return
      setBusy(false)
      if (!r || !r.ok) {
        setEntries(null)
        setError(r && r.error ? r.error : { code: 'unknown', message: String(r) })
        return
      }
      const value = r.value as ListValue
      setEntries(value.entries || [])
      setTruncated(value.truncated === true)
    }).catch((e) => {
      if (my !== seq.current) return
      setBusy(false)
      setEntries(null)
      setError({ code: 'transport', message: String(e && e.message ? e.message : e) })
    })
  }, [call])

  // Fetch one directory level into the children cache (used by
  // toggle and by the expansion restore on mount).
  const loadDirChildren = React.useCallback((path: string) => {
    setLoadingDirs(prev => Object.assign({}, prev, { [path]: true }))
    call('list', { path }).then((r) => {
      setLoadingDirs((prev) => {
        const next = Object.assign({}, prev)
        Reflect.deleteProperty(next, path)
        return next
      })
      if (!r || !r.ok) {
        setDirErrors(prev => Object.assign({}, prev, { [path]: true }))
        return
      }
      const value = r.value as ListValue
      setChildren((prev) => {
        const next = Object.assign({}, prev)
        next[path] = { entries: value.entries || [], truncated: value.truncated === true }
        return next
      })
    }).catch(() => {
      setLoadingDirs((prev) => {
        const next = Object.assign({}, prev)
        Reflect.deleteProperty(next, path)
        return next
      })
      setDirErrors(prev => Object.assign({}, prev, { [path]: true }))
    })
  }, [call])

  // Load the root level whenever the root changes; a new root
  // discards the cached levels (children/expansion) so stale
  // listings never leak across. The first mount keeps the expansion
  // restored by the persistence effect above.
  React.useEffect(() => {
    if (root === null) return
    const first = prevRoot.current === null
    prevRoot.current = root
    setEntries(null)
    setChildren({})
    setDirErrors({})
    if (!first) setExpanded({})
    load(root)
  }, [root])

  // Remember collapse state and the expanded structure (localStorage);
  // data is always re-fetched on the next visit.
  React.useEffect(() => {
    if (root === null) return
    saveExplorerState({
      collapsed: collapsed === true,
      root,
      expanded: Object.keys(expanded),
    })
  }, [collapsed, root, expanded])

  const toggleDir = React.useCallback((path: string) => {
    setExpanded((prev) => {
      const next = Object.assign({}, prev)
      if (next[path]) { Reflect.deleteProperty(next, path); return next }
      next[path] = true
      return next
    })
    setDirErrors((prev) => {
      if (!prev[path]) return prev
      const next = Object.assign({}, prev)
      Reflect.deleteProperty(next, path)
      return next
    })
    if (children[path] !== undefined) return
    loadDirChildren(path)
  }, [children, loadDirChildren])

  const copyPath = React.useCallback((path: string) => {
    const done = () => {
      setCopied(path)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(null), 1200)
    }
    const fallback = () => {
      try {
        const ta = document.createElement('textarea')
        ta.value = path
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        done()
      } catch (_e) { /* clipboard unavailable */ }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(path).then(done).catch(fallback)
    } else fallback()
  }, [])

  const openFile = React.useCallback((path: string) => {
    if (typeof onOpenFile === 'function') onOpenFile(path)
  }, [onOpenFile])

  function renderDir(dirPath: string, depth: number): React.ReactNode[] {
    const level = dirPath === root ? { entries, truncated } : children[dirPath]
    const cells: React.ReactNode[] = []
    if (level === undefined || level === null) {
      cells.push(h('div', { key: 'loading', className: 'dsh-fs-tree-muted', style: { paddingLeft: 8 + (depth + 1) * 16 } }, dirErrors[dirPath] ? T('fsTree.error') : T('fsTree.loading')))
      return cells
    }
    const list = (level.entries || []).filter(e => !e.hidden)
    if (list.length === 0) {
      cells.push(h('div', { key: 'empty', className: 'dsh-fs-tree-muted', style: { paddingLeft: 8 + (depth + 1) * 16 } }, dirErrors[dirPath] ? T('fsTree.error') : T('fsTree.empty')))
      return cells
    }
    for (const entry of list) {
      const fullPath = joinPath(dirPath, entry.name)
      cells.push(React.createElement(TreeRow, {
        key: fullPath,
        dirPath, depth, name: entry.name, kind: entry.kind,
        expanded: expanded[fullPath] === true,
        copied, selectedPath,
        onToggle: toggleDir,
        onOpen: openFile,
        onCopy: copyPath,
        onReveal: (p) => { if (typeof props.reveal === 'function') props.reveal(p) },
        T,
      }))
      if (entry.kind === 'dir' && expanded[fullPath] === true) {
        cells.push(...renderDir(fullPath, depth + 1))
      }
    }
    if (level.truncated) {
      cells.push(h('div', { key: 'truncated', className: 'dsh-fs-tree-note', style: { paddingLeft: 8 + (depth + 1) * 16 } }, T('fsTree.truncated')))
    }
    return cells
  }

  const shown = entries ? entries.filter(e => !e.hidden).length : 0
  const header = h('div', { key: 'header', className: 'dsh-fs-tree-explorer-header' },
    h('button', {
      key: 'toggle', type: 'button', className: 'dsh-fs-tree-explorer-toggle',
      title: collapsed ? T('fsTree.open') : T('fsTree.close'),
      'aria-expanded': collapsed ? 'false' : 'true',
      onClick: () => setCollapsed(!collapsed),
    },
    h('span', { key: 'chev', style: chevronWrap }, chevron(!collapsed)),
    h('span', { key: 'title', className: 'dsh-fs-tree-explorer-title', title: root ?? undefined }, root ? baseName(root) : T('fsTree.title')),
    ),
    h('span', { key: 'count', className: 'dsh-fs-tree-count' }, T('fsTree.entries').replace('{n}', String(shown))),
    h('button', {
      key: 'refresh', type: 'button', style: iconBtnStyle, title: T('fsTree.refresh'),
      onClick: () => { if (root) load(root) },
    }, h(primitives.IconRefreshOutline14, { size: 14 })),
    // Cross-plugin header actions (e.g. dsh-erebus-git's management button):
    // rendered as the trailing header entry when an occupant registers.
    typeof renderSlot === 'function' ? renderSlot('fsTree.explorer.header', {}) as React.ReactNode : null,
  )

  const bodyCells: React.ReactNode[] = []
  if (root === null) {
    if (error) bodyCells.push(h('div', { key: 'e', className: 'dsh-fs-tree-error' }, error.message || T('fsTree.error')))
  } else if (busy && entries === null) {
    bodyCells.push(h('div', { key: 'b', className: 'dsh-fs-tree-muted' }, T('fsTree.loading')))
  } else if (error) {
    bodyCells.push(h('div', { key: 'e', className: 'dsh-fs-tree-error' }, error.message || T('fsTree.error')))
  } else {
    bodyCells.push(...renderDir(root, 0))
  }
  const body = h('div', { key: 'body', className: 'dsh-fs-tree-explorer-body' }, bodyCells)

  // The hole is rendered only while the sidebar is wide, but never
  // assume it: the rail hides the whole explorer.
  if (!wide) return null
  return h('div', { className: 'dsh-fs-tree-explorer' }, [header, collapsed ? null : body])
}

// ---------- binary preview (format dispatch) ----------
const SPREADSHEET_EXTS = new Set(['xlsx', 'xls', 'ods', 'csv', 'tsv'])
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])

/** Stream URL for media (bypasses the base64 cap, supports seeking). */
function rawUrl(path: string): string {
  return `/fs-tree-raw?path=${encodeURIComponent(path)}`
}

/** Viewer kind for one file, used by the dispatch and by tests. */
function binaryKind(path: string): string {
  const ext = extOf(path)
  if (SPREADSHEET_EXTS.has(ext)) return 'spreadsheet'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (ext === 'pptx' || ext === 'ppt') return 'pptx'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx' || ext === 'doc') return 'docx'
  return 'other'
}

// Decompress one raw-deflate buffer (zip method 8) in the browser.
async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持 DecompressionStream')
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const buf = await new Response(stream).arrayBuffer()
  return new TextDecoder().decode(buf)
}

/** Extract slide text from a PPTX (zip of XML): <a:t> runs per slide. */
async function pptxText(base64: string): Promise<string> {
  const bytes = base64ToUint8(base64)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('不是有效的 PPTX（zip）文件')
  const count = dv.getUint16(eocd + 10, true)
  const cdOffset = dv.getUint32(eocd + 16, true)
  const entries: { name: string; method: number; csize: number; localOffset: number }[] = []
  let p = cdOffset
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const localOffset = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen))
    entries.push({ name, method, csize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  const slides = entries
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.name))
    .sort((a, b) => parseInt((a.name.match(/\d+/) ?? ['0'])[0], 10) - parseInt((b.name.match(/\d+/) ?? ['0'])[0], 10))
  if (slides.length === 0) throw new Error('PPTX 中没有找到幻灯片')
  const pages: string[] = []
  for (const slide of slides) {
    const lp = slide.localOffset
    if (dv.getUint32(lp, true) !== 0x04034b50) continue
    const lNameLen = dv.getUint16(lp + 26, true)
    const lExtraLen = dv.getUint16(lp + 28, true)
    const dataStart = lp + 30 + lNameLen + lExtraLen
    const compressed = bytes.subarray(dataStart, dataStart + slide.csize)
    let xml: string
    if (slide.method === 0) xml = new TextDecoder().decode(compressed)
    else if (slide.method === 8) xml = await inflateRaw(compressed)
    else continue
    const runs: string[] = []
    const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(xml)) !== null) runs.push(m[1])
    if (runs.length > 0) pages.push(`— 幻灯片 ${pages.length + 1} —\n${runs.join('')}`)
  }
  if (pages.length === 0) throw new Error('幻灯片中没有文本内容')
  return pages.join('\n\n')
}

/** The current file document state of the file view. */
type FileState =
	| { status: 'idle'; path: null; text: null; binary: false; truncated: false; size: 0; base64: null; tooLarge: false; error: null }
	| { status: 'loading'; path: string; text: null; binary: false; truncated: false; size: 0; base64: null; tooLarge: false; error: null }
	| { status: 'error'; path: string; text: null; binary: false; truncated: false; size: 0; base64: null; tooLarge: false; error: RpcError }
	| { status: 'ready'; path: string; text: string | null; binary: boolean; truncated: boolean; size: number; base64: string | null; tooLarge: boolean; error: null }

/** The vendored SheetJS surface this plugin drives. */
interface SheetJs {
  read(data: Uint8Array, options: { type: string }): SheetJsWorkbook
  utils: { sheet_to_json(sheet: unknown, options: Record<string, unknown>): unknown[][] }
}
/** A parsed SheetJS workbook (the fields this plugin reads). */
interface SheetJsWorkbook {
  SheetNames?: string[]
  Sheets: Record<string, unknown>
}

/** A ready spreadsheet preview state (SheetJS). */
interface SheetState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  wb: SheetJsWorkbook | null
  names: string[]
  active: number
  rows: unknown[][]
  truncated: boolean
  error: string | null
}

interface FileBinaryViewProps {
  state: Extract<FileState, { status: 'ready' }>
  T: (key: string) => string
  openPath: (path: string) => void
  reveal?: (path: string) => void
  onTabMenu?: (e: React.MouseEvent) => void
}
function FileBinaryView({ state, T, openPath, reveal, onTabMenu }: FileBinaryViewProps) {
  const kind = binaryKind(state.path)
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null)
  const [docHtml, setDocHtml] = React.useState<string | null>(null)
  const [docStatus, setDocStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [docError, setDocError] = React.useState<string | null>(null)
  const [sheet, setSheet] = React.useState<SheetState>({ status: 'idle', wb: null, names: [], active: 0, rows: [], truncated: false, error: null })
  const [ppt, setPpt] = React.useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; text: string; error: string | null }>({ status: 'idle', text: '', error: null })

  // PDF: hand the bytes to the browser's built-in viewer via a blob URL.
  React.useEffect(() => {
    if (kind !== 'pdf' || !state.base64 || state.tooLarge) return
    const url = URL.createObjectURL(new Blob([base64ToUint8(state.base64)], { type: 'application/pdf' }))
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [kind, state.base64, state.tooLarge])

  // DOCX: mammoth (served locally by the host) converts to sanitized HTML.
  React.useEffect(() => {
    if (kind !== 'docx' || !state.base64 || state.tooLarge) return
    let alive = true
    setDocStatus('loading')
    setDocError(null)
    docxToHtml(state.base64).then((html) => {
      if (!alive) return
      setDocHtml(sanitizeDocxHtml(html))
      setDocStatus('ready')
    }).catch((e) => {
      if (!alive) return
      setDocError(String(e && e.message ? e.message : e))
      setDocStatus('error')
    })
    return () => { alive = false }
  }, [kind, state.base64, state.tooLarge])

  // Spreadsheets (xlsx/xls/ods/csv/tsv): SheetJS parses to a table.
  // Binary sources arrive as base64; text csv/tsv arrive as text.
  React.useEffect(() => {
    if (kind !== 'spreadsheet' || state.tooLarge) return
    if (!state.base64 && typeof state.text !== 'string') return
    let alive = true
    setSheet({ status: 'loading', wb: null, names: [], active: 0, rows: [], truncated: false, error: null })
    loadScript('/fs-tree-assets/xlsx.full.min.js', () => typeof window.XLSX !== 'undefined').then(() => {
      const data = state.base64 ? base64ToUint8(state.base64) : new TextEncoder().encode(state.text || '')
      const wb = (window.XLSX as SheetJs).read(data, { type: 'array' })
      if (!alive) return
      if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) throw new Error('表格中没有工作表')
      const name = wb.SheetNames[0]
      const rows = (window.XLSX as SheetJs).utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' })
      setSheet({
        status: 'ready',
        wb,
        names: wb.SheetNames,
        active: 0,
        rows: rows.slice(0, 500),
        truncated: rows.length > 500,
        error: null,
      })
    }).catch((e) => {
      if (!alive) return
      setSheet({ status: 'error', wb: null, names: [], active: 0, rows: [], truncated: false, error: String(e && e.message ? e.message : e) })
    })
    return () => { alive = false }
  }, [kind, state.base64, state.text, state.tooLarge])

  // PPTX: extract slide text from the zip of XML.
  React.useEffect(() => {
    if (kind !== 'pptx' || !state.base64 || state.tooLarge) return
    let alive = true
    setPpt({ status: 'loading', text: '', error: null })
    pptxText(state.base64).then((text) => {
      if (!alive) return
      setPpt({ status: 'ready', text, error: null })
    }).catch((e) => {
      if (!alive) return
      setPpt({ status: 'error', text: '', error: String(e && e.message ? e.message : e) })
    })
    return () => { alive = false }
  }, [kind, state.base64, state.tooLarge])

  // Toolbar for binary previews: open in the system app + reveal in
  // the file manager + tab actions (no "cannot preview" nag text).
  const bar = h('div', { key: 'bar', className: 'dsh-fs-tree-binbar' },
    h('button', {
      type: 'button', className: 'dsh-fs-tree-openbtn',
      onClick: () => { if (typeof openPath === 'function') openPath(state.path) },
    }, T('fsTree.openInSystem')),
    h('button', {
      type: 'button', className: 'dsh-fs-tree-openbtn',
      onClick: () => { if (typeof reveal === 'function') reveal(state.path) },
    }, T('fsTree.reveal')),
    typeof onTabMenu === 'function' ? h('button', {
      type: 'button', className: 'dsh-fs-tree-openbtn',
      title: T('fsTree.tabActions'), 'aria-label': T('fsTree.tabActions'),
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => onTabMenu(e),
    }, '▾') : null,
  )

  // Media stream inline via the raw route (no base64 cap, seeking works)
  // — these work even when the read marked the file tooLarge.
  if (kind === 'image') {
    return h('div', { style: fileViewCenterStyle },
      h('img', { key: 'img', src: rawUrl(state.path), alt: state.path, style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 } }),
      bar,
    )
  }
  if (kind === 'audio') {
    return h('div', { style: Object.assign({}, absFill, { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, padding: 24 }) },
      h('audio', { key: 'audio', controls: true, src: rawUrl(state.path), style: { width: '100%' } }),
      bar,
    )
  }
  if (kind === 'video') {
    return h('div', { style: fileViewCenterStyle },
      h('video', { key: 'video', controls: true, src: rawUrl(state.path), style: { maxWidth: '100%', maxHeight: '100%', borderRadius: 8 } }),
      bar,
    )
  }
  if (state.tooLarge) {
    return h('div', { style: fileViewCenterStyle },
      h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.binaryTooLarge').replace('{size}', formatSize(state.size))),
      bar,
    )
  }
  // No bytes available (e.g. an older host half without base64): never
  // present an eternal loading state — fall back to the plain notice.
  // Spreadsheets handle text sources (csv/tsv), so skip them here.
  if (!state.base64 && kind !== 'spreadsheet') {
    return h('div', { style: fileViewCenterStyle },
      h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.binary').replace('{size}', formatSize(state.size))),
      bar,
    )
  }
  if (kind === 'spreadsheet') {
    if (sheet.status === 'loading') {
      return h('div', { style: fileViewCenterStyle }, h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.loading')), bar)
    }
    if (sheet.status === 'error') {
      return h('div', { style: fileViewCenterStyle },
        h('div', { className: 'dsh-fs-tree-error', style: { textAlign: 'center' } }, T('fsTree.sheetError')),
        h('div', { className: 'dsh-fs-tree-note', style: { textAlign: 'center', marginTop: 4 } }, sheet.error || ''),
        bar,
      )
    }
    if (sheet.status === 'ready') {
      const sheetTabs = sheet.names.length > 1
        ? h('div', { key: 'tabs', className: 'dsh-fs-tree-sheetTabs' },
          sheet.names.map((name, i) => h('button', {
            key: name,
            type: 'button',
            className: i === sheet.active ? 'dsh-fs-tree-sheetTab dsh-fs-tree-sheetTab-active' : 'dsh-fs-tree-sheetTab',
            onClick: () => {
              if (!sheet.wb) return
              const rows = (window.XLSX as SheetJs).utils.sheet_to_json(sheet.wb.Sheets[name], { header: 1, raw: true, defval: '' })
              setSheet(prev => ({ ...prev, active: i, rows: rows.slice(0, 500), truncated: rows.length > 500 }))
            },
          }, name)),
        )
        : null
      return h('div', { style: Object.assign({}, absFill, { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: '12px 16px 16px' }) },
        bar,
        sheetTabs,
        h('div', { key: 'table', className: 'dsh-fs-tree-sheet' },
          h('table', null,
            h('tbody', null, sheet.rows.map((row, ri) => h('tr', { key: ri },
              row.map((cell, ci) => h('td', { key: ci }, cell === null || cell === undefined ? '' : String(cell))),
            ))),
          ),
        ),
        sheet.truncated ? h('div', { key: 'trunc', className: 'dsh-fs-tree-note' }, T('fsTree.sheetTruncated')) : null,
      )
    }
    return h('div', { style: fileViewCenterStyle }, h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.loading')), bar)
  }
  if (kind === 'pptx') {
    if (ppt.status === 'loading') {
      return h('div', { style: fileViewCenterStyle }, h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.loading')), bar)
    }
    if (ppt.status === 'error') {
      return h('div', { style: fileViewCenterStyle },
        h('div', { className: 'dsh-fs-tree-error', style: { textAlign: 'center' } }, T('fsTree.pptxError')),
        h('div', { className: 'dsh-fs-tree-note', style: { textAlign: 'center', marginTop: 4 } }, ppt.error || ''),
        bar,
      )
    }
    return h('div', { style: Object.assign({}, absFill, { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: '12px 20px 20px' }) },
      bar,
      h('pre', { key: 'ppt', className: 'dsh-fs-tree-ppt', style: { flex: 1, minHeight: 0, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.7, margin: 0, color: 'var(--dsw-alias-label-primary)' } }, ppt.text),
    )
  }
  if (kind === 'pdf' && blobUrl !== null) {
    return h('div', { style: Object.assign({}, absFill, { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: '12px 16px 16px' }) },
      bar,
      h('iframe', { key: 'pdf', className: 'dsh-fs-tree-pdf', src: blobUrl, title: state.path }),
    )
  }
  if (kind === 'docx') {
    if (docStatus === 'ready' && docHtml !== null) {
      return h('div', { style: Object.assign({}, absFill, { boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: '12px 20px 20px' }) },
        bar,
        h('div', { key: 'docx', className: 'dsh-fs-tree-docx', dangerouslySetInnerHTML: { __html: docHtml } }),
      )
    }
    if (docStatus === 'error') {
      return h('div', { style: fileViewCenterStyle },
        h('div', { className: 'dsh-fs-tree-error', style: { textAlign: 'center' } }, T('fsTree.docxError')),
        h('div', { className: 'dsh-fs-tree-note', style: { textAlign: 'center', marginTop: 4 } }, docError || ''),
        bar,
      )
    }
    return h('div', { style: fileViewCenterStyle }, h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.loading')), bar)
  }
  // Other binary kinds (.doc, images, archives, ...): notice + system open.
  return h('div', { style: fileViewCenterStyle },
    h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.binary').replace('{size}', formatSize(state.size))),
    bar,
  )
}

/** The vendored SheetJS surface this plugin drives. */
interface SheetJs {
  read(data: Uint8Array, options: { type: string }): { SheetNames?: string[]; Sheets: Record<string, unknown> }
  utils: { sheet_to_json(sheet: unknown, options: Record<string, unknown>): unknown[][] }
}

// ---------- file view (the 文件 conversation tab) ----------
// Pure state → JSX mapping for the content area, exported for the smoke
// test; the kernel only reads `apply`/`inject`, so the extra export is
// inert. Text files render through the `fsTree.fileView` CHAIN slot
// (the editor plugin claims editable text; the ReadBlock below is the
// fallback), so viewing and editing live in ONE tab.
interface FileViewBodyProps {
  state: FileState
  T: (key: string) => string
  openPath: (path: string) => void
  reveal?: (path: string) => void
  renderSlotChain?: (name: string, props: Record<string, unknown>, options: { fallback?: unknown }) => unknown
  onDirtyChange?: (path: string, dirty: boolean) => void
  onTabMenu?: (e: React.MouseEvent) => void
}
function FileViewBody({ state, T, openPath, reveal, renderSlotChain, onDirtyChange, onTabMenu }: FileViewBodyProps) {
  if (state.status === 'idle') {
    return h('div', { style: fileViewCenterStyle },
      h('span', { style: { color: 'var(--dsw-alias-label-tertiary)', marginBottom: 12, display: 'inline-flex' } }, h(primitives.IconFolderOpen16, { size: 32 })),
      h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.noSelection')),
    )
  }
  if (state.status === 'loading') {
    return h('div', { style: fileViewCenterStyle }, h('div', { className: 'dsh-fs-tree-hint' }, T('fsTree.loading')))
  }
  if (state.status === 'error') {
    return h('div', { style: fileViewCenterStyle },
      h('div', { className: 'dsh-fs-tree-error', style: { textAlign: 'center' } }, `${T('fsTree.readError')}${state.path ? `\n${state.path}` : ''}`),
      h('div', { className: 'dsh-fs-tree-note', style: { textAlign: 'center', marginTop: 4 } }, state.error ? state.error.message : ''),
    )
  }
  // ready
  // Spreadsheets (incl. text csv/tsv) render as tables; everything
  // else binary goes through the format dispatch.
  if (state.binary || binaryKind(state.path) === 'spreadsheet') {
    return h(FileBinaryView, { state, T, openPath, reveal, onTabMenu })
  }
  // Text: the chain slot gets first pick (editor), the ReadBlock
  // viewer is the fallback (no editor plugin, or non-editable text).
  const slot = typeof renderSlotChain === 'function'
    ? renderSlotChain('fsTree.fileView', { path: state.path, onDirtyChange, onTabMenu }, { fallback: null })
    : null
  if (slot !== null && slot !== undefined) return slot as React.ReactNode
  const lines = (state.text || '').split(/\r?\n/).map((text, i) => ({ number: i + 1, text }))
  const lang = langFromPath(state.path)
  return h('div', { style: fileViewRootStyle },
    [
      state.truncated ? h('div', { key: 't', className: 'dsh-fs-tree-note', style: { marginBottom: 8 } }, T('fsTree.readTruncated')) : null,
      h(primitives.ReadBlock, {
        key: 'rb',
        label: state.path,
        lines,
        totalLines: lines.length,
        lang,
        maxLines: 10000,
      }),
    ],
  )
}

// ---------- tab context menu (shared by tab right-click + toolbar ▾) ----------
// Rendered through a portal onto document.body when the DOM host is a
// real browser: a fixed-position overlay inside the conversation view
// can be hijacked by a transformed ancestor (menu lands off-screen or
// its invisible hit-layer swallows clicks). Closing is driven by a
// capture-phase document listener instead of a full-screen backdrop,
// so a click outside the menu both closes it AND reaches the element
// underneath. In non-DOM hosts (SSR/tests) it renders inline.
interface TabMenuProps {
  menu: { x: number; y: number; path: string | null; openedAt: number } | null
  onClose: () => void
  onCloseTab: (path: string) => void
  onCloseOthers: (keep: string | null) => void
  onCloseAll: () => void
  T: (key: string) => string
}
function TabMenu({ menu, onClose, onCloseTab, onCloseOthers, onCloseAll, T }: TabMenuProps) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      try {
        if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) onClose()
      } catch (_err) { /* never break the page */ }
    }
    document.addEventListener('mousedown', onDown, true)
    return () => document.removeEventListener('mousedown', onDown, true)
  }, [menu, onClose])
  if (!menu) return null
  // Ignore clicks within 300 ms of opening: a double-click on the
  // ▾ button would otherwise land on the menu's first item.
  const fresh = () => (Date.now() - (menu.openedAt || 0)) < 300
  const el = h('div', { ref: wrapRef, className: 'dsh-fs-tree-tabmenu', style: { left: menu.x, top: menu.y } },
    menu.path ? h('button', {
      key: 'c1', type: 'button', className: 'dsh-fs-tree-tabmenu-item',
      onClick: () => { if (fresh()) return; onCloseTab(menu.path as string); onClose() },
    }, T('fsTree.closeTab')) : null,
    h('button', {
      key: 'c2', type: 'button', className: 'dsh-fs-tree-tabmenu-item',
      onClick: () => { if (fresh()) return; onCloseOthers(menu.path); onClose() },
    }, T('fsTree.closeOthers')),
    h('button', {
      key: 'c3', type: 'button', className: 'dsh-fs-tree-tabmenu-item',
      onClick: () => { if (fresh()) return; onCloseAll(); onClose() },
    }, T('fsTree.closeAll')),
  )
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(el, document.body)
  }
  return el
}

// ---------- open-file tab strip (VS Code style) ----------
// Context menu (right-click a tab) is the entry point here; the
// overflow-safe entry lives in the content toolbar (tab-menu button).
interface FileTabsProps {
  tabs: string[]
  activePath: string | null
  dirtyMap: Record<string, boolean>
  openFile: (path: string) => void
  closeTab: (path: string) => void
  onTabMenu: (e: React.MouseEvent, path: string) => void
  T: (key: string) => string
}
function FileTabs({ tabs, activePath, dirtyMap, openFile, closeTab, onTabMenu, T }: FileTabsProps) {
  if (!tabs || tabs.length === 0) return null
  return h('div', { className: 'dsh-fs-tree-tabs', role: 'tablist' },
    tabs.map(p => h('div', {
      key: p,
      className: p === activePath ? 'dsh-fs-tree-tab dsh-fs-tree-tab-active' : 'dsh-fs-tree-tab',
      role: 'tab',
      'aria-selected': p === activePath ? 'true' : 'false',
      title: p,
      onClick: (_e: React.MouseEvent<HTMLDivElement>) => openFile(p),
      onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => onTabMenu(e, p),
    },
    dirtyMap[p] ? h('span', { key: 'dot', className: 'dsh-fs-tree-tabdot', title: T('fsTree.dirty') }) : null,
    h('span', { key: 'name', className: 'dsh-fs-tree-tabname' }, baseName(p)),
    h('button', {
      key: 'close', type: 'button', className: 'dsh-fs-tree-tabclose',
      title: T('fsTree.closeTab'), 'aria-label': T('fsTree.closeTab'),
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); closeTab(p) },
    }, '×'),
    )),
  )
}

interface FileViewProps {
  call: Call
  openPath: (path: string) => void
  reveal: (path: string) => void
  selectionStore?: SelectionStore
  tabs?: TabsStore
  openFile: (path: string) => void
  closeTab: (path: string) => void
  renderSlotChain?: (name: string, props: Record<string, unknown>, options: { fallback?: unknown }) => unknown
  t: (key: string) => string
}
function FileView(props: FileViewProps) {
  const call = props.call
  const openPath = props.openPath
  const reveal = props.reveal
  const selectionStore = props.selectionStore
  const tabsStore = props.tabs
  const openFile = props.openFile
  const closeTab = props.closeTab
  const renderSlotChain = props.renderSlotChain
  const T = typeof props.t === 'function' ? props.t : (k: string) => k
  const closeOtherTabs = (keep: string | null) => {
    if (!tabsStore || !selectionStore) return
    if (!keep || !tabsStore.getSnapshot().includes(keep)) return
    const hasDirty = tabsStore.getSnapshot().some(p => p !== keep && dirtyMap[p])
    if (hasDirty && typeof window !== 'undefined' && !window.confirm(T('fsTree.confirmCloseOthers'))) return
    tabsStore.closeOthers(keep)
    if (selectionStore.getSnapshot() !== keep) selectionStore.select(keep)
  }
  const closeAllTabs = () => {
    if (!tabsStore || !selectionStore) return
    const hasDirty = tabsStore.getSnapshot().some(p => dirtyMap[p])
    if (hasDirty && typeof window !== 'undefined' && !window.confirm(T('fsTree.confirmCloseAll'))) return
    tabsStore.closeAll()
    selectionStore.select(null)
  }

  // Shared tab-menu (right-click a tab, or the toolbar ▾ button):
  // state lives here so the menu survives tab-strip overflow.
  // Button clicks anchor the menu below the button (so the menu
  // never covers the button that opened it — an easy misclick);
  // right-clicks anchor at the cursor. Clicking the button again
  // while the menu is open closes it, and menu items ignore clicks
  // within 300 ms of opening (double-click protection).
  const [tabMenu, setTabMenu] = React.useState<{ x: number; y: number; path: string | null; openedAt: number } | null>(null)
  const openTabMenu = React.useCallback((e: React.MouseEvent, tabPath: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    if (tabMenu) { setTabMenu(null); return }
    let x = e.clientX
    let y = e.clientY
    const el = e.currentTarget
    if (el && e.type === 'click' && typeof el.getBoundingClientRect === 'function') {
      const r = el.getBoundingClientRect()
      x = r.left
      y = r.bottom + 2
    }
    setTabMenu({ x, y, path: tabPath || null, openedAt: Date.now() })
  }, [tabMenu])
  const closeTabMenu = React.useCallback(() => setTabMenu(null), [])
  const hasTabs = tabsStore ? tabsStore.getSnapshot().length > 0 : false
  const tabMenuEl = tabMenu && hasTabs
    ? h(TabMenu, {
      key: 'tabmenu',
      menu: tabMenu,
      onClose: closeTabMenu,
      onCloseTab: closeTab,
      onCloseOthers: keep => closeOtherTabs(keep || path),
      onCloseAll: closeAllTabs,
      T,
    })
    : null

  const path = React.useSyncExternalStore(
    selectionStore ? selectionStore.subscribe : () => () => {},
    selectionStore ? selectionStore.getSnapshot : () => null,
    selectionStore ? selectionStore.getSnapshot : () => null,
  )
  const tabs = React.useSyncExternalStore(
    tabsStore ? tabsStore.subscribe : () => () => {},
    tabsStore ? tabsStore.getSnapshot : () => [],
    tabsStore ? tabsStore.getSnapshot : () => [],
  )
  const [state, setState] = React.useState<FileState>({ status: 'idle', path: null, text: null, binary: false, truncated: false, size: 0, base64: null, tooLarge: false, error: null })
  const [dirtyMap, setDirtyMap] = React.useState<Record<string, boolean>>({})

  const onDirtyChange = React.useCallback((p: string, dirty: boolean) => {
    setDirtyMap((prev) => {
      const next = Object.assign({}, prev)
      if (dirty) next[p] = true
      else Reflect.deleteProperty(next, p)
      return next
    })
  }, [])

  React.useEffect(() => {
    if (!path) {
      setState({ status: 'idle', path: null, text: null, binary: false, truncated: false, size: 0, base64: null, tooLarge: false, error: null })
      return
    }
    let alive = true
    setState({ status: 'loading', path, text: null, binary: false, truncated: false, size: 0, base64: null, tooLarge: false, error: null })
    call('read', { path }).then((r) => {
      if (!alive) return
      if (!r || !r.ok) {
        setState({ status: 'error', path, text: null, binary: false, truncated: false, size: 0, base64: null, tooLarge: false, error: r && r.error ? r.error : { code: 'unknown', message: String(r) } })
        return
      }
      const value = r.value as ReadValue
      setState({
        status: 'ready',
        path,
        text: typeof value.text === 'string' ? value.text : '',
        binary: value.binary === true,
        truncated: value.truncated === true,
        size: typeof value.size === 'number' ? value.size : 0,
        base64: typeof value.base64 === 'string' ? value.base64 : null,
        tooLarge: value.tooLarge === true,
        error: null,
      })
    }).catch((e) => {
      if (!alive) return
      setState({ status: 'error', path, text: null, binary: false, truncated: false, size: 0, base64: null, tooLarge: false, error: { code: 'transport', message: String(e && e.message ? e.message : e) } })
    })
    return () => { alive = false }
  }, [path, call])

  // Per-file scroll memory: record the active scroller on any scroll
  // (capture phase — scroll events don't bubble), restore it after
  // switching back to a file once its content has mounted.
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const scrollMemory = React.useRef<Record<string, number>>({})

  React.useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !path) return
    const record = (e: Event) => {
      const el = e.target as HTMLElement
      if (el === wrap || typeof el.scrollTop !== 'number') return
      scrollMemory.current[path] = el.scrollTop
    }
    wrap.addEventListener('scroll', record, true)
    return () => wrap.removeEventListener('scroll', record, true)
  }, [path])

  React.useEffect(() => {
    if (!path) return
    const expected = scrollMemory.current[path]
    if (expected === undefined || expected === 0) return
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      const scroller = findScrollable(wrapRef.current)
      if (scroller) {
        scroller.scrollTop = expected
        clearInterval(timer)
      } else if (tries > 30) {
        clearInterval(timer)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [path])

  // The root fills the conversation's viewArea as a flex item (NOT a
  // percentage height — those resolve unreliably inside the flex
  // chain) and clips overflow, so the tab strip is always visible.
  return h('div', { style: { flex: 1, minHeight: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
    h(FileTabs, { tabs, activePath: path, dirtyMap, openFile, closeTab, onTabMenu: (e, p) => openTabMenu(e, p), T }),
    h('div', { key: 'content', ref: wrapRef, style: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' } },
      FileViewBody({
        state, T, openPath, reveal, renderSlotChain, onDirtyChange,
        onTabMenu: hasTabs ? e => openTabMenu(e, null) : undefined,
      }),
    ),
    tabMenuEl,
  )
}

// Find the first vertical scroller inside a container (used to restore
// per-file scroll positions after the content remounts).
function findScrollable(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null
  if (typeof root.scrollHeight === 'number' && root.scrollHeight > root.clientHeight) {
    let overflowY = ''
    try { overflowY = getComputedStyle(root).overflowY } catch (_e) { /* detached */ }
    if (overflowY === '' || overflowY === 'auto' || overflowY === 'scroll') return root
  }
  for (const child of root.children) {
    const found = findScrollable(child as HTMLElement)
    if (found) return found
  }
  return null
}

// ---------- plugin entry ----------
/** The client context surface this plugin reads (structural). */
interface PluginContext {
  effect(fn: () => unknown, label?: string): unknown
  locale: {
    register(ns: string, dicts: Record<string, Dict>): unknown
    bind(ns: string): (key: string) => string
  }
  connection: {
    rpc: { call(route: string, method: string, payload?: Record<string, unknown>): Promise<RpcResult<unknown>> }
    api: { host: { openPath(input: { path: string }): Promise<{ ok: boolean; value?: unknown; error?: { message: string } }> } }
  }
  slots: {
    inject(name: string, fn: () => unknown): unknown
    register(opts: SlotRegisterOptions, component: unknown): () => void
  }
  provide(name: string, handle: FsTreeService): unknown
  get(name: string): unknown
}
/** One child-slot declaration or a registration option (the fields used). */
interface SlotChildDecl { kind: string; scope: string }
interface SlotRegisterOptions {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
  locale?: string
  children?: Record<string, SlotChildDecl>
  select?: (owner: unknown) => unknown
  inject?: () => Record<string, unknown>
}
/** The shared `fsTree` client service (the cross-plugin seam). */
interface FsTreeService {
  call: Call
  openPath: (path: string) => Promise<unknown>
  reveal: (path: string) => void
  selectionStore: SelectionStore
  viewPrefs: ViewPrefs
  dirActions: DirActions
  tabs: TabsStore
  openFile: (path: string) => void
  closeTab: (path: string) => void
  openInViewer: (path: string) => Promise<boolean>
}
/** The workspace handle (for the openPath wrap). */
interface WorkspacesHandle {
  openPath(path: string): Promise<{ ok: boolean; value?: unknown; error?: { message: string } }>
}
/** The sessions handle (for the current cwd read). */
interface SessionsHandle {
  list?: { getSnapshot(): { current: string | null; byId?: Record<string, { cwd?: string }> } | null }
}

export const inject = ['slots', 'connection', 'locale']
export function apply(ctx: PluginContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'fs-tree: dictionaries')
  const tView = ctx.locale.bind(NS)
  const selectionStore = createSelectionStore()
  const call: Call = (endpoint, payload) => ctx.connection.rpc.call('/fs-tree', endpoint, payload)
  const openPath = (path: string) => ctx.connection.api.host.openPath({ path }).catch(() => {})

  // The shared `fsTree` service: the cross-plugin seam other plugins
  // (dsh-file-editor, dsh-c-lang) inject to reach the tree's RPC,
  // selection, system-open, and view preferences.
  const viewPrefs = createViewPrefs()
  // Binary/document kinds stay in the built-in viewer tab; text kinds
  // are claimed by the editor plugin (when installed) via the same
  // registry. Unknown kinds fall back to the viewer.
  viewPrefs.register(['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'ods', 'csv', 'tsv',
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico',
    'zip', 'rar', '7z', 'tar', 'gz', 'xz', 'exe', 'dll', 'bin', 'wasm',
    'mp3', 'mp4', 'wav', 'ogg', 'oga', 'm4a', 'flac', 'webm', 'mov', 'm4v', 'ogv'], 'file', tView('fsTree.viewTab'))

  // Directory navigation hook: the tree explorer registers a handler so
  // path clicks on directories can re-root the tree.
  const dirActions: DirActions = {
    handler: null,
    setHandler(fn) { this.handler = fn },
  }

  // Open-files tab store (VS Code style) + the shared open action:
  // add a tab, select it, and activate the file view.
  const tabsStore = createTabsStore()
  const openFile = (path: string) => {
    tabsStore.add(path)
    selectionStore.select(path)
    const pref = viewPrefs.viewFor(path)
    tryActivateFileView(pref ? pref.label : tView('fsTree.viewTab'))
  }
  const closeTab = (path: string) => {
    const neighbor = tabsStore.close(path)
    if (selectionStore.getSnapshot() === path) {
      if (neighbor) selectionStore.select(neighbor)
      else selectionStore.select(null)
    }
  }

  // Open a path (relative paths resolve against the current session's
  // cwd) in the file display: files go to the preferred view tab,
  // directories navigate the tree explorer. Returns whether the
  // path existed and was handled.
  const openInViewer = async (rawPath: string): Promise<boolean> => {
    const resolved = resolveAgainstCwd(currentCwd(), rawPath)
    if (!resolved) return false
    const r = await call('stat', { path: resolved })
    if (!r || !r.ok || !(r.value as StatValue).exists) return false
    if ((r.value as StatValue).kind === 'dir') {
      if (dirActions.handler) {
        dirActions.handler(resolved)
        return true
      }
      return false
    }
    if ((r.value as StatValue).kind !== 'file') return false
    openFile(resolved)
    return true
  }

  // Current session cwd from the runtime's list mirror.
  const sessions = ctx.get('sessions') as SessionsHandle | undefined
  function currentCwd(): string | null {
    try {
      const snap = sessions && sessions.list ? sessions.list.getSnapshot() : null
      if (!snap) return null
      const current = snap.current
      const summary = current != null && snap.byId ? snap.byId[current] : null
      return summary && summary.cwd ? summary.cwd : null
    } catch (_e) { return null }
  }

  // Redirect every existing file-open call (deliverables mention
  // buttons, produced-file chips) into the viewer; unresolvable paths
  // fall back to the original system-open behavior.
  const workspaces = ctx.get('workspaces') as WorkspacesHandle | undefined
  if (workspaces && typeof workspaces.openPath === 'function') {
    const original = workspaces.openPath.bind(workspaces)
    workspaces.openPath = path => openInViewer(path).then(handled => (
      handled ? { ok: true, value: { opened: true, inViewer: true } } : original(path)
    ))
  }

  // Bare path tokens in messages: document-level click probe.
  if (typeof document !== 'undefined') {
    installConversationPathClicker((text) => { openInViewer(text) })
  }

  ctx.provide('fsTree', {
    call,
    openPath,
    reveal: path => call('reveal', { path }).catch(() => {}),
    selectionStore,
    viewPrefs,
    dirActions,
    tabs: tabsStore,
    openFile,
    closeTab,
    openInViewer: path => openInViewer(path),
  })

  // After a page reload the tab list is restored from localStorage;
  // select the first tab so the file view shows something.
  if (selectionStore.getSnapshot() === null && tabsStore.getSnapshot().length > 0) {
    selectionStore.select(tabsStore.getSnapshot()[0])
  }

  // Sidebar explorer under the workspace/session region: the opened
  // workspace's file tree, always visible while the sidebar is wide.
  // Declares the `fsTree.explorer.header` LIST slot for cross-plugin header
  // actions (dsh-erebus-git registers its management button there).
  ctx.slots.inject('sidebar.workspaces.tree', () => ctx.slots.register({
    name: 'sidebar.workspaces.tree',
    id: 'fs-tree-explorer',
    locale: NS,
    children: { 'fsTree.explorer.header': { kind: 'list', scope: 'root' } },
    inject: () => ({
      call,
      selectionStore,
      dirActions,
      reveal: (path: string) => call('reveal', { path }).catch(() => {}),
      onOpenFile: openFile,
    }),
  }, FsTreePanel))

  // Conversation view tab: the file viewer (same seam as ui-trajectory).
  // Declares the `fsTree.fileView` CHAIN slot for editable surfaces
  // (dsh-file-editor claims text files; ReadBlock is the fallback).
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'fs-file',
    order: 20,
    locale: NS,
    label: () => tView('fsTree.viewTab'),
    children: { 'fsTree.fileView': {
      kind: 'chain',
      scope: 'session',
    } },
    inject: () => ({ call, selectionStore, openPath, reveal: (path: string) => call('reveal', { path }).catch(() => {}), tabs: tabsStore, openFile, closeTab }),
  }, FileView))
}

// Exports consumed by the smoke tests (inert to the kernel, which only reads
// `apply`/`inject`).
const _pathClick = { looksLikePath, resolveAgainstCwd }
const _pptx = { pptxText, inflateRaw }
export { FileViewBody, TabMenu, TreeRow, binaryKind, _pathClick, _pptx }

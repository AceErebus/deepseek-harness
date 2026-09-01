// dsh-file-editor browser half: the editable surface inside the file tree's
// "文件" conversation view. Registered into the `fsTree.fileView` CHAIN slot
// (declared by dsh-fs-tree): its `select` claims editable text files, and the
// tree's FileView falls back to the built-in read-only viewer for everything
// else — one tab, VS Code style, no duplicate 编辑/文件 pages.
//
// TypeScript source; tsdown bundles this file into client.js in the
// __ModuleLoader__.load({ id, factory }) format the web shell kernel loads
// (externals answered by the frozen module table).
//
// Seams used (all public):
//   - `fsTree.fileView` chain slot (declared by dsh-fs-tree): self-nominating
//     entry; the owner passes `{ path, onDirtyChange }`.
//   - `fsTree` client service (provided by dsh-fs-tree): `call` (read/write
//     RPC), `openFile` (tab + selection + view activation), `openPath`.
//   - `cLang` client service (provided by dsh-c-lang, optional): CTRL+click
//     symbol resolution (against the editor's CURRENT text) and 编译.
//   - `/file-editor-assets/cm6.bundle.js`: prebuilt CodeMirror 6 library.
import * as React from 'react'

const h = React.createElement

// ---------- styles (one owned tag, injected at materialization) ----------
const css = '.dsh-editor-host{flex:1;min-height:0;overflow:hidden}.dsh-editor-toolbar{flex:none;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2);padding:6px 12px;min-height:38px}.dsh-editor-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary);font-size:12px}.dsh-editor-status{flex:none;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;white-space:nowrap}.dsh-editor-status[data-error]{color:var(--dsw-alias-state-error-primary)}.dsh-editor-dirty{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-business-primary)}.dsh-editor-output{flex:none;max-height:200px;overflow-y:auto;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-all;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;padding:8px 12px;margin:0}.dsh-editor-btn{flex:none;height:26px;display:inline-flex;align-items:center;cursor:pointer;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border:none;border-radius:8px;padding:0 10px;font-family:inherit;font-size:12px}.dsh-editor-btn:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}.dsh-editor-btn[disabled]{opacity:.45;cursor:default}.dsh-editor-btn[data-primary]{background:var(--dsw-alias-button-elevated-fill);border:1px solid var(--dsw-alias-border-l1)}.dsh-editor-center{position:absolute;top:0;left:0;right:0;bottom:0;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px}.dsh-editor-hint{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:22px;text-align:center}.dsh-cm-jump{text-decoration:underline;text-underline-offset:2px;cursor:pointer}.dsh-editor-preview{flex:1;min-height:0;overflow-y:auto;box-sizing:border-box;padding:16px 20px 48px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.75;word-break:break-word}.dsh-editor-preview h1,.dsh-editor-preview h2,.dsh-editor-preview h3,.dsh-editor-preview h4,.dsh-editor-preview h5,.dsh-editor-preview h6{margin:20px 0 10px;font-weight:600;line-height:1.35}.dsh-editor-preview h1{font-size:24px;padding-bottom:8px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-editor-preview h2{font-size:20px;padding-bottom:6px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-editor-preview h3{font-size:17px}.dsh-editor-preview h4{font-size:15px}.dsh-editor-preview h5,.dsh-editor-preview h6{font-size:14px;color:var(--dsw-alias-label-secondary)}.dsh-editor-preview p{margin:10px 0}.dsh-editor-preview a{color:var(--dsw-alias-state-business-primary)}.dsh-editor-preview img{max-width:100%;border-radius:6px}.dsh-editor-preview code{background:var(--dsw-alias-interactive-bg-hover);border-radius:5px;padding:1px 5px;font-family:var(--ds-font-family-code);font-size:.92em}.dsh-editor-preview pre{background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;overflow-x:auto;font-family:var(--ds-font-family-code);font-size:12.5px;line-height:1.55;margin:12px 0}.dsh-editor-preview pre code{background:transparent;padding:0;font-size:inherit}.dsh-editor-preview table{border-collapse:collapse;margin:12px 0;width:100%}.dsh-editor-preview th,.dsh-editor-preview td{border:1px solid var(--dsw-alias-border-l2);padding:6px 10px;text-align:left;vertical-align:top}.dsh-editor-preview thead th{background:var(--dsw-alias-interactive-bg-hover)}.dsh-editor-preview blockquote{margin:12px 0;padding:2px 14px;border-left:3px solid var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}.dsh-editor-preview ul,.dsh-editor-preview ol{margin:10px 0;padding-left:24px}.dsh-editor-preview li{margin:4px 0}.dsh-editor-preview hr{border:none;border-top:1px solid var(--dsw-alias-border-l2);margin:18px 0}.dsh-editor-preview del{color:var(--dsw-alias-label-tertiary)}'
// Media preview styles (image/video files render via /fs-tree-raw).
const mediaCss = '.dsh-editor-media{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:auto;box-sizing:border-box;padding:16px;background:var(--dsw-alias-bg-base)}.dsh-editor-media-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:4px}.dsh-editor-media-video{max-width:100%;max-height:100%;outline:none;border-radius:4px;background:#000}'
const cssTagId = 'dsh-file-editor/styles'
if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(cssTagId) + ']') === null) {
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-file-editor'
  tag.dataset.pluginCss = cssTagId
  tag.textContent = css + mediaCss
  document.head.appendChild(tag)
}

// ---------- ambient browser globals from the vendored CodeMirror bundle ----------
declare global {
  interface Window {
    /** The prebuilt CodeMirror 6 API (cm6.bundle.js, loaded on demand). */
    CM6?: CM6Api
  }
}

// ---------- locale ----------
type Dict = Record<string, string>
const NS = 'file-editor'
const zh: Dict = {
  'editor.loading': '加载中…',
  'editor.binary': '二进制文件，无法编辑',
  'editor.readError': '无法读取该文件',
  'editor.save': '保存',
  'editor.saved': '已保存',
  'editor.saving': '保存中…',
  'editor.saveError': '保存失败',
  'editor.reload': '重新加载',
  'editor.openInSystem': '在系统中打开',
  'editor.reveal': '在资源管理器中显示',
  'editor.build': '编译',
  'editor.building': '编译中…',
  'editor.buildError': '编译失败',
  'editor.buildEmpty': '（无输出）',
  'editor.noCompiler': '未检测到 C 编译器（gcc/clang），请安装 MinGW-w64 后重试',
  'editor.tabActions': '标签操作',
  'editor.dirty': '未保存',
  'editor.noDef': '未找到定义',
  'editor.preview': '预览',
  'editor.edit': '编辑',
  'editor.imageHint': '图片预览',
  'editor.videoHint': '视频预览',
}
const en: Dict = {
  'editor.loading': 'Loading…',
  'editor.binary': 'Binary file, cannot edit',
  'editor.readError': 'Could not read this file',
  'editor.save': 'Save',
  'editor.saved': 'Saved',
  'editor.saving': 'Saving…',
  'editor.saveError': 'Save failed',
  'editor.reload': 'Reload',
  'editor.openInSystem': 'Open in system app',
  'editor.reveal': 'Reveal in File Explorer',
  'editor.build': 'Build',
  'editor.building': 'Building…',
  'editor.buildError': 'Build failed',
  'editor.buildEmpty': '(no output)',
  'editor.noCompiler': 'No C compiler (gcc/clang) detected — install MinGW-w64 and retry',
  'editor.tabActions': 'Tab actions',
  'editor.dirty': 'Unsaved',
  'editor.noDef': 'Definition not found',
  'editor.preview': 'Preview',
  'editor.edit': 'Edit',
  'editor.imageHint': 'Image preview',
  'editor.videoHint': 'Video preview',
}

// ---------- helpers ----------
function baseName(path: string): string {
  if (!path) return ''
  const trimmed = path.replace(/[\\/]+$/, '')
  const i = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return i < 0 ? trimmed : trimmed.slice(i + 1)
}
const TEXT_EXTS = new Set(['c', 'h', 'cpp', 'hpp', 'cc', 'cxx', 'cu', 'py', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx',
  'json', 'jsonc', 'md', 'markdown', 'txt', 'yml', 'yaml', 'toml', 'ini', 'sh', 'bash', 'zsh', 'ps1',
  'css', 'scss', 'less', 'html', 'htm', 'xml', 'svg', 'sql', 'php', 'rb', 'rs', 'go', 'java', 'kt',
  'swift', 'vue', 'svelte', 'graphql', 'diff', 'log', 'env', 'gitignore', 'editorconfig'])
const TEXT_NAMES = new Set(['dockerfile', 'makefile', 'cmakelists.txt', 'license', 'readme', 'readme.md'])
function isEditableText(path: string): boolean {
  const base = baseName(path).toLowerCase()
  if (TEXT_NAMES.has(base)) return true
  const dot = base.lastIndexOf('.')
  return dot > 0 && TEXT_EXTS.has(base.slice(dot + 1))
}
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.CM6 !== 'undefined') { resolve(); return }
    const existing = document.querySelector<HTMLElement>(`script[data-editor-src="${src}"]`)
    if (existing) {
      if (existing.dataset.editorState === 'loaded') { resolve(); return }
      if (existing.dataset.editorState === 'error') { reject(new Error(`failed to load ${src}`)); return }
      existing.addEventListener('load', () => { existing.dataset.editorState = 'loaded'; resolve() }, { once: true })
      existing.addEventListener('error', () => { existing.dataset.editorState = 'error'; reject(new Error(`failed to load ${src}`)) }, { once: true })
      return
    }
    const script = document.createElement('script')
    script.dataset.editorSrc = src
    script.src = src
    script.onload = () => { script.dataset.editorState = 'loaded'; resolve() }
    script.onerror = () => { script.dataset.editorState = 'error'; reject(new Error(`failed to load ${src}`)) }
    document.head.appendChild(script)
  })
}

// ---------- markdown preview (safe, dependency-free) ----------
// A compact GFM-flavored renderer for the preview mode. Every source byte is
// HTML-escaped BEFORE tokenization and no raw HTML ever passes through, so a
// document cannot inject markup. Supports: headings, fenced code blocks, GFM
// tables, blockquotes, ordered/unordered lists, horizontal rules, paragraphs
// (single line breaks render as <br>, the common convention for Chinese
// docs), and inline code/bold/italic/strikethrough/links/images.
function isMarkdown(path: string): boolean {
  const base = baseName(path).toLowerCase()
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return base === 'readme' || base === 'readme.md'
  return base.slice(dot + 1) === 'md' || base.slice(dot + 1) === 'markdown'
}
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv'])
function extOf(path: string): string {
  const base = baseName(path).toLowerCase()
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1) : ''
}
function isImage(path: string): boolean { return IMAGE_EXTS.has(extOf(path)) }
function isVideo(path: string): boolean { return VIDEO_EXTS.has(extOf(path)) }
/** Images and videos are previewed inline (raw bytes streamed by fs-tree). */
function isMedia(path: string): boolean { return isImage(path) || isVideo(path) }
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
/** Only benign URL schemes may reach an href/src; everything else becomes "#". */
function safeHref(url: string): string {
  const u = url.trim()
  return /^(?:javascript|data|vbscript)\s*:/i.test(u) ? '#' : u
}
/**
 * Render inline tokens (code, links, images, bold, italic, strikethrough)
 * over already-escaped text. Code spans are set aside first so later passes
 * never touch their content.
 */
function renderInline(text: string): string {
  const codes: string[] = []
  let out = escapeHtml(text).replace(/(`+)([\s\S]*?)\1/g, (_w, _ticks: string, body: string) => {
    codes.push(body)
    return `\u0000${codes.length - 1}\u0000`
  })
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_w, alt: string, url: string) => `<img alt="${alt}" src="${safeHref(url)}">`)
  out = out.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_w, label: string, url: string) => `<a href="${safeHref(url)}">${label}</a>`)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return out.replace(/\u0000(\d+)\u0000/g, (_w, id: string) => `<code>${codes[Number(id)] ?? ''}</code>`)
}
/** Split one table row into cells (leading/trailing pipes stripped). */
function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return t.split('|').map(c => c.trim())
}
/** A GFM delimiter row: `|---|---|` (dashes + pipes, optionally colons). */
function isDelimiterRow(line: string | undefined): boolean {
  if (line === undefined) return false
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return t !== '' && /^[\s:|-]+$/.test(t) && t.includes('-') && t.includes('|')
}
/**
 * Render a markdown document to safe HTML. Block grammar: fenced code, GFM
 * tables, ATX headings, blockquotes, lists, hr, paragraphs.
 */
export function renderMarkdown(source: string): string {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { i++; continue }
    // Fenced code block (optional language tag after the marker).
    const fence = /^(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      const marker = fence[1].charAt(0)
      const close = new RegExp(`^${marker === '`' ? '`' : '~'}{3,}\\s*$`)
      const buf: string[] = []
      i++
      while (i < lines.length && !close.test(lines[i])) { buf.push(lines[i]); i++ }
      i++
      blocks.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }
    // GFM table (header + delimiter + at least one body row).
    if (isDelimiterRow(lines[i + 1])) {
      const header = splitRow(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]))
        i++
      }
      const head = `<thead><tr>${header.map(c => `<th>${renderInline(c)}</th>`).join('')}</tr></thead>`
      const body = rows.length > 0
        ? `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
        : ''
      blocks.push(`<table>${head}${body}</table>`)
      continue
    }
    // ATX heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      i++
      continue
    }
    // Horizontal rule.
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push('<hr>')
      i++
      continue
    }
    // Blockquote: consecutive `> ` lines.
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      blocks.push(`<blockquote>${renderInline(buf.join('<br>'))}</blockquote>`)
      continue
    }
    // Unordered list (one level).
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>`)
        i++
      }
      blocks.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    // Ordered list (one level).
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, ''))}</li>`)
        i++
      }
      blocks.push(`<ol>${items.join('')}</ol>`)
      continue
    }
    // Paragraph: accumulate until a blank line or a block-start line.
    const buf: string[] = []
    while (i < lines.length
			&& lines[i].trim() !== ''
			&& !/^(?:#{1,6}\s|>|[-*+]\s|\d+[.)]\s|`{3,}|~{3,})/.test(lines[i])
			&& !isDelimiterRow(lines[i + 1])
			&& !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
      buf.push(lines[i])
      i++
    }
    if (buf.length > 0) blocks.push(`<p>${renderInline(buf.join('<br>'))}</p>`)
    else i++
  }
  return blocks.join('\n')
}

// ---------- wire types (the /fs-tree channel contract, shared with dsh-fs-tree) ----------
interface RpcError { code: string; message: string }
type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }
type Call = (endpoint: string, payload?: Record<string, unknown>) => Promise<RpcResult<unknown>>
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

// ---------- the shared `fsTree` service face (provided by dsh-fs-tree) ----------
interface SelectionStore {
  getSnapshot(): string | null
  subscribe(fn: () => void): () => void
  select(next: string | null): void
}
interface FsTreeService {
  call: Call
  openPath: (path: string) => Promise<unknown>
  reveal: (path: string) => void
  selectionStore: SelectionStore
  openFile: (path: string) => void
}

// ---------- the optional `cLang` service face (provided by dsh-c-lang) ----------
interface CLangService {
  jumpTargets(path: string, input: { text: string }): Promise<unknown>
  invalidate(path: string): void
  resolve(path: string, input: { offset: number; line: number; col: number; text: string }): Promise<{ path: string; line: number } | null>
  build(path: string): Promise<{ ok: true; value: { output: string } } | { ok: false; error?: { code: string; message: string } }>
}

// ---------- the vendored CodeMirror 6 surface ----------
interface CM6Editor {
  getValue(): string
  setValue(value: string): void
  scrollTo(line: number): void
  focus(): void
  destroy(): void
  setJumpRanges?(ranges: unknown): void
}
interface CM6Options {
  value: string
  filename: string
  onChange: () => void
  onSave: () => void
  onCtrlClick: (line: number, col: number, offset: number) => void
}
interface CM6Api {
  create(host: HTMLElement, options: CM6Options): Promise<CM6Editor>
}

// NOTE: web-tree-sitter's indices are UTF-16 code units (the wasm glue
// writes UTF-16), so jumpTargets ranges are already in CodeMirror's
// coordinate space — no conversion. (No byte-map helpers here.)

// ---------- editor component (chain entry: fsTree.fileView) ----------
interface FileEditorProps {
  path: string
  onDirtyChange?: (path: string, dirty: boolean) => void
  fsTree: FsTreeService
  getCLang: () => CLangService | undefined
  t: (key: string) => string
  onTabMenu?: (e: React.MouseEvent) => void
}
function FileEditor(props: FileEditorProps) {
  const path = props.path
  const onDirtyChange = props.onDirtyChange
  const fsTree = props.fsTree
  const getCLang = props.getCLang
  const T = typeof props.t === 'function' ? props.t : (k: string) => k

  const [doc, setDoc] = React.useState<{ status: 'loading' | 'ready' | 'error'; text: string; error: RpcError | null }>({ status: 'loading', text: '', error: null })
  const [dirty, setDirty] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<{ kind: 'saving' | 'saved' | 'error'; text: string } | null>(null)
  const [buildState, setBuildState] = React.useState<{ status: 'idle' | 'running' | 'done' | 'error'; output: string; error: string | null }>({ status: 'idle', output: '', error: null })
  // Markdown files open in the rendered PREVIEW by default; the toolbar
  // toggle switches back to the source editor.
  const [preview, setPreview] = React.useState(isMarkdown(path))
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const editorRef = React.useRef<CM6Editor | null>(null) // {getValue,setValue,scrollTo,focus,destroy}
  const savedTextRef = React.useRef('')
  // The current document text: the editor's live content while mounted,
  // otherwise the last loaded text. Preview renders from this, and toggling
  // back to edit remounts CodeMirror with it, so unsaved edits survive.
  const textRef = React.useRef('')

  // Report dirty state upward so the tab strip can show a dot.
  React.useEffect(() => {
    if (typeof onDirtyChange === 'function') onDirtyChange(path, dirty)
  }, [dirty, path])

  // Load the document when the selected file changes.
  React.useEffect(() => {
    let alive = true
    setDoc({ status: 'loading', text: '', error: null })
    setDirty(false)
    setSaveStatus(null)
    setBuildState({ status: 'idle', output: '', error: null })
    setPreview(isMarkdown(path))
    if (isMedia(path)) {
      // Media files never go through the text read: the raw route
      // streams them straight into the <img>/<video> preview.
      setDoc({ status: 'ready', text: '', error: null })
      return
    }
    fsTree.call('read', { path }).then((r) => {
      if (!alive) return
      if (!r || !r.ok) {
        setDoc({ status: 'error', text: '', error: r && r.error ? r.error : { code: 'unknown', message: String(r) } })
        return
      }
      const value = r.value as ReadValue
      if (value.binary === true) {
        setDoc({ status: 'error', text: '', error: { code: 'binary', message: T('editor.binary') } })
        return
      }
      textRef.current = typeof value.text === 'string' ? value.text : ''
      setDoc({ status: 'ready', text: textRef.current, error: null })
    }).catch((e) => {
      if (!alive) return
      setDoc({ status: 'error', text: '', error: { code: 'transport', message: String(e && e.message ? e.message : e) } })
    })
    return () => { alive = false }
  }, [path, fsTree, T])

  // (Re)create the CodeMirror instance when the document changes (and when
  // toggling out of preview; the instance is destroyed while previewing).
  React.useEffect(() => {
    if (doc.status !== 'ready' || preview || isMedia(path)) return
    let alive = true
    let instance: CM6Editor | null = null
    let disposed = false
    const mount = () => {
      if (!alive || disposed || !hostRef.current) return
      window.CM6?.create(hostRef.current, {
        value: textRef.current,
        filename: path,
        onChange: () => {
          if (!alive) return
          textRef.current = instance ? instance.getValue() : textRef.current
          setDirty(true)
          if (ctrlRef.current) scheduleJumpRanges()
        },
        onSave: () => { if (alive) doSave(instance) },
        onCtrlClick: (line, col, offset) => { if (alive) doJump(instance, line, col, offset) },
      }).then((ed) => {
        if (!alive || disposed) { ed.destroy(); return }
        instance = ed
        editorRef.current = ed
        textRef.current = doc.text
        savedTextRef.current = doc.text
      })
    }
    loadScript('/file-editor-assets/cm6.bundle.js').then(mount).catch((e) => {
      if (alive) setDoc({ status: 'error', text: '', error: { code: 'asset', message: String(e && e.message ? e.message : e) } })
    })
    return () => {
      alive = false
      disposed = true
      if (instance) { instance.destroy(); instance = null }
      editorRef.current = null
      if (hostRef.current) hostRef.current.textContent = ''
    }
  }, [path, doc.text, doc.status, preview])

  // VS Code-style Ctrl affordance: while Ctrl is held, ask cLang for
  // jumpable ranges and underline them (pointer cursor on hover).
  // The modifier state is synced from ANY key/mouse event via
  // `e.ctrlKey`/`e.metaKey` (not a specific key), so no keyboard
  // layout or IME can swallow the gesture; a window blur always clears.
  const ctrlRef = React.useRef(false)
  const jumpTimer = React.useRef<number | null>(null)

  const clearJumpRanges = React.useCallback(() => {
    const instance = editorRef.current
    if (instance && typeof instance.setJumpRanges === 'function') {
      instance.setJumpRanges([])
    } else if (instance && typeof instance.setJumpRanges !== 'function') {
      console.warn('[dsh-file-editor] stale CodeMirror bundle: no setJumpRanges — hard-refresh the page (Ctrl+Shift+R) to load the rebuilt asset.')
    }
  }, [])

  const requestJumpRanges = React.useCallback(() => {
    const cLang = getCLang()
    const instance = editorRef.current
    if (!ctrlRef.current || !cLang || typeof cLang.jumpTargets !== 'function' || !instance) {
      clearJumpRanges()
      return
    }
    const text = instance.getValue()
    cLang.jumpTargets(path, { text }).then((ranges) => {
      if (!ctrlRef.current) return
      if (typeof instance.setJumpRanges === 'function') {
        // Ranges are already UTF-16 code units (web-tree-sitter
        // ABI) — pass through verbatim.
        instance.setJumpRanges(ranges)
      } else {
        console.warn('[dsh-file-editor] stale CodeMirror bundle: no setJumpRanges — hard-refresh the page (Ctrl+Shift+R) to load the rebuilt asset.')
      }
    }).catch(() => {
      clearJumpRanges()
    })
  }, [path, getCLang, clearJumpRanges])

  const scheduleJumpRanges = React.useCallback(() => {
    if (jumpTimer.current !== null) clearTimeout(jumpTimer.current)
    jumpTimer.current = setTimeout(requestJumpRanges, 120)
  }, [requestJumpRanges])

  React.useEffect(() => {
    // Any event carrying the modifier (or its absence) syncs the state;
    // mousemove covers the case where a keydown was swallowed.
    const sync = (e: Event) => {
      const ev = e as KeyboardEvent
      const down = ev.ctrlKey === true || ev.metaKey === true
      if (down === ctrlRef.current) return
      ctrlRef.current = down
      if (down) scheduleJumpRanges()
      else clearJumpRanges()
    }
    const onBlur = () => {
      if (!ctrlRef.current) return
      ctrlRef.current = false
      clearJumpRanges()
    }
    window.addEventListener('keydown', sync)
    window.addEventListener('keyup', sync)
    window.addEventListener('mousemove', sync)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', sync)
      window.removeEventListener('keyup', sync)
      window.removeEventListener('mousemove', sync)
      window.removeEventListener('blur', onBlur)
      if (jumpTimer.current !== null) clearTimeout(jumpTimer.current)
    }
  }, [scheduleJumpRanges, clearJumpRanges])

  // Save through the core write RPC. In preview mode the editor instance is
  // gone; textRef still carries the latest content (unsaved edits included).
  const doSave = React.useCallback((instance: CM6Editor | null) => {
    const text = instance ? instance.getValue() : textRef.current
    setSaveStatus({ kind: 'saving', text: T('editor.saving') })
    fsTree.call('write', { path, content: text }).then((r) => {
      if (!r || !r.ok) {
        setSaveStatus({ kind: 'error', text: `${T('editor.saveError')}${r && r.error && r.error.message ? `：${r.error.message}` : ''}` })
        return
      }
      savedTextRef.current = text
      setDirty(false)
      setSaveStatus({ kind: 'saved', text: T('editor.saved') })
      const cLang = getCLang()
      if (cLang && typeof cLang.invalidate === 'function') cLang.invalidate(path)
    }).catch((e) => {
      setSaveStatus({ kind: 'error', text: `${T('editor.saveError')}：${String(e && e.message ? e.message : e)}` })
    })
  }, [path, doc.text, fsTree, getCLang, T])

  // CTRL+click: resolve against the editor's CURRENT text (never a
  // stale disk copy), then open the target in the viewer.
  const doJump = React.useCallback((instance: CM6Editor | null, line: number, col: number, offset: number) => {
    const cLang = getCLang()
    if (!cLang || typeof cLang.resolve !== 'function') return
    const text = instance ? instance.getValue() : doc.text
    cLang.resolve(path, { offset, line, col, text }).then((target) => {
      if (!target) {
        setSaveStatus({ kind: 'saved', text: T('editor.noDef') })
        return
      }
      if (target.path === path) {
        if (instance && typeof instance.scrollTo === 'function') instance.scrollTo(target.line)
      } else if (fsTree && typeof fsTree.openFile === 'function') {
        fsTree.openFile(target.path)
      } else {
        fsTree.selectionStore.select(target.path)
      }
    }).catch((e) => {
      setSaveStatus({ kind: 'error', text: String(e && e.message ? e.message : e) })
    })
  }, [path, doc.text, getCLang, fsTree, T])

  const doBuild = React.useCallback(() => {
    const cLang = getCLang()
    if (!cLang || typeof cLang.build !== 'function') return
    setBuildState({ status: 'running', output: '', error: null })
    cLang.build(path).then((r) => {
      if (!r || !r.ok) {
        const code = r && r.error ? r.error.code : 'unknown'
        if (code === 'no-compiler') {
          setBuildState({ status: 'error', output: '', error: T('editor.noCompiler') })
          return
        }
        setBuildState({ status: 'error', output: '', error: r && r.error ? r.error.message : T('editor.buildError') })
        return
      }
      setBuildState({ status: 'done', output: r.value.output, error: null })
    }).catch((e) => {
      setBuildState({ status: 'error', output: '', error: String(e && e.message ? e.message : e) })
    })
  }, [path, getCLang, T])

  // Ctrl+S (Cmd+S) still saves while previewing: the CodeMirror instance is
  // unmounted, so the shortcut is handled at window level here.
  React.useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        doSave(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview, doSave])

  if (doc.status === 'loading') {
    return h('div', { className: 'dsh-editor-center' }, h('div', { className: 'dsh-editor-hint' }, T('editor.loading')))
  }
  if (doc.status === 'error') {
    return h('div', { className: 'dsh-editor-center' },
      h('div', { className: 'dsh-editor-hint', style: { color: 'var(--dsw-alias-state-error-primary)' } },
        `${T('editor.readError')}：${doc.error ? doc.error.message : ''}`))
  }

  const hasCLang = typeof getCLang === 'function' && getCLang() !== undefined
  const markdownFile = isMarkdown(path)
  const mediaFile = isMedia(path)
  const rawMediaUrl = `/fs-tree-raw?path=${encodeURIComponent(path)}`
  const toolbar = h('div', { key: 'toolbar', className: 'dsh-editor-toolbar' },
    dirty ? h('span', { key: 'dot', className: 'dsh-editor-dirty', title: T('editor.dirty') }) : null,
    h('span', { key: 'path', className: 'dsh-editor-path', title: path }, baseName(path)),
    mediaFile ? h('span', { key: 'kind', className: 'dsh-editor-status' }, isImage(path) ? T('editor.imageHint') : T('editor.videoHint')) : null,
    markdownFile ? h('button', {
      key: 'toggle', type: 'button', className: 'dsh-editor-btn',
      onClick: () => setPreview(p => !p),
    }, preview ? T('editor.edit') : T('editor.preview')) : null,
    mediaFile ? null : h('button', {
      key: 'save', type: 'button', className: 'dsh-editor-btn', 'data-primary': 'true',
      disabled: !dirty,
      onClick: () => doSave(editorRef.current),
    }, T('editor.save')),
    mediaFile ? null : h('button', {
      key: 'reload', type: 'button', className: 'dsh-editor-btn',
      onClick: () => {
        setDoc({ status: 'loading', text: '', error: null })
        fsTree.call('read', { path }).then((r) => {
          if (!r || !r.ok) { setDoc({ status: 'error', text: '', error: r && r.error ? r.error : { code: 'unknown', message: String(r) } }); return }
          const value = r.value as ReadValue
          if (value.binary === true) { setDoc({ status: 'error', text: '', error: { code: 'binary', message: T('editor.binary') } }); return }
          textRef.current = typeof value.text === 'string' ? value.text : ''
          setDoc({ status: 'ready', text: textRef.current, error: null })
          setDirty(false)
          setSaveStatus(null)
        }).catch(e => setDoc({ status: 'error', text: '', error: { code: 'transport', message: String(e && e.message ? e.message : e) } }))
      },
    }, T('editor.reload')),
    h('button', {
      key: 'open', type: 'button', className: 'dsh-editor-btn',
      onClick: () => { if (fsTree && typeof fsTree.openPath === 'function') fsTree.openPath(path) },
    }, T('editor.openInSystem')),
    h('button', {
      key: 'reveal', type: 'button', className: 'dsh-editor-btn',
      onClick: () => { if (fsTree && typeof fsTree.reveal === 'function') fsTree.reveal(path) },
    }, T('editor.reveal')),
    hasCLang && !mediaFile ? h('button', {
      key: 'build', type: 'button', className: 'dsh-editor-btn', 'data-primary': 'true',
      disabled: buildState.status === 'running',
      onClick: doBuild,
    }, buildState.status === 'running' ? T('editor.building') : T('editor.build')) : null,
    typeof props.onTabMenu === 'function' ? h('button', {
      key: 'tabs', type: 'button', className: 'dsh-editor-btn',
      title: T('editor.tabActions'), 'aria-label': T('editor.tabActions'),
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => props.onTabMenu?.(e),
    }, '▾') : null,
    h('span', {
      key: 'status', className: 'dsh-editor-status',
      'data-error': saveStatus && saveStatus.kind === 'error' ? 'true' : undefined,
    }, saveStatus ? saveStatus.text : ''),
  )

  const output = (buildState.status === 'done' || buildState.status === 'error' || buildState.status === 'running')
    ? h('pre', {
      key: 'output', className: 'dsh-editor-output',
      'data-error': buildState.status === 'error' ? 'true' : undefined,
    }, buildState.error || buildState.output || T('editor.buildEmpty'))
    : null

  // Media files render straight from the fs-tree raw streaming route;
  // the preview pane replaces the CodeMirror host while previewing (the
  // HTML is produced by renderMarkdown, all source HTML escaped).
  const body = mediaFile
    ? (isImage(path)
      ? h('div', { key: 'media', className: 'dsh-editor-media' }, h('img', { key: 'img', className: 'dsh-editor-media-img', src: rawMediaUrl, alt: baseName(path) }))
      : h('div', { key: 'media', className: 'dsh-editor-media' }, h('video', { key: 'video', className: 'dsh-editor-media-video', src: rawMediaUrl, controls: true })))
    : preview && markdownFile
      ? h('div', { key: 'preview', className: 'dsh-editor-preview', dangerouslySetInnerHTML: { __html: renderMarkdown(textRef.current) } })
      : h('div', { key: 'host', className: 'dsh-editor-host', ref: hostRef })

  return h('div', { className: 'dsh-editor-root', style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' } },
    toolbar,
    body,
    output,
  )
}

// ---------- plugin entry ----------
/** The client context surface this plugin reads (structural). */
interface PluginContext {
  effect(fn: () => unknown, label?: string): unknown
  locale: {
    register(ns: string, dicts: Record<string, Dict>): unknown
  }
  slots: {
    inject(name: string, fn: () => unknown): unknown
    register(opts: SlotRegisterOptions, component: unknown): () => void
  }
  get(name: string): unknown
}
interface SlotRegisterOptions {
  name: string
  locale?: string
  select?: (owner: { path: string }) => unknown
  inject?: () => Record<string, unknown>
}

export const inject = ['slots', 'locale', 'fsTree']
export function apply(ctx: PluginContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'file-editor: dictionaries')
  // Claim editable text files inside the file view's chain slot; the
  // tree's built-in viewer remains the fallback for everything else.
  ctx.slots.inject('fsTree.fileView', () => ctx.slots.register({
    name: 'fsTree.fileView',
    select: ({ path }) => (path && (isEditableText(path) || isMedia(path))) ? { path } : null,
    locale: NS,
    inject: () => ({
      fsTree: ctx.get('fsTree') as FsTreeService,
      getCLang: () => ctx.get('cLang') as CLangService | undefined,
    }),
  }, FileEditor))
}

export { isEditableText, isMarkdown, isMedia }

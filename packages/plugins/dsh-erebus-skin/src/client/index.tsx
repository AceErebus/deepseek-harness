/**
 * dsh-erebus-skin client entry: a thin vertical scale at the left edge of the
 * main workspace (the sidebar/content seam) owns the whole skin axis
 * (-1..30: the maid at -1, the liang intensity 0..30). Drag it like the
 * original slider — the thumb follows the pointer, ticks show every level,
 * and the current range name (鲨鱼娘 / 梁off / 梁high / 梁max) appears in the
 * tooltip while dragging.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import liangCss from './liang/liang.css'
import maidCss from './maid/maid.css'
import {
  clampLevel,
  labelForLevel,
  MAX_LEVEL,
  skinIndexForLevel,
  SKINS,
  sliderMin,
  type SkinDeps,
  type ThemeService,
} from './skins.ts'

const PACKAGE_ID = 'dsh-erebus-skin'
const STORAGE_KEY = 'dsh-erebus-skin.level'
const DEFAULT_LEVEL = MAX_LEVEL

// ---------------------------------------------------------------------------
// Skin manager: owns the current level, mounts exactly one skin, persists.
// ---------------------------------------------------------------------------
class SkinManager {
  private level: number
  private cleanup: (() => void) | null = null
  private readonly listeners = new Set<() => void>()

  constructor(private readonly theme: ThemeService) {
    let stored: number | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw !== null) stored = Number(raw)
    } catch {
      // Quota/private mode: keep the default.
    }
    this.level = clampLevel(stored ?? DEFAULT_LEVEL, SKINS.length)
    this.apply()
  }

  getLevel = (): number => this.level
  getSkins = (): readonly typeof SKINS[number][] => SKINS
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setLevel(raw: number): void {
    const next = clampLevel(raw, SKINS.length)
    if (next === this.level) return
    this.level = next
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // In-memory level is enough for this session.
    }
    this.apply()
    for (const listener of this.listeners) listener()
  }

  private apply(): void {
    if (this.cleanup !== null) {
      this.cleanup()
      this.cleanup = null
    }
    const index = skinIndexForLevel(this.level, SKINS.length)
    const deps: SkinDeps = { theme: this.theme }
    this.cleanup = SKINS[index].mount(this.level, deps)
  }

  dispose(): void {
    if (this.cleanup !== null) {
      this.cleanup()
      this.cleanup = null
    }
    this.listeners.clear()
  }
}

// ---------------------------------------------------------------------------
// The left-edge skin scale: a thin vertical slider over the -1..30 axis
// (the maid at -1, the liang intensity 0..30). Drag like the original range
// slider — the thumb follows the pointer, every level has a tick, and the
// current range name shows in the tooltip while dragging.
// ---------------------------------------------------------------------------
const SIDEBAR_SELECTOR = ":is([data-pane='sidebar'], [class*='sidebarCol'])"
const MAIN_PANE_SELECTOR = ":is([data-pane='conversation'], [class*='centerCol'])"
const SCALE_INSET_PX = 4

/**
 * Viewport X for the scale: the sidebar/content seam. Prefer the sidebar's
 * right edge (the left of the main workspace). Fall back to the conversation
 * pane. Chat-flow / message columns are ignored — their left edge sits
 * inside the dialog, which is what parked the bar over the conversation.
 */
export function scaleLeftPx(
  pane: { getBoundingClientRect(): { left: number } } | null,
  sidebar: { getBoundingClientRect(): { right: number } } | null,
): number {
  const sidebarRight = sidebar?.getBoundingClientRect().right
  if (sidebarRight !== undefined && sidebarRight > 0) return Math.round(sidebarRight) + SCALE_INSET_PX
  const paneLeft = pane?.getBoundingClientRect().left
  if (paneLeft !== undefined && paneLeft > 0) return Math.round(paneLeft) + SCALE_INSET_PX
  return SCALE_INSET_PX
}

function SkinScale({ manager }: { manager: SkinManager }) {
  const level = useSyncExternalStore(manager.subscribe, manager.getLevel)
  const min = sliderMin(SKINS.length)
  const max = MAX_LEVEL
  const span = max - min
  const [left, setLeft] = useState(SCALE_INSET_PX)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  // Pointer Y -> level: the top of the track is the max, the bottom the min.
  const levelAtClientY = (clientY: number): number => {
    const track = trackRef.current
    if (track === null) return level
    const rect = track.getBoundingClientRect()
    if (rect.height <= 0) return level
    const ratio = 1 - (clientY - rect.top) / rect.height
    return clampLevel(min + ratio * span, SKINS.length)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    manager.setLevel(levelAtClientY(e.clientY))
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging) return
    manager.setLevel(levelAtClientY(e.clientY))
  }

  const onPointerUp = (): void => {
    setDragging(false)
  }

  const onPointerCancel = (): void => {
    setDragging(false)
  }

  // Park the scale at the left edge of the MAIN WORKSPACE (the conversation
  // pane / center column), which is the sidebar seam — not the chat-flow
  // column, whose left edge sits in the middle of the dialog. The layout may
  // not be ready at mount, so re-measure on a short retry loop and keep
  // following sidebar/column changes with a ResizeObserver.
  useEffect(() => {
    let raf = 0
    let tries = 0
    const watched = new Set<Element>()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    const watch = (node: Element | null): void => {
      if (node === null || observer === null || watched.has(node)) return
      watched.add(node)
      observer.observe(node)
    }
    function measure(): void {
      const pane = document.querySelector<HTMLElement>(MAIN_PANE_SELECTOR)
      const sidebar = document.querySelector<HTMLElement>(SIDEBAR_SELECTOR)
      watch(pane)
      watch(sidebar)
      const next = scaleLeftPx(pane, sidebar)
      setLeft(prev => (prev === next ? prev : next))
    }
    measure()
    const retry = (): void => {
      if (tries++ >= 40) return
      measure()
      raf = requestAnimationFrame(retry)
    }
    raf = requestAnimationFrame(retry)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [])

  const ratio = (max - level) / span // 0 at the top
  const ticks: { value: number; major: boolean }[] = []
  for (let value = min; value <= max; value += 1) {
    ticks.push({ value, major: value === -1 || value === 0 || value === 10 || value === 20 || value === 30 })
  }

  // Portal to document.body: inside the composer slot a transformed ancestor
  // (the maid skin docks/animates the composer) would otherwise become the
  // containing block and drag the fixed bar around.
  return createPortal(
    <div
      className="uni-skin-scale"
      data-plugin={PACKAGE_ID}
      data-dragging={dragging ? 'true' : undefined}
      style={{ left }}
      title={labelForLevel(level)}
      aria-label={`皮肤刻度 · ${labelForLevel(level)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {dragging && (
        <span className="uni-skin-scale__tip" style={{ top: `${ratio * 100}%` }}>
          {labelForLevel(level)}
        </span>
      )}
      <div className="uni-skin-scale__track" ref={trackRef}>
        {ticks.map(tick => (
          <i
            key={tick.value}
            className={`uni-skin-scale__tick${tick.major ? ' uni-skin-scale__tick--major' : ''}`}
            style={{ top: `${((max - tick.value) / span) * 100}%` }}
          />
        ))}
        <span className="uni-skin-scale__thumb" style={{ top: `${ratio * 100}%` }} />
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Plugin entry.
// ---------------------------------------------------------------------------
export const inject = ['slots', 'theme']

interface ClientContext {
  effect(fn: () => unknown, label?: string): unknown
  get(name: string): unknown
  slots: {
    inject(name: string, fn: () => unknown): unknown
    register(opts: {
      name: string
      id?: string
      order?: number
      inject?: (sessionId: string) => Record<string, unknown>
    }, component: unknown): () => void
  }
}

export function apply(ctx: ClientContext): void {
  const style = document.createElement('style')
  style.dataset.plugin = PACKAGE_ID
  // Both skins' styles are scoped by their own body attributes / classes, so
  // they can stay injected side by side; the wheel gets its own compact
  // styles below. The file tree and editor panels get a solid surface: the
  // liang backdrop stays translucent (character visible) while these working
  // panels keep readable text.
  style.textContent = `${liangCss}\n${maidCss}\n${SCALE_CSS}\n`
    + 'body[data-liang-skin="on"] .dsh-fs-tree-explorer,\n'
    + 'body[data-liang-skin="on"] [class*="dsh-editor"] {\n'
    + '  background: var(--liang-layer-3) !important;\n}\n'
  document.head.append(style)
  ctx.effect(() => () => style.remove(), 'dsh-erebus-skin: scoped styles')

  const theme = ctx.get('theme') as ThemeService
  const manager = new SkinManager(theme)
  ctx.effect(() => () => manager.dispose(), 'dsh-erebus-skin: skin manager')

  // The scale renders as a fixed left-edge bar; the slot merely mounts it.
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'erebus-skin-scale',
    order: 10,
    inject: () => ({ manager }),
  }, SkinScale))
}

const SCALE_CSS = `
.uni-skin-scale {
  position: fixed;
  top: 50%;
  z-index: 40;
  width: 14px;
  height: 260px;
  padding: 6px 0;
  border: 1px solid var(--dsw-alias-border-l2, rgb(0 0 0 / 12%));
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-bg-elevated, #fff) 88%, transparent);
  box-shadow: var(--dsw-shadow-lv2, 0 8px 24px rgb(0 0 0 / 12%));
  cursor: ns-resize;
  user-select: none;
  touch-action: none;
  transform: translateY(-50%);
  backdrop-filter: blur(6px);
}
.uni-skin-scale[data-dragging="true"] {
  border-color: var(--dsw-alias-state-business-primary, #4176e6);
}
.uni-skin-scale__track {
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.uni-skin-scale__tick {
  position: absolute;
  left: 2px;
  width: 4px;
  height: 1px;
  background: var(--dsw-alias-label-tertiary, #999);
  opacity: 0.55;
  transform: translateY(-50%);
}
.uni-skin-scale__tick--major {
  left: 2px;
  width: 8px;
  opacity: 0.9;
}
.uni-skin-scale__thumb {
  position: absolute;
  left: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary, #4176e6);
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-elevated, #fff);
  transform: translate(-50%, -50%);
}
.uni-skin-scale__tip {
  position: absolute;
  left: 22px;
  z-index: 1;
  min-width: max-content;
  padding: 4px 8px;
  border: 1px solid var(--dsw-alias-border-l2, rgb(0 0 0 / 12%));
  border-radius: 7px;
  color: var(--dsw-alias-label-primary, #222);
  background: var(--dsw-alias-bg-elevated, #fff);
  box-shadow: 0 5px 16px rgb(0 0 0 / 16%);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  white-space: nowrap;
  pointer-events: none;
  transform: translateY(-50%);
}
`

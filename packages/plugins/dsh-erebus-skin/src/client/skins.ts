/**
 * The erebus skin registry — the whole "add a skin" story.
 *
 * The wheel is one named axis: the levels 0..30 drive the skins, and the
 * wheel exposes them as named stops (see SKIN_STOPS below). Level 0 is the
 * maid skin (鲨鱼娘); levels 1..30 are the liang intensity (梁off / 梁high /
 * 梁max). Adding a skin therefore only means appending one entry to SKINS
 * (plus its assets) and a stop in SKIN_STOPS — nothing else changes.
 */
/** The native light/dark theme service (provided by @deepseek-ai/dsh-client-ui-theme). */
export interface ThemeService {
  getTheme(): { preference: string }
  setTheme(id: 'light' | 'dark' | 'system'): void
}

export const MAX_LEVEL = 30

export interface SkinDeps {
  theme: ThemeService
}

export interface SkinDef {
  /** Stable id (also the body attribute namespace when the skin uses one). */
  id: string
  /** Label shown on the wheel. */
  label: string
  /**
   * Activate this skin at `level`. Returns the disposer that fully restores
   * every DOM/CSS write; the manager calls it before mounting the next skin.
   */
  mount(level: number, deps: SkinDeps): () => void
}

/** One wheel position: the displayed name and the level it maps to. */
export interface SkinStop {
  label: string
  level: number
}

// ---------------------------------------------------------------------------
// The skin table. Skin 0 owns levels 0..30 (the liang intensity), skin 1 owns
// the negative ticks (-1, -2, … — one per extra skin, in order). Future skins
// append here and get their own negative tick automatically.
// ---------------------------------------------------------------------------
import { mountLiangSkin } from './liang-skin.ts'
import { mountMaidSkin } from './maid-skin.ts'

export const SKINS: readonly SkinDef[] = [
  { id: 'liang', label: '梁', mount: mountLiangSkin },
  { id: 'maid-atelier', label: '鲨鱼娘', mount: mountMaidSkin },
]

/**
 * Display labels per level range. ALL 30 liang levels keep working — the
 * ranges only name what the scale shows while dragging through them.
 * Edit the names/boundaries here to re-tune.
 */
export const SKIN_RANGES: readonly { min: number; max: number; label: string }[] = [
  { min: 0, max: 10, label: '梁off' },
  { min: 11, max: 20, label: '梁high' },
  { min: 21, max: 30, label: '梁max' },
]

/** The scale label for a level: the maid on the negative side, else the range name. */
export function labelForLevel(level: number): string {
  if (level < 0) return '鲨鱼娘'
  const safe = clampLevel(level, SKINS.length)
  for (const range of SKIN_RANGES) {
    if (safe >= range.min && safe <= range.max) return range.label
  }
  return '梁'
}

// ---------------------------------------------------------------------------
// Axis math — pure functions over the skin table.
// ---------------------------------------------------------------------------

/** Left edge of the scale: one negative tick per extra skin. */
export function sliderMin(skinCount: number): number {
  return -(skinCount - 1)
}

/** Which skin owns a level. Levels 0..30 → skin 0; -1 → skin 1; -2 → skin 2; … */
export function skinIndexForLevel(level: number, skinCount: number): number {
  if (level >= 0 || skinCount <= 1) return 0
  const index = -level
  return Math.min(skinCount - 1, Math.max(1, index))
}

/** Clamp a raw level into the current axis span. */
export function clampLevel(raw: number, skinCount: number): number {
  if (!Number.isFinite(raw)) return 0
  return Math.min(MAX_LEVEL, Math.max(sliderMin(skinCount), Math.round(raw)))
}

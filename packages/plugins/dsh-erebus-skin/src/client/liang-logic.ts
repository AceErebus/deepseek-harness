/**
 * Liang skin palette math, ported from dsh-liang-skin-main (src/client/logic.ts)
 * with the reasoning-effort machinery removed: the unified axis level 0..30
 * maps 1:1 to the original 0..240 preview frame.
 */
import { MAX_LEVEL } from './skins.ts'

export const PREVIEW_MAX_FRAME = 240

export interface Palette {
  level: number
  stage: number
  strength: number
  page: string
  base: string
  layer1: string
  layer2: string
  layer3: string
  sidebar: string
  ink: string
  secondary: string
  tertiary: string
  border: string
  accent: string
  accentHover: string
  hover: string
  portraitOpacity: string
}

type Rgb = readonly [number, number, number]

interface PaletteStop {
  at: number
  page: Rgb
  surface: Rgb
  surface2: Rgb
  ink: Rgb
  secondary: Rgb
  accent: Rgb
  portraitOpacity: number
}

// The original calibrator's six stage anchors: pale neutral at the low end,
// progressively smoked surfaces, then charcoal and antique gold.
const STOPS: readonly PaletteStop[] = [
  { at: 0, page: [232, 233, 229], surface: [248, 248, 245], surface2: [238, 239, 235],
    ink: [23, 24, 22], secondary: [112, 116, 111], accent: [181, 43, 36], portraitOpacity: 0.92 },
  { at: 6, page: [211, 211, 206], surface: [239, 239, 234], surface2: [224, 224, 218],
    ink: [26, 26, 24], secondary: [101, 101, 96], accent: [181, 43, 36], portraitOpacity: 0.93 },
  { at: 12, page: [171, 168, 162], surface: [211, 208, 201], surface2: [190, 186, 179],
    ink: [27, 26, 24], secondary: [83, 79, 74], accent: [166, 54, 42], portraitOpacity: 0.94 },
  { at: 18, page: [117, 112, 106], surface: [154, 148, 140], surface2: [128, 122, 115],
    ink: [24, 22, 20], secondary: [65, 61, 56], accent: [154, 56, 42], portraitOpacity: 0.94 },
  { at: 24, page: [43, 39, 37], surface: [48, 43, 40], surface2: [58, 51, 46],
    ink: [244, 241, 232], secondary: [184, 180, 169], accent: [181, 92, 54], portraitOpacity: 0.94 },
  { at: 30, page: [17, 17, 17], surface: [30, 27, 25], surface2: [41, 35, 30],
    ink: [244, 241, 232], secondary: [184, 180, 169], accent: [193, 154, 73], portraitOpacity: 0.94 },
]

/** The slider level (0..30) mapped onto the original 0..240 frame scale. */
export function frameForLevel(level: number): number {
  const safe = Number.isFinite(level) ? Math.min(MAX_LEVEL, Math.max(0, level)) : 0
  return Math.round((safe / MAX_LEVEL) * PREVIEW_MAX_FRAME)
}

export function clampFrame(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(PREVIEW_MAX_FRAME, Math.max(0, Math.round(value)))
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [
    Math.round(lerp(a[0], b[0], amount)),
    Math.round(lerp(a[1], b[1], amount)),
    Math.round(lerp(a[2], b[2], amount)),
  ]
}

function rgb(value: Rgb, alpha = 1): string {
  return alpha === 1
    ? `rgb(${value[0]} ${value[1]} ${value[2]})`
    : `rgb(${value[0]} ${value[1]} ${value[2]} / ${alpha})`
}

export function paletteForFrame(rawFrame: number): Palette {
  const frame = clampFrame(rawFrame)
  const level = (frame / PREVIEW_MAX_FRAME) * MAX_LEVEL
  const portraitStage = Math.min(5, Math.floor(level / 6))
  const portraitFrom = STOPS[portraitStage]
  const portraitTo = STOPS[Math.min(5, portraitStage + 1)]
  const portraitAmount = portraitFrom === portraitTo
    ? 0
    : (level - portraitFrom.at) / (portraitTo.at - portraitFrom.at)

  // The UI itself is intentionally binary: levels 0-23 keep the native light
  // shell; entering the 梁神/梁祖 region at level 24 switches black/gold.
  const dark = level >= 24
  const stage = dark ? 5 : 0
  const ui = dark ? STOPS[5] : STOPS[0]
  const page = ui.page
  const surface = ui.surface
  const surface2 = ui.surface2
  const sidebar = mix(page, surface2, 0.25)
  const ink = ui.ink
  const secondary = ui.secondary
  // Keep the native blue in the light shell; the antique gold only becomes
  // the product accent once the dark region begins.
  const accent: Rgb = dark ? [193, 154, 73] : [65, 118, 230]
  const accentHover = mix(accent, ink, 0.13)

  return {
    level,
    stage,
    strength: level / MAX_LEVEL,
    page: rgb(page),
    // The liang skin's identity is the backdrop showing through the surfaces:
    // keep the original translucency so the character/video stay visible. The
    // file-tree/editor panels get their own solid background via a targeted
    // rule (see index.tsx), so text over them stays readable.
    base: rgb(page, dark ? 0.42 : 0.28),
    layer1: rgb(surface, 0.94),
    layer2: rgb(surface2, 0.96),
    layer3: rgb(surface2, 0.99),
    sidebar: rgb(sidebar, 0.96),
    ink: rgb(ink),
    secondary: rgb(secondary),
    tertiary: rgb(mix(secondary, page, 0.28)),
    border: rgb(ink, dark ? 0.15 : 0.12),
    accent: rgb(accent),
    accentHover: rgb(accentHover),
    hover: rgb(ink, dark ? 0.09 : 0.07),
    portraitOpacity: String(lerp(
      portraitFrom.portraitOpacity,
      portraitTo.portraitOpacity,
      portraitAmount,
    )),
  }
}

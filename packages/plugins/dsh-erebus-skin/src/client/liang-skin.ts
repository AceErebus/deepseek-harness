/**
 * Liang skin mount, ported from dsh-liang-skin-main (SkinPresenter): the
 * intensity backdrop (scrubbed evolution video + portrait sequence + poster)
 * and the --liang-* palette on <body>. The unified manager drives it with the
 * axis level 0..30; the disposer restores every write, including the native
 * light/dark theme preference.
 */
import type { SkinDeps } from './skins.ts'
import { frameForLevel, paletteForFrame, PREVIEW_MAX_FRAME } from './liang-logic.ts'

const PACKAGE_ID = 'dsh-erebus-skin'
const ASSET_PREFIX = `/plugins/${PACKAGE_ID}/assets/`
const VIDEO_DURATION = 8.033

const PORTRAIT_ANCHORS = [
  { level: 0, file: 'stage-00.png' },
  { level: 1, file: 'level-01.png' },
  { level: 3, file: 'level-03.png' },
  { level: 4, file: 'level-04.png' },
  { level: 6, file: 'stage-06.png' },
  { level: 7, file: 'level-07.png' },
  { level: 9, file: 'level-09.png' },
  { level: 10, file: 'level-10.png' },
  { level: 12, file: 'stage-12.png' },
  { level: 13, file: 'level-13.png' },
  { level: 14, file: 'level-14.png' },
  { level: 15, file: 'bridge-15.png' },
  { level: 16, file: 'level-16.png' },
  { level: 17, file: 'level-17.png' },
  { level: 18, file: 'stage-18.png' },
  { level: 19, file: 'level-19.png' },
  { level: 21, file: 'level-21.png' },
  { level: 22, file: 'level-22.png' },
  { level: 24, file: 'stage-24.png' },
  { level: 25, file: 'level-25.png' },
  { level: 27, file: 'bridge-27.png' },
  { level: 28, file: 'level-28.png' },
  { level: 29, file: 'level-29.png' },
  { level: 30, file: 'stage-30.png' },
] as const

const CSS_VARIABLES = [
  '--liang-strength',
  '--liang-page',
  '--liang-bg-base',
  '--liang-layer-1',
  '--liang-layer-2',
  '--liang-layer-3',
  '--liang-sidebar',
  '--liang-ink',
  '--liang-secondary',
  '--liang-tertiary',
  '--liang-border',
  '--liang-accent',
  '--liang-accent-hover',
  '--liang-hover',
  '--liang-portrait-opacity',
] as const

export function mountLiangSkin(level: number, deps: SkinDeps): () => void {
  const body = document.body
  const frame = frameForLevel(level)
  const palette = paletteForFrame(frame)
  const previousTheme = deps.theme.getTheme().preference
  const targetTheme = palette.stage === 5 ? 'dark' : 'light'
  let disposed = false

  // ---- backdrop layers -----------------------------------------------------
  const root = document.createElement('div')
  root.className = 'liang-skin-backdrop'
  root.dataset.plugin = PACKAGE_ID
  root.dataset.media = 'sequence'
  root.setAttribute('aria-hidden', 'true')

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  const webm = document.createElement('source')
  webm.src = `${ASSET_PREFIX}liang-evolution.webm`
  webm.type = 'video/webm'
  const mp4 = document.createElement('source')
  mp4.src = `${ASSET_PREFIX}liang-evolution.mp4`
  mp4.type = 'video/mp4'
  video.append(webm, mp4)

  const poster = document.createElement('img')
  poster.className = 'liang-skin-poster'
  poster.src = `${ASSET_PREFIX}liang-poster.png`
  poster.alt = ''

  const portrait = document.createElement('img')
  portrait.className = 'liang-skin-sequence-frame'
  portrait.alt = ''
  portrait.draggable = false

  const preloads = PORTRAIT_ANCHORS.map(({ file }) => {
    const image = new Image()
    image.src = `${ASSET_PREFIX}portrait-source-v2/${file}`
    return image
  })

  root.append(video, portrait, poster)
  body.prepend(root)

  const seek = (): void => {
    if (video.readyState < 1 || video.duration === 0) return
    const duration = Number.isFinite(video.duration) ? video.duration : VIDEO_DURATION
    const target = Math.min(Math.max(0, duration - 0.001), (frame / PREVIEW_MAX_FRAME) * duration)
    if (Math.abs(video.currentTime - target) > 0.025) video.currentTime = target
  }

  const handleMetadata = (): void => seek()
  const handleVideoError = (): void => { if (!disposed) root.dataset.media = 'poster' }
  const handleSequenceError = (): void => { if (!disposed) root.dataset.media = 'video' }
  const handlePosterError = (): void => { if (!disposed) root.dataset.media = 'color' }
  video.addEventListener('loadedmetadata', handleMetadata)
  video.addEventListener('error', handleVideoError)
  portrait.addEventListener('error', handleSequenceError)
  poster.addEventListener('error', handlePosterError)
  video.load()

  // ---- palette + native theme ---------------------------------------------
  body.dataset.liangSkin = 'on'
  body.dataset.liangStage = String(palette.stage)
  body.style.setProperty('--liang-strength', String(palette.strength))
  body.style.setProperty('--liang-page', palette.page)
  body.style.setProperty('--liang-bg-base', palette.base)
  body.style.setProperty('--liang-layer-1', palette.layer1)
  body.style.setProperty('--liang-layer-2', palette.layer2)
  body.style.setProperty('--liang-layer-3', palette.layer3)
  body.style.setProperty('--liang-sidebar', palette.sidebar)
  body.style.setProperty('--liang-ink', palette.ink)
  body.style.setProperty('--liang-secondary', palette.secondary)
  body.style.setProperty('--liang-tertiary', palette.tertiary)
  body.style.setProperty('--liang-border', palette.border)
  body.style.setProperty('--liang-accent', palette.accent)
  body.style.setProperty('--liang-accent-hover', palette.accentHover)
  body.style.setProperty('--liang-hover', palette.hover)
  body.style.setProperty('--liang-portrait-opacity', palette.portraitOpacity)

  // The portrait picks the nearest anchor by level.
  let portraitIndex = 0
  let portraitDistance = Infinity
  PORTRAIT_ANCHORS.forEach((anchor, index) => {
    const distance = Math.abs(anchor.level - level)
    if (distance < portraitDistance) {
      portraitIndex = index
      portraitDistance = distance
    }
  })
  portrait.src = `${ASSET_PREFIX}portrait-source-v2/${PORTRAIT_ANCHORS[portraitIndex].file}`

  if (deps.theme.getTheme().preference !== targetTheme) {
    deps.theme.setTheme(targetTheme)
  }

  return () => {
    if (disposed) return
    disposed = true
    video.pause()
    video.removeEventListener('loadedmetadata', handleMetadata)
    video.removeEventListener('error', handleVideoError)
    portrait.removeEventListener('error', handleSequenceError)
    poster.removeEventListener('error', handlePosterError)
    for (const image of preloads) image.src = ''
    root.remove()
    delete body.dataset.liangSkin
    delete body.dataset.liangStage
    for (const name of CSS_VARIABLES) body.style.removeProperty(name)
    if (deps.theme.getTheme().preference !== previousTheme) {
      deps.theme.setTheme(previousTheme as 'light' | 'dark' | 'system')
    }
  }
}

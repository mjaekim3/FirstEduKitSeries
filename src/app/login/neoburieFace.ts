import { createCarePainter } from "./neoburieCare"

// Coordinates belong to the original 543 × 724 sprite frame, before mirroring.
export type StalkEyeGlint = {
  cx: number
  cy: number
  horizontalRadius: number
  verticalRadius: number
  alpha: number
  color: "#ffffff"
  outline: false
  clip: StalkEyeRegion
}

export type StalkEyeRegion = {
  cx: number
  cy: number
  rx: number
  ry: number
}

export type StalkPupilCover = {
  cx: number
  cy: number
  rx: number
  ry: number
  color: "#0b1511"
  clip: StalkEyeRegion
}

export const STALK_EYES: readonly StalkEyeRegion[] = [
  { cx: 420, cy: 487, rx: 20, ry: 21 },
  { cx: 486, cy: 486, rx: 17, ry: 20 },
]

export const STALK_FACE_SPARKLE_MASKS: readonly StalkEyeRegion[] = [
  { cx: 379, cy: 487, rx: 20, ry: 31 },
  { cx: 529, cy: 486, rx: 14, ry: 30 },
]
export const STALK_SHEET_PATH = "/neoburie-stalk-v15-clean.png"
export const HELD_SHEET_PATH = "/neoburie-held-v2-4f-clean.png"
export const DIZZY_SHEET_PATH = "/neoburie-dizzy-v5-xeyes-8f-clean.png"
export const HELD_FRAME_COUNT = 4
export const DIZZY_FRAME_COUNT = 8

export function heldFrameAt(time: number) {
  return Math.floor(Math.max(0, time) / 135) % HELD_FRAME_COUNT
}

export function dizzyFrameAt(time: number) {
  return Math.floor(Math.max(0, time) / 150) % DIZZY_FRAME_COUNT
}

export function stalkFrameAt(phase: number) {
  return Math.min(5, Math.floor(Math.max(0, phase) * 6))
}

export function swatFrameAt(phase: number) {
  if (phase < .12) return 0
  if (phase < .24) return 1
  if (phase < .38) return 2
  if (phase < .5) return 5
  if (phase < .6) return 4
  if (phase < .7) return 5
  if (phase < .8) return 4
  if (phase < .89) return 2
  if (phase < .97) return 1
  return 0
}

export function mapStalkEyePixel(eye: StalkEyeRegion, x: number, y: number, focus: number, lookX: number, lookY: number) {
  const dx = x - eye.cx
  const dy = y - eye.cy
  const radius = Math.hypot(dx / eye.rx, dy / eye.ry)
  const weight = Math.max(0, 1 - radius * radius)
  const scale = 1 + focus * .75 * weight
  return {
    x: Math.round(eye.cx + (dx - lookX * weight) / scale),
    y: Math.round(eye.cy + (dy - lookY * weight) / scale),
  }
}

export function getStalkPupilCovers(phase: number, lookX: number, lookY: number): StalkPupilCover[] {
  if (phase < .76) return []
  return STALK_EYES.map(eye => ({
    cx: eye.cx + lookX,
    cy: eye.cy + lookY,
    rx: eye.rx * .7,
    ry: eye.ry * .8,
    color: "#0b1511",
    clip: { ...eye },
  }))
}

export function getStalkEyeGlints(phase: number, lookX = 0, lookY = 0): StalkEyeGlint[] {
  if (phase < .76) return []

  const rise = Math.min(1, Math.max(0, (phase - .76) / .18))
  const verticalRadius = 9 + 4 * rise
  const alpha = .78 + .22 * rise

  return STALK_EYES.map(eye => ({
    cx: eye.cx + lookX,
    cy: eye.cy + lookY,
    horizontalRadius: Math.max(eye.rx * .38, verticalRadius * .6),
    verticalRadius,
    alpha,
    color: "#ffffff",
    outline: false,
    clip: { ...eye },
  }))
}

function clipToStalkEye(context: CanvasRenderingContext2D, eye: StalkEyeRegion) {
  context.beginPath()
  context.ellipse(eye.cx, eye.cy, eye.rx, eye.ry, 0, 0, Math.PI * 2)
  context.clip()
}

function paintDiamond(context: CanvasRenderingContext2D, glint: StalkEyeGlint) {
  const { cx, cy, horizontalRadius: x, verticalRadius: y } = glint
  context.beginPath()
  context.moveTo(cx, cy - y)
  context.lineTo(cx + x, cy)
  context.lineTo(cx, cy + y)
  context.lineTo(cx - x, cy)
  context.closePath()
  context.fill()
}

function paintStalkEyes(
  output: CanvasRenderingContext2D,
  stalk: HTMLImageElement,
  original: Uint8ClampedArray,
  eyeCanvas: HTMLCanvasElement,
  eyeContext: CanvasRenderingContext2D,
  focus: number,
  lookX: number,
  lookY: number,
) {
  eyeContext.clearRect(0, 0, 543, 724)
  for (const eye of STALK_EYES) {
    const left = eye.cx - eye.rx
    const top = eye.cy - eye.ry
    const width = eye.rx * 2
    const height = eye.ry * 2
    const patch = eyeContext.createImageData(width, height)

    for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
      const mapped = mapStalkEyePixel(eye, left + px, top + py, focus, lookX, lookY)
      const sourceIndex = (mapped.y * 543 + mapped.x) * 4
      const destinationIndex = (py * width + px) * 4
      for (let channel = 0; channel < 4; channel++) patch.data[destinationIndex + channel] = original[sourceIndex + channel]
    }
    eyeContext.putImageData(patch, left, top)
  }

  // Restore clean face artwork over the generated eye area and the two
  // decorative starbursts beside the cheeks. The replacement glints below
  // are clipped back inside the eyes.
  output.save()
  output.beginPath()
  for (const eye of STALK_EYES) output.ellipse(eye.cx, eye.cy, eye.rx + 10, eye.ry + 8, 0, 0, Math.PI * 2)
  for (const mask of STALK_FACE_SPARKLE_MASKS) output.ellipse(mask.cx, mask.cy, mask.rx, mask.ry, 0, 0, Math.PI * 2)
  output.clip()
  output.drawImage(stalk, 0, 0, 543, 724, 0, 0, 543, 724)
  output.restore()

  output.save()
  output.beginPath()
  for (const eye of STALK_EYES) output.ellipse(eye.cx, eye.cy, eye.rx, eye.ry, 0, 0, Math.PI * 2)
  output.clip()
  output.drawImage(eyeCanvas, 0, 0)
  output.restore()
}

export function createFacePainter(canvas: HTMLCanvasElement) {
  const output = canvas.getContext("2d")!
  const paintCare = createCarePainter(canvas)
  output.imageSmoothingEnabled = false
  const stalkSource = document.createElement("canvas")
  stalkSource.width = 543
  stalkSource.height = 724
  const stalkSourceContext = stalkSource.getContext("2d", { willReadFrequently: true })!
  const stalkEyes = document.createElement("canvas")
  stalkEyes.width = 543
  stalkEyes.height = 724
  const stalkEyeContext = stalkEyes.getContext("2d")!
  const dizzy = new Image()
  const held = new Image()
  const stalk = new Image()
  const swat = new Image()
  dizzy.src = DIZZY_SHEET_PATH
  held.src = HELD_SHEET_PATH
  stalk.src = STALK_SHEET_PATH
  swat.src = "/neoburie-swat-v4.png"
  let stalkPixels: ImageData | undefined

  return (mode: "stalk" | "swat" | "pounce" | "land" | "held" | "dizzy" | "wake" | "groom" | "settle" | null, time: number, focus: number, lookX: number, lookY: number, phase = 0) => {
    output.clearRect(0, 0, 543, 724)
    canvas.style.transformOrigin = ""
    canvas.dataset.atlas = "false"
    if (!mode) return false
    if (mode === "stalk") {
      if (!stalk.complete || !stalk.naturalWidth) return false
      // Keep the body progression monotonic while correcting the generated
      // eye artwork below so only the pupils dilate.
      const frame = stalkFrameAt(phase)
      output.drawImage(stalk, frame * 543, 0, 543, 724, 0, 0, 543, 724)
      if (!stalkPixels) {
        stalkSourceContext.drawImage(stalk, 0, 0, 543, 724, 0, 0, 543, 724)
        stalkPixels = stalkSourceContext.getImageData(0, 0, 543, 724)
      }
      paintStalkEyes(output, stalk, stalkPixels.data, stalkEyes, stalkEyeContext, focus, lookX, lookY)
      for (const cover of getStalkPupilCovers(phase, lookX, lookY)) {
        output.save()
        clipToStalkEye(output, cover.clip)
        output.beginPath()
        output.ellipse(cover.cx, cover.cy, cover.rx, cover.ry, 0, 0, Math.PI * 2)
        output.fillStyle = cover.color
        output.fill()
        output.restore()
      }
      for (const glint of getStalkEyeGlints(phase, lookX, lookY)) {
        output.save()
        clipToStalkEye(output, glint.clip)
        output.fillStyle = glint.color
        output.globalAlpha = glint.alpha
        output.shadowColor = glint.color
        output.shadowBlur = 1.5
        paintDiamond(output, glint)
        output.restore()
      }
      return true
    }
    if (mode === "swat") {
      if (!swat.complete || !swat.naturalWidth) return false
      // Two quick taps followed by a complete reverse recovery. Returning to
      // the neutral frame prevents the second strike from being cut off.
      const frame = swatFrameAt(phase)
      output.drawImage(swat, frame * 543, 0, 543, 724, 0, 0, 543, 724)
      return true
    }
    if (mode === "wake" || mode === "groom" || mode === "pounce" || mode === "settle" || mode === "land") {
      if (paintCare(mode, time, phase)) return true
      if (mode === "wake" || mode === "groom" || mode === "pounce" || mode === "settle" || mode === "land") return false
    }
    if (mode === "held") {
      if (!held.complete || !held.naturalWidth) return false
      canvas.dataset.atlas = "true"
      output.drawImage(held, heldFrameAt(time) * 543, 0, 543, 724, 0, 0, 543, 724)
      return true
    }
    if (mode === "dizzy") {
      if (!dizzy.complete || !dizzy.naturalWidth) return false
      canvas.dataset.atlas = "true"
      output.drawImage(dizzy, dizzyFrameAt(time) * 543, 0, 543, 724, 0, 0, 543, 724)
      return true
    }
    return false
  }
}


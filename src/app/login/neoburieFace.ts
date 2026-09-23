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
}

export type StalkEyeRegion = {
  cx: number
  cy: number
  rx: number
  ry: number
}

export const STALK_EYES: readonly StalkEyeRegion[] = [
  { cx: 420, cy: 487, rx: 20, ry: 21 },
  { cx: 486, cy: 486, rx: 17, ry: 20 },
]

export function stalkFrameAt(phase: number) {
  return Math.min(4, Math.floor(Math.max(0, phase) * 6))
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

export function getStalkEyeGlints(phase: number): StalkEyeGlint[] {
  if (phase < .42) return []

  const rise = Math.min(1, Math.max(0, (phase - .42) / .16))
  const settle = Math.min(1, Math.max(0, (phase - .82) / .18))
  const verticalRadius = 8 + 4 * rise - settle
  const alpha = .72 + .28 * rise - .15 * settle

  return STALK_EYES.map(({ cx, cy, rx }) => ({
    cx,
    cy,
    horizontalRadius: Math.max(rx * .34, verticalRadius * .58),
    verticalRadius,
    alpha,
    color: "#ffffff",
    outline: false,
  }))
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

  // Remove the generated large eyes and external starbursts with the clean
  // first-frame artwork before compositing the locally warped eye pixels.
  output.save()
  output.beginPath()
  for (const eye of STALK_EYES) output.ellipse(eye.cx, eye.cy, eye.rx + 10, eye.ry + 8, 0, 0, Math.PI * 2)
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
  const painted = document.createElement("canvas")
  painted.width = 543; painted.height = 724
  const context = painted.getContext("2d")!
  const source = document.createElement("canvas")
  source.width = 543
  source.height = 724
  const sourceContext = source.getContext("2d", { willReadFrequently: true })!
  const stalkSource = document.createElement("canvas")
  stalkSource.width = 543
  stalkSource.height = 724
  const stalkSourceContext = stalkSource.getContext("2d", { willReadFrequently: true })!
  const stalkEyes = document.createElement("canvas")
  stalkEyes.width = 543
  stalkEyes.height = 724
  const stalkEyeContext = stalkEyes.getContext("2d")!
  const held = new Image()
  const stalk = new Image()
  const swat = new Image()
  held.src = "/neoburie-pixel-held.png"
  stalk.src = "/neoburie-stalk-v14.png"
  swat.src = "/neoburie-swat-v4.png"
  let pixels: ImageData | undefined
  let stalkPixels: ImageData | undefined

  return (mode: "stalk" | "swat" | "pounce" | "land" | "dizzy" | "wake" | "groom" | "settle" | null, time: number, focus: number, lookX: number, lookY: number, phase = 0) => {
    context.clearRect(0, 0, 543, 724)
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
      for (const glint of getStalkEyeGlints(phase)) {
        output.save()
        output.fillStyle = glint.color
        output.globalAlpha = glint.alpha * .25
        output.shadowColor = glint.color
        output.shadowBlur = 7
        paintDiamond(output, {
          ...glint,
          horizontalRadius: glint.horizontalRadius + 2.5,
          verticalRadius: glint.verticalRadius + 3,
        })
        output.globalAlpha = glint.alpha
        output.shadowBlur = 2
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
    if (!held.complete || !held.naturalWidth) return false
    if (!pixels) {
      sourceContext.clearRect(0, 0, 543, 724)
      sourceContext.drawImage(held, 0, 0, 543, 724, 0, 0, 543, 724)
      pixels = sourceContext.getImageData(0, 0, 543, 724)
    }
    context.drawImage(source, 0, 0)
    const original = pixels.data
    const eyes = [[354, 216, 34, 28], [449, 215, 29, 28]]
    for (const [cx, cy, rx, ry] of eyes) {
      const left = cx - rx, top = cy - ry, width = rx * 2, height = ry * 2
      const patch = context.createImageData(width, height)
      for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
        const dx = px - rx, dy = py - ry
        const radius = Math.hypot(dx / rx, dy / ry)
        const sx = left + px, sy = top + py
        const index = (sy * 543 + sx) * 4
        const dest = (py * width + px) * 4
        for (let channel = 0; channel < 4; channel++) {
          let value = original[index + channel]
          if (mode === "dizzy") {
            // Continue the surrounding fur through the old eye, without a badge or ring.
            const blend = Math.min(1, Math.max(0, (1.06 - radius) * 12))
            const fur = original[((cy + ry + 6) * 543 + left + px) * 4 + channel]
            value += (fur - value) * blend
          }
          patch.data[dest + channel] = value
        }
      }
      context.putImageData(patch, left, top)
      if (mode === "dizzy") {
        context.save()
        context.translate(cx, cy)
        context.rotate(time / 210 * (cx < 400 ? 1 : -1))
        context.beginPath()
        for (let step = 0; step <= 90; step++) {
          const angle = step / 90 * Math.PI * 3.5
          const radius = 1 + step / 90 * 18
          const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius
          if (step === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle = "#171512"
        context.lineWidth = 5
        context.lineCap = "round"
        context.stroke()
        context.restore()
      }
    }
    if (mode === "dizzy") {
      // A small tongue emerging directly from the original mouth junction.
      context.beginPath()
      context.moveTo(407, 273)
      context.bezierCurveTo(408, 283, 404, 299, 415, 301)
      context.bezierCurveTo(426, 302, 427, 285, 423, 274)
      context.closePath()
      context.fillStyle = "#d88c94"
      context.fill()
      context.beginPath()
      context.moveTo(416, 279)
      context.lineTo(416, 291)
      context.strokeStyle = "#b76f7d"
      context.lineWidth = 2
      context.stroke()
    }
    output.drawImage(painted, 0, 0)
    return true
  }
}


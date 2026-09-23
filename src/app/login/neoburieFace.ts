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

export function getStalkEyeGlints(phase: number): StalkEyeGlint[] {
  if (phase < .66) return []

  const rise = Math.min(1, Math.max(0, (phase - .66) / .12))
  const settle = Math.min(1, Math.max(0, (phase - .78) / .22))
  const verticalRadius = 4.5 + 3.5 * rise - 2 * settle
  const alpha = .58 + .42 * rise - .17 * settle

  return [[414, 487], [485, 486]].map(([cx, cy]) => ({
    cx,
    cy,
    horizontalRadius: verticalRadius * .42,
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
  const held = new Image()
  const stalk = new Image()
  const swat = new Image()
  held.src = "/neoburie-pixel-held.png"
  stalk.src = "/neoburie-stalk-v14.png"
  swat.src = "/neoburie-swat-v4.png"
  let pixels: ImageData | undefined

  return (mode: "stalk" | "swat" | "pounce" | "land" | "dizzy" | "wake" | "groom" | "settle" | null, time: number, _focus: number, _lookX: number, _lookY: number, phase = 0) => {
    context.clearRect(0, 0, 543, 724)
    output.clearRect(0, 0, 543, 724)
    canvas.style.transformOrigin = ""
    canvas.dataset.atlas = "false"
    if (!mode) return false
    if (mode === "stalk") {
      if (!stalk.complete || !stalk.naturalWidth) return false
      // The artwork alternates the rear-foot load while pupil size increases
      // monotonically from frame 0 to frame 5. Never reverse this sequence.
      const frame = Math.min(5, Math.floor(Math.max(0, phase) * 6))
      output.drawImage(stalk, frame * 543, 0, 543, 724, 0, 0, 543, 724)
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
      // Slow lift, an inquisitive hold, then two quick taps.
      const frame = phase < .2 ? 0 : phase < .44 ? 1 : phase < .72 ? 2 : phase < .8 ? 3 : phase < .92 ? 4 : 5
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


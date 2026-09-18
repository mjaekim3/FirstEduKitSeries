import { drawMesh } from "./neoburieMesh"
import { createCarePainter } from "./neoburieCare"

// Coordinates belong to the original 543 × 724 sprite frame, before mirroring.
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
  const idle = new Image()
  const held = new Image()
  idle.src = "/neoburie-pixel-idle.png"
  held.src = "/neoburie-pixel-held.png"
  let cached: string | undefined
  let pixels: ImageData | undefined

  return (mode: "stalk" | "pounce" | "land" | "dizzy" | "wake" | "groom" | "settle" | null, time: number, focus: number, lookX: number, lookY: number, phase = 0) => {
    context.clearRect(0, 0, 543, 724)
    output.clearRect(0, 0, 543, 724)
    canvas.style.transformOrigin = ""
    canvas.dataset.atlas = "false"
    if (!mode) return false
    if (mode === "wake" || mode === "groom" || mode === "pounce" || mode === "settle" || mode === "land") {
      if (paintCare(mode, time, phase)) return true
      if (mode === "wake" || mode === "groom" || mode === "pounce" || mode === "settle" || mode === "land") return false
    }
    const sourceMode = mode === "dizzy" ? "dizzy" : "stalk"
    const image = sourceMode === "dizzy" ? held : idle
    if (!image.complete || !image.naturalWidth) return false
    if (cached !== sourceMode) {
      sourceContext.clearRect(0, 0, 543, 724)
      sourceContext.drawImage(image, sourceMode === "dizzy" ? 0 : 1629, 0, 543, 724, 0, 0, 543, 724)
      pixels = sourceContext.getImageData(0, 0, 543, 724)
      cached = sourceMode
    }
    context.drawImage(source, 0, 0)
    const original = pixels!.data
    const eyes = sourceMode === "dizzy" ? [[354, 216, 34, 28], [449, 215, 29, 28]]
      : [[370, 355, 29, 27], [459, 352, 25, 26]]
    for (const [cx, cy, rx, ry] of (mode === "stalk" || mode === "dizzy" ? eyes : [])) {
      const left = cx - rx, top = cy - ry, width = rx * 2, height = ry * 2
      const patch = context.createImageData(width, height)
      for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
        const dx = px - rx, dy = py - ry
        const radius = Math.hypot(dx / rx, dy / ry)
        const weight = Math.max(0, 1 - radius * radius)
        let sx = left + px, sy = top + py
        if (sourceMode === "stalk") {
          // Warp the actual pupil and highlight, leaving the eye perimeter fixed.
          const scale = 1 + focus * .75 * weight
          sx = Math.round(cx + (dx - lookX * weight) / scale)
          sy = Math.round(cy + (dy - lookY * weight) / scale)
        }
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
    if (mode === "stalk" && phase > .78) {
      const sparkle = Math.sin(Math.min(1, (phase - .78) / .22) * Math.PI * 2) ** 2
      for (const [cx, cy] of [[373, 348], [461, 345]]) {
        const r = 4 + sparkle * 13
        context.beginPath(); context.moveTo(cx, cy - r); context.lineTo(cx + 3, cy - 3)
        context.lineTo(cx + r * .7, cy); context.lineTo(cx + 3, cy + 3)
        context.lineTo(cx, cy + r); context.lineTo(cx - 3, cy + 3)
        context.lineTo(cx - r * .7, cy); context.lineTo(cx - 3, cy - 3); context.closePath()
        context.fillStyle = "#fffce5"; context.fill()
      }
    }
    if (mode !== "stalk") output.drawImage(painted, 0, 0)
    else drawMesh(output, painted, (x, y) => {
      const front = Math.max(0, Math.min(1, (x - 200) / 140))
      const rump = (1 - front) * Math.max(0, Math.min(1, (600 - y) / 180))
      return [x + Math.sin(time / 90) * 7 * rump,
        y + Math.max(0, 610 - y) * (.06 + .13 * front) + Math.cos(time / 90) * 3 * rump]
    })
    return true
  }
}


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
  const held = new Image()
  const stalk = new Image()
  held.src = "/neoburie-pixel-held.png"
  stalk.src = "/neoburie-stalk-v5.png"
  let pixels: ImageData | undefined

  return (mode: "stalk" | "pounce" | "land" | "dizzy" | "wake" | "groom" | "settle" | null, time: number, focus: number, lookX: number, lookY: number, phase = 0) => {
    context.clearRect(0, 0, 543, 724)
    output.clearRect(0, 0, 543, 724)
    canvas.style.transformOrigin = ""
    canvas.dataset.atlas = "false"
    if (!mode) return false
    if (mode === "stalk") {
      if (!stalk.complete || !stalk.naturalWidth) return false
      // These are separately drawn crouching poses. Reverse the second half
      // so the hips sway back without deforming the body or snapping at loop end.
      const sequence = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1]
      const frame = sequence[Math.min(sequence.length - 1, Math.floor(phase * sequence.length))]
      output.drawImage(stalk, frame * 543, 0, 543, 724, 0, 0, 543, 724)
      for (const [cx, cy] of [[421, 456], [492, 455]]) {
        if (focus > 0) {
          output.save()
          output.globalAlpha = focus * .82
          output.beginPath()
          output.ellipse(cx + lookX, cy + lookY, 5 + focus * 4, 7 + focus * 5, 0, 0, Math.PI * 2)
          output.fillStyle = "#18272a"
          output.fill()
          output.beginPath()
          output.ellipse(cx - 4 + lookX, cy - 5 + lookY, 2, 2.5, 0, 0, Math.PI * 2)
          output.fillStyle = "#fffdf5"
          output.fill()
          output.restore()
        }
        if (phase > .62) {
          const sparkle = Math.sin(time / 135) ** 2 * Math.min(1, (phase - .62) / .18)
          const r = 2 + sparkle * 4
          output.beginPath()
          output.moveTo(cx - 4, cy - 6 - r)
          output.lineTo(cx - 1, cy - 9)
          output.lineTo(cx - 4 + r, cy - 6)
          output.lineTo(cx - 1, cy - 3)
          output.lineTo(cx - 4, cy - 6 + r)
          output.lineTo(cx - 7, cy - 3)
          output.lineTo(cx - 4 - r, cy - 6)
          output.lineTo(cx - 7, cy - 9)
          output.closePath()
          output.fillStyle = "#fffce5"
          output.fill()
        }
      }
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


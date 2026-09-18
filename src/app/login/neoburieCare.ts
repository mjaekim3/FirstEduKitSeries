import { CAT_TIMING, poseTimeline, type CareMode, type Pose } from "./neoburieTimeline"

type Frame = { x: number; y: number; width: number; height: number; area: number }
type Sheet = { image: HTMLImageElement; frames?: Frame[] }
const RENDER_SCALE = 1.32617

// Find complete sprites rather than cutting a paw at a nominal grid boundary.
function measureFrames(image: HTMLImageElement): Frame[] {
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
  const context = canvas.getContext("2d", { willReadFrequently: true })!
  context.drawImage(image, 0, 0)
  const { width, height } = canvas
  const data = context.getImageData(0, 0, width, height).data
  const seen = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  const groups: Frame[] = []
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 80) continue
    let head = 0, tail = 1, count = 0
    let left = width, top = height, right = 0, bottom = 0
    queue[0] = start; seen[start] = 1
    while (head < tail) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width)
      count++; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
      for (const next of [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1, index - width, index + width]) {
        if (next >= 0 && next < seen.length && !seen[next] && data[next * 4 + 3] >= 80) { seen[next] = 1; queue[tail++] = next }
      }
    }
    if (count < 2000) continue
    left = Math.max(0, left - 3); top = Math.max(0, top - 3)
    right = Math.min(width - 1, right + 3); bottom = Math.min(height - 1, bottom + 3)
    let area = 0
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) area += data[(y * width + x) * 4 + 3] / 255
    groups.push({ x: left, y: top, width: right - left + 1, height: bottom - top + 1, area })
  }
  const main = groups.sort((a, b) => b.area - a.area).slice(0, 6).sort((a, b) => a.y + a.height / 2 - b.y - b.height / 2)
  return [...main.slice(0, 3).sort((a, b) => a.x - b.x), ...main.slice(3).sort((a, b) => a.x - b.x)]
}

export function createCarePainter(canvas: HTMLCanvasElement) {
  const paths = { rest: "/neoburie-rest-v3.png", groom: "/neoburie-groom-v3.png", jump: "/neoburie-jump-v3.png", idle: "/neoburie-pixel-idle.png", sleep: "/neoburie-pixel-sleep-v2.png" }
  const sheets = Object.fromEntries(Object.entries(paths).map(([key, src]) => { const image = new Image(); image.src = src; return [key, { image }] })) as Record<Pose["sheet"], Sheet>
  const context = canvas.getContext("2d")!
  let ready = false
  return (mode: CareMode, _time: number, phase: number) => {
    if (!ready) {
      if (Object.values(sheets).some(({ image }) => !image.complete || !image.naturalWidth)) return false
      for (const name of ["rest", "groom", "jump"] as const) {
        sheets[name].frames = measureFrames(sheets[name].image)
        if (sheets[name].frames!.length !== 6) return false
      }
      ready = true
    }
    const elapsed = phase * CAT_TIMING[mode === "pounce" ? "jump" : mode]
    const { keys, time } = poseTimeline(mode, elapsed)
    let index = keys.length - 1
    while (index > 0 && keys[index].at > time) index--
    const current = keys[index], previous = keys[Math.max(0, index - 1)]
    const duration = mode === "pounce" ? (index === 3 ? 40 : 55) : 100
    const fraction = Math.min(1, Math.max(0, (time - current.at) / duration))
    const mix = fraction * fraction * (3 - 2 * fraction)
    const ground = mode === "settle" ? 610 - 39 * Math.min(1, elapsed / 2200)
      : mode === "wake" ? 571 + 39 * Math.min(1, Math.max(0, (elapsed - 1100) / 700)) : 610
    canvas.dataset.atlas = "true"
    canvas.style.transformOrigin = `50% ${ground / 724 * 100}%`
    const draw = (pose: Pose, opacity: number) => {
      const sheet = sheets[pose.sheet]
      context.save(); context.globalAlpha = opacity
      if (pose.sheet === "idle" || pose.sheet === "sleep") {
        // Exact originals at both ends of the sleep/wake sequence.
        const size = 1 / RENDER_SCALE
        context.translate(271.5, ground); context.scale("mirror" in pose && pose.mirror ? -size : size, size)
        const baseline = pose.sheet === "sleep" ? 571 : 610
        context.drawImage(sheet.image, pose.frame * 543, 0, 543, 724, -271.5, -baseline, 543, 724)
      } else {
        const frame = sheet.frames![pose.frame]
        const scale = Math.sqrt(83582 / frame.area)
        context.drawImage(sheet.image, frame.x, frame.y, frame.width, frame.height, (543 - frame.width * scale) / 2, ground - frame.height * scale, frame.width * scale, frame.height * scale)
      }
      context.restore()
    }
    context.clearRect(0, 0, 543, 724)
    context.globalCompositeOperation = "lighter"
    if (mix < 1 && index > 0) draw(previous.pose, 1 - mix)
    draw(current.pose, index === 0 ? 1 : mix)
    context.globalCompositeOperation = "source-over"
    return true
  }
}

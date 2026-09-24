import { describe, expect, it } from "vitest"
import path from "node:path"
import sharp from "sharp"
import { DIZZY_FRAME_COUNT, DIZZY_SHEET_PATH, dizzyFrameAt, getStalkEyeGlints, getStalkPupilCovers, HELD_FRAME_COUNT, heldFrameAt, HELD_SHEET_PATH, mapStalkEyePixel, stalkFrameAt, STALK_EYES, STALK_FACE_SPARKLE_MASKS, STALK_SHEET_PATH, swatFrameAt } from "./neoburieFace"

describe("stalk frames", () => {
  it("keeps the complete six-step hunting progression", () => {
    expect([0, .19, .38, .58, .78, 1].map(stalkFrameAt))
      .toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe("paw-swat frames", () => {
  it("shows both taps and returns through recovery poses instead of cutting off", () => {
    expect([0, .16, .3, .46, .56, .66, .76, .85, .93, 1].map(swatFrameAt))
      .toEqual([0, 1, 2, 5, 4, 5, 4, 2, 1, 0])
  })
})

describe("held and dizzy artwork", () => {
  it("uses matching redrawn sprite sheets instead of modifying the old held face", () => {
    expect(HELD_SHEET_PATH).toBe("/neoburie-held-v4-hand-4f.png")
    expect(DIZZY_SHEET_PATH).toBe("/neoburie-dizzy-v10-held-rotating-spirals-8f.png")
    expect(HELD_FRAME_COUNT).toBe(4)
    expect(DIZZY_FRAME_COUNT).toBe(8)
  })

  it("holds each aligned catch frame without any in-between sprite translation", () => {
    expect([0, 135, 270, 405].map(heldFrameAt)).toEqual([0, 1, 2, 3])
    expect(heldFrameAt(540)).toBe(0)
  })

  it("keeps the held cat at its natural width instead of squeezing the source cell", async () => {
    const { data, info } = await sharp(path.join(process.cwd(), "public", HELD_SHEET_PATH.slice(1)))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    for (let frame = 0; frame < HELD_FRAME_COUNT; frame++) {
      let minX = 543
      let maxX = 0
      let minY = 724
      let maxY = 0
      for (let y = 0; y < 724; y++) for (let x = 0; x < 543; x++) {
        if (data[(y * info.width + frame * 543 + x) * info.channels + 3] <= 40) continue
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
      expect((maxX - minX + 1) / (maxY - minY + 1)).toBeGreaterThan(.48)
    }
  })

  it("cycles every dizzy frame so the rolling pupils and overhead birds move together", () => {
    expect([0, 150, 300, 450, 600, 750, 900, 1050].map(dizzyFrameAt))
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(dizzyFrameAt(1200)).toBe(0)
  })

  it("keeps every dizzy bird and body safely inside its frame", async () => {
    const { data, info } = await sharp(path.join(process.cwd(), "public", DIZZY_SHEET_PATH.slice(1)))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    expect(info.width).toBe(543 * DIZZY_FRAME_COUNT)
    expect(info.height).toBe(724)
    for (let frame = 0; frame < DIZZY_FRAME_COUNT; frame++) {
      const left = frame * 543
      for (let y = 0; y < info.height; y++) for (let x = 0; x < 543; x++) {
        if (x >= 10 && x < 533 && y >= 14 && y < 710) continue
        expect(data[(y * info.width + left + x) * info.channels + 3]).toBe(0)
      }
    }
  })

  it("finishes every tail with a rounded tip instead of a clipped flat edge", async () => {
    const { data, info } = await sharp(path.join(process.cwd(), "public", DIZZY_SHEET_PATH.slice(1)))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    for (let frame = 0; frame < DIZZY_FRAME_COUNT; frame++) {
      let lowestRow = -1
      let lowestRowPixels = 0
      for (let y = 0; y < info.height; y++) {
        let opaquePixels = 0
        for (let x = 0; x < 543; x++) {
          if (data[(y * info.width + frame * 543 + x) * info.channels + 3] > 40) opaquePixels++
        }
        if (opaquePixels) {
          lowestRow = y
          lowestRowPixels = opaquePixels
        }
      }
      expect(lowestRow).toBeLessThan(710)
      expect(lowestRowPixels).toBeLessThanOrEqual(30)
    }
  })
})

describe("stalk pupil dilation", () => {
  it("magnifies the original pupil pixels while pinning the eye perimeter", () => {
    const eye = STALK_EYES[0]
    const centerSide = { x: eye.cx + eye.rx * .5, y: eye.cy }
    const resting = mapStalkEyePixel(eye, centerSide.x, centerSide.y, 0, 0, 0)
    const hunting = mapStalkEyePixel(eye, centerSide.x, centerSide.y, 1, 0, 0)
    const boundary = mapStalkEyePixel(eye, eye.cx + eye.rx, eye.cy, 1, 0, 0)

    expect(resting).toEqual(centerSide)
    expect(Math.abs(hunting.x - eye.cx)).toBeLessThan(Math.abs(resting.x - eye.cx))
    expect(boundary).toEqual({ x: eye.cx + eye.rx, y: eye.cy })
  })

  it("moves the magnified source pixels with the cursor without moving the eye edge", () => {
    const eye = STALK_EYES[1]
    const center = mapStalkEyePixel(eye, eye.cx, eye.cy, 1, 3, -2)
    const edge = mapStalkEyePixel(eye, eye.cx, eye.cy + eye.ry, 1, 3, -2)

    expect(center.x).toBeLessThan(eye.cx)
    expect(center.y).toBeGreaterThan(eye.cy)
    expect(edge).toEqual({ x: eye.cx, y: eye.cy + eye.ry })
  })
})

describe("stalk eye glints", () => {
  it("uses a sprite whose face-side pixels stay clean through every hunting frame", async () => {
    expect(STALK_SHEET_PATH).toBe("/neoburie-stalk-v15-clean.png")
    const { data, info } = await sharp(path.join(process.cwd(), "public", STALK_SHEET_PATH.slice(1)))
      .raw()
      .toBuffer({ resolveWithObject: true })
    const patches = [
      { left: 320, top: 445, width: 80, height: 82 },
      { left: 510, top: 445, width: 33, height: 82 },
    ]

    for (let frame = 1; frame < 6; frame++) for (const patch of patches) {
      for (let y = patch.top; y < patch.top + patch.height; y++) for (let x = patch.left; x < patch.left + patch.width; x++) {
        const clean = (y * info.width + x) * info.channels
        const animated = (y * info.width + frame * 543 + x) * info.channels
        expect(data.subarray(animated, animated + info.channels)).toEqual(data.subarray(clean, clean + info.channels))
      }
    }
  })

  it("cleans only the two sparkles beside the face, outside the eye glint regions", () => {
    expect(STALK_FACE_SPARKLE_MASKS).toHaveLength(2)
    expect(STALK_FACE_SPARKLE_MASKS[0].cx).toBeLessThan(STALK_EYES[0].cx - STALK_EYES[0].rx)
    expect(STALK_FACE_SPARKLE_MASKS[1].cx).toBeGreaterThan(STALK_EYES[1].cx + STALK_EYES[1].rx)
  })

  it("uses a large white diamond in place of each pupil", () => {
    const glints = getStalkEyeGlints(.96)

    expect(glints).toHaveLength(2)
    expect(glints).toEqual([
      expect.objectContaining({ cx: 420, cy: 487, color: "#ffffff" }),
      expect.objectContaining({ cx: 486, cy: 486, color: "#ffffff" }),
    ])
    for (let index = 0; index < glints.length; index++) {
      const glint = glints[index]
      const eye = STALK_EYES[index]
      expect(glint.clip).toEqual(eye)
      expect(glint.verticalRadius).toBeGreaterThan(glint.horizontalRadius)
      expect(glint.verticalRadius).toBeGreaterThanOrEqual(eye.ry * .6)
      expect(glint.verticalRadius).toBeLessThan(eye.ry * .7)
      expect(glint.horizontalRadius).toBeLessThanOrEqual(8)
      expect(glint.alpha).toBe(1)
      expect(glint.outline).toBe(false)
      expect(glint.cx).toBe(eye.cx)
      expect(glint.cy).toBe(eye.cy)
    }
  })

  it("builds and holds the eye shine before the cat jumps", () => {
    expect(getStalkEyeGlints(.59)).toEqual([])

    const entering = getStalkEyeGlints(.64)
    const flash = getStalkEyeGlints(.86)
    const held = getStalkEyeGlints(1)
    expect(entering).toHaveLength(2)
    expect(held[0].verticalRadius).toBeCloseTo(flash[0].verticalRadius)
    expect(held[0].alpha).toBeCloseTo(flash[0].alpha)
    expect(flash[0].verticalRadius).toBeGreaterThan(entering[0].verticalRadius)
    expect(flash[0].alpha).toBeGreaterThan(entering[0].alpha)
  })

  it("covers the original off-center highlight before drawing one replacement pupil", () => {
    expect(getStalkPupilCovers(.59, 0, 0)).toEqual([])

    const covers = getStalkPupilCovers(.64, 0, 0)
    expect(covers).toHaveLength(2)
    covers.forEach((cover, index) => {
      const eye = STALK_EYES[index]
      expect(cover.clip).toEqual(eye)
      const oldHighlight = { x: eye.cx + 6, y: eye.cy - 11 }
      expect(((oldHighlight.x - cover.cx) / cover.rx) ** 2 + ((oldHighlight.y - cover.cy) / cover.ry) ** 2).toBeLessThan(1)
      expect(cover.color).toBe("#0b1511")
    })
  })
})

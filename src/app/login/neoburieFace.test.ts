import { describe, expect, it } from "vitest"
import { getStalkEyeGlints, getStalkPupilCovers, mapStalkEyePixel, stalkFrameAt, STALK_EYES, swatFrameAt } from "./neoburieFace"

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
      expect(glint.verticalRadius).toBeGreaterThanOrEqual(eye.ry * .7)
      expect(glint.horizontalRadius).toBeGreaterThanOrEqual(eye.rx * .4)
      expect(glint.alpha).toBe(1)
      expect(glint.outline).toBe(false)
      expect(glint.cx).toBe(eye.cx)
      expect(glint.cy).toBe(eye.cy)
    }
  })

  it("replaces the pupil only at the end of the hunting pose", () => {
    expect(getStalkEyeGlints(.75)).toEqual([])

    const entering = getStalkEyeGlints(.8)
    const flash = getStalkEyeGlints(.94)
    const held = getStalkEyeGlints(1)
    expect(entering).toHaveLength(2)
    expect(held[0].verticalRadius).toBeCloseTo(flash[0].verticalRadius)
    expect(held[0].alpha).toBeCloseTo(flash[0].alpha)
    expect(flash[0].verticalRadius).toBeGreaterThan(entering[0].verticalRadius)
    expect(flash[0].alpha).toBeGreaterThan(entering[0].alpha)
  })

  it("covers the original off-center highlight before drawing one replacement pupil", () => {
    expect(getStalkPupilCovers(.75, 0, 0)).toEqual([])

    const covers = getStalkPupilCovers(.9, 0, 0)
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

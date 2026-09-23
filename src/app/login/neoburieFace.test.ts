import { describe, expect, it } from "vitest"
import { getStalkEyeGlints, mapStalkEyePixel, stalkFrameAt, STALK_EYES, swatFrameAt } from "./neoburieFace"

describe("stalk frames", () => {
  it("holds the final complete crouch instead of showing the clipped last frame", () => {
    expect([0, .19, .38, .58, .78, 1].map(stalkFrameAt))
      .toEqual([0, 1, 2, 3, 4, 4])
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
    const glints = getStalkEyeGlints(.78)

    expect(glints).toHaveLength(2)
    expect(glints).toEqual([
      expect.objectContaining({ cx: 420, cy: 487, color: "#ffffff" }),
      expect.objectContaining({ cx: 486, cy: 486, color: "#ffffff" }),
    ])
    for (let index = 0; index < glints.length; index++) {
      const glint = glints[index]
      const eye = STALK_EYES[index]
      expect(glint.verticalRadius).toBeGreaterThan(glint.horizontalRadius)
      expect(glint.verticalRadius).toBeGreaterThanOrEqual(eye.ry * .5)
      expect(glint.horizontalRadius).toBeGreaterThanOrEqual(eye.rx * .3)
      expect(glint.outline).toBe(false)
      expect(glint.cx).toBe(eye.cx)
      expect(glint.cy).toBe(eye.cy)
    }
  })

  it("holds the flash through the middle of the stalking pose before settling", () => {
    expect(getStalkEyeGlints(.39)).toEqual([])

    const entering = getStalkEyeGlints(.45)
    const flash = getStalkEyeGlints(.62)
    const held = getStalkEyeGlints(.78)
    const settled = getStalkEyeGlints(1)
    expect(entering).toHaveLength(2)
    expect(held[0].verticalRadius).toBe(flash[0].verticalRadius)
    expect(held[0].alpha).toBe(flash[0].alpha)
    expect(flash[0].verticalRadius).toBeGreaterThan(settled[0].verticalRadius)
    expect(flash[0].alpha).toBeGreaterThan(settled[0].alpha)
    expect(settled[0].alpha).toBeGreaterThan(.7)
  })
})

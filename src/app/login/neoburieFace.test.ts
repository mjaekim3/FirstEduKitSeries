import { describe, expect, it } from "vitest"
import { getStalkEyeGlints, mapStalkEyePixel, STALK_EYES } from "./neoburieFace"

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
  it("places a compact white diamond inside the front of each pupil", () => {
    const glints = getStalkEyeGlints(.78)

    expect(glints).toHaveLength(2)
    expect(glints).toEqual([
      expect.objectContaining({ cx: 417, cy: 481, color: "#ffffff" }),
      expect.objectContaining({ cx: 483, cy: 480, color: "#ffffff" }),
    ])
    for (let index = 0; index < glints.length; index++) {
      const glint = glints[index]
      const eye = STALK_EYES[index]
      expect(glint.verticalRadius).toBeGreaterThan(glint.horizontalRadius)
      expect(glint.verticalRadius).toBeLessThanOrEqual(5)
      expect(glint.outline).toBe(false)
      expect(Math.hypot((glint.cx - eye.cx) / eye.rx, (glint.cy - eye.cy) / eye.ry)).toBeLessThan(.5)
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

import { describe, expect, it } from "vitest"
import { getStalkEyeGlints, getStalkEyes } from "./neoburieFace"

describe("stalk pupil dilation", () => {
  it("keeps each eye the same size while only the pupil grows", () => {
    const resting = getStalkEyes(0)
    const hunting = getStalkEyes(1)

    expect(hunting.map(({ eyeRadiusX, eyeRadiusY }) => [eyeRadiusX, eyeRadiusY]))
      .toEqual(resting.map(({ eyeRadiusX, eyeRadiusY }) => [eyeRadiusX, eyeRadiusY]))
    for (let index = 0; index < hunting.length; index++) {
      expect(hunting[index].pupilRadiusX).toBeGreaterThan(resting[index].pupilRadiusX)
      expect(hunting[index].pupilRadiusY).toBeGreaterThan(resting[index].pupilRadiusY)
      expect(hunting[index].pupilRadiusX).toBeLessThan(hunting[index].eyeRadiusX)
      expect(hunting[index].pupilRadiusY).toBeLessThan(hunting[index].eyeRadiusY)
    }
  })
})

describe("stalk eye glints", () => {
  it("places a compact white diamond inside the front of each pupil", () => {
    const glints = getStalkEyeGlints(.78)
    const eyes = getStalkEyes(.78)

    expect(glints).toHaveLength(2)
    expect(glints).toEqual([
      expect.objectContaining({ cx: 417, cy: 481, color: "#ffffff" }),
      expect.objectContaining({ cx: 483, cy: 480, color: "#ffffff" }),
    ])
    for (let index = 0; index < glints.length; index++) {
      const glint = glints[index]
      const eye = eyes[index]
      expect(glint.verticalRadius).toBeGreaterThan(glint.horizontalRadius)
      expect(glint.verticalRadius).toBeLessThanOrEqual(5)
      expect(glint.outline).toBe(false)
      expect(Math.abs(glint.cx - eye.pupilCx) + glint.horizontalRadius).toBeLessThan(eye.pupilRadiusX)
      expect(Math.abs(glint.cy - eye.pupilCy) + glint.verticalRadius).toBeLessThan(eye.pupilRadiusY)
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

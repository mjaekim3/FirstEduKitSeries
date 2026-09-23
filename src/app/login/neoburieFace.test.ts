import { describe, expect, it } from "vitest"
import { getStalkEyeGlints } from "./neoburieFace"

describe("stalk eye glints", () => {
  it("places a compact white diamond toward the front of each pupil", () => {
    const glints = getStalkEyeGlints(.78)

    expect(glints).toHaveLength(2)
    expect(glints).toEqual([
      expect.objectContaining({ cx: 414, cy: 487, color: "#ffffff" }),
      expect.objectContaining({ cx: 485, cy: 486, color: "#ffffff" }),
    ])
    for (const glint of glints) {
      expect(glint.verticalRadius).toBeGreaterThan(glint.horizontalRadius)
      expect(glint.verticalRadius).toBeLessThanOrEqual(8)
      expect(glint.outline).toBe(false)
    }
  })

  it("flashes once with the stalking phase instead of continuously pulsing with time", () => {
    expect(getStalkEyeGlints(.64)).toEqual([])

    const flash = getStalkEyeGlints(.78)
    const settled = getStalkEyeGlints(1)
    expect(flash[0].verticalRadius).toBeGreaterThan(settled[0].verticalRadius)
    expect(flash[0].alpha).toBeGreaterThan(settled[0].alpha)
    expect(settled[0].alpha).toBeGreaterThan(.5)
  })
})

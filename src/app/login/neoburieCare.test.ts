import { describe, expect, it } from "vitest"
import { getJumpFramePlacement } from "./neoburieCare"

describe("cursor-grab jump framing", () => {
  it("keeps the enlarged reaching pose inside a safe horizontal inset", () => {
    const placement = getJumpFramePlacement()

    expect(placement.canvasLeft).toBe(24)
    expect(placement.canvasRight).toBe(519)
    expect(placement.width).toBe(495)
  })

  it("keeps the paws on the same ground line after adding the inset", () => {
    const placement = getJumpFramePlacement()
    expect(placement.y + placement.baseline).toBeCloseTo(0)
  })
})

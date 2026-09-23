import { describe, expect, it } from "vitest"
import { getPoseBlendDuration, JUMP_SHEET_PATH, MEASURED_FRAME_SHEETS, shouldBlendPoseTransitions } from "./neoburieCare"

describe("cursor-grab jump artwork", () => {
  it("uses the historical sheet where both front paws gather around the cursor", () => {
    expect(JUMP_SHEET_PATH).toBe("/neoburie-jump-v4-clean.png")
    expect(MEASURED_FRAME_SHEETS).toContain("jump")
  })

  it("switches jump poses cleanly without drawing the previous frame as a ghost", () => {
    expect(getPoseBlendDuration("pounce")).toBe(0)
    expect(getPoseBlendDuration("groom")).toBeGreaterThan(0)
  })

  it("softens the sparse wake-up stretch frames without blending the sleep transition", () => {
    expect(getPoseBlendDuration("wake")).toBe(220)
    expect(shouldBlendPoseTransitions("wake")).toBe(true)
    expect(shouldBlendPoseTransitions("settle")).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { JUMP_SHEET_PATH, MEASURED_FRAME_SHEETS } from "./neoburieCare"

describe("cursor-grab jump artwork", () => {
  it("uses the historical sheet where both front paws gather around the cursor", () => {
    expect(JUMP_SHEET_PATH).toBe("/neoburie-jump-v4.png")
    expect(MEASURED_FRAME_SHEETS).toContain("jump")
  })
})

import { describe, expect, it } from "vitest"
import { pounceMotion } from "./neoburieMotion"

describe("vertical toy pounce", () => {
  it("holds the feet during the crouch and returns them to the floor", () => {
    expect(pounceMotion(0, 220, 24)).toEqual({ lift: 0, travel: 0 })
    expect(pounceMotion(.17, 220, 24)).toEqual({ lift: 0, travel: 0 })
    expect(pounceMotion(1, 220, 24)).toEqual({ lift: 0, travel: 24 })
  })

  it("rises almost straight up and lingers near the apex", () => {
    const rising = pounceMotion(.4, 220, 24)
    const apex = pounceMotion(.58, 220, 24)

    expect(rising.lift).toBeGreaterThan(175)
    expect(rising.travel).toBeLessThan(6)
    expect(apex.lift).toBeGreaterThan(210)
    expect(apex.travel).toBeLessThan(12)
  })
})

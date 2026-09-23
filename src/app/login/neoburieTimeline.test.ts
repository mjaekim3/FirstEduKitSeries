import { expect, it } from "vitest"
import { poseTimeline } from "./neoburieTimeline"

function settlingFrame(at: number) {
  const { keys } = poseTimeline("settle", at)
  return keys.filter(key => key.at <= at).at(-1)!.pose
}

it("yawns wide and then blinks twice before closing the eyes for sleep", () => {
  expect([1050, 1550, 1800, 2600, 2850].map(settlingFrame))
    .toMatchObject([
      { sheet: "groom", frame: 0 }, { sheet: "yawnHalf", frame: 0 },
      { sheet: "yawnOpen", frame: 0 }, { sheet: "yawnHalf", frame: 0 },
      { sheet: "groom", frame: 0 },
    ])
  expect([3150, 3700, 3840, 4150, 4320, 4650, 5200, 5850, 6700].map(settlingFrame))
    .toMatchObject([
      { sheet: "rest", frame: 2 }, { sheet: "rest", frame: 3 },
      { sheet: "rest", frame: 2 }, { sheet: "rest", frame: 4 },
      { sheet: "rest", frame: 2 }, { sheet: "rest", frame: 3 },
      { sheet: "rest", frame: 4 }, { sheet: "rest", frame: 5 },
      { sheet: "sleep", frame: 0 },
    ])
})

it("stays seated from grooming into the yawn and keeps one head direction through sleep", () => {
  const groomingEnd = poseTimeline("groom", 6000).keys.at(-1)!.pose
  expect(groomingEnd).toMatchObject({ sheet: "groom", frame: 0 })
  expect(settlingFrame(0)).toMatchObject({ sheet: "groom", frame: 0 })
  for (const at of [3150, 5850, 6700]) expect(settlingFrame(at).mirror).toBe(true)
})

it("reaches the stretch quickly and holds the full extension", () => {
  const { keys } = poseTimeline("wake", 5300)
  expect(keys.filter(key => key.at >= 1350).map(key => [key.at, key.pose.sheet, key.pose.frame]))
    .toEqual([[1350, "wake", 1], [1550, "wake", 2], [2250, "wake", 3], [3650, "wake", 4], [4250, "wake", 5], [4900, "walk", 0]])
  expect(keys.at(-1)?.at).toBeLessThan(5300)
})

it("uses only complete-paw frames during the vertical jump", () => {
  const { keys } = poseTimeline("pounce", 940)
  expect(keys.map(key => [key.at, key.pose.frame]))
    .toEqual([[0, 0], [150, 1], [300, 1], [470, 4], [610, 4], [790, 5]])
})

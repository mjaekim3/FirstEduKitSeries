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

it("uses twelve distinct poses to move smoothly through the wake-up stretch", () => {
  const { keys } = poseTimeline("wake", 5300)
  const wakeKeys = keys.filter(key => key.pose.sheet === "wake")
  expect(wakeKeys.map(key => key.pose.frame)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  expect(Math.max(...wakeKeys.slice(1).map((key, index) => key.at - wakeKeys[index].at))).toBeLessThanOrEqual(500)
  expect(keys.at(-1)?.at).toBeLessThan(5300)
})

it("uses only complete-paw frames during the vertical jump", () => {
  const { keys } = poseTimeline("pounce", 940)
  expect(keys.map(key => [key.at, key.pose.frame]))
    .toEqual([[0, 0], [150, 1], [300, 1], [470, 4], [610, 4], [790, 5]])
})

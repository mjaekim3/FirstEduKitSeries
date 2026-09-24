export const CAT_TIMING = { settle: 6900, wake: 5300, groom: 6200, jump: 940, land: 280, stalk: 3200, swat: 1250 } as const

export type CareMode = "settle" | "wake" | "groom" | "pounce" | "land"
export type Pose = { sheet: "rest" | "groom" | "jump" | "wake" | "yawnHalf" | "yawnOpen" | "sleep" | "idle" | "walk"; frame: number; mirror?: boolean }
export type PoseKey = { at: number; pose: Pose }
const rest = (frame: number): Pose => ({ sheet: "rest", frame, mirror: frame >= 2 })
const wake = (frame: number): Pose => ({ sheet: "wake", frame, mirror: true })
const groom = (frame: number): Pose => ({ sheet: "groom", frame })
const jump = (frame: number): Pose => ({ sheet: "jump", frame })
const yawn = (open: boolean): Pose => ({ sheet: open ? "yawnOpen" : "yawnHalf", frame: 0 })
const asleep: Pose = { sheet: "sleep", frame: 0, mirror: true }
const standing: Pose = { sheet: "walk", frame: 0 }

export function poseTimeline(mode: CareMode, elapsed: number): { keys: PoseKey[]; time: number } {
  if (mode === "settle") return { time: elapsed, keys: [
    { at: 0, pose: groom(0) },
    { at: 1550, pose: yawn(false) }, { at: 1800, pose: yawn(true) },
    { at: 2600, pose: yawn(false) }, { at: 2850, pose: groom(0) },
    { at: 3150, pose: rest(2) },
    // Two quick drowsy blinks, then the eyelids stay lower until fully asleep.
    { at: 3700, pose: rest(3) }, { at: 3840, pose: rest(2) },
    { at: 4150, pose: rest(4) }, { at: 4320, pose: rest(2) },
    { at: 4650, pose: rest(3) }, { at: 5200, pose: rest(4) },
    { at: 5850, pose: rest(5) }, { at: 6700, pose: asleep },
  ] }
  if (mode === "wake") return { time: elapsed, keys: [
    { at: 0, pose: asleep }, { at: 200, pose: rest(5) },
    { at: 500, pose: rest(4) }, { at: 800, pose: rest(3) },
    { at: 1100, pose: wake(0) }, { at: 1400, pose: wake(1) },
    { at: 1700, pose: wake(2) }, { at: 2000, pose: wake(3) },
    { at: 2300, pose: wake(4) }, { at: 2600, pose: wake(5) },
    { at: 2900, pose: wake(6) }, { at: 3200, pose: wake(7) },
    { at: 3500, pose: wake(8) }, { at: 3900, pose: wake(9) },
    { at: 4300, pose: wake(10) }, { at: 4700, pose: wake(11) },
    { at: 5100, pose: standing },
  ] }
  if (mode === "groom") {
    if (elapsed < 450) return { time: elapsed, keys: [{ at: 0, pose: standing }, { at: 350, pose: groom(0) }] }
    if (elapsed >= 5750) return { time: elapsed - 5750, keys: [{ at: 0, pose: groom(0) }] }
    return { time: (elapsed - 450) % 2650, keys: [
      { at: 0, pose: groom(0) }, { at: 250, pose: groom(1) },
      { at: 480, pose: groom(2) }, { at: 670, pose: groom(1) },
      { at: 840, pose: groom(2) }, { at: 1010, pose: groom(1) },
      { at: 1210, pose: groom(3) }, { at: 1550, pose: groom(4) },
      { at: 1800, pose: groom(5) }, { at: 2050, pose: groom(3) },
      { at: 2280, pose: groom(4) }, { at: 2510, pose: groom(0) },
    ] }
  }
  if (mode === "land") return { time: elapsed, keys: [{ at: 0, pose: jump(5) }, { at: 220, pose: standing }] }
  return { time: elapsed, keys: [
    { at: 0, pose: jump(0) }, { at: 150, pose: jump(1) },
    { at: 300, pose: jump(1) }, { at: 470, pose: jump(4) },
    { at: 610, pose: jump(4) }, { at: 790, pose: jump(5) },
  ] }
}

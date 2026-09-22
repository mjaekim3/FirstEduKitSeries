export const CAT_TIMING = { settle: 6900, wake: 5300, groom: 6200, jump: 700, land: 280, stalk: 2200 } as const

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
    { at: 1100, pose: wake(0) }, { at: 1350, pose: wake(1) },
    // Reach the stretch promptly, then let the original full extension linger.
    { at: 1550, pose: wake(2) }, { at: 2250, pose: wake(3) },
    { at: 3650, pose: wake(4) }, { at: 4250, pose: wake(5) },
    { at: 4900, pose: standing },
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
    { at: 0, pose: jump(0) }, { at: 100, pose: jump(1) },
    { at: 225, pose: jump(2) }, { at: 325, pose: jump(3) },
    { at: 455, pose: jump(4) }, { at: 655, pose: jump(5) },
  ] }
}

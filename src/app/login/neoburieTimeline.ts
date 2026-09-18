export const CAT_TIMING = { settle: 2600, wake: 3400, groom: 6200, jump: 700, land: 280 } as const

export type CareMode = "settle" | "wake" | "groom" | "pounce" | "land"
export type Pose = { sheet: "rest" | "groom" | "jump"; frame: number } | { sheet: "sleep" | "idle"; frame: number; mirror?: boolean }
export type PoseKey = { at: number; pose: Pose }
const rest = (frame: number): Pose => ({ sheet: "rest", frame })
const groom = (frame: number): Pose => ({ sheet: "groom", frame })
const jump = (frame: number): Pose => ({ sheet: "jump", frame })
const asleep: Pose = { sheet: "sleep", frame: 0 }
const standing: Pose = { sheet: "idle", frame: 3 }

export function poseTimeline(mode: CareMode, elapsed: number): { keys: PoseKey[]; time: number } {
  if (mode === "settle") return { time: elapsed, keys: [
    { at: 0, pose: { sheet: "idle", frame: 3, mirror: true } }, { at: 300, pose: rest(0) },
    { at: 800, pose: rest(1) }, { at: 1350, pose: rest(2) },
    { at: 2000, pose: rest(3) }, { at: 2450, pose: asleep },
  ] }
  if (mode === "wake") return { time: elapsed, keys: [
    { at: 0, pose: asleep }, { at: 350, pose: rest(2) },
    { at: 620, pose: rest(3) }, { at: 750, pose: rest(2) },
    { at: 980, pose: rest(3) }, { at: 1100, pose: rest(2) },
    { at: 1450, pose: rest(4) }, { at: 1850, pose: rest(5) },
    { at: 2450, pose: rest(4) }, { at: 2750, pose: rest(0) },
    { at: 3180, pose: { sheet: "idle", frame: 3, mirror: true } },
  ] }
  if (mode === "groom") {
    if (elapsed < 450) return { time: elapsed, keys: [{ at: 0, pose: standing }, { at: 350, pose: groom(0) }] }
    if (elapsed >= 5750) return { time: elapsed - 5750, keys: [{ at: 0, pose: groom(0) }, { at: 350, pose: standing }] }
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

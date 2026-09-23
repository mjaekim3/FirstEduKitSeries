// @vitest-environment jsdom
import React from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import Neoburie from "./Neoburie"

vi.mock("./neoburieFace", () => ({
  createFacePainter: () => () => false,
  HELD_SHEET_PATH: "/neoburie-held-v2-4f-clean.png",
}))
let now = 0
let nextId = 0
const callbacks = new Map<number, FrameRequestCallback>()
let cat: HTMLElement
const history: string[] = []
function advance(duration: number) {
  act(() => {
    const end = now + duration
    while (now < end) {
      now = Math.min(end, now + 20)
      const batch = [...callbacks.values()]; callbacks.clear()
      batch.forEach(callback => callback(now))
      history.push(cat.className)
    }
  })
}
function move(x: number, y: number) {
  act(() => {
    const event = new Event("pointermove")
    Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y }, pointerType: { value: "mouse" }, buttons: { value: 0 } })
    window.dispatchEvent(event)
  })
}
beforeEach(() => {
  now = 0; nextId = 0; callbacks.clear(); history.length = 0
  vi.spyOn(performance, "now").mockImplementation(() => now)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(150)
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(200)
  vi.stubGlobal("React", React)
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callbacks.set(++nextId, callback); return nextId })
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id))
  cat = render(<Neoburie />).getByRole("button", { name: "너부리 들어보기" })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it("finishes grooming and gradually settles before sleeping", () => {
  advance(5100); expect(cat.classList.contains("is-groom")).toBe(true)
  advance(6200); expect(cat.classList.contains("is-settle")).toBe(true)
  advance(2300); expect(cat.classList.contains("is-settle")).toBe(true)
  advance(4600); expect(cat.classList.contains("is-sleep")).toBe(true)
})
it("keeps the last left-facing direction through settling and sleep", () => {
  cleanup()
  vi.stubGlobal("innerWidth", 5000)
  vi.spyOn(Math, "random").mockReturnValue(0)
  cat = render(<Neoburie />).getByRole("button", { name: "너부리 들어보기" })
  advance(5500)
  expect(cat.dataset.facing).toBe("left")
  advance(6000)
  expect(cat.classList.contains("is-settle")).toBe(true)
  expect(cat.dataset.facing).toBe("left")
  advance(7000)
  expect(cat.classList.contains("is-sleep")).toBe(true)
  expect(cat.dataset.facing).toBe("left")
  expect(cat.style.getPropertyValue("--cat-sleep-facing")).toBe("1")
  expect(cat.querySelector(".login-cat-sleep-scene .login-cat-sleep-bubble")).not.toBeNull()
})
it("completes the waking sequence before responding with a chase", () => {
  advance(18400); expect(cat.classList.contains("is-sleep")).toBe(true)
  move(850, 300); expect(cat.classList.contains("is-wake")).toBe(true)
  advance(1400); move(700, 350)
  advance(1000); expect(cat.classList.contains("is-wake")).toBe(true)
  advance(1000); expect(cat.classList.contains("is-wake")).toBe(true)
  advance(2000); expect(cat.classList.contains("is-walk")).toBe(true)
})
it("keeps pursuing a moving cursor and catches only after it stops", () => {
  move(600, 300); advance(1800)
  expect(cat.classList.contains("is-stalk")).toBe(true)
  advance(450)
  expect(cat.classList.contains("is-hunt")).toBe(true)
  history.length = 0
  for (let i = 0; i < 45; i++) { move(600 + Math.sin(i / 5) * 180, 300 + Math.cos(i / 5) * 40); advance(100) }
  expect(history.some(mode => mode.includes("is-pounce"))).toBe(false)
  expect(cat.classList.contains("is-hunt")).toBe(true)
  history.length = 0; advance(2200)
  expect(history.some(mode => mode.includes("is-pounce"))).toBe(true)
  expect(history.some(mode => mode.includes("is-land"))).toBe(true)
})
it("uses a paw swat instead of hunting when the cursor is close", () => {
  move(260, 220)
  expect(cat.classList.contains("is-swat")).toBe(true)
  expect(cat.style.getPropertyValue("--cat-art-scale")).toBe("1.04")
  advance(1300)
  expect(cat.classList.contains("is-walk")).toBe(true)
})

it("normalizes active pose sizes against the yawn and sleep artwork", () => {
  expect(cat.style.getPropertyValue("--cat-art-scale")).toBe("1.08")
  advance(18400)
  expect(cat.classList.contains("is-sleep")).toBe(true)
  expect(cat.style.getPropertyValue("--cat-art-scale")).toBe("1")
})

it("uses the redrawn held artwork and does not layer emoji birds over dizzy frames", () => {
  expect(cat.style.getPropertyValue("--held-sprite")).toContain("neoburie-held-v2-4f-clean.png")
  expect(cat.querySelector(".login-cat-dizzy-birds")).toBeNull()
  expect(cat.textContent).not.toMatch(/[🐤🐦]/u)
})

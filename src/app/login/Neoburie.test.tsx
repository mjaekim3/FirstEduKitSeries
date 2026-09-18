// @vitest-environment jsdom
import React from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import Neoburie from "./Neoburie"

vi.mock("./neoburieFace", () => ({ createFacePainter: () => () => false }))
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
  advance(400); expect(cat.classList.contains("is-sleep")).toBe(true)
})
it("completes the waking sequence before responding with a chase", () => {
  advance(14500); expect(cat.classList.contains("is-sleep")).toBe(true)
  move(850, 300); expect(cat.classList.contains("is-wake")).toBe(true)
  advance(1400); move(700, 350)
  advance(1800); expect(cat.classList.contains("is-wake")).toBe(true)
  advance(240); expect(cat.classList.contains("is-walk")).toBe(true)
})
it("keeps pursuing a moving cursor and catches only after it stops", () => {
  move(600, 300); advance(1550)
  expect(cat.classList.contains("is-hunt")).toBe(true)
  history.length = 0
  for (let i = 0; i < 45; i++) { move(600 + Math.sin(i / 5) * 180, 300 + Math.cos(i / 5) * 40); advance(100) }
  expect(history.some(mode => mode.includes("is-pounce"))).toBe(false)
  expect(cat.classList.contains("is-hunt")).toBe(true)
  history.length = 0; advance(2200)
  expect(history.some(mode => mode.includes("is-pounce"))).toBe(true)
  expect(history.some(mode => mode.includes("is-land"))).toBe(true)
})

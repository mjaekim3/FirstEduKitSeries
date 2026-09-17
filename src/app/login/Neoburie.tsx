"use client"

import { useEffect, useRef } from "react"

type CatMode = "walk" | "chase" | "sleep" | "held" | "drop"

export default function Neoburie() {
  const catRef = useRef<HTMLDivElement>(null)
  const birdRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cat = catRef.current
    const bird = birdRef.current
    if (!cat || !bird) return

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    let mode: CatMode = reducedMotion ? "sleep" : "walk"
    let frame = 0
    let lastTime = 0
    let lastActivity = performance.now()
    let modeUntil = 0
    let chaseStart = 0
    let stops = 0
    let heldPointerId: number | null = null
    let releaseRequested = false
    let earliestRelease = 0
    let x = 0, y = 0, targetX = 0, targetY = 0
    let birdX = 0, birdY = 0, birdBaseY = 0, birdDirection = 1

    const bounds = () => ({
      maxX: Math.max(0, window.innerWidth - cat.offsetWidth - 16),
      maxY: Math.max(0, window.innerHeight - cat.offsetHeight - 16),
    })
    const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))
    const draw = () => { cat.style.transform = `translate3d(${x}px, ${y}px, 0)` }

    const setMode = (next: CatMode) => {
      cat.classList.remove("is-walk", "is-chase", "is-sleep", "is-held", "is-drop")
      if (next === "sleep") cat.style.setProperty("--cat-facing", "1")
      cat.classList.add(`is-${next}`)
      bird.style.opacity = next === "chase" ? "1" : "0"
      mode = next
    }

    const chooseTarget = () => {
      const { maxX, maxY } = bounds()
      for (let attempt = 0; attempt < 5; attempt += 1) {
        targetX = clamp(x + (Math.random() - 0.5) * 440, maxX)
        targetY = clamp(y + (Math.random() - 0.5) * 440, maxY)
        if (Math.hypot(targetX - x, targetY - y) > 70) break
      }
    }

    const moveTowards = (nextX: number, nextY: number, speed: number, elapsed: number) => {
      const dx = nextX - x, dy = nextY - y
      const distance = Math.hypot(dx, dy)
      const step = speed * elapsed / 1000
      if (distance <= step) {
        x = nextX; y = nextY; draw()
        return true
      }
      x += dx / distance * step
      y += dy / distance * step
      if (Math.abs(dx) > 2) cat.style.setProperty("--cat-facing", dx > 0 ? "1" : "-1")
      draw()
      return false
    }

    const noteActivity = () => {
      lastActivity = performance.now()
      if (mode === "sleep" && !reducedMotion) {
        chooseTarget()
        setMode("walk")
      }
    }

    const dragCat = (event: PointerEvent) => {
      const { maxX, maxY } = bounds()
      x = clamp(event.clientX - cat.offsetWidth * 0.47, maxX)
      y = clamp(event.clientY - cat.offsetHeight * 0.1, maxY)
      draw()
    }

    const onCatPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      noteActivity()
      heldPointerId = event.pointerId
      releaseRequested = false
      earliestRelease = performance.now() + 950
      setMode("held")
      cat.setPointerCapture?.(event.pointerId)
      dragCat(event)
    }

    const onPointerMove = (event: PointerEvent) => {
      noteActivity()
      if (mode === "held" && heldPointerId === event.pointerId && !releaseRequested) dragCat(event)
    }

    const onPointerUp = (event: PointerEvent) => {
      noteActivity()
      if (heldPointerId !== event.pointerId) return
      releaseRequested = true
      heldPointerId = null
      if (cat.hasPointerCapture?.(event.pointerId)) cat.releasePointerCapture(event.pointerId)
    }

    const onCatKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      noteActivity()
      releaseRequested = true
      earliestRelease = performance.now() + 950
      setMode("held")
    }

    const onResize = () => {
      const { maxX, maxY } = bounds()
      x = clamp(x, maxX); y = clamp(y, maxY)
      targetX = clamp(targetX, maxX); targetY = clamp(targetY, maxY)
      draw()
    }

    const startChase = (time: number) => {
      birdDirection = x < bounds().maxX / 2 ? 1 : -1
      birdX = clamp(x + birdDirection * 125, window.innerWidth - 32)
      birdBaseY = Math.max(20, Math.min(window.innerHeight - 90, y + 25))
      birdY = birdBaseY
      bird.style.transform = `translate3d(${birdX}px, ${birdY}px, 0)`
      chaseStart = time
      setMode("chase")
    }

    const { maxX, maxY } = bounds()
    x = maxX * 0.12; y = maxY * 0.22
    draw(); cat.style.opacity = "1"
    chooseTarget(); setMode(mode)

    const roam = (time: number) => {
      const elapsed = Math.min(time - (lastTime || time), 32)
      lastTime = time

      if (mode === "held" && releaseRequested && time >= earliestRelease) {
        setMode("drop")
        modeUntil = time + 700
      } else if (mode === "drop" && time >= modeUntil) {
        if (reducedMotion) setMode("sleep")
        else { chooseTarget(); setMode("walk") }
      } else if (!reducedMotion && mode !== "held" && mode !== "drop" && mode !== "sleep" && time - lastActivity >= 5000) {
        setMode("sleep")
      } else if (mode === "walk" && moveTowards(targetX, targetY, 75, elapsed)) {
        stops += 1
        if (stops % 3 === 0) startChase(time)
        else chooseTarget()
      } else if (mode === "chase") {
        birdX += birdDirection * 105 * elapsed / 1000
        if (birdX < 16 || birdX > window.innerWidth - 48) birdDirection *= -1
        birdX = Math.max(16, Math.min(window.innerWidth - 48, birdX))
        birdY = birdBaseY + Math.sin(time / 180) * 22
        bird.style.transform = `translate3d(${birdX}px, ${birdY}px, 0)`
        const { maxX: chaseMaxX, maxY: chaseMaxY } = bounds()
        moveTowards(clamp(birdX - cat.offsetWidth / 2, chaseMaxX), clamp(birdY + 20, chaseMaxY), 135, elapsed)
        if (time - chaseStart > 4300) { chooseTarget(); setMode("walk") }
      }

      frame = requestAnimationFrame(roam)
    }

    cat.addEventListener("pointerdown", onCatPointerDown)
    cat.addEventListener("keydown", onCatKeyDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    window.addEventListener("pointerdown", noteActivity)
    window.addEventListener("keydown", noteActivity)
    window.addEventListener("wheel", noteActivity, { passive: true })
    window.addEventListener("touchstart", noteActivity, { passive: true })
    window.addEventListener("resize", onResize)
    frame = requestAnimationFrame(roam)

    return () => {
      cancelAnimationFrame(frame)
      cat.removeEventListener("pointerdown", onCatPointerDown)
      cat.removeEventListener("keydown", onCatKeyDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      window.removeEventListener("pointerdown", noteActivity)
      window.removeEventListener("keydown", noteActivity)
      window.removeEventListener("wheel", noteActivity)
      window.removeEventListener("touchstart", noteActivity)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <>
      <div ref={catRef} role="button" tabIndex={0} aria-label="너부리 들어보기" className="login-cat fixed left-0 top-0 z-0 h-40 w-[120px] opacity-0 sm:h-[200px] sm:w-[150px]">
        <div className="login-cat-pose h-full w-full">
          <div className="login-cat-sprite h-full w-full" />
          <div className="login-cat-sleep h-full w-full" />
          <span className="login-cat-sleep-bubble" aria-hidden="true" />
          <span className="login-cat-zzz" aria-hidden="true">Zzz</span>
        </div>
      </div>
      <div ref={birdRef} aria-hidden="true" className="login-bird pointer-events-none fixed left-0 top-0 z-0 h-8 w-8 opacity-0">
        <svg viewBox="0 0 32 32" shapeRendering="crispEdges" className="h-full w-full">
          <path d="M10 13h5v-5h7v4h4v9h-4v3H12v-3H8v-6h2Z" fill="#79a9ba" stroke="#536e7a" strokeWidth="1.5" />
          <path d="M10 14 3 9v8l7 3m13-7 6-3v8l-6 3" fill="#97c4d0" stroke="#536e7a" strokeWidth="1.5" className="login-bird-wings" />
          <path d="M26 16h5l-5 4Z" fill="#dba263" />
          <rect x="20" y="14" width="2" height="2" fill="#263e48" />
        </svg>
      </div>
    </>
  )
}

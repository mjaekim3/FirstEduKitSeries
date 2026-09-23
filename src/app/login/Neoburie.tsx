"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import { createFacePainter, HELD_SHEET_PATH } from "./neoburieFace"
import { CAT_TIMING, poseTimeline } from "./neoburieTimeline"
import { pounceMotion } from "./neoburieMotion"

type CatMode = "walk" | "chase" | "sleep" | "settle" | "wake" | "groom" | "stalk" | "swat" | "hunt" | "pounce" | "land" | "held" | "dizzy" | "drop"

const CAT_ART_SCALE: Record<CatMode, number> = {
  walk: 1.08, chase: 1.08, hunt: 1.08,
  sleep: 1, settle: 1, wake: 1, groom: 1,
  stalk: 1.08, swat: 1.04,
  pounce: 1.16, land: 1.16,
  held: .93, dizzy: 1.04, drop: .93,
}

export default function Neoburie() {
  const catRef = useRef<HTMLDivElement>(null)
  const faceRef = useRef<HTMLCanvasElement>(null)
  const birdRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cat = catRef.current
    const bird = birdRef.current
    if (!cat || !bird || !faceRef.current) return
    const face = faceRef.current
    const paintFace = createFacePainter(face)

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    let mode: CatMode = reducedMotion ? "sleep" : "walk"
    let frame = 0
    let lastTime = 0
    let lastActivity = performance.now()
    let modeUntil = 0
    let chaseStart = 0
    let stalkUntil = 0
    let swatStart = 0
    let huntStart = 0
    let pounceStart = 0
    let careStart = 0
    let idleRound = 0
    let jumpFrom = 0, jumpTo = 0, jumpHeight = 0
    let lookX = 0, lookY = 0
    let huntCooldown = 0
    let cursorMovedAt = 0
    let cursorX = 0, cursorY = 0
    let stops = 0
    let heldPointerId: number | null = null
    let releaseRequested = false
    let earliestRelease = 0
    let dizzy = false
    let spinScore = 0
    let dragDistance = 0
    let wriggleStrength = 0.015
    let lastDragX = 0, lastDragY = 0, lastDragTime = 0
    let lastDragAngle: number | null = null
    let x = 0, y = 0, targetX = 0, targetY = 0
    let birdX = 0, birdY = 0, birdBaseY = 0, birdDirection = 1
    let facing: 1 | -1 = 1
    let restingFacing: 1 | -1 = 1
    const setFacing = (direction: 1 | -1) => {
      facing = direction
      cat.style.setProperty("--cat-facing", String(direction))
      cat.style.setProperty("--cat-sleep-facing", String(-direction))
      cat.dataset.facing = direction === 1 ? "right" : "left"
    }

    const bounds = () => ({
      maxX: Math.max(0, window.innerWidth - cat.offsetWidth - 16),
      maxY: Math.max(0, window.innerHeight - cat.offsetHeight - 16),
    })
    const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))
    const draw = () => { cat.style.transform = `translate3d(${x}px, ${y}px, 0)` }

    const updateGaze = () => {
      const facing = cursorX > x + cat.offsetWidth / 2 ? 1 : -1
      lookX = Math.max(-5, Math.min(5, (cursorX - x - cat.offsetWidth * .75) * facing / 65))
      lookY = Math.max(-4, Math.min(4, (cursorY - y - cat.offsetHeight * .48) / 65))
    }

    const applyWriggle = () => {
      cat.style.setProperty("--cat-wriggle-strength", wriggleStrength.toFixed(3))
    }

    const setMode = (next: CatMode) => {
      cat.classList.remove("is-walk", "is-chase", "is-sleep", "is-settle", "is-wake", "is-groom", "is-stalk", "is-swat", "is-hunt", "is-pounce", "is-land", "is-held", "is-dizzy", "is-drop")
      cat.classList.add(`is-${next}`)
      bird.style.opacity = next === "chase" ? "1" : "0"
      if (next !== "pounce") cat.style.setProperty("--cat-lift", "0px")
      cat.style.setProperty("--cat-art-scale", String(CAT_ART_SCALE[next]))
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
      if (Math.abs(dx) > 2) setFacing(dx > 0 ? 1 : -1)
      draw()
      return false
    }

    const noteActivity = () => {
      lastActivity = performance.now()
      if ((mode === "sleep" || mode === "settle") && !reducedMotion) {
        if (mode === "settle") {
          const settling = lastActivity - careStart
          if (settling < 3150) { chooseTarget(); setMode("walk"); return }
          // Reverse from the current eyelid pose, including either quick blink.
          const { keys } = poseTimeline("settle", settling)
          let poseIndex = keys.length - 1
          while (poseIndex > 0 && keys[poseIndex].at > settling) poseIndex--
          const pose = keys[poseIndex].pose
          const wakeElapsed = pose.sheet === "sleep" ? 0 : pose.frame === 5 ? 200 : pose.frame === 4 ? 500 : pose.frame === 3 ? 800 : 1100
          careStart = lastActivity - wakeElapsed
        } else careStart = lastActivity
        modeUntil = careStart + CAT_TIMING.wake
        setMode("wake")
      } else if (mode === "groom" && !reducedMotion) {
        chooseTarget(); setMode("walk")
      }
    }

    const dragCat = (event: PointerEvent) => {
      const { maxX, maxY } = bounds()
      x = clamp(event.clientX - cat.offsetWidth * 0.47, maxX)
      y = clamp(event.clientY - cat.offsetHeight * 0.1, maxY)
      draw()
    }

    const trackSpin = (event: PointerEvent) => {
      const dx = event.clientX - lastDragX
      const dy = event.clientY - lastDragY
      const distance = Math.hypot(dx, dy)
      const elapsed = Math.max(0, event.timeStamp - lastDragTime)
      const speed = distance * 1000 / Math.max(16, elapsed)
      wriggleStrength = Math.max(wriggleStrength, Math.min(0.14, speed / 7500))
      applyWriggle()
      spinScore = Math.max(0, spinScore - elapsed * 0.002)
      if (distance > 7 && elapsed < 250) {
        const angle = Math.atan2(dy, dx)
        if (lastDragAngle !== null) {
          const turn = Math.atan2(Math.sin(angle - lastDragAngle), Math.cos(angle - lastDragAngle))
          spinScore += Math.abs(turn) * Math.min(1, distance / 20)
        }
        lastDragAngle = angle
        dragDistance += distance
      } else if (elapsed >= 250) {
        lastDragAngle = null
        dragDistance = 0
      }
      lastDragX = event.clientX
      lastDragY = event.clientY
      lastDragTime = event.timeStamp
      if (!dizzy && spinScore > 5 && dragDistance > 260) {
        dizzy = true
        cat.classList.add("is-dizzy")
      }
    }

    const onCatPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      noteActivity()
      heldPointerId = event.pointerId
      releaseRequested = false
      earliestRelease = performance.now() + 950
      dizzy = false
      spinScore = 0
      dragDistance = 0
      lastDragAngle = null
      lastDragX = event.clientX
      lastDragY = event.clientY
      lastDragTime = event.timeStamp
      wriggleStrength = 0.015
      applyWriggle()
      setMode("held")
      cat.setPointerCapture?.(event.pointerId)
      dragCat(event)
    }

    const onPointerMove = (event: PointerEvent) => {
      noteActivity()
      if (mode === "held" && heldPointerId === event.pointerId && !releaseRequested) {
        trackSpin(event)
        dragCat(event)
        return
      }
      if (event.pointerType === "mouse" && event.buttons === 0 && !reducedMotion &&
          (mode === "walk" || mode === "chase" || mode === "stalk" || mode === "swat" || mode === "hunt" || mode === "pounce")) {
        if (Math.hypot(event.clientX - cursorX, event.clientY - cursorY) > 1) cursorMovedAt = performance.now()
        cursorX = event.clientX
        cursorY = event.clientY
        updateGaze()
        if ((mode === "walk" || mode === "chase") && cursorMovedAt >= huntCooldown) {
          const cursorDistance = Math.hypot(cursorX - x - cat.offsetWidth / 2, cursorY - y - cat.offsetHeight / 2)
          if (cursorDistance > 180) {
            stalkUntil = cursorMovedAt + CAT_TIMING.stalk
            setMode("stalk")
          } else if (cursorDistance > 30) {
            swatStart = cursorMovedAt
            modeUntil = swatStart + CAT_TIMING.swat
            setFacing(cursorX > x + cat.offsetWidth / 2 ? 1 : -1)
            setMode("swat")
          }
        }
      }
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
    draw(); setFacing(facing); cat.style.opacity = "1"
    chooseTarget(); setMode(mode)

    const roam = (time: number) => {
      const elapsed = Math.min(time - (lastTime || time), 32)
      lastTime = time

      if (mode === "held" || mode === "dizzy") {
        wriggleStrength = Math.max(0.015, wriggleStrength - elapsed * 0.0001)
        applyWriggle()
      }

      if (mode === "held" && releaseRequested && time >= earliestRelease) {
        setMode(dizzy ? "dizzy" : "drop")
        modeUntil = time + (dizzy ? 1700 : 700)
      } else if (mode === "dizzy" && time >= modeUntil) {
        setMode("drop")
        modeUntil = time + 700
      } else if (mode === "drop" && time >= modeUntil) {
        if (reducedMotion) setMode("sleep")
        else { chooseTarget(); setMode("walk") }
      } else if (!reducedMotion && mode !== "held" && mode !== "dizzy" && mode !== "drop" && mode !== "sleep" && mode !== "settle" && mode !== "wake" && mode !== "groom" && mode !== "stalk" && mode !== "swat" && mode !== "hunt" && mode !== "pounce" && mode !== "land" && time - lastActivity >= 5000) {
        careStart = time
        restingFacing = facing
        const next = idleRound++ % 2 === 0 ? "groom" : "settle"
        modeUntil = time + CAT_TIMING[next]
        setMode(next)
      } else if (mode === "wake" && time >= modeUntil) {
        lastActivity = time
        huntCooldown = time + 1000
        chooseTarget(); setMode("walk")
      } else if (mode === "groom" && time >= modeUntil) {
        setFacing(restingFacing)
        careStart = time; modeUntil = time + CAT_TIMING.settle; setMode("settle")
      } else if (mode === "settle" && time >= modeUntil) {
        setFacing(restingFacing)
        setMode("sleep")
      } else if (mode === "stalk") {
        setFacing(cursorX > x + cat.offsetWidth / 2 ? 1 : -1)
        updateGaze()
        if (time >= stalkUntil) {
          huntStart = time
          setMode("hunt")
        } else if (time - cursorMovedAt > 2200) {
          chooseTarget(); setMode("walk")
          huntCooldown = time + 1400
        }
      } else if (mode === "swat") {
        setFacing(cursorX > x + cat.offsetWidth / 2 ? 1 : -1)
        if (time >= modeUntil) {
          chooseTarget()
          huntCooldown = time + 650
          setMode("walk")
        }
      } else if (mode === "hunt") {
        const facing = cursorX >= x + cat.offsetWidth / 2 ? 1 : -1
        const nextX = clamp(cursorX - cat.offsetWidth * (facing > 0 ? .75 : .25), bounds().maxX)
        const nextY = clamp(cursorY - cat.offsetHeight * .4, bounds().maxY)
        const distance = Math.hypot(nextX - x, nextY - y)
        setFacing(facing)
        moveTowards(nextX, nextY, Math.min(460, 140 + (time - huntStart) * .6), elapsed)
        // Keep tracking indefinitely while the toy moves. Catch only after it settles nearby.
        if (time - cursorMovedAt >= 220 && distance < 100) {
          pounceStart = time
          jumpFrom = x
          jumpTo = clamp(x + Math.max(-22, Math.min(22, nextX - x)), bounds().maxX)
          jumpHeight = Math.min(Math.max(180, y + cat.offsetHeight * .9 - cursorY), 260)
          setMode("pounce")
          modeUntil = time + CAT_TIMING.jump
        }
      } else if (mode === "pounce") {
        const progress = Math.min(1, (time - pounceStart) / CAT_TIMING.jump)
        const motion = pounceMotion(progress, jumpHeight, jumpTo - jumpFrom)
        const lift = motion.lift
        x = jumpFrom + motion.travel
        cat.style.setProperty("--cat-lift", `${-lift}px`)
        draw()
        if (time >= modeUntil) {
          setMode("land")
          careStart = time
          modeUntil = time + CAT_TIMING.land
        }
      } else if (mode === "land") {
        if (time >= modeUntil) {
          if (cursorMovedAt > pounceStart) { huntStart = time; setMode("hunt") }
          else { chooseTarget(); setMode("walk"); huntCooldown = time + 350 }
        }
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

      const faceMode = cat.classList.contains("is-dizzy") ? "dizzy" : mode === "held" || mode === "stalk" || mode === "swat" || mode === "pounce" || mode === "land" || mode === "wake" || mode === "groom" || mode === "settle" ? mode : null
      const stalkPhase = Math.max(0, Math.min(1, (time - stalkUntil + CAT_TIMING.stalk) / CAT_TIMING.stalk))
      const focus = Math.max(0, Math.min(1, (stalkPhase - .12) / .38))
      const painted = paintFace(faceMode, reducedMotion ? 0 : time, focus * focus * (3 - 2 * focus), lookX, lookY, mode === "wake" || mode === "groom" || mode === "settle" || mode === "land" ? (time - careStart) / CAT_TIMING[mode] : mode === "stalk" ? stalkPhase : mode === "swat" ? Math.min(1, (time - swatStart) / CAT_TIMING.swat) : Math.min(1, (time - pounceStart) / CAT_TIMING.jump))
      cat.classList.toggle("has-painted-pose", painted)
      cat.classList.toggle("uses-atlas", painted && face.dataset.atlas === "true")
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
      {/* Absolute animation scale: the 543×724 walking frame renders at 120×160 / 150×200 CSS px. See docs/neoburie/animation-frame-lock.md. */}
      <div ref={catRef} role="button" tabIndex={0} aria-label="너부리 들어보기" style={{ "--held-sprite": `url(${HELD_SHEET_PATH})` } as CSSProperties} className="login-cat fixed left-0 top-0 h-40 w-[120px] opacity-0 sm:h-[200px] sm:w-[150px]">
        <div className="login-cat-pose h-full w-full">
          <div className="login-cat-art h-full w-full">
            <div className="login-cat-sprite h-full w-full" />
            <canvas ref={faceRef} width={543} height={724} className="login-cat-face" aria-hidden="true" />
          </div>
          <div className="login-cat-sleep-scene h-full w-full">
            <div className="login-cat-sleep h-full w-full" />
            <div className="login-cat-sleep-ear h-full w-full" />
            <svg className="login-cat-sleep-bubble" viewBox="0 0 28 18" aria-hidden="true">
              <path d="M1 9 C6 8 8 2 17 2 C23 2 27 6 27 10 C27 15 23 17 17 16 C8 15 6 10 1 9 Z" />
            </svg>
            <div className="login-cat-bubble-pop" aria-hidden="true"><i /><i /><i /><i /></div>
          </div>
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

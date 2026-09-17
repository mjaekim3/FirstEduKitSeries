"use client"

import { useEffect, useRef } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const catRef = useRef<HTMLDivElement>(null)
  const birdRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cat = catRef.current
    const bird = birdRef.current
    if (!cat || !bird) return

    type CatMode = "walk" | "idle" | "sparkle" | "sleep" | "hunt" | "chase"
    let frame = 0
    let lastTime = 0
    let modeUntil = 0
    let chaseStart = 0
    let stops = 0
    let mode: CatMode = "walk"
    let x = 0
    let y = 0
    let targetX = 0
    let targetY = 0
    let birdX = 0
    let birdY = 0
    let birdBaseY = 0
    let birdDirection = 1

    const bounds = () => ({
      maxX: Math.max(0, window.innerWidth - cat.offsetWidth - 16),
      maxY: Math.max(0, window.innerHeight - cat.offsetHeight - 16),
    })

    const draw = () => {
      cat.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    const setMode = (next: CatMode) => {
      // CSS uses is-moving (walk/chase) and is-hopping (idle bounce)
      cat.classList.remove("is-moving", "is-hopping")
      if (next === "walk" || next === "chase") cat.classList.add("is-moving")
      if (next === "idle") cat.classList.add("is-hopping")
      bird.style.opacity = next === "chase" ? "1" : "0"
      mode = next
    }

    const chooseTarget = () => {
      const { maxX, maxY } = bounds()
      targetX = Math.max(0, Math.min(maxX, x + (Math.random() - 0.5) * 440))
      targetY = Math.max(0, Math.min(maxY, y + (Math.random() - 0.5) * 440))
    }

    const moveTowards = (nextX: number, nextY: number, speed: number, elapsed: number) => {
      const dx = nextX - x
      const dy = nextY - y
      const distance = Math.hypot(dx, dy)
      const step = (speed * elapsed) / 1000
      if (distance <= step) {
        x = nextX
        y = nextY
        draw()
        return true
      }
      x += (dx / distance) * step
      y += (dy / distance) * step
      if (Math.abs(dx) > 2) cat.style.setProperty("--cat-facing", dx > 0 ? "1" : "-1")
      draw()
      return false
    }

    const { maxX, maxY } = bounds()
    x = maxX * 0.12
    y = maxY * 0.22
    draw()
    cat.style.opacity = "1"

    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      chooseTarget()
      setMode("walk")
      const roam = (time: number) => {
        const elapsed = Math.min(time - (lastTime || time), 32)
        lastTime = time

        if (mode === "walk" && moveTowards(targetX, targetY, 75, elapsed)) {
          stops += 1
          setMode("idle")
          modeUntil = time + 1000
        } else if (mode === "idle" && time >= modeUntil) {
          if (stops % 3 === 1) {
            setMode("sparkle")
            modeUntil = time + 1100
          } else if (stops % 3 === 2) {
            setMode("sleep")
            modeUntil = time + 4800
          } else {
            setMode("hunt")
            modeUntil = time + 1900
          }
        } else if ((mode === "sparkle" || mode === "sleep") && time >= modeUntil) {
          chooseTarget()
          setMode("walk")
        } else if (mode === "hunt" && time >= modeUntil) {
          birdDirection = x < bounds().maxX / 2 ? 1 : -1
          birdX = Math.max(0, Math.min(window.innerWidth - 32, x + birdDirection * 125))
          birdBaseY = Math.max(20, Math.min(window.innerHeight - 90, y + 25))
          birdY = birdBaseY
          chaseStart = time
          setMode("chase")
        } else if (mode === "chase") {
          birdX += birdDirection * (105 * elapsed) / 1000
          if (birdX < 16 || birdX > window.innerWidth - 48) birdDirection *= -1
          birdX = Math.max(16, Math.min(window.innerWidth - 48, birdX))
          birdY = birdBaseY + Math.sin(time / 180) * 22
          bird.style.transform = `translate3d(${birdX}px, ${birdY}px, 0)`
          const { maxX, maxY } = bounds()
          moveTowards(Math.max(0, Math.min(maxX, birdX - cat.offsetWidth / 2)), Math.max(0, Math.min(maxY, birdY + 20)), 135, elapsed)
          if (time - chaseStart > 4300) {
            chooseTarget()
            setMode("walk")
          }
        }
        frame = requestAnimationFrame(roam)
      }
      frame = requestAnimationFrame(roam)
    } else {
      setMode("idle")
    }

    const onResize = () => {
      const { maxX, maxY } = bounds()
      x = Math.min(x, maxX)
      y = Math.min(y, maxY)
      targetX = Math.min(targetX, maxX)
      targetY = Math.min(targetY, maxY)
      draw()
    }
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      className="login-scene min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_top,#fafcf8_0%,#e8f0e9_60%,#dce9df_100%)]"
    >
      <div
        ref={catRef}
        aria-hidden="true"
        className="login-cat pointer-events-none fixed left-0 top-0 z-0 h-40 w-[120px] opacity-0 sm:h-[200px] sm:w-[150px]"
      >
        <div className="login-cat-pose h-full w-full">
          <div className="login-cat-sprite h-full w-full" />
          <div className="login-cat-sleep h-full w-full" />
          <div className="login-cat-sparkles"><span /><span /></div>
          <div className="login-cat-hunt-eyes"><span /><span /></div>
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

      <div className="relative z-10 w-80 space-y-6 rounded-2xl border border-[#d7e4d9] bg-white/90 p-10 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-gray-800">FirstEduKit Series</h1>

        <button
          type="button"
          onClick={() => void signIn("google", { redirectTo: "/" })}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 transition"
        >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.2-10.6 7.2-17.2z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.9-6c-2.1 1.4-4.8 2.3-7.9 2.3-6 0-11.2-4.1-13-9.6H2.9v6.2C6.8 42.6 14.8 48 24 48z"/>
              <path fill="#FBBC05" d="M11 28.9c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.9C1 17.5 0 20.6 0 24s1 6.5 2.9 9.1l8.1-4.2z"/>
              <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6C35.9 2.5 30.4 0 24 0 14.8 0 6.8 5.4 2.9 13.3l8.1 4.2z"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Google로 로그인</span>
        </button>
      </div>

      <p className="relative z-10 mt-6 text-xs text-gray-600">Made by Mr. Raccoon</p>
    </div>
  )
}

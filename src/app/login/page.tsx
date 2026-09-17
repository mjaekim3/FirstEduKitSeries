"use client"

import { useState, useEffect, useRef } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const [catPos, setCatPos] = useState({ x: -100, y: -100 })
  const [phase, setPhase] = useState<"follow" | "goto" | "sit">("follow")
  const mousePos = useRef({ x: 200, y: 300 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const animFrame = useRef<number>(0)
  const phaseRef = useRef<"follow" | "goto" | "sit">("follow")

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
      if (phaseRef.current === "sit") {
        phaseRef.current = "follow"
        setPhase("follow")
      }
    }
    window.addEventListener("mousemove", onMove)

    // 4초 후 버튼으로 달려감
    const t = setTimeout(() => {
      phaseRef.current = "goto"
      setPhase("goto")
      const btn = btnRef.current
      if (btn) {
        const r = btn.getBoundingClientRect()
        setCatPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }
      setTimeout(() => {
        phaseRef.current = "sit"
        setPhase("sit")
      }, 800)
    }, 4000)

    const loop = () => {
      if (phaseRef.current === "follow") {
        setCatPos(prev => ({
          x: prev.x + (mousePos.current.x - prev.x) * 0.15,
          y: prev.y + (mousePos.current.y - prev.y) * 0.15,
        }))
      }
      animFrame.current = requestAnimationFrame(loop)
    }
    animFrame.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener("mousemove", onMove)
      cancelAnimationFrame(animFrame.current)
      clearTimeout(t)
    }
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{
        backgroundImage: "url('/neoburie.jpg')",
        backgroundSize: "300px 300px",
        backgroundRepeat: "repeat",
        cursor: phase === "sit" ? "default" : "none",
      }}
    >
      <div className="absolute inset-0 bg-white/30" />

      {/* 너부리 커서 */}
      <img
        src="/neoburie_cursor.png"
        alt=""
        style={{
          position: "fixed",
          left: catPos.x - 40,
          top: catPos.y - 40,
          width: 80,
          height: 80,
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          transition: phase === "goto" ? "left 0.7s ease, top 0.7s ease" : undefined,
          transform: phase === "sit" ? "scale(1.2)" : "scale(1)",
        }}
      />

      <div className="relative z-10 bg-white/90 p-10 rounded-2xl shadow-xl text-center space-y-6 w-80">
        <h1 className="text-2xl font-bold text-gray-800">FirstEduKit Series</h1>

        <button
          ref={btnRef}
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

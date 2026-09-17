"use client"

import { signIn } from "next-auth/react"
import Neoburie from "./Neoburie"

export default function LoginPage() {
  return (
    <div className="login-scene relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#fafcf8_0%,#e8f0e9_60%,#dce9df_100%)]">
      <Neoburie />

      <div className="relative z-10 w-80 space-y-6 rounded-2xl border border-[#d7e4d9] bg-white/90 p-10 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-gray-800">FirstEduKit Series</h1>
        <button
          type="button"
          onClick={() => void signIn("google", { redirectTo: "/" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 transition hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.2-10.6 7.2-17.2z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.9-6c-2.1 1.4-4.8 2.3-7.9 2.3-6 0-11.2-4.1-13-9.6H2.9v6.2C6.8 42.6 14.8 48 24 48z" />
            <path fill="#FBBC05" d="M11 28.9c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.9C1 17.5 0 20.6 0 24s1 6.5 2.9 9.1l8.1-4.2z" />
            <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6C35.9 2.5 30.4 0 24 0 14.8 0 6.8 5.4 2.9 13.3l8.1 4.2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Google로 로그인</span>
        </button>
      </div>

      <p className="relative z-10 mt-6 text-xs text-gray-600">Made by Mr. Raccoon</p>
    </div>
  )
}

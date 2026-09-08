import { signIn } from "@/auth"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center space-y-6 w-80">
        <h1 className="text-2xl font-bold text-gray-800">FirstEduKit</h1>
        <p className="text-gray-500 text-sm">선생님 전용 로그인</p>
        <form action={async () => {
          "use server"
          await signIn("google", { redirectTo: "/" })
        }}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.2-10.6 7.2-17.2z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.9-6c-2.1 1.4-4.8 2.3-7.9 2.3-6 0-11.2-4.1-13-9.6H2.9v6.2C6.8 42.6 14.8 48 24 48z"/>
              <path fill="#FBBC05" d="M11 28.9c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H2.9C1 17.5 0 20.6 0 24s1 6.5 2.9 9.1l8.1-4.2z"/>
              <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6C35.9 2.5 30.4 0 24 0 14.8 0 6.8 5.4 2.9 13.3l8.1 4.2c1.8-5.5 6.9-8 13-8z"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">Google로 로그인</span>
          </button>
        </form>
      </div>
    </div>
  )
}

import { signOut } from "@/auth"

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md text-center space-y-4 w-80">
        <div className="text-3xl">⏳</div>
        <h1 className="text-lg font-bold text-gray-800">승인 대기 중</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          가입 신청이 접수되었습니다.<br />
          관리자 승인 후 이용하실 수 있습니다.
        </p>
        <form action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}>
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            다른 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  )
}

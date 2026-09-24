import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Supabase REST 직접 호출 (Edge/Node 모두 동작, 키가 없어도 로그인은 막지 않음)
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" }

// 승인이 필요한 경로 (HIFS 전용)
const APPROVAL_PATHS = ["/wlpe", "/api/sheets"]

async function isApproved(email: string) {
  if (!SB_URL || !SB_KEY) return false
  try {
    const r = await fetch(`${SB_URL}/rest/v1/approved_users?select=approved&email=eq.${encodeURIComponent(email)}`, { headers: sbHeaders })
    const rows = r.ok ? await r.json() : []
    return !!rows[0]?.approved
  } catch { return false }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      // 첫 로그인 시 approved_users에 등록 (실패해도 로그인은 진행)
      if (SB_URL && SB_KEY) {
        try {
          await fetch(`${SB_URL}/rest/v1/approved_users?on_conflict=email`, {
            method: "POST",
            headers: { ...sbHeaders, Prefer: "resolution=ignore-duplicates" },
            body: JSON.stringify([{ email: user.email }]),
          })
        } catch {}
      }
      return true
    },
    async authorized({ auth, request }) {
      if (!auth?.user?.email) return false
      const { pathname } = request.nextUrl
      if (APPROVAL_PATHS.some((p) => pathname.startsWith(p)) && !(await isApproved(auth.user.email))) {
        const url = request.nextUrl.clone()
        url.pathname = "/pending"
        return Response.redirect(url)
      }
      return true
    },
  },
})

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      // 첫 로그인 시 approved_users에 등록 (approved: false)
      await supabaseAdmin
        .from("approved_users")
        .upsert({ email: user.email }, { onConflict: "email", ignoreDuplicates: true })
      return true
    },
    async authorized({ auth, request }) {
      if (!auth?.user?.email) return false
      const { pathname } = request.nextUrl
      if (pathname === "/pending") return true
      // 승인 여부 체크
      const { data } = await supabaseAdmin
        .from("approved_users")
        .select("approved")
        .eq("email", auth.user.email)
        .single()
      if (!data?.approved) {
        const url = request.nextUrl.clone()
        url.pathname = "/pending"
        return Response.redirect(url)
      }
      return true
    },
  },
})

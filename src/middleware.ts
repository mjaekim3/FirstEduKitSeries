import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  if (!req.auth && pathname !== "/login" && pathname !== "/pending") {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\.jpg|.*\.png|.*\.svg|.*\.ico).*)"],
}

import { auth } from "@/auth"
export default auth

export const config = {
  matcher: ["/seating/:path*", "/wlpe/:path*"],
}

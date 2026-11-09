// proxy.ts (project root, or src/ if you use src)
import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import cookiesdb from "@/lib/db/models/cookiesdb"

const LOGIN_PATH = "/outh/u/login"

// Pages that skip the session check entirely (the email verify flow handles its own redirects)
const BYPASS_PATTERNS = [
  /^\/outh\/u\/email\/verify$/,               // /outh/u/email/verify?m=...
  /^\/outh\/u\/[^/]+\/email\/verify$/,        // /outh/u/<id>/email/verify
]
// Reachable while logged out: the login/register page
const PUBLIC_PATTERNS = [
  /^\/outh\/u\/[^/]+$/,
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  // Email verify route: no cookie check, no redirect from here
  if (BYPASS_PATTERNS.some((re) => re.test(pathname))) {
    return NextResponse.next()
  }

  let isAuthenticated = false
  const sessionToken = request.cookies.get("__sessionToken")?.value

  if (sessionToken) {
    try {
      await connectDB()
      const row = await cookiesdb.findOne(
        { sessionid: sessionToken },
        { sessionexp: 1, refexp: 1 }
      )
      const now = Date.now()
      if (row && row.sessionexp > now && row.refexp > now) {
        isAuthenticated = true
      }
    } catch (err) {
      console.error("Proxy DB check error:", err)
    }
  }

  const isPublic = PUBLIC_PATTERNS.some((re) => re.test(pathname))

  // Logged in on the login/register page: send to home
  if (isAuthenticated && isPublic) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (isAuthenticated || isPublic) {
    return NextResponse.next()
  }

  // Logged out on a protected page: clear the session cookie and send to login
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  response.cookies.delete("__sessionToken")
  response.cookies.delete("__refToken")
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
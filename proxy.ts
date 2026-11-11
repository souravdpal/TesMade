// proxy.ts
import { NextResponse, type NextRequest } from "next/server"
import crypto from "crypto"
import { connectDB } from "@/lib/config/mongodb"
import cookiesdb from "@/lib/db/models/cookiesdb"

const LOGIN_PATH = "/outh/u/login"
const SESSION_MS = 15 * 60 * 1000 // match createSession_token

const BYPASS_PATTERNS = [
  /^\/outh\/u\/email\/verify$/,
  /^\/outh\/u\/[^/]+\/email\/verify$/,
]
const PUBLIC_PATTERNS = [/^\/outh\/u\/[^/]+$/]

/** Valid refresh token -> atomically issue a new session token. */
async function refreshSession(refToken: string) {
  const now = Date.now()
  const token = crypto.randomBytes(32).toString("hex")
  const sessionexp = now + SESSION_MS
  const row = await cookiesdb.findOneAndUpdate(
    { refid: refToken, refexp: { $gt: now } },        // <-- field name: adjust
    { $set: { sessionid: token, sessionexp } },
    { returnDocument: "after", projection: { _id: 1 } }
  )
  return row ? { token, sessionexp } : null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }
  if (BYPASS_PATTERNS.some((re) => re.test(pathname))) {
    return NextResponse.next()
  }

  let isAuthenticated = false
  let refreshed: { token: string; sessionexp: number } | null = null

  try {
    await connectDB()
    const now = Date.now()

    const sessionToken = request.cookies.get("__sessionToken")?.value
    if (sessionToken) {
      const row = await cookiesdb.findOne(
        { sessionid: sessionToken },
        { sessionexp: 1, refexp: 1 }
      )
      if (row && row.sessionexp > now && row.refexp > now) isAuthenticated = true
    }

    // Session cookie missing/expired: try the refresh token
    if (!isAuthenticated) {
      const refToken = request.cookies.get("__refToken")?.value
      if (refToken) {
        refreshed = await refreshSession(refToken)
        if (refreshed) isAuthenticated = true
      }
    }
  } catch (err) {
    console.error("Proxy auth error:", err)
  }

  const isPublic = PUBLIC_PATTERNS.some((re) => re.test(pathname))

  const withCookie = (res: NextResponse) => {
    if (refreshed) {
      res.cookies.set("__sessionToken", refreshed.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(refreshed.sessionexp), // match how createSession_token sets it
      })
    }
    return res
  }

  if (isAuthenticated && isPublic) {
    return withCookie(NextResponse.redirect(new URL("/", request.url)))
  }

  if (isAuthenticated) {
    // Make the new cookie visible to server components in this same request
    if (refreshed) request.cookies.set("__sessionToken", refreshed.token)
    return withCookie(NextResponse.next({ request }))
  }

  if (isPublic) return NextResponse.next()

  // Both tokens invalid: only now clear cookies and send to login
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  response.cookies.delete("__sessionToken")
  response.cookies.delete("__refToken")
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
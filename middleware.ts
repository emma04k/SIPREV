import { NextResponse, type NextRequest } from 'next/server'

const authCookieNames = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
]

const privatePathPrefixes = ['/dashboard', '/cases', '/audit']

function hasAuthSessionCookie(request: NextRequest): boolean {
  return authCookieNames.some((cookieName) => Boolean(request.cookies.get(cookieName)?.value))
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const isPrivatePath = privatePathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (!isPrivatePath || hasAuthSessionCookie(request)) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/auth/login', request.url)
  loginUrl.searchParams.set('next', `${pathname}${search}`)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/dashboard/:path*', '/cases/:path*', '/audit/:path*'],
}

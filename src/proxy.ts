import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Zaštićene rute - treba login
  const protectedRoutes = ['/training', '/admin']
  const isProtected = protectedRoutes.some(r => path.startsWith(r))

  // Ako nije ulogiran i pokušava pristupiti zaštićenoj ruti
  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Ako je ulogiran i pokušava otvoriti /auth - preusmjeri na /training
  if (user && path === '/auth') {
    return NextResponse.redirect(new URL('/training', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|slike|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
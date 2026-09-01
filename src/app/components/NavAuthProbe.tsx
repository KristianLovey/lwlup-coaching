'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Jedino mjesto u navbaru koje dira Supabase.
 *
 * Odvojeno u vlastitu datoteku da bi `next/dynamic` iz njega napravio zaseban
 * chunk — inače `@supabase/ssr` (~64 KB gzip) završi u početnom bundleu SVAKE
 * javne stranice, iako posjetitelju koji nije prijavljen uopće ne treba.
 * Navbar ga montira tek kad postoji auth cookie.
 */
export default function NavAuthProbe({ onResolve }: { onResolve: (loggedIn: boolean) => void }) {
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => onResolve(!!user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => onResolve(!!session?.user),
    )
    return () => subscription.unsubscribe()
  }, [onResolve])

  return null
}

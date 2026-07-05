import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Supabase Admin client - NIKAD ne izlaži SUPABASE_SERVICE_ROLE_KEY na frontendu
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    // Provjeri je li pozivatelj admin (čitaj JWT iz Authorization headera)
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await adminClient
      .from('lifters')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, password: customPassword } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Nedostaje korisnik' }, { status: 400 })
    if (customPassword != null && customPassword !== '' && (typeof customPassword !== 'string' || customPassword.length < 8)) {
      return NextResponse.json({ error: 'Lozinka mora imati barem 8 znakova' }, { status: 400 })
    }

    // Admin ne smije mijenjati lozinku drugom adminu (zaštita glavnog računa)
    const { data: target } = await adminClient.from('lifters').select('role').eq('id', userId).single()
    if (target?.role === 'admin' && userId !== user.id) {
      return NextResponse.json({ error: 'Ne možeš mijenjati lozinku drugom adminu' }, { status: 403 })
    }

    // Admin može upisati lozinku; prazno polje → nasumična po korisniku.
    const password = (typeof customPassword === 'string' && customPassword.length >= 8)
      ? customPassword
      : 'Lwl-' + randomBytes(9).toString('base64url')

    const { error: updError } = await adminClient.auth.admin.updateUserById(userId, { password })
    if (updError) return NextResponse.json({ error: updError.message }, { status: 400 })

    return NextResponse.json({ userId, password })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

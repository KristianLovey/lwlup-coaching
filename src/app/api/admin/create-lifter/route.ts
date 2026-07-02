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

    // Kreiraj liftera
    const { email, fullName, category, squat, bench, deadlift } = await req.json()
    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email i ime su obavezni' }, { status: 400 })
    }

    // Nasumična lozinka po korisniku — vraća se adminu jednokratno u odgovoru.
    // (Fiksna default lozinka u kodu = svatko tko vidi repo zna lozinku svih novih računa.)
    const password = 'Lwl-' + randomBytes(9).toString('base64url')

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

    // Upsert profil — trigger može kreirati prazan red prije ovoga
    const { error: profileError } = await adminClient.from('lifters').upsert({
      id: newUser.user.id,
      full_name: fullName,
      role: 'lifter',
      weight_class: category || null,
      current_squat_1rm: squat ? Number(squat) : null,
      current_bench_1rm: bench ? Number(bench) : null,
      current_deadlift_1rm: deadlift ? Number(deadlift) : null,
    }, { onConflict: 'id' })

    if (profileError) console.error('profile upsert error:', profileError.message)

    return NextResponse.json({ userId: newUser.user.id, email, fullName, password })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

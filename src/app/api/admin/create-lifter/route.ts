import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Kreiraj liftera
    const { email, fullName } = await req.json()
    if (!email || !fullName) {
      return NextResponse.json({ error: 'Email i ime su obavezni' }, { status: 400 })
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: 'LwlupChange123!',
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

    // Kreiraj profil
    await adminClient.from('profiles').insert({
      id: newUser.user.id,
      full_name: fullName,
      role: 'lifter',
    })

    // Kreiraj prazan trening blok za liftera
    await adminClient.from('training_blocks').insert({
      user_id: newUser.user.id,
      name: 'Blok 1',
      data: [
        {
          weekNumber: 1,
          days: [
            { id: crypto.randomUUID(), dayNumber: 1, date: '', blocks: [] },
            { id: crypto.randomUUID(), dayNumber: 2, date: '', blocks: [] },
            { id: crypto.randomUUID(), dayNumber: 3, date: '', blocks: [] },
            { id: crypto.randomUUID(), dayNumber: 4, date: '', blocks: [] },
          ],
        },
      ],
      is_active: true,
    })

    return NextResponse.json({ userId: newUser.user.id, email, fullName })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const REHAB_EXERCISES = [
  { name: 'Wall Squat',             category: 'Knee Rehab', default_sets: 3, default_reps: 10, notes: '' },
  { name: 'Spanish Squat s trakom', category: 'Knee Rehab', default_sets: 3, default_reps: 10, notes: '' },
  { name: 'Box Squat',              category: 'Knee Rehab', default_sets: 3, default_reps: 8,  notes: '' },
]

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await adminClient
      .from('lifters')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const results = []
    for (const ex of REHAB_EXERCISES) {
      const { data, error } = await adminClient
        .from('exercises')
        .upsert(ex, { onConflict: 'name' })
        .select()
        .single()
      results.push({ name: ex.name, success: !error, error: error?.message })
    }

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'trener') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { weId, data } = await req.json()
    if (!weId || !data) return NextResponse.json({ error: 'Missing weId or data' }, { status: 400 })

    const ALLOWED_FIELDS = [
      'planned_sets', 'planned_reps', 'planned_weight_kg', 'planned_rpe',
      'planned_rest_seconds', 'planned_tempo', 'target_rpe', 'coach_note',
      'exercise_order', 'actual_weight_kg', 'actual_rpe', 'actual_note',
      // 'completed' intentionally excluded — only the lifter can mark exercises done
    ]
    const safe = Object.fromEntries(
      Object.entries(data).filter(([k]) => ALLOWED_FIELDS.includes(k))
    )
    if (Object.keys(safe).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    const { error } = await adminClient.from('workout_exercises').update(safe).eq('id', weId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

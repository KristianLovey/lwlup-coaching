import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
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

    const { workoutExerciseId, athleteId, setNumber, field, value } = await req.json()
    if (!workoutExerciseId || !athleteId || !setNumber || !field) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const ALLOWED_FIELDS = ['weight_kg', 'reps', 'rpe', 'completed']
    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    // Check if row already exists
    const { data: existing } = await adminClient
      .from('set_logs')
      .select('id')
      .eq('workout_exercise_id', workoutExerciseId)
      .eq('athlete_id', athleteId)
      .eq('set_number', setNumber)
      .maybeSingle()

    if (existing) {
      // Row exists — update the field
      const { error: updateErr } = await adminClient
        .from('set_logs')
        .update({ [field]: value })
        .eq('id', existing.id)
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    } else {
      // No row — insert
      const { error: insertErr } = await adminClient
        .from('set_logs')
        .insert({ workout_exercise_id: workoutExerciseId, athlete_id: athleteId, set_number: setNumber, [field]: value })
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

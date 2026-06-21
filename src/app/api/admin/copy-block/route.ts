import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TEMPLATE_MARK = '__template__'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await adminClient.from('lifters').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'trener') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sourceBlockId, targetAthleteId, name, asTemplate } = await req.json()
    if (!sourceBlockId || !targetAthleteId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: src, error: srcErr } = await adminClient
      .from('blocks')
      .select('*, weeks(*, workouts(*, workout_exercises(*)))')
      .eq('id', sourceBlockId).single()
    if (srcErr || !src) return NextResponse.json({ error: srcErr?.message ?? 'Source not found' }, { status: 404 })

    const { data: nb, error: nbErr } = await adminClient.from('blocks').insert({
      athlete_id: targetAthleteId,
      name: name || src.name,
      start_date: src.start_date, end_date: src.end_date,
      status: 'planned',
      goal: asTemplate ? TEMPLATE_MARK : (src.goal === TEMPLATE_MARK ? null : src.goal),
    }).select('id').single()
    if (nbErr || !nb) return NextResponse.json({ error: nbErr?.message ?? 'Insert failed' }, { status: 500 })

    for (const wk of (src.weeks ?? [])) {
      const { data: nw } = await adminClient.from('weeks').insert({
        block_id: nb.id, week_number: wk.week_number, start_date: wk.start_date, end_date: wk.end_date, notes: wk.notes ?? null,
      }).select('id').single()
      if (!nw) continue
      for (const wo of (wk.workouts ?? [])) {
        const { data: nwo } = await adminClient.from('workouts').insert({
          week_id: nw.id, athlete_id: targetAthleteId, day_name: wo.day_name, workout_date: wo.workout_date, completed: false, notes: wo.notes ?? null,
        }).select('id').single()
        if (!nwo) continue
        const exRows = (wo.workout_exercises ?? []).map((ex: any) => ({
          workout_id: nwo.id, exercise_id: ex.exercise_id, exercise_order: ex.exercise_order,
          planned_sets: ex.planned_sets, planned_reps: ex.planned_reps, planned_weight_kg: ex.planned_weight_kg,
          planned_rpe: ex.planned_rpe, planned_tempo: ex.planned_tempo, planned_rest_seconds: ex.planned_rest_seconds,
          target_rpe: ex.target_rpe, coach_note: ex.coach_note, set_plan: ex.set_plan ?? null,
        }))
        if (exRows.length) await adminClient.from('workout_exercises').insert(exRows)
      }
    }
    return NextResponse.json({ data: { id: nb.id } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Upisuje izračunati plan bloka (planer kilaža) u same vježbe.
 *
 * Klijent šalje gotove kilaže po tjednima — one iste koje trener vidi u tablici —
 * pa je upisano točno ono što je na ekranu. Ruta samo pronalazi vježbu u svakom
 * tjednu i postavlja kilažu, ponavljanja, broj serija i backoff (set_plan).
 *
 * Ako vježba u nekom tjednu fali, dodaje se u dan istog naziva kao u tjednu gdje
 * lift postoji (dani se zovu neujednačeno — "heavy", "Heavy", "vol+tech" — pa se
 * uspoređuje bez razlike u velikim slovima i razmacima), inače u prvi trening tog
 * tjedna. Ništa se ne briše.
 *
 * Service role jer piše po cijelom bloku liftera — zato je provjera role ovdje
 * jedina zaštita.
 */

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type SetPlanRow = { mode: 'manual' | 'backoff'; pct: number; ref: number }
type ExercisePlan = { exerciseId: string; kg: number | null; reps: number; sets: number; rpe: number | null; setPlan: SetPlanRow[] }
type WeekPlan = { week: number; primary: ExercisePlan | null; secondary: ExercisePlan | null }

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

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

    const { blockId, weeks } = (await req.json()) as { blockId?: string; weeks?: WeekPlan[] }
    if (!blockId || !Array.isArray(weeks) || weeks.length === 0) {
      return NextResponse.json({ error: 'Nedostaje blok ili plan po tjednima' }, { status: 400 })
    }

    // Trener smije samo svoje liftere; admin sve
    const { data: block } = await adminClient.from('blocks').select('athlete_id').eq('id', blockId).maybeSingle()
    if (!block) return NextResponse.json({ error: 'Blok ne postoji' }, { status: 404 })
    if (profile.role === 'trener') {
      const { data: assigned } = await adminClient.from('coach_assignments')
        .select('lifter_id').eq('coach_id', user.id).eq('lifter_id', block.athlete_id).maybeSingle()
      if (!assigned) return NextResponse.json({ error: 'Taj lifter nije tvoj' }, { status: 403 })
    }

    // Cijeli blok odjednom: tjedni → treninzi → vježbe
    const { data: weekRows, error: wErr } = await adminClient
      .from('weeks')
      .select('id, week_number, workouts(id, day_name, workout_exercises(id, exercise_id, exercise_order))')
      .eq('block_id', blockId)
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })

    type WoRow = { id: string; day_name: string | null; workout_exercises: { id: string; exercise_id: string; exercise_order: number }[] }
    const byWeek = new Map<number, WoRow[]>()
    for (const w of (weekRows ?? []) as any[]) {
      byWeek.set(Number(w.week_number), (w.workouts ?? []) as WoRow[])
    }

    // Dan u kojem lift već živi — po njemu se slaže tjedan u kojem vježba fali
    const refDay = new Map<string, string>()
    for (const wp of weeks) {
      for (const p of [wp.primary, wp.secondary]) {
        if (!p || refDay.has(p.exerciseId)) continue
        for (const wo of byWeek.get(wp.week) ?? []) {
          if (wo.workout_exercises?.some(we => we.exercise_id === p.exerciseId)) {
            refDay.set(p.exerciseId, norm(wo.day_name))
            break
          }
        }
      }
    }

    let updated = 0, created = 0
    const skipped: string[] = []

    const applyOne = async (weekNo: number, p: ExercisePlan | null) => {
      if (!p) return
      const workouts = byWeek.get(weekNo) ?? []
      if (workouts.length === 0) { skipped.push(`tjedan ${weekNo}: nema treninga`); return }

      const fields = {
        planned_weight_kg: p.kg,
        planned_reps: String(p.reps),
        planned_sets: Math.max(1, p.sets),
        target_rpe: p.rpe,
        set_plan: { rows: p.setPlan },
      }

      const host = workouts.find(wo => wo.workout_exercises?.some(we => we.exercise_id === p.exerciseId))
      if (host) {
        const we = host.workout_exercises.find(x => x.exercise_id === p.exerciseId)!
        const { error } = await adminClient.from('workout_exercises').update(fields).eq('id', we.id)
        if (error) { skipped.push(`tjedan ${weekNo}: ${error.message}`); return }
        updated++
        return
      }

      const day = refDay.get(p.exerciseId)
      const target = (day ? workouts.find(wo => norm(wo.day_name) === day) : null) ?? workouts[0]
      const order = Math.max(0, ...(target.workout_exercises ?? []).map(x => x.exercise_order ?? 0)) + 1
      const { error } = await adminClient.from('workout_exercises')
        .insert({ workout_id: target.id, exercise_id: p.exerciseId, exercise_order: order, ...fields })
      if (error) { skipped.push(`tjedan ${weekNo}: ${error.message}`); return }
      created++
    }

    for (const wp of weeks) {
      await applyOne(wp.week, wp.primary)
      await applyOne(wp.week, wp.secondary)
    }

    return NextResponse.json({ data: { updated, created, skipped } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

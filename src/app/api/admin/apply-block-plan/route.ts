import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildWrites, type WeekPlan, type WoRow } from './plan-layout'

/**
 * Upisuje izračunati plan bloka (planer kilaža) u same vježbe.
 *
 * Klijent šalje gotove kilaže po tjednima — one iste koje trener vidi u tablici —
 * pa je upisano točno ono što je na ekranu. Ruta samo pronalazi vježbu u svakom
 * tjednu i postavlja kilažu, ponavljanja, broj serija i backoff (set_plan).
 *
 * Ista vježba smije doći dvaput u istom tjednu (top set ponavljanja + fatigue
 * single). Unosi stižu u željenom redoslijedu, svaki dobiva svoj red u bloku, a
 * exercise_order se dodjeljuje tek kad su svi unosi tog dana složeni.
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
      .select('id, week_number, workouts(id, day_name, workout_exercises(id, exercise_id, exercise_order, planned_reps))')
      .eq('block_id', blockId)
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })

    const byWeek = new Map<number, WoRow[]>()
    for (const w of (weekRows ?? []) as any[]) {
      byWeek.set(Number(w.week_number), (w.workouts ?? []) as WoRow[])
    }

    const { updates, inserts, skipped } = buildWrites(weeks, byWeek)
    let updated = 0, created = 0

    const results = await Promise.all(
      updates.map(u => adminClient.from('workout_exercises').update(u.fields).eq('id', u.id)),
    )
    results.forEach((r, i) => {
      if (r.error) skipped.push(`izmjena ${i + 1}: ${r.error.message}`)
      else updated++
    })

    if (inserts.length > 0) {
      // broj redova je poznat unaprijed, pa ne ovisimo o count opciji klijenta
      const { error } = await adminClient.from('workout_exercises').insert(inserts)
      if (error) skipped.push(`dodavanje vjezbi: ${error.message}`)
      else created += inserts.length
    }

    return NextResponse.json({ data: { updated, created, skipped } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

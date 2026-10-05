import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { blockRowsFrom, matchPlan, type WeekEntries } from '@/lib/block-plan-match'

/**
 * Upisuje izračunati plan bloka (planer kilaža) u same vježbe.
 *
 * Aplikacija ne slaže strukturu bloka: ne dodaje vježbe, ne mijenja broj serija
 * ni backoff. Upis smije krenuti tek kad blok odgovara projekciji (isti broj
 * serija i isti broj ★ top setova u svakom tjednu — provjera u block-plan-match,
 * ista koju planer vrti uživo). Ako ne odgovara, ne piše se NIŠTA i vraća se
 * popis razlika.
 *
 * Piše se samo: kilaža i ponavljanja označenih top setova (set_logs) te sažetak
 * reda (planned_weight_kg / planned_reps / target_rpe). Već odrađene serije se
 * ne diraju — set_logs.weight_kg je ujedno i ono što je lifter stvarno digao.
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

    const { blockId, weeks } = (await req.json()) as { blockId?: string; weeks?: WeekEntries[] }
    if (!blockId || !Array.isArray(weeks) || weeks.length === 0) {
      return NextResponse.json({ error: 'Nedostaje blok ili plan po tjednima' }, { status: 400 })
    }
    // stari oblik (setPlan po vježbi) šalje samo neosvježena stranica
    if (weeks.some(w => !Array.isArray(w?.entries) || w.entries.some(e => !Array.isArray((e as any)?.tops)))) {
      return NextResponse.json({ error: 'Stara verzija planera — osvježi stranicu pa pokušaj ponovno.' }, { status: 400 })
    }
    if (weeks.some(w => w.entries.some(e => e.rowKg == null || e.tops.some(t => t.kg == null)))) {
      return NextResponse.json({ error: 'Plan nije potpun — neki tjedan nema kilažu top seta.' }, { status: 400 })
    }

    // Trener smije samo svoje liftere; admin sve
    const { data: block } = await adminClient.from('blocks').select('athlete_id').eq('id', blockId).maybeSingle()
    if (!block) return NextResponse.json({ error: 'Blok ne postoji' }, { status: 404 })
    if (profile.role === 'trener') {
      const { data: assigned } = await adminClient.from('coach_assignments')
        .select('lifter_id').eq('coach_id', user.id).eq('lifter_id', block.athlete_id).maybeSingle()
      if (!assigned) return NextResponse.json({ error: 'Taj lifter nije tvoj' }, { status: 403 })
    }

    // Struktura bloka: vježbe po tjednima sa serijama i zvjezdicama
    const { data: raw, error: rErr } = await adminClient
      .from('workout_exercises')
      .select('id, exercise_id, exercise_order, planned_sets, workouts!inner(workout_date, day_name, weeks!inner(week_number, block_id)), set_logs(set_number, is_top_set, completed, weight_kg)')
      .eq('workouts.weeks.block_id', blockId)
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

    const { problems, assignments } = matchPlan(weeks, blockRowsFrom(raw ?? []))
    if (problems.length > 0) {
      return NextResponse.json({ error: 'Blok ne odgovara projekciji', problems }, { status: 409 })
    }

    const skipped: string[] = []
    // svaki upis vraća poruku greške ili null — tip se izvodi sam, bez Supabase generika
    const writes: Promise<string | null>[] = []
    let sets = 0

    for (const { week, entry, row } of assignments) {
      writes.push((async () => {
        const { error } = await adminClient.from('workout_exercises').update({
          planned_weight_kg: entry.rowKg,
          planned_reps: String(entry.rowReps),
          ...(entry.rpe != null ? { target_rpe: entry.rpe } : {}),
        }).eq('id', row.id)
        return error?.message ?? null
      })())

      entry.tops.forEach((t, i) => {
        const setNumber = row.topSets[i]
        if (row.doneTopSets.includes(setNumber)) {
          skipped.push(`tj. ${week} · ${entry.label} S${setNumber} već odrađen`)
          return
        }
        sets++
        writes.push((async () => {
          const { error } = await adminClient.from('set_logs')
            .update({ weight_kg: t.kg, reps: String(t.reps) })
            .eq('workout_exercise_id', row.id)
            .eq('athlete_id', block.athlete_id)
            .eq('set_number', setNumber)
            .or('completed.is.null,completed.eq.false')
          return error?.message ?? null
        })())
      })
    }

    const failed = (await Promise.all(writes)).filter((m): m is string => m != null)
    if (failed.length > 0) {
      return NextResponse.json({ error: `Dio upisa nije prošao: ${failed[0]}`, data: { skipped } }, { status: 500 })
    }

    return NextResponse.json({ data: { exercises: assignments.length, sets, skipped } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

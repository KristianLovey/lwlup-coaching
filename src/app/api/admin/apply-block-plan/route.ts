import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  BLOCK_SHAPE_SELECT, blockShapeFrom, planApply, rowWrite,
  type PlanEntry, type WeekEntries,
} from '@/lib/block-plan-apply'

/**
 * Upisuje projekciju u blok — projekcija ima prednost (vidi block-plan-apply).
 *
 * Za svaki tjedan red vježbe dobije broj serija, ★ top setove, ponavljanja,
 * kilaže i backoff točno prema planu; vježba koja u tjednu fali se dodaje.
 * Započeti treninzi se ne diraju. Odluka što se mijenja donosi se istom
 * funkcijom koju planer vrti za pregled, nad svježim stanjem iz baze.
 *
 * Service role jer piše po cijelom bloku liftera — zato je provjera role ovdje
 * jedina zaštita.
 */

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const MAX_TOPS = 4
const MAX_BACKOFFS = 10

/** Je li unos plana cijel i u granicama — klijentu se ne vjeruje na riječ. */
function entryError(e: PlanEntry): string | null {
  if (!e || typeof e.exerciseId !== 'string' || !e.exerciseId) return 'unos bez vježbe'
  if (!Array.isArray(e.tops) || e.tops.length < 1 || e.tops.length > MAX_TOPS) return `${e.label}: 1–${MAX_TOPS} top seta`
  if (e.tops.some(t => t.kg == null || !(Number(t.kg) > 0) || !(Number(t.reps) >= 1))) return `${e.label}: top set bez kilaže ili ponavljanja`
  if (!Number.isInteger(e.mainIndex) || e.mainIndex < 0 || e.mainIndex >= e.tops.length) return `${e.label}: nema glavnog top seta`
  if (!Number.isInteger(e.backoffFrom) || e.backoffFrom < 0 || e.backoffFrom >= e.tops.length) return `${e.label}: backoff ne kreće ni od jednog top seta`
  if (!Number.isInteger(e.backoffSets) || e.backoffSets < 0 || e.backoffSets > MAX_BACKOFFS) return `${e.label}: 0–${MAX_BACKOFFS} backoff serija`
  if (e.backoffSets > 0 && !(Number(e.backoffPct) > 0)) return `${e.label}: backoff bez postotka`
  return null
}

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
    // stari oblik šalje samo neosvježena stranica
    if (weeks.some(w => !Array.isArray(w?.entries) || w.entries.some(e => typeof (e as any)?.mainIndex !== 'number'))) {
      return NextResponse.json({ error: 'Stara verzija planera — osvježi stranicu pa pokušaj ponovno.' }, { status: 400 })
    }
    for (const w of weeks) {
      for (const e of w.entries) {
        // planer otvoren prije ove verzije ne šalje backoffFrom — tada backoff ide od glavnog
        if (e && (e as any).backoffFrom === undefined) e.backoffFrom = e.mainIndex
        const msg = entryError(e)
        if (msg) return NextResponse.json({ error: `Plan nije potpun (${w.week}. tj.): ${msg}` }, { status: 400 })
      }
    }

    // Trener smije samo svoje liftere; admin sve
    const { data: block } = await adminClient.from('blocks').select('athlete_id').eq('id', blockId).maybeSingle()
    if (!block) return NextResponse.json({ error: 'Blok ne postoji' }, { status: 404 })
    if (profile.role === 'trener') {
      const { data: assigned } = await adminClient.from('coach_assignments')
        .select('lifter_id').eq('coach_id', user.id).eq('lifter_id', block.athlete_id).maybeSingle()
      if (!assigned) return NextResponse.json({ error: 'Taj lifter nije tvoj' }, { status: 403 })
    }

    const { data: raw, error: rErr } = await adminClient
      .from('workouts').select(BLOCK_SHAPE_SELECT).eq('weeks.block_id', blockId)
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

    const { targets, skips } = planApply(weeks, blockShapeFrom(raw ?? []))
    const athleteId = block.athlete_id

    // Svi redovi idu paralelno; unutar reda redom: red → serije → višak serija.
    // Svaki vraća poruku greške ili null.
    const results = await Promise.all(targets.map(async (t): Promise<string | null> => {
      const w = rowWrite(t.entry)
      const where = `${t.week}. tj. · ${t.entry.label}`

      let rowId: string
      if (t.kind === 'update') {
        rowId = t.row.id
        const { error } = await adminClient.from('workout_exercises').update(w.fields).eq('id', rowId)
        if (error) return `${where}: ${error.message}`
      } else {
        const { data, error } = await adminClient.from('workout_exercises')
          .insert({ workout_id: t.slot.id, exercise_id: t.entry.exerciseId, exercise_order: t.order, completed: false, ...w.fields })
          .select('id').single()
        if (error || !data) return `${where}: ${error?.message ?? 'red nije dodan'}`
        rowId = data.id
      }

      // completed i rpe se ne šalju — upsert dira samo poslane stupce
      const { error: lErr } = await adminClient.from('set_logs').upsert(
        w.logs.map(l => ({ workout_exercise_id: rowId, athlete_id: athleteId, ...l })),
        { onConflict: 'workout_exercise_id,set_number' },
      )
      if (lErr) return `${where} (serije): ${lErr.message}`

      if (t.kind === 'update' && t.row.plannedSets > w.fields.planned_sets) {
        const { error: dErr } = await adminClient.from('set_logs').delete()
          .eq('workout_exercise_id', rowId)
          .gt('set_number', w.fields.planned_sets)
          .or('completed.is.null,completed.eq.false')
        if (dErr) return `${where} (višak serija): ${dErr.message}`
      }
      return null
    }))

    const failed = results.filter((m): m is string => m != null)
    const created = targets.filter(t => t.kind === 'insert').length
    const data = {
      updated: targets.length - created,
      created,
      restructured: targets.filter(t => t.kind === 'update' && t.change != null).length,
      skipped: skips.map(s => `${s.week}. tj. · ${s.label}: ${s.reason}`),
    }
    if (failed.length > 0) {
      return NextResponse.json({ error: `Dio upisa nije prošao (${failed.length}): ${failed[0]}`, data }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

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

    const { blockId } = await req.json()
    if (!blockId) return NextResponse.json({ error: 'Missing blockId' }, { status: 400 })

    // Cascade delete: set_logs → workout_exercises → workouts → weeks → block
    const { data: weeks } = await adminClient.from('weeks').select('id').eq('block_id', blockId)
    const weekIds = (weeks ?? []).map((w: { id: string }) => w.id)

    if (weekIds.length > 0) {
      const { data: workouts } = await adminClient.from('workouts').select('id').in('week_id', weekIds)
      const workoutIds = (workouts ?? []).map((w: { id: string }) => w.id)

      if (workoutIds.length > 0) {
        const { data: wes } = await adminClient.from('workout_exercises').select('id').in('workout_id', workoutIds)
        const weIds = (wes ?? []).map((w: { id: string }) => w.id)

        if (weIds.length > 0) {
          await adminClient.from('set_logs').delete().in('workout_exercise_id', weIds)
        }
        await adminClient.from('workout_exercises').delete().in('workout_id', workoutIds)
      }
      await adminClient.from('workouts').delete().in('week_id', weekIds)
    }
    await adminClient.from('weeks').delete().eq('block_id', blockId)

    const { error } = await adminClient.from('blocks').delete().eq('id', blockId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Popis: { name mora točno matchati ime u athlete_stats, email, hasAthleteStats }
const ATHLETES = [
  { name: 'Lara Žic',         email: 'lara.zic.1306@gmail.com',   hasAthleteStats: true  },
  { name: 'Petar Rendulić',   email: 'pero.rendulic@gmail.com',    hasAthleteStats: true  },
  { name: 'Mateo Ljevar',     email: 'mateo.ljevar3@gmail.com',    hasAthleteStats: true  },
  { name: 'Ivan Petriček',    email: 'ivan.petricek03@gmail.com',  hasAthleteStats: true  },
  { name: 'Daren Grgičević',  email: 'dar3ng@gmail.com',           hasAthleteStats: true  },
  { name: 'Mia Šestan',       email: 'miasestan06@gmail.com',      hasAthleteStats: false },
  { name: 'Robert Lipohar',   email: 'lipoharrobert@gmail.com',    hasAthleteStats: true  },
  { name: 'Karlo Gulić',      email: 'karlogulic@gmail.com',       hasAthleteStats: true  },
]

export async function POST(req: NextRequest) {
  try {
    // Provjeri je li pozivatelj admin
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const results: Record<string, string>[] = []

    for (const athlete of ATHLETES) {
      const log: Record<string, string> = { name: athlete.name, email: athlete.email }

      // 1. Kreiraj auth usera
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: athlete.email,
        password: 'LwlupChange123!',
        email_confirm: true,
        user_metadata: { full_name: athlete.name },
      })

      if (createError) {
        log.status = 'ERROR'
        log.error = createError.message
        results.push(log)
        continue
      }

      const uid = newUser.user.id
      log.uid = uid

      // 2. Kreiraj profile
      const { error: profileError } = await adminClient.from('profiles').insert({
        id: uid,
        full_name: athlete.name,
        role: 'lifter',
      })

      if (profileError) {
        log.status = 'ERROR_PROFILE'
        log.error = profileError.message
        results.push(log)
        continue
      }

      // 3. Ako postoji u athlete_stats — poveži profile_id
      if (athlete.hasAthleteStats) {
        const { data: statRow, error: findError } = await adminClient
          .from('athlete_stats')
          .select('id')
          .ilike('name', athlete.name)
          .maybeSingle()

        if (findError || !statRow) {
          log.status = 'WARN_NO_ATHLETE_STATS'
          log.warn = `athlete_stats row not found for name "${athlete.name}"`
        } else {
          const { error: updateError } = await adminClient
            .from('athlete_stats')
            .update({ profile_id: uid })
            .eq('id', statRow.id)

          if (updateError) {
            log.status = 'WARN_UPDATE_FAILED'
            log.warn = updateError.message
          } else {
            log.athlete_stats_id = statRow.id
            log.status = 'OK'
          }
        }
      } else {
        log.status = 'OK_NO_STATS'
      }

      results.push(log)
    }

    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

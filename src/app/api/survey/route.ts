import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

const TO_EMAIL = 'lwlup.coaching@gmail.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      full_name, email, age, gender, bodyweight,
      experience, days_per_week, has_competed,
      squat, bench, deadlift,
      goals, injuries, additional
    } = body

    // 1. Spremi u Supabase
    const supabase = createClient()
    await supabase.from('questionnaire_responses').insert({
      full_name,
      email,
      age: parseInt(age),
      training_experience: experience,
      current_squat: parseFloat(squat),
      current_bench: parseFloat(bench),
      current_deadlift: parseFloat(deadlift),
      goals,
      injuries,
      additional_notes: `Spol: ${gender} | Težina: ${bodyweight}kg | Dane tjedno: ${days_per_week} | Natjecanja: ${has_competed}\n\n${additional}`,
      status: 'pending'
    })

    // 2. Pošalji email putem Resend (ili fallback na mailto log)
    // Ako imaš Resend API key, dodaj ga u .env.local kao RESEND_API_KEY
    const resendKey = process.env.RESEND_API_KEY

    if (resendKey) {
      const total = (parseFloat(squat) + parseFloat(bench) + parseFloat(deadlift)).toFixed(1)

      const html = `
        <div style="font-family: monospace; background: #050505; color: #fff; padding: 40px; max-width: 600px;">
          <h1 style="font-size: 28px; margin-bottom: 8px;">NOVA PRIJAVA 🏋️</h1>
          <p style="color: #666; margin-bottom: 30px;">LWLUP Coaching Upitnik</p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr><td colspan="2" style="padding: 12px 0; border-bottom: 1px solid #222; color: #888; font-size: 11px; letter-spacing: 3px;">OSOBNI PODACI</td></tr>
            <tr><td style="padding: 10px 0; color: #888; width: 40%;">Ime</td><td style="padding: 10px 0; color: #fff; font-weight: bold;">${full_name}</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Email</td><td style="padding: 10px 0; color: #fff;"><a href="mailto:${email}" style="color: #fff;">${email}</a></td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Dob</td><td style="padding: 10px 0; color: #fff;">${age} godina</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Spol</td><td style="padding: 10px 0; color: #fff;">${gender}</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Težina</td><td style="padding: 10px 0; color: #fff;">${bodyweight} kg</td></tr>

            <tr><td colspan="2" style="padding: 20px 0 12px 0; border-bottom: 1px solid #222; color: #888; font-size: 11px; letter-spacing: 3px;">TRENING</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Iskustvo</td><td style="padding: 10px 0; color: #fff;">${experience}</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Dana tjedno</td><td style="padding: 10px 0; color: #fff;">${days_per_week}</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Natjecanja</td><td style="padding: 10px 0; color: #fff;">${has_competed}</td></tr>

            <tr><td colspan="2" style="padding: 20px 0 12px 0; border-bottom: 1px solid #222; color: #888; font-size: 11px; letter-spacing: 3px;">MAKSIMALI</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Squat</td><td style="padding: 10px 0; color: #fff; font-size: 20px; font-weight: bold;">${squat} kg</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Bench</td><td style="padding: 10px 0; color: #fff; font-size: 20px; font-weight: bold;">${bench} kg</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">Deadlift</td><td style="padding: 10px 0; color: #fff; font-size: 20px; font-weight: bold;">${deadlift} kg</td></tr>
            <tr><td style="padding: 10px 0; color: #888;">TOTAL</td><td style="padding: 10px 0; color: #fff; font-size: 28px; font-weight: bold;">${total} kg</td></tr>

            <tr><td colspan="2" style="padding: 20px 0 12px 0; border-bottom: 1px solid #222; color: #888; font-size: 11px; letter-spacing: 3px;">CILJEVI</td></tr>
            <tr><td colspan="2" style="padding: 10px 0; color: #fff; line-height: 1.6;">${goals || '—'}</td></tr>

            <tr><td colspan="2" style="padding: 20px 0 12px 0; border-bottom: 1px solid #222; color: #888; font-size: 11px; letter-spacing: 3px;">OZLJEDE</td></tr>
            <tr><td colspan="2" style="padding: 10px 0; color: #fff; line-height: 1.6;">${injuries || '—'}</td></tr>

            ${additional ? `
            <tr><td colspan="2" style="padding: 20px 0 12px 0; border-bottom: 1px solid #222; color: #888; font-size: 11px; letter-spacing: 3px;">DODATNO</td></tr>
            <tr><td colspan="2" style="padding: 10px 0; color: #fff; line-height: 1.6;">${additional}</td></tr>
            ` : ''}
          </table>

          <p style="margin-top: 40px; color: #444; font-size: 12px;">LWLUP Powerlifting · ${new Date().toLocaleDateString('hr-HR')}</p>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LWLUP Coaching <onboarding@resend.dev>',
          to: [TO_EMAIL],
          subject: `Nova prijava: ${full_name} — Total ${total}kg`,
          html,
        }),
      })
    } else {
      // Fallback: log u konzolu ako nema Resend keya
      console.log('=== NOVA PRIJAVA (nema Resend key) ===')
      console.log(JSON.stringify(body, null, 2))
      console.log('======================================')
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Survey API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
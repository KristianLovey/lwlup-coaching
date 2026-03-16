import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(req: NextRequest) {
  const { weeks, lifterName } = await req.json()
  const tmpInput = join(tmpdir(), `kiz0_data_${Date.now()}.json`)
  const tmpOutput = join(tmpdir(), `kiz0_export_${Date.now()}.xlsx`)

  try {
    writeFileSync(tmpInput, JSON.stringify({ weeks, lifterName }))

    const scriptPath = join(process.cwd(), 'scripts', 'generate_xlsx.py')
    execSync(`python3 "${scriptPath}" "${tmpInput}" "${tmpOutput}"`, { timeout: 30000 })

    const buffer = readFileSync(tmpOutput)
    unlinkSync(tmpInput)
    unlinkSync(tmpOutput)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${lifterName || 'KIZ0'}_training.xlsx"`,
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

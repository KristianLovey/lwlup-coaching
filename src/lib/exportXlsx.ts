import { WeekPlan, resolveLoad, calcEstimated1RM } from './exercises'

// Build the XLSX export via Python API route
export async function exportToXlsx(weeks: WeekPlan[], lifterName: string): Promise<void> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weeks, lifterName }),
  })

  if (!response.ok) throw new Error('Export failed')

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${lifterName || 'KIZ0'}_training.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

import { WeekPlan, resolveLoad, calcEstimated1RM } from './exercises'

type RGB = { argb: string }

const BLACK:  RGB = { argb: 'FF000000' }
const WHITE:  RGB = { argb: 'FFFFFFFF' }
const GREY1:  RGB = { argb: 'FFEFEFEF' }  // col headers bg  (matches original #EFEFEF)
const GREY2:  RGB = { argb: 'FFD0D0D0' }  // metrics header
const GREY3:  RGB = { argb: 'FFF5F5F5' }  // alternating rows
const BORDER_COL: RGB = { argb: 'FFCCCCCC' }

const thin  = { style: 'thin'  as const, color: BORDER_COL }
const thick = { style: 'medium' as const, color: BLACK }

type BorderSide = { style: 'thin' | 'medium'; color: RGB }
function allBorders(t: BorderSide = thin) {
  return { top: t, bottom: t, left: t, right: t }
}

function applyBorder(cell: any, border = allBorders()) {
  cell.border = border
}

function header(cell: any, text: string, bg = BLACK, fg = WHITE, size = 11) {
  cell.value = text
  cell.font = { name: 'Arial', bold: true, color: fg, size }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: bg }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  applyBorder(cell)
}

function label(cell: any, text: string | number | null, bold = false, align: 'left'|'center'|'right' = 'left', size = 10) {
  cell.value = text
  cell.font = { name: 'Arial', bold, size, color: BLACK }
  cell.alignment = { horizontal: align, vertical: 'middle' }
  applyBorder(cell)
}

function num(cell: any, value: number | null) {
  cell.value = value
  cell.font = { name: 'Arial', size: 10, color: BLACK }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
  applyBorder(cell)
  if (value !== null) cell.numFmt = '#,##0.##'
}

export async function exportToExcel(weeks: WeekPlan[], lifterName: string): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'KIZ0 Training'
  wb.created = new Date()

  weeks.forEach(week => {
    const ws = wb.addWorksheet(`Week ${week.weekNumber}`, {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      properties: { tabColor: { argb: 'FF000000' } }
    })

    // ── Column widths ──────────────────────────────────────────────────────────
    ws.columns = [
      { key: 'A', width: 24 },  // Exercise
      { key: 'B', width: 22 },  // Priority
      { key: 'C', width: 2  },  // spacer
      { key: 'D', width: 6  },  // Sets
      { key: 'E', width: 6  },  // Reps
      { key: 'F', width: 6  },  // RPE (coach)
      { key: 'G', width: 11 },  // Range
      { key: 'H', width: 16 },  // Notes
      { key: 'I', width: 9  },  // Load
      { key: 'J', width: 6  },  // RPE (athlete)
      { key: 'K', width: 10 },  // Tonnage
      { key: 'L', width: 4  },  // Video
    ]

    let row = 1

    // ── TOP BANNER ─────────────────────────────────────────────────────────────
    const bannerRow = ws.getRow(row)
    const bannerCell = ws.getCell(`A${row}`)
    ws.mergeCells(`A${row}:L${row}`)
    bannerCell.value = `KIZ0 TRAINING  ·  ${lifterName.toUpperCase()}  ·  WEEK ${week.weekNumber}`
    bannerCell.font = { name: 'Arial', bold: true, size: 14, color: WHITE }
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: BLACK }
    bannerCell.alignment = { horizontal: 'center', vertical: 'middle' }
    bannerRow.height = 28
    row++

    // blank
    ws.getRow(row).height = 6
    row++

    // ── MICROCYCLE METRICS ─────────────────────────────────────────────────────
    const metricsTitle = ws.getCell(`A${row}`)
    ws.mergeCells(`A${row}:L${row}`)
    metricsTitle.value = 'MICROCYCLE METRICS'
    metricsTitle.font = { name: 'Arial', bold: true, size: 11, color: WHITE }
    metricsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: BLACK }
    metricsTitle.alignment = { horizontal: 'left', vertical: 'middle' }
    metricsTitle.border = allBorders(thick)
    ws.getRow(row).height = 18
    row++

    // Metrics column headers
    const mhRow = ws.getRow(row)
    mhRow.height = 16
    ;['Lift','Sets','Reps','Avg Load','Tonnage','Top Set','Est 1RM'].forEach((h,i) => {
      const col = ['A','D','E','F','G','I','K'][i]
      const c = ws.getCell(`${col}${row}`)
      header(c, h, GREY1, BLACK, 9)
    })
    row++

    // Aggregate stats
    const stats: Record<string, { sets: number; reps: number; loads: number[]; tonnage: number; topLoad: number; topReps: number }> = {}
    week.days.forEach(day => {
      day.blocks.forEach(block => {
        const cat = block.exercise.category
        if (!stats[cat]) stats[cat] = { sets: 0, reps: 0, loads: [], tonnage: 0, topLoad: 0, topReps: 1 }
        const s = stats[cat]
        block.sets.forEach(set => {
          const load = resolveLoad(set.load, set.resolvedLoad)
          if (load > 0) {
            s.sets++
            s.reps += (set.reps || 0)
            s.loads.push(load)
            s.tonnage += load * (set.reps || 0)
            if (load > s.topLoad) { s.topLoad = load; s.topReps = set.reps || 1 }
          }
        })
      })
    })

    const LIFT_ORDER = [
      'Primary Squat','Secondary Squat',
      'Primary Bench','Secondary Bench','Tertiary Bench','Quaternary Bench',
      'Primary Deadlift','Secondary Deadlift',
    ]
    let metricAlt = false
    LIFT_ORDER.forEach(lift => {
      const s = stats[lift]
      const bg = metricAlt ? GREY3 : WHITE
      metricAlt = !metricAlt
      const avgLoad = s && s.loads.length ? Math.round(s.loads.reduce((a,b)=>a+b,0)/s.loads.length) : null
      const est1rm  = s && s.topLoad > 0 ? calcEstimated1RM(s.topLoad, s.topReps) : null

      label(ws.getCell(`A${row}`), lift, true)
      ws.getCell(`A${row}`).fill = { type:'pattern',pattern:'solid',fgColor:bg }
      ;[
        { col:'D', val: s?.sets ?? 0 },
        { col:'E', val: s?.reps ?? 0 },
        { col:'F', val: avgLoad },
        { col:'G', val: s?.tonnage ? Math.round(s.tonnage) : null },
        { col:'I', val: s?.topLoad || null },
        { col:'K', val: est1rm },
      ].forEach(({col,val}) => {
        const c = ws.getCell(`${col}${row}`)
        num(c, val)
        c.fill = { type:'pattern',pattern:'solid',fgColor:bg }
      })
      row++
    })

    row++ // blank
    ws.getRow(row).height = 8
    row++

    // ── DAY SECTIONS ───────────────────────────────────────────────────────────
    week.days.forEach(day => {
      const dateStr = day.date
        ? new Date(day.date).toLocaleDateString('hr-HR')
        : 'DATUM'

      // ── Day header (black bar) ──
      ws.mergeCells(`A${row}:C${row}`)
      ws.mergeCells(`D${row}:L${row}`)
      const dayCell = ws.getCell(`A${row}`)
      const datCell = ws.getCell(`D${row}`)
      header(dayCell, `DAN ${day.dayNumber}`, BLACK, WHITE, 12)
      dayCell.alignment = { horizontal: 'left', vertical: 'middle' }
      header(datCell, dateStr, BLACK, WHITE, 10)
      datCell.alignment = { horizontal: 'left', vertical: 'middle' }
      ws.getRow(row).height = 20
      row++

      // ── Coach / Athlete sub-header ──
      ws.mergeCells(`D${row}:H${row}`)
      ws.mergeCells(`I${row}:L${row}`)
      const coachCell = ws.getCell(`D${row}`)
      const athCell   = ws.getCell(`I${row}`)
      header(coachCell, 'Coach', BLACK, WHITE, 9)
      header(athCell,   'Athlete', BLACK, WHITE, 9)
      ws.getRow(row).height = 14
      row++

      // ── Column labels ──
      const colRow = ws.getRow(row)
      colRow.height = 15
      ;[
        { col:'A', t:'Exercise'  },
        { col:'B', t:'Priority'  },
        { col:'D', t:'Sets'      },
        { col:'E', t:'Reps'      },
        { col:'F', t:'RPE'       },
        { col:'G', t:'Range'     },
        { col:'H', t:'Notes'     },
        { col:'I', t:'Load'      },
        { col:'J', t:'RPE'       },
        { col:'K', t:'Tonnage'   },
        { col:'L', t:'Video'     },
      ].forEach(({col,t}) => {
        const c = ws.getCell(`${col}${row}`)
        header(c, t, GREY1, BLACK, 9)
      })
      row++

      // ── Exercise rows ──
      if (day.blocks.length === 0) {
        ws.mergeCells(`A${row}:L${row}`)
        const ec = ws.getCell(`A${row}`)
        ec.value = '—'
        ec.font = { name:'Arial', size:9, color:{ argb:'FF999999' }, italic:true }
        ec.alignment = { horizontal:'center', vertical:'middle' }
        applyBorder(ec)
        ws.getRow(row).height = 14
        row++
      }

      day.blocks.forEach((block, bi) => {
        const altBg: RGB = bi % 2 === 0 ? WHITE : GREY3

        block.sets.forEach((set, si) => {
          const load    = resolveLoad(set.load, set.resolvedLoad)
          const tonnage = load * (set.reps || 0)
          const r       = ws.getRow(row)
          r.height      = 15

          // Exercise name — only on first set row
          const exCell = ws.getCell(`A${row}`)
          if (si === 0) {
            exCell.value = block.exercise.name
            exCell.font  = { name:'Arial', bold:true, size:10, color:BLACK }
          } else {
            exCell.value = null
          }
          exCell.fill      = { type:'pattern',pattern:'solid',fgColor:altBg }
          exCell.alignment = { horizontal:'left', vertical:'middle' }
          applyBorder(exCell)

          // Priority
          const priCell = ws.getCell(`B${row}`)
          if (si === 0) {
            priCell.value = block.exercise.category
            priCell.font  = { name:'Arial', size:9, italic:true, color:{ argb:'FF666666' } }
          }
          priCell.fill      = { type:'pattern',pattern:'solid',fgColor:altBg }
          priCell.alignment = { horizontal:'left', vertical:'middle' }
          applyBorder(priCell)

          // Spacer C
          const sc = ws.getCell(`C${row}`)
          sc.fill = { type:'pattern',pattern:'solid',fgColor:altBg }
          applyBorder(sc)

          // Sets (always 1 — one row per set)
          const setsC = ws.getCell(`D${row}`)
          num(setsC, 1)
          setsC.fill = { type:'pattern',pattern:'solid',fgColor:altBg }

          // Reps
          const repsC = ws.getCell(`E${row}`)
          num(repsC, set.reps || null)
          repsC.fill = { type:'pattern',pattern:'solid',fgColor:altBg }

          // RPE coach
          const rpeC = ws.getCell(`F${row}`)
          num(rpeC, set.rpe || null)
          rpeC.fill = { type:'pattern',pattern:'solid',fgColor:altBg }

          // Range (blank — for coach to fill)
          const rangeC = ws.getCell(`G${row}`)
          rangeC.fill = { type:'pattern',pattern:'solid',fgColor:altBg }
          applyBorder(rangeC)

          // Notes
          const notesC = ws.getCell(`H${row}`)
          if (si === 0 && block.notes) {
            notesC.value = block.notes
            notesC.font  = { name:'Arial', size:9, italic:true, color:BLACK }
          }
          notesC.fill      = { type:'pattern',pattern:'solid',fgColor:altBg }
          notesC.alignment = { horizontal:'left', vertical:'middle' }
          applyBorder(notesC)

          // Load (athlete)
          const loadC = ws.getCell(`I${row}`)
          num(loadC, load > 0 ? load : null)
          loadC.fill = { type:'pattern',pattern:'solid',fgColor:altBg }
          if (load > 0) loadC.font = { name:'Arial', bold:true, size:10, color:BLACK }

          // RPE athlete
          const rpeAC = ws.getCell(`J${row}`)
          num(rpeAC, set.rpe || null)
          rpeAC.fill = { type:'pattern',pattern:'solid',fgColor:altBg }

          // Tonnage
          const tonC = ws.getCell(`K${row}`)
          num(tonC, tonnage > 0 ? tonnage : null)
          tonC.fill = { type:'pattern',pattern:'solid',fgColor:altBg }
          if (tonnage > 0) tonC.font = { name:'Arial', size:10, color:{ argb:'FF333333' } }

          // Video checkbox placeholder
          const vidC = ws.getCell(`L${row}`)
          vidC.value = null
          vidC.fill  = { type:'pattern',pattern:'solid',fgColor:altBg }
          applyBorder(vidC)

          row++
        })
      })

      // Blank separator between days
      ws.getRow(row).height = 8
      row++
    })

    // Freeze top row
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  })

  // ── Download ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `KIZ0_${lifterName.replace(/\s+/g,'_')}_W${new Date().toISOString().slice(0,7)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

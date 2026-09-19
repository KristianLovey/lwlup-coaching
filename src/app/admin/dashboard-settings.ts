export type CardId = 'blockplan' | 'progress' | 'compliance' | 'volume' | 'bodyweight' | 'recovery' | 'balance' | 'macro' | 'water'
export type CardState = { hidden: boolean; collapsed: boolean; range: number }
export type DashCards = Record<CardId, CardState>

export const CARD_META: { id: CardId; label: string; series: boolean }[] = [
  { id: 'blockplan',  label: 'Plan blokova',       series: false },
  { id: 'progress',   label: 'Pregled napretka',   series: true },
  { id: 'compliance', label: 'Zadnji treninzi',      series: false },
  { id: 'volume',     label: 'Volumen & intenzitet', series: true },
  { id: 'bodyweight', label: 'Trend težine',        series: true },
  { id: 'recovery',   label: 'Oporavak',            series: false },
  { id: 'balance',    label: 'Balans snage',        series: false },
  { id: 'macro',      label: 'Makro & aktivnost',   series: false },
  { id: 'water',      label: 'Unos tekućine',       series: false },
]

export function defaultCards(): DashCards {
  const cards = {} as DashCards
  CARD_META.forEach(card => { cards[card.id] = { hidden: false, collapsed: false, range: card.id === 'progress' ? 0 : card.id === 'bodyweight' ? 8 : 12 } })
  return cards
}
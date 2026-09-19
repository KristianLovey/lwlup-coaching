'use client'
import { ChevronDown, Eye, EyeOff, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { CARD_META, type CardId, type CardState, type DashCards } from './dashboard-settings'

export function RangeSelect({ id, value, onChange }: { id: CardId; value: number; onChange: (value: number) => void }) {
  const byBlocks = id === 'progress'
  return (
    <div className="range-select">
      <select value={byBlocks ? ([1, 2, 3, 4].includes(value) ? value : 0) : value} onChange={event => onChange(Number(event.target.value))}>
        {byBlocks
          ? <><option value={1}>1 blok</option><option value={2}>2 bloka</option><option value={3}>3 bloka</option><option value={4}>4 bloka</option><option value={0}>Svi blokovi</option></>
          : <><option value={4}>4 tj.</option><option value={8}>8 tj.</option><option value={12}>12 tj.</option></>}
      </select>
      <span className="rs-caret"><ChevronDown size={11} /></span>
    </div>
  )
}

export function SettingsDrawer({ open, onClose, cards, setCard, onReset }: {
  open: boolean; onClose: () => void; cards: DashCards; setCard: (id: CardId, patch: Partial<CardState>) => void; onReset: () => void
}) {
  return (
    <>
      <aside className={'settings-drawer' + (open ? ' open' : '')}>
        <div className="sd-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Postavke</div>
            <div className="sd-title">Dashboard</div>
          </div>
          <button className="icon-sm" onClick={onClose} aria-label="zatvori"><X size={16} /></button>
        </div>
        <div className="sd-scroll">
          <div className="sd-section">
            <div className="sd-label">Kartice na dashboardu</div>
            <div className="sd-cards">
              {CARD_META.map(card => {
                const state = cards[card.id]
                return (
                  <div className={'sd-card-row' + (state.hidden ? ' off' : '')} key={card.id}>
                    <button className="sd-eye" onClick={() => setCard(card.id, { hidden: !state.hidden })} title={state.hidden ? 'Prikaži' : 'Sakrij'}>
                      {state.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <span className="sd-card-name">{card.label}</span>
                    {card.series
                      ? <RangeSelect id={card.id} value={state.range} onChange={range => setCard(card.id, { range })} />
                      : <span className="sd-na">—</span>}
                    <button className="sd-min" onClick={() => setCard(card.id, { collapsed: !state.collapsed })} title={state.collapsed ? 'Proširi' : 'Minimiziraj'}>
                      {state.collapsed ? <Plus size={13} /> : <Minus size={13} />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          <button className="sd-reset" onClick={onReset}><RotateCcw size={15} /> Vrati zadano</button>
        </div>
      </aside>
      {open && <div className="sd-scrim" onClick={onClose} />}
    </>
  )
}
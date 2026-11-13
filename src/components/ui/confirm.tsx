'use client'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useEffect, useRef, useState } from 'react'

/**
 * Potvrda nepovratne radnje u stilu panela, umjesto window.confirm.
 * Tok je isti kao prije: `if (!(await confirmDialog({...}))) return`.
 * Host (<ConfirmHost/>) je montiran jednom po panelu (vidi UiHosts).
 */

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** crveni gumb za brisanje */
  destructive?: boolean
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

let show: ((p: Pending) => void) | null = null

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    // bez montiranog hosta (npr. stranica izvan panela) ne smije tiho proći
    if (!show) { resolve(window.confirm(opts.description ? `${opts.title}\n\n${opts.description}` : opts.title)); return }
    show({ ...opts, resolve })
  })
}

export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null)
  // promise se rješava točno jednom, bez obzira kojim putem se dijalog zatvori
  const current = useRef<Pending | null>(null)

  const finish = (ok: boolean) => {
    const p = current.current
    current.current = null
    p?.resolve(ok)
    setPending(null)
  }

  useEffect(() => {
    show = next => {
      current.current?.resolve(false)
      current.current = next
      setPending(next)
    }
    return () => { show = null; current.current?.resolve(false); current.current = null }
  }, [])

  return (
    <AlertDialog.Root open={pending != null} onOpenChange={open => { if (!open) finish(false) }}>
      {/* bez portala: dijalog ostaje unutar panela i nasljeđuje njegove tokene */}
      <AlertDialog.Overlay className="ui-scrim" />
      <AlertDialog.Content className="ui-confirm">
        <AlertDialog.Title className="ui-confirm-t">{pending?.title}</AlertDialog.Title>
        {pending?.description
          ? <AlertDialog.Description className="ui-confirm-d">{pending.description}</AlertDialog.Description>
          : <AlertDialog.Description className="ui-sr-only">Potvrdi ili odustani.</AlertDialog.Description>}
        <div className="ui-confirm-actions">
          <AlertDialog.Cancel className="ui-btn">{pending?.cancelLabel ?? 'Odustani'}</AlertDialog.Cancel>
          <AlertDialog.Action className={`ui-btn ${pending?.destructive ? 'ui-btn-danger' : 'ui-btn-primary'}`}
            onClick={() => finish(true)}>
            {pending?.confirmLabel ?? 'Potvrdi'}
          </AlertDialog.Action>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}

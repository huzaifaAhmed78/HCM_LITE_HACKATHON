import { useCallback, useRef, useState } from 'react'
import { Btn, Modal } from './ui.jsx'

// Usage:
//   const [confirm, confirmDialog] = useConfirm()
//   if (!(await confirm({ title: 'Delete holiday?', message: '...', confirmLabel: 'Delete' }))) return
//   ...and render {confirmDialog} once in the component's JSX.
export function useConfirm() {
  const [state, setState] = useState(null)
  const resolver = useRef(null)

  const ask = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve
        setState(opts)
      }),
    []
  )
  const close = (answer) => {
    resolver.current?.(answer)
    resolver.current = null
    setState(null)
  }

  const dialog = state && (
    <Modal title={state.title || 'Are you sure?'} onClose={() => close(false)} size="sm">
      <p className="text-sm text-ink/80">{state.message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" autoFocus onClick={() => close(false)}>Cancel</Btn>
        <Btn variant="dangerSolid" onClick={() => close(true)}>{state.confirmLabel || 'Delete'}</Btn>
      </div>
    </Modal>
  )
  return [ask, dialog]
}

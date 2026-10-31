import { type ReactNode, useEffect, useId, useRef } from 'react'
import { PartyInviteControls } from '@/widgets/hud/party'
import { Icon } from './icons'

export function Dialog({
  title,
  eyebrow,
  onClose,
  children,
  className = '',
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`journal-dialog ${className}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="dialog-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={id}>{title}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close panel"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <PartyInviteControls />
      {children}
    </dialog>
  )
}

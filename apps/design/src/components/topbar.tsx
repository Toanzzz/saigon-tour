import { Bell, ChevronRight, CircleUserRound, Gem } from 'lucide-react'
import { navItems } from '../data'
import { Separator } from './ui/separator'

export function Topbar({
  active,
  onAction,
}: {
  active: string
  onAction: (message: string) => void
}) {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <span className="brand-mark">S</span>
        <strong>SÀI GÒN</strong>
      </div>
      <div className="breadcrumbs">
        <span>City hub</span>
        <ChevronRight size={14} />
        <strong>{navItems.find((item) => item.id === active)?.label}</strong>
      </div>
      <div className="top-actions">
        <button
          type="button"
          className="icon-action"
          aria-label="Notifications"
          onClick={() => onAction('No new neighborhood notes.')}
        >
          <Bell size={18} />
        </button>
        <Separator />
        <div className="wallet-chip">
          <Gem size={16} />
          <strong>80</strong>
          <span>coins</span>
        </div>
        <button
          type="button"
          className="profile-chip"
          onClick={() => onAction('Your profile is coming along nicely.')}
        >
          <CircleUserRound size={19} />
          <span>Mai</span>
        </button>
      </div>
    </header>
  )
}

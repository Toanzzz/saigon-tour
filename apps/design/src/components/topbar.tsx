import { Coins, UserRound } from 'lucide-react'
import { navItems } from '../data'

export function Topbar({
  active,
  onSelect,
  onAction,
}: {
  active: string
  onSelect: (id: string) => void
  onAction: (message: string) => void
}) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Sài Gòn city hub">
        <BrandMark />
        <span>
          <strong>Sài Gòn</strong>
          <small>City hub</small>
        </span>
      </a>
      <nav className="top-nav" aria-label="Hub sections">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <Icon size={17} strokeWidth={2.2} />
            {label}
          </button>
        ))}
      </nav>
      <div className="top-actions">
        <span className="wallet-chip">
          <Coins size={17} strokeWidth={2.2} />
          <strong>80</strong>
          <span className="sr-only">coins</span>
        </span>
        <button
          type="button"
          className="profile-chip"
          onClick={() => onAction('Your profile is coming along nicely.')}
        >
          <UserRound size={18} strokeWidth={2.2} />
          <span>Mai</span>
        </button>
      </div>
    </header>
  )
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M6 26 32 8l26 18v4H6z" className="brand-roof" />
      <rect
        x="12"
        y="30"
        width="40"
        height="26"
        rx="3"
        className="brand-wall"
      />
      <path d="M26 56V44a6 6 0 0 1 12 0v12" className="brand-door" />
    </svg>
  )
}

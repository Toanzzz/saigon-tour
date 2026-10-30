import { Heart, Settings2 } from 'lucide-react'
import { navItems } from '../data'

export function Sidebar({
  active,
  onSelect,
  onAction,
}: {
  active: string
  onSelect: (id: string) => void
  onAction: (message: string) => void
}) {
  return (
    <aside className="hub-sidebar">
      <div className="brand-lockup">
        <span className="brand-mark">S</span>
        <span>
          <strong>SÀI GÒN</strong>
          <small>city hub / 10°46′ N</small>
        </span>
      </div>
      <div className="sidebar-caption">YOUR NEIGHBORHOOD</div>
      <nav className="side-nav" aria-label="Hub sections">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={active === id ? 'nav-item active' : 'nav-item'}
            onClick={() => onSelect(id)}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
            {active === id && <span className="nav-chevron">›</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-memory">
        <span className="eyebrow">A LITTLE MEMORY</span>
        <p>“Every street leads somewhere.”</p>
        <span className="memory-line">
          <Heart size={13} fill="currentColor" /> 1 kind errand
        </span>
      </div>
      <button
        className="settings-link"
        type="button"
        onClick={() => onAction('Settings are ready for the next journey.')}
      >
        <Settings2 size={16} /> Settings
      </button>
    </aside>
  )
}

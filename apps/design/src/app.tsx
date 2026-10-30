import { useState } from 'react'
import { HubFooter } from './components/footer'
import { AgentCard, StoryCard, Welcome } from './components/hero'
import { MapCard, PulseCard, RideCard } from './components/map-section'
import { Sidebar } from './components/sidebar'
import { Topbar } from './components/topbar'
import { navItems } from './data'

export function App() {
  const [active, setActive] = useState('overview')
  const [toast, setToast] = useState('')
  const setAction = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }
  return (
    <div className="hub-shell">
      <Sidebar active={active} onSelect={setActive} onAction={setAction} />
      <main className="hub-main">
        <Topbar active={active} onAction={setAction} />
        <div className="hub-content">
          <Welcome onAction={setAction} />
          <section className="hero-grid">
            <StoryCard onAction={setAction} />
            <AgentCard onAction={setAction} />
          </section>
          <section className="lower-grid">
            <MapCard onAction={setAction} />
            <div className="right-stack">
              <RideCard onAction={setAction} />
              <PulseCard />
            </div>
          </section>
          <HubFooter />
        </div>
      </main>
      {toast && (
        <div className="hub-toast" role="status">
          {toast}
        </div>
      )}
      <nav className="mobile-nav" aria-label="Mobile hub sections">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={active === id ? 'active' : ''}
            onClick={() => setActive(id)}
          >
            <Icon size={18} />
            <span>{label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

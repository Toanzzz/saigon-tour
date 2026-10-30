import { useRef, useState } from 'react'
import { NeighborCard, StoryCard } from './components/cards'
import { PulseCard, RideCard, SoundCard } from './components/city'
import { Hero } from './components/hero'
import { Topbar } from './components/topbar'
import { navItems } from './data'

export function App() {
  const [active, setActive] = useState('overview')
  const [toast, setToast] = useState('')
  const timer = useRef(0)
  const setAction = (message: string) => {
    setToast(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(''), 2600)
  }
  return (
    <div className="hub-shell">
      <Topbar active={active} onSelect={setActive} onAction={setAction} />
      <main className="hub-main">
        <Hero onAction={setAction} />
        <section className="hub-grid" aria-label="Your day in the city">
          <StoryCard onAction={setAction} />
          <NeighborCard onAction={setAction} />
          <RideCard onAction={setAction} />
          <PulseCard />
          <SoundCard />
        </section>
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
            aria-current={active === id ? 'page' : undefined}
            onClick={() => setActive(id)}
          >
            <Icon size={19} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

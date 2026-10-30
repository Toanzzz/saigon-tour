import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'

export function HubFooter() {
  const [playing, setPlaying] = useState(false)
  return (
    <section className="footer-row">
      <div className="sound-control">
        <Button
          className="sound-button"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause city sounds' : 'Play city sounds'}
        >
          {playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </Button>
        <span>
          <strong>{playing ? 'City sounds playing' : 'City sounds'}</strong>
          <small>soft traffic · market chatter</small>
        </span>
        <span className="sound-wave">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="hub-note">
        <span className="online-dot" /> AI connection <strong>ready</strong>
      </div>
    </section>
  )
}

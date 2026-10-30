import { BusFront, Leaf, Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'

export function RideCard({
  onAction,
}: {
  onAction: (message: string) => void
}) {
  return (
    <Card className="ride-card">
      <CardHeader>
        <div>
          <p className="card-kicker">Scenic route</p>
          <CardTitle>Catch a city bus</CardTitle>
        </div>
        <span className="tile-icon bus-red" aria-hidden="true">
          <BusFront size={22} strokeWidth={2.2} />
        </span>
      </CardHeader>
      <CardContent>
        <p className="ticket-route">
          <span>Bến Thành</span>
          <i aria-hidden="true" />
          <span>Công viên</span>
        </p>
        <p className="ticket-fare">5 coins, about 20 seconds</p>
        <Button
          className="block-button wide"
          onClick={() => onAction('Bus route selected. Meet the city halfway.')}
        >
          Choose a ride
        </Button>
      </CardContent>
    </Card>
  )
}

export function PulseCard() {
  return (
    <Card className="pulse-card">
      <CardHeader>
        <div>
          <p className="card-kicker">Neighborhood pulse</p>
          <CardTitle>Gentle afternoon</CardTitle>
        </div>
        <span className="tile-icon leaf" aria-hidden="true">
          <Leaf size={22} strokeWidth={2.2} />
        </span>
      </CardHeader>
      <CardContent>
        <Progress value={72} label="Shade from the trees" />
        <dl className="pulse-stats">
          <div>
            <dt>Neighbors out</dt>
            <dd>3</dd>
          </div>
          <div>
            <dt>Tree shade</dt>
            <dd>72%</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

export function SoundCard() {
  const [playing, setPlaying] = useState(false)
  return (
    <Card className={playing ? 'sound-card playing' : 'sound-card'}>
      <CardHeader>
        <div>
          <p className="card-kicker">City sounds</p>
          <CardTitle>{playing ? 'Playing' : 'Paused'}</CardTitle>
        </div>
        <Button
          className="sound-button"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause city sounds' : 'Play city sounds'}
        >
          {playing ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <p className="sound-mix">Soft traffic and market chatter</p>
        <span className="sound-wave" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </CardContent>
    </Card>
  )
}

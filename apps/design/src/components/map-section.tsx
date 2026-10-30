import {
  ArrowUpRight,
  BusFront,
  ChevronRight,
  Compass,
  Leaf,
} from 'lucide-react'
import { stops } from '../data'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Progress } from './ui/progress'

export function MapCard({ onAction }: { onAction: (message: string) => void }) {
  return (
    <Card className="map-card">
      <CardHeader>
        <div>
          <p className="eyebrow">NEIGHBORHOOD MAP</p>
          <CardTitle>Every street leads somewhere</CardTitle>
        </div>
        <Button
          className="text-button"
          onClick={() => onAction('Full map opened.')}
        >
          Open full map <ArrowUpRight size={14} />
        </Button>
      </CardHeader>
      <CardContent>
        <div
          className="map-illustration"
          role="img"
          aria-label="Illustrated neighborhood map with four travel stops"
        >
          <span className="map-road road-a" />
          <span className="map-road road-b" />
          <span className="map-road road-c" />
          <span className="map-water" />
          <span className="map-block block-a" />
          <span className="map-block block-b" />
          <span className="map-block block-c" />
          {stops.map((stop) => (
            <button
              key={stop.label}
              type="button"
              className={`map-stop ${stop.tone}`}
              style={{ left: stop.x, top: stop.y }}
              onClick={() => onAction(`${stop.label} selected.`)}
            >
              <span>{stop.icon}</span>
              <small>{stop.label}</small>
            </button>
          ))}
          <span className="map-you">
            <span /> you are here
          </span>
        </div>
        <div className="map-footer">
          <span>
            <Compass size={14} /> Bến Thành district
          </span>
          <span>4 places · 1 discovered</span>
        </div>
      </CardContent>
    </Card>
  )
}
export function RideCard({
  onAction,
}: {
  onAction: (message: string) => void
}) {
  return (
    <Card className="ride-card">
      <CardHeader>
        <div>
          <p className="eyebrow">SCENIC ROUTE</p>
          <CardTitle>Catch a city bus</CardTitle>
        </div>
        <BusFront size={22} className="bus-icon" />
      </CardHeader>
      <CardContent>
        <div className="ride-route">
          <span>Bến Thành</span>
          <span className="route-dots" />
          <span>Công viên</span>
        </div>
        <p className="muted">5 coins · about 20 seconds</p>
        <Button
          className="ride-button"
          onClick={() => onAction('Bus route selected. Meet the city halfway.')}
        >
          Choose a ride <ChevronRight size={15} />
        </Button>
      </CardContent>
    </Card>
  )
}
export function PulseCard() {
  return (
    <Card className="pulse-card">
      <CardContent>
        <div className="pulse-heading">
          <div className="pulse-icon">
            <Leaf size={17} />
          </div>
          <div>
            <strong>Neighborhood pulse</strong>
            <small>Gentle afternoon · 28°</small>
          </div>
          <span className="pulse-dot" />
        </div>
        <Progress value={72} />
        <div className="pulse-stats">
          <span>
            <strong>3</strong> neighbors out
          </span>
          <span>
            <strong>72%</strong> leafy
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

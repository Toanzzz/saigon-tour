import { Check, Coins, MessageCircle, Mic, Stamp } from 'lucide-react'
import { steps } from '../data'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function StoryCard({
  onAction,
}: {
  onAction: (message: string) => void
}) {
  return (
    <Card className="story-card roofed">
      <CardHeader>
        <div>
          <p className="card-kicker">Active story</p>
          <CardTitle>A little taste of home</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="story-road">
          {steps.map((step, index) => (
            <li key={step.title} className={`stop ${step.state}`}>
              <span className="stop-marker" aria-hidden="true">
                {step.state === 'done' ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
              <span className="sr-only">
                {step.state === 'done'
                  ? 'Done'
                  : step.state === 'now'
                    ? 'Current step'
                    : 'Later'}
              </span>
            </li>
          ))}
        </ol>
        <div className="story-footer">
          <span className="chip bus">
            <Coins size={15} strokeWidth={2.4} /> 50 coins
          </span>
          <span className="chip leaf">
            <Stamp size={15} strokeWidth={2.4} /> A Sài Gòn postcard
          </span>
          <Button
            className="block-button small"
            onClick={() => onAction('Quest details opened.')}
          >
            View details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function NeighborCard({
  onAction,
}: {
  onAction: (message: string) => void
}) {
  return (
    <Card className="neighbor-card">
      <CardHeader>
        <div className="neighbor-id">
          <span className="portrait" aria-hidden="true">
            H
          </span>
          <div>
            <CardTitle>Cô Hoa</CardTitle>
            <small>Market food vendor</small>
          </div>
        </div>
        <span className="status">Online</span>
      </CardHeader>
      <CardContent>
        <blockquote className="bubble">
          Take your time, con. The park is lovely this afternoon.
        </blockquote>
        <div className="neighbor-meta">
          <span>
            <MessageCircle size={15} strokeWidth={2.2} /> Remembers 4 chats
          </span>
          <span>
            <Mic size={15} strokeWidth={2.2} /> Voice ready
          </span>
        </div>
        <Button
          className="primary-button wide"
          onClick={() => onAction('Conversation reopened with Cô Hoa.')}
        >
          Talk to Cô Hoa
        </Button>
      </CardContent>
    </Card>
  )
}

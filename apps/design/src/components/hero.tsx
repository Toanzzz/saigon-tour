import {
  ArrowUpRight,
  Gem,
  Leaf,
  MessageCircle,
  MoreHorizontal,
  Play,
  Radio,
  Sparkles,
  Star,
} from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function Welcome({ onAction }: { onAction: (message: string) => void }) {
  return (
    <section className="welcome-row">
      <div>
        <p className="eyebrow">THURSDAY · LATE AFTERNOON</p>
        <h1>
          Chào mừng back, Mai<span>.</span>
        </h1>
        <p className="welcome-copy">
          A warm city, a small favor, and a few more stories waiting around the
          corner.
        </p>
      </div>
      <Button
        className="primary-cta"
        onClick={() => onAction('Opening your neighborhood map…')}
      >
        <Play size={15} fill="currentColor" /> Continue exploring
      </Button>
    </section>
  )
}
export function StoryCard({
  onAction,
}: {
  onAction: (message: string) => void
}) {
  return (
    <Card className="journey-card">
      <CardHeader>
        <div>
          <Badge>
            <Sparkles size={12} /> ACTIVE STORY
          </Badge>
          <CardTitle>A little taste of home</CardTitle>
          <p className="muted">Cô Hoa needs fresh herbs at the park.</p>
        </div>
        <button
          className="more-button"
          type="button"
          aria-label="More journey options"
          onClick={() => onAction('Journey options opened.')}
        >
          <MoreHorizontal size={18} />
        </button>
      </CardHeader>
      <CardContent>
        <div className="journey-progress">
          <Step
            number="01"
            title="Meet Cô Hoa"
            detail="Market stall · complete"
            complete
          />
          <div className="step-line complete" />
          <Step
            number="02"
            title="Deliver the herbs"
            detail="Chị Linh · the park"
            current
          />
          <div className="step-line" />
          <Step number="03" title="Make a memory" detail="Earn a postcard" />
        </div>
        <div className="quest-footer">
          <div className="reward-pill">
            <Gem size={15} /> +50 coins <span>·</span> <Star size={14} />{' '}
            postcard
          </div>
          <Button
            className="soft-button"
            onClick={() => onAction('Quest details opened.')}
          >
            View details <ArrowUpRight size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
function Step({
  number,
  title,
  detail,
  complete,
  current,
}: {
  number: string
  title: string
  detail: string
  complete?: boolean
  current?: boolean
}) {
  return (
    <div
      className={complete ? 'step complete' : current ? 'step current' : 'step'}
    >
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  )
}
export function AgentCard({
  onAction,
}: {
  onAction: (message: string) => void
}) {
  return (
    <Card className="agent-card">
      <CardHeader>
        <div>
          <Badge className="live-badge">
            <span className="pulse" /> LIVE AGENT
          </Badge>
          <CardTitle>Neighbors are thinking</CardTitle>
        </div>
        <Radio size={20} className="agent-radio" />
      </CardHeader>
      <CardContent>
        <div className="agent-person">
          <div className="avatar hoa">H</div>
          <div>
            <strong>Cô Hoa</strong>
            <small>Market food vendor</small>
          </div>
          <span className="agent-state">online</span>
        </div>
        <p className="agent-quote">
          “Take your time, con. The park is lovely this afternoon.”
        </p>
        <div className="agent-meta">
          <span>
            <MessageCircle size={14} /> 4 memories
          </span>
          <span>
            <Leaf size={14} /> voice ready
          </span>
        </div>
        <Button
          className="outline-button"
          onClick={() => onAction('Conversation reopened with Cô Hoa.')}
        >
          Open conversation <MessageCircle size={15} />
        </Button>
      </CardContent>
    </Card>
  )
}

import { NPCS } from '@saigon/shared'
import { useStore } from '@tanstack/react-store'
import {
  acceptQuest,
  board,
  close,
  deliverOrVerify,
  interact,
  nearby,
} from '../../core/actions'
import { MODES, PLACES } from '../../core/places'
import { game } from '../../state/game'
import { XRWorldPanel } from './panel'

export function XRGameHud() {
  const state = useStore(game, (value) => value)
  const target = nearby(state.position)
  if (state.dialogue) {
    const npc = NPCS[state.dialogue.npc]
    const lines = state.dialogue.history
      .slice(-3)
      .map(
        (line) => `${line.role === 'user' ? 'You' : npc.name}: ${line.content}`
      )
    if (state.dialogue.thinking) lines.push(`${npc.name} is thinking…`)
    const delivery =
      state.quest?.objective.type === 'DELIVER' &&
      state.quest.objective.npcId === state.dialogue.npc &&
      (state.world.inventory[state.quest.objective.itemId] ?? 0) > 0
    return (
      <XRWorldPanel
        title={npc.name}
        lines={
          lines.length ? lines : [`${npc.role}. Say hello to your neighbor.`]
        }
        buttons={
          state.dialogue.thinking
            ? []
            : [
                {
                  id: delivery ? 'deliver' : 'quest',
                  label: delivery
                    ? 'Deliver herbs'
                    : state.dialogue.npc === 'hoa' && !state.quest
                      ? 'Help Hoa'
                      : 'Check progress',
                  onClick:
                    delivery || state.quest ? deliverOrVerify : acceptQuest,
                },
                { id: 'close', label: 'Continue', onClick: close },
              ]
        }
      />
    )
  }
  if (state.panel === 'transport') {
    return (
      <XRWorldPanel
        title="Choose a ride"
        lines={[
          `${state.world.currency} coins in your wallet. Bus to the park costs ${MODES.bus.fare}.`,
        ]}
        buttons={[
          {
            id: 'park',
            label: 'Bus → park',
            onClick: () => board('park', 'bus'),
          },
          {
            id: 'cathedral',
            label: 'Bus → cathedral',
            onClick: () => board('cathedral', 'bus'),
          },
          {
            id: 'river',
            label: 'Bus → river',
            onClick: () => board('river', 'bus'),
          },
          { id: 'close', label: 'Continue', onClick: close },
        ]}
      />
    )
  }
  if (state.panel === 'reward') {
    return (
      <XRWorldPanel
        title="A little kindness goes far."
        lines={['You earned a Sài Gòn postcard and 50 coins.']}
        buttons={[{ id: 'close', label: 'Continue', onClick: close }]}
      />
    )
  }
  if (target) {
    const title =
      target.kind === 'npc'
        ? target.label
        : PLACES[target.id as keyof typeof PLACES].name
    return (
      <XRWorldPanel
        title={title}
        lines={[
          target.kind === 'npc'
            ? 'Point and tap to start a conversation.'
            : 'Choose a destination and ride across the neighborhood.',
        ]}
        buttons={[
          {
            id: 'interact',
            label: target.kind === 'npc' ? 'Say hello' : 'Choose a ride',
            onClick: interact,
          },
        ]}
      />
    )
  }
  return (
    <XRWorldPanel
      title="Sài Gòn"
      lines={[
        state.quest?.description ??
          'Explore the neighborhood and meet a neighbor.',
      ]}
    />
  )
}

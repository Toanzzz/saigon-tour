import { NPCS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import {
  acceptQuest,
  board,
  close,
  deliverOrVerify,
  interact,
  nearby,
} from '@/app/actions'
import { game, trackedQuest } from '@/shared/state/game'
import { dialogueQuests } from '@/shared/state/quests'
import { MODES, PLACES } from '@/shared/world/places'
import { XRWorldPanel } from '@/shared/xr'

export function XRGameHud() {
  const state = useSelector(game, (value) => value)
  const target = nearby(state.position)
  if (state.dialogue) {
    const npc = NPCS[state.dialogue.npc]
    const lines = state.dialogue.history
      .slice(-3)
      .map(
        (line) => `${line.role === 'user' ? 'You' : npc.name}: ${line.content}`
      )
    if (state.dialogue.thinking) lines.push(`${npc.name} is thinking…`)
    const { delivery, ready, canHelp } = dialogueQuests(
      state,
      state.dialogue.npc
    )
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
                ...(canHelp
                  ? [
                      {
                        id: 'help',
                        label: 'Any errands?',
                        onClick: acceptQuest,
                      },
                    ]
                  : []),
                ...(delivery
                  ? [
                      {
                        id: 'deliver',
                        label: `Give ${delivery.itemId}`,
                        onClick: deliverOrVerify,
                      },
                    ]
                  : []),
                ...(ready
                  ? [
                      {
                        id: 'check',
                        label: "I'm back",
                        onClick: deliverOrVerify,
                      },
                    ]
                  : []),
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
          `${state.world.currency} coins in your wallet. Every bus ride costs ${MODES.bus.fare}.`,
        ]}
        buttons={[
          ...(Object.keys(PLACES) as (keyof typeof PLACES)[])
            .filter((id) => id !== state.stop)
            .map((id) => ({
              id,
              label: `Bus → ${PLACES[id].name}`,
              onClick: () => board(id, 'bus'),
            })),
          { id: 'close', label: 'Continue', onClick: close },
        ]}
      />
    )
  }
  if (state.panel === 'reward') {
    return (
      <XRWorldPanel
        title="A little kindness goes far."
        lines={[
          `You earned ${state.reward} coins and ${state.rewardQuest?.reward.itemId ?? 'a neighbor’s thanks'}.`,
        ]}
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
        trackedQuest(state)?.description ??
          'Explore the neighborhood and meet a neighbor.',
      ]}
    />
  )
}

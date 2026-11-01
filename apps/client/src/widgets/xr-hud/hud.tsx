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
import { itemLabel, m, useLocale } from '@/shared/i18n'
import { game, trackedQuest } from '@/shared/state/game'
import { dialogueQuests } from '@/shared/state/quests'
import { MODES, PLACES, placeName } from '@/shared/world/places'
import { XRWorldPanel } from '@/shared/xr'

export function XRGameHud() {
  // Lives inside the scene, which never remounts; redraw panels on language change.
  useLocale()
  const state = useSelector(game, (value) => value)
  const target = nearby(state.position)
  if (state.dialogue) {
    const npc = NPCS[state.dialogue.npc]
    const lines = state.dialogue.history
      .slice(-3)
      .map(
        (line) =>
          `${line.role === 'user' ? m.map_you() : npc.name}: ${line.content}`
      )
    if (state.dialogue.thinking) lines.push(m.chat_thinking({ name: npc.name }))
    const { delivery, ready, canHelp } = dialogueQuests(
      state,
      state.dialogue.npc
    )
    return (
      <XRWorldPanel
        title={npc.name}
        lines={lines.length ? lines : [m.xr_say_hello({ role: npc.role })]}
        buttons={
          state.dialogue.thinking
            ? []
            : [
                ...(canHelp
                  ? [
                      {
                        id: 'help',
                        label: m.xr_any_errands(),
                        onClick: acceptQuest,
                      },
                    ]
                  : []),
                ...(delivery
                  ? [
                      {
                        id: 'deliver',
                        label: m.errands_give({
                          item: itemLabel(delivery.itemId),
                        }),
                        onClick: deliverOrVerify,
                      },
                    ]
                  : []),
                ...(ready
                  ? [
                      {
                        id: 'check',
                        label: m.xr_im_back(),
                        onClick: deliverOrVerify,
                      },
                    ]
                  : []),
                { id: 'close', label: m.xr_continue(), onClick: close },
              ]
        }
      />
    )
  }
  if (state.panel === 'transport') {
    return (
      <XRWorldPanel
        title={m.hud_choose_ride()}
        lines={[
          m.xr_wallet({
            coins: m.coins({ count: state.world.currency }),
            fare: MODES.bus.fare,
          }),
        ]}
        buttons={[
          ...(Object.keys(PLACES) as (keyof typeof PLACES)[])
            .filter((id) => id !== state.stop)
            .map((id) => ({
              id,
              label: m.xr_bus_to({ place: placeName(id) }),
              onClick: () => board(id, 'bus'),
            })),
          { id: 'close', label: m.xr_continue(), onClick: close },
        ]}
      />
    )
  }
  if (state.panel === 'reward') {
    return (
      <XRWorldPanel
        title={m.reward_title()}
        lines={[
          m.xr_earned({
            coins: m.coins({ count: state.reward }),
            item: state.rewardQuest?.reward.itemId
              ? itemLabel(state.rewardQuest.reward.itemId)
              : m.xr_neighbor_thanks(),
          }),
        ]}
        buttons={[{ id: 'close', label: m.xr_continue(), onClick: close }]}
      />
    )
  }
  if (target) {
    const title =
      target.kind === 'npc'
        ? target.label
        : placeName(target.id as keyof typeof PLACES)
    return (
      <XRWorldPanel
        title={title}
        lines={[
          target.kind === 'npc'
            ? m.xr_point_to_talk()
            : m.xr_choose_destination(),
        ]}
        buttons={[
          {
            id: 'interact',
            label:
              target.kind === 'npc' ? m.emote_say_hello() : m.hud_choose_ride(),
            onClick: interact,
          },
        ]}
      />
    )
  }
  return (
    <XRWorldPanel
      title="Sài Gòn"
      lines={[trackedQuest(state)?.description ?? m.xr_explore()]}
    />
  )
}

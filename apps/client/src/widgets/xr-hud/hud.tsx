import { friendlinessOf, NPCS } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { board, close, giveItem, interact, nearby } from '@/app/actions'
import { itemLabel, m, npcDisplay, unlockLabel, useLocale } from '@/shared/i18n'
import { game, trackedQuest } from '@/shared/state/game'
import { dialogueQuests } from '@/shared/state/quests'
import { MODES, PLACES, placeName } from '@/shared/world/places'
import { XRWorldPanel } from '@/shared/xr'

export function XRGameHud() {
  // Lives inside the scene, which never remounts; redraw panels on language change.
  useLocale()
  // Select the fields the panels read; collapse the frame-rate `position` into
  // just the nearest target id so a walking player does not redraw the panel.
  const { state, target } = useSelector(
    game,
    (value) => ({ state: value, target: nearby(value.position) }),
    {
      compare: (a, b) =>
        a.state.dialogue === b.state.dialogue &&
        a.state.panel === b.state.panel &&
        a.state.world === b.state.world &&
        a.state.stop === b.state.stop &&
        a.state.reward === b.state.reward &&
        a.state.rewardQuest === b.state.rewardQuest &&
        a.state.friendship === b.state.friendship &&
        a.state.quests === b.state.quests &&
        a.state.trackedQuestId === b.state.trackedQuestId &&
        a.target?.id === b.target?.id,
    }
  )
  if (state.dialogue) {
    const npc = {
      ...NPCS[state.dialogue.npc],
      ...npcDisplay(state.dialogue.npc),
    }
    const lines = state.dialogue.history
      .slice(-3)
      .map(
        (line) =>
          `${line.role === 'user' ? m.map_you() : npc.name}: ${line.content}`
      )
    lines.unshift(
      `${m.friendship_label()}: ${friendlinessOf(state.friendship, state.dialogue.npc)}`
    )
    if (state.dialogue.thinking) lines.push(m.chat_thinking({ name: npc.name }))
    const { delivery } = dialogueQuests(state, state.dialogue.npc)
    return (
      <XRWorldPanel
        title={npc.name}
        lines={lines.length ? lines : [m.xr_say_hello({ role: npc.role })]}
        buttons={
          state.dialogue.thinking
            ? []
            : [
                ...(delivery
                  ? [
                      {
                        id: 'deliver',
                        label: m.errands_give({
                          item: itemLabel(delivery.itemId),
                        }),
                        onClick: giveItem,
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
          ...(state.rewardQuest?.reward.unlockId
            ? [
                m.reward_unlock({
                  item: unlockLabel(state.rewardQuest.reward.unlockId),
                }),
              ]
            : []),
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

import { GIVER_UNLOCKS, UNLOCKS } from '@saigon/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { equipUnlock } from '@/shared/api/wardrobe'
import { unlockLabel } from '@/shared/i18n'
import { game, initialState } from '@/shared/state/game'
import { resetWardrobeTab, setWardrobeTab } from '@/shared/state/ui'
import { WardrobePanel } from '@/widgets/hud/wardrobe'

const hatId = GIVER_UNLOCKS.hoa[0]

beforeEach(() => {
  game.setState(() => initialState())
  resetWardrobeTab()
})

describe('wardrobe panel', () => {
  it('renders owned hats as cards and hides locked ones', () => {
    game.setState((state) => ({
      ...state,
      unlocks: { owned: [hatId], equipped: {} },
    }))
    const html = renderToStaticMarkup(<WardrobePanel />)
    // The default Hat tab shows the owned hat as an equip card.
    expect(html).toContain(unlockLabel(hatId))
    expect(html).toContain('wardrobe-card')
    // Locked items stay hidden: no locked card and no un-owned hat label.
    expect(html).not.toContain('wardrobe-card is-locked')
    const lockedHatId = GIVER_UNLOCKS.ba[0]
    expect(html).not.toContain(unlockLabel(lockedHatId))
  })

  it('shows the empty-slot message for a slot with no owned items', () => {
    game.setState((state) => ({
      ...state,
      unlocks: { owned: [hatId], equipped: {} },
    }))
    // The Hat tab is the default; a slot the player owns nothing in is empty.
    // Force the Ride tab, which the seed player has not earned.
    setWardrobeTab('vehicle')
    const html = renderToStaticMarkup(<WardrobePanel />)
    expect(html).toContain('wardrobe-empty')
  })

  it('equips an owned unlock optimistically for an offline guest', async () => {
    game.setState((state) => ({
      ...state,
      guestStatus: 'offline',
      unlocks: { owned: [hatId], equipped: {} },
    }))
    await equipUnlock(UNLOCKS[hatId].slot, hatId)
    expect(game.state.unlocks.equipped[UNLOCKS[hatId].slot]).toBe(hatId)
    await equipUnlock(UNLOCKS[hatId].slot, null)
    expect(game.state.unlocks.equipped[UNLOCKS[hatId].slot]).toBeUndefined()
  })

  it('refuses to equip an unowned unlock', async () => {
    const other = GIVER_UNLOCKS.tam[0]
    game.setState((state) => ({
      ...state,
      guestStatus: 'offline',
      unlocks: { owned: [], equipped: {} },
    }))
    await equipUnlock(UNLOCKS[other].slot, other)
    expect(game.state.unlocks.equipped).toEqual({})
  })
})

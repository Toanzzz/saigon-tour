import { GIVER_UNLOCKS, UNLOCKS } from '@saigon/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { equipUnlock } from '@/shared/api/wardrobe'
import { unlockLabel } from '@/shared/i18n'
import { game, initialState } from '@/shared/state/game'
import { WardrobePanel } from '@/widgets/hud/wardrobe'

const hatId = GIVER_UNLOCKS.hoa[0]

beforeEach(() => {
  game.setState(() => initialState())
})

describe('wardrobe panel', () => {
  it('shows owned unlocks as equippable and others as locked', () => {
    game.setState((state) => ({
      ...state,
      unlocks: { owned: [hatId], equipped: {} },
    }))
    const html = renderToStaticMarkup(<WardrobePanel />)
    expect(html).toContain(unlockLabel(hatId))
    expect(html).toContain('is-locked')
    // An owned hat renders an enabled chip, not a locked span.
    const lockedId = GIVER_UNLOCKS.tam[0]
    expect(html).toContain(unlockLabel(lockedId))
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

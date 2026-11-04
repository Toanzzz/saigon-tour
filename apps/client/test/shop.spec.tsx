import { createQuest, type RareWearableId } from '@saigon/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsumableBag, NpcShop } from '@/features/shop'
import { commerce, retryCommerce, transact } from '@/features/shop/api'
import { ShopItemArt } from '@/features/shop/item-art'
import {
  failShopArt,
  resetShop,
  shopView,
  showShop,
} from '@/features/shop/store'
import { stamina, stepStamina } from '@/features/stamina'
import { city, resetCity } from '@/shared/api/city'
import { queryClient } from '@/shared/api/query'
import { game, initialState, update } from '@/shared/state/game'

beforeEach(() => {
  resetCity()
  game.setState(() => ({ ...initialState(), guestStatus: 'offline' }))
})
const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
  )

describe('NPC goods and bag', () => {
  it('renders only the NPC stock, with its specific food icon and effect', () => {
    const html = render(<NpcShop npc="mai" state={game.state} />)
    expect(html).toContain('Buy iced milk coffee')
    expect(html).toContain('Full stamina while you explore')
    expect(html).toContain('good-icon')
    expect(html).not.toContain('Buy ripe banana')
    expect(html).toContain('images/shop/coffee.webp')
    expect(html).not.toContain('<canvas')
  })

  it.each([
    'lacquer-non-la',
    'silk-scarf',
    'festival-ao-dai',
  ] as RareWearableId[])(
    'lists %s as a flat product illustration without loading a model',
    (unlockId) => {
      city.setState((value) => ({
        ...value,
        rareOffer: {
          id: 'test-offer',
          npcId: 'mai',
          unlockId,
          price: 1500,
          startedAt: Date.now(),
          endsAt: Date.now() + 600000,
        },
      }))
      const html = render(<NpcShop npc="mai" state={game.state} />)
      expect(html).toContain(`images/shop/${unlockId}.webp`)
      expect(html).not.toContain('<canvas')
      expect(html).not.toContain('.glb')
      expect(html).not.toContain('images/wardrobe')
    }
  )

  it('replaces failed art with a readable product label and retries on shop reset', () => {
    failShopArt('coffee')
    showShop('mai')
    expect(shopView.state.failedArt).toEqual(['coffee'])
    const html = render(<ShopItemArt id="coffee" label="iced milk coffee" />)
    expect(html).toContain('shop-art-fallback')
    expect(html).toContain('iced milk coffee')
    expect(html).not.toContain('<img')
    resetShop()
    expect(shopView.state.failedArt).toEqual([])
  })

  it('buys then consumes a good offline without sending a trusted purchase event', async () => {
    expect(
      await transact({ kind: 'buy', npcId: 'fruit-vendor', itemId: 'banana' })
    ).toBe(true)
    expect(game.state.world.currency).toBe(28)
    expect(game.state.world.inventory.banana).toBe(1)
    expect(game.state.pending).toEqual([])
    for (let frame = 0; frame < 360; frame++) stepStamina(1 / 60, true, [])
    expect(await transact({ kind: 'use', itemId: 'banana' })).toBe(true)
    expect(game.state.world.inventory.banana).toBe(0)
    expect(stamina.state.current).toBeCloseTo(90, 0)
  })

  it('protects the final delivery copy while allowing surplus consumption', async () => {
    const quest = createQuest({
      giverNpcId: 'hoa',
      title: 'Coffee delivery',
      description: 'Bring coffee to Mai.',
      scope: 'solo',
      steps: [{ type: 'DELIVER', itemId: 'coffee', npcId: 'mai' }],
    })
    update({
      quests: [quest],
      world: { ...game.state.world, inventory: { coffee: 1 } },
    })
    expect(await transact({ kind: 'use', itemId: 'coffee' })).toBe(false)
    expect(game.state.world.inventory.coffee).toBe(1)
    const html = render(<ConsumableBag state={game.state} />)
    expect(html).toContain('reserved for errands')
    expect(html).toContain('disabled')
    update({ world: { ...game.state.world, inventory: { coffee: 2 } } })
    expect(await transact({ kind: 'use', itemId: 'coffee' })).toBe(true)
    expect(game.state.world.inventory.coffee).toBe(1)
  })

  it('retries an uncertain transaction using the same id and original events', async () => {
    update({ guestStatus: 'online', pending: [{ type: 'spend', amount: 5 }] })
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('timeout'))
    expect(
      await transact({ kind: 'buy', npcId: 'mai', itemId: 'coffee' })
    ).toBe(false)
    expect(commerce.state.uncertain).toBe(true)
    const sent = JSON.parse(String(fetcher.mock.calls[0][1]?.body))
    const player = {
      id: crypto.randomUUID(),
      name: 'Tourist',
      body: 'man',
      color: '#ffffff',
      revision: 2,
      friendship: {},
      world: { ...game.state.world, currency: 22, inventory: { coffee: 1 } },
      quests: [],
      completed: [],
      reputation: 0,
      unlocks: { owned: [], equipped: {} },
    }
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          player,
          receipt: { requestId: sent.requestId, restore: 0 },
        })
      )
    )
    expect(await retryCommerce()).toBe(true)
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual(sent)
    expect(game.state.world.currency).toBe(22)
    expect(commerce.state.uncertain).toBe(false)
    fetcher.mockRestore()
  })

  it('restores queued events after a rejected purchase and never switches offline', async () => {
    update({
      guestStatus: 'online',
      pending: [{ type: 'spend', amount: 5 }],
    })
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'insufficient_funds' }), {
        status: 409,
      })
    )
    expect(
      await transact({ kind: 'buy', npcId: 'mai', itemId: 'coffee' })
    ).toBe(false)
    expect(game.state.world.inventory.coffee ?? 0).toBe(0)
    expect(game.state.pending).toEqual([{ type: 'spend', amount: 5 }])
    expect(game.state.guestStatus).toBe('online')
    expect(commerce.state.uncertain).toBe(false)
    fetcher.mockRestore()
  })

  it('waits for long pending batches instead of buying against an old balance', async () => {
    update({
      guestStatus: 'online',
      pending: Array.from({ length: 17 }, () => ({
        type: 'spend' as const,
        amount: 1,
      })),
    })
    const fetcher = vi.spyOn(globalThis, 'fetch')
    expect(
      await transact({ kind: 'buy', npcId: 'mai', itemId: 'coffee' })
    ).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
    expect(game.state.pending).toHaveLength(17)
    fetcher.mockRestore()
  })

  it('keeps offline food usable when more than sixteen local events accumulate', async () => {
    update({
      guestStatus: 'offline',
      world: { ...game.state.world, inventory: { banana: 1 } },
      pending: Array.from({ length: 17 }, () => ({
        type: 'spend' as const,
        amount: 1,
      })),
    })
    expect(await transact({ kind: 'use', itemId: 'banana' })).toBe(true)
    expect(game.state.world.inventory.banana).toBe(0)
    expect(game.state.pending).toHaveLength(17)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { QuestService } from '@/domain/quests'
import { linkGuestSave } from '@/features/auth'
import { fixture } from './fixture'

let fx: Awaited<ReturnType<typeof fixture>>
beforeAll(async () => {
  fx = await fixture()
})
afterAll(async () => {
  await fx.close()
})

async function metaUser(name: string) {
  const id = crypto.randomUUID()
  await fx.sql.query(
    'INSERT INTO "user"(id,name,email,email_verified,updated_at,is_anonymous) VALUES($1,$2,$3,true,now(),false)',
    [id, name, `${id}@facebook.saigon.invalid`]
  )
  return { id, name }
}

describe('anonymous to Meta account linking', () => {
  it('moves the guest save onto a new Meta account', async () => {
    const guest = await fx.guest()
    await new QuestService(fx.db).applyEvents(guest.player.id, [
      { type: 'visit', locationId: 'park' },
    ])
    const account = await metaUser('Lan')
    const guestUserId = (
      await fx.sql.query<{ user_id: string }>(
        'SELECT user_id FROM players WHERE id=$1',
        [guest.player.id]
      )
    ).rows[0]?.user_id as string
    expect(await linkGuestSave(fx.db, guestUserId, account.id)).toBe(
      'inherited-guest'
    )
    const linked = await fx.db.ensurePlayer(account)
    expect(linked.id).toBe(guest.player.id)
    expect(linked.world.visitedLocations).toContain('park')
  })

  it('keeps the existing Meta save and drops the guest journey', async () => {
    const account = await metaUser('Bảo')
    const saved = await fx.db.ensurePlayer(account)
    await new QuestService(fx.db).applyEvents(saved.id, [
      { type: 'visit', locationId: 'river' },
    ])
    const guest = await fx.guest()
    const guestUserId = (
      await fx.sql.query<{ user_id: string }>(
        'SELECT user_id FROM players WHERE id=$1',
        [guest.player.id]
      )
    ).rows[0]?.user_id as string
    expect(await linkGuestSave(fx.db, guestUserId, account.id)).toBe(
      'kept-account'
    )
    // The anonymous plugin deletes the guest user; its save cascades away.
    await fx.sql.query('DELETE FROM "user" WHERE id=$1', [guestUserId])
    const after = await fx.db.ensurePlayer(account)
    expect(after.id).toBe(saved.id)
    expect(after.world.visitedLocations).toContain('river')
    const orphan = await fx.sql.query('SELECT id FROM players WHERE id=$1', [
      guest.player.id,
    ])
    expect(orphan.rows).toHaveLength(0)
  })
})

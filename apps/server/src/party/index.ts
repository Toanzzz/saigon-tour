import { randomUUID } from 'node:crypto'
import type {
  ClientSocketMessage,
  PartyInvite,
  PartySnapshot,
} from '@saigon/shared'
import type { GameDb } from '../db'
import type { RoomManager } from '../realtime/rooms'
import { TeamErrand } from './team'

type Invite = PartyInvite & { targetId: string; partyId: string | null }
export type PartyMessage = Extract<
  ClientSocketMessage,
  { type: 'party-invite' | 'party-respond' | 'party-leave' }
>

export class PartyService {
  readonly parties = new Map<string, PartySnapshot>()
  readonly invites = new Map<string, Invite>()
  private memberships = new Map<string, string>()
  private queue: Promise<unknown> = Promise.resolve()
  private readonly team: TeamErrand

  constructor(
    readonly rooms: RoomManager,
    db: GameDb,
    private readonly now = Date.now
  ) {
    this.team = new TeamErrand(this, db)
    rooms.onTick((time) => this.tick(time))
    rooms.onLeave((id) => {
      void this.leave(id).catch(() => {
        rooms.send(id, { type: 'error', message: 'service_unavailable' })
      })
    })
  }

  snapshot(playerId: string): PartySnapshot | null {
    const id = this.memberships.get(playerId)
    const party = id ? this.parties.get(id) : undefined
    return party ? structuredClone(party) : null
  }

  current(playerId: string) {
    const id = this.memberships.get(playerId)
    return id ? this.parties.get(id) : undefined
  }

  serialize<T>(work: () => T | Promise<T>): Promise<T> {
    const operation = this.queue.then(work)
    this.queue = operation.catch(() => {})
    return operation
  }

  invite(fromId: string, targetId: string) {
    return this.serialize(() => {
      this.tick()
      this.validateInvite(fromId, targetId)
      const existing = [...this.invites.values()].find(
        (invite) => invite.fromId === fromId && invite.targetId === targetId
      )
      if (existing) return this.publicInvite(existing)
      const from = this.rooms.getPlayer(fromId)
      if (!from) throw new Error('player_not_connected')
      const invite: Invite = {
        inviteId: randomUUID(),
        fromId,
        fromName: from.name,
        expiresAt: this.now() + 30_000,
        targetId,
        partyId: this.memberships.get(fromId) ?? null,
      }
      this.invites.set(invite.inviteId, invite)
      this.rooms.send(targetId, {
        type: 'party-invited',
        ...this.publicInvite(invite),
      })
      return this.publicInvite(invite)
    })
  }

  respond(playerId: string, inviteId: string, accept: boolean) {
    return this.serialize(() => {
      const invite = this.invites.get(inviteId)
      if (!invite || invite.targetId !== playerId)
        throw new Error('invite_not_found')
      this.invites.delete(inviteId)
      if (invite.expiresAt <= this.now()) throw new Error('invite_expired')
      if (!accept) return this.snapshot(playerId)
      this.validateInvite(invite.fromId, playerId)
      if ((this.memberships.get(invite.fromId) ?? null) !== invite.partyId)
        throw new Error('party_changed')
      const from = this.rooms.getPlayer(invite.fromId)
      const target = this.rooms.getPlayer(playerId)
      if (!from || !target) throw new Error('player_not_connected')
      let party = this.current(invite.fromId)
      if (!party) {
        party = {
          id: randomUUID(),
          members: [{ id: from.id, name: from.name, color: from.color }],
          quest: null,
        }
        this.parties.set(party.id, party)
        this.memberships.set(from.id, party.id)
      }
      party.members.push({
        id: target.id,
        name: target.name,
        color: target.color,
      })
      this.memberships.set(playerId, party.id)
      this.clearInvites(playerId)
      this.push(party)
      return this.snapshot(playerId)
    })
  }

  leave(playerId: string) {
    return this.serialize(() => {
      this.clearInvites(playerId)
      const party = this.current(playerId)
      this.memberships.delete(playerId)
      this.rooms.send(playerId, { type: 'party', party: null })
      if (!party) return
      party.members = party.members.filter((member) => member.id !== playerId)
      if (party.quest) {
        party.quest.assignments = party.quest.assignments.filter(
          (assignment) => assignment.playerId !== playerId
        )
        if (party.quest.assignments.length < 2) party.quest = null
      }
      if (party.members.length < 2) {
        for (const member of party.members) {
          this.memberships.delete(member.id)
          this.rooms.send(member.id, { type: 'party', party: null })
        }
        this.parties.delete(party.id)
      } else this.push(party)
    })
  }

  async handle(playerId: string, message: PartyMessage) {
    if (message.type === 'party-invite')
      await this.invite(playerId, message.targetId)
    else if (message.type === 'party-respond')
      await this.respond(playerId, message.inviteId, message.accept)
    else await this.leave(playerId)
  }

  connected(playerId: string) {
    this.rooms.send(playerId, {
      type: 'party',
      party: this.snapshot(playerId),
    })
    this.tick()
    for (const invite of this.invites.values())
      if (invite.targetId === playerId)
        this.rooms.send(playerId, {
          type: 'party-invited',
          ...this.publicInvite(invite),
        })
  }

  tick(now = this.now()) {
    for (const [id, invite] of this.invites)
      if (invite.expiresAt <= now) this.invites.delete(id)
  }

  push(party: PartySnapshot) {
    for (const member of party.members)
      this.rooms.send(member.id, {
        type: 'party',
        party: structuredClone(party),
      })
  }

  offerQuest(...args: Parameters<TeamErrand['offerQuest']>) {
    return this.serialize(() => this.team.offerQuest(...args))
  }

  checkQuest(...args: Parameters<TeamErrand['checkQuest']>) {
    return this.serialize(() => this.team.checkQuest(...args))
  }

  deliver(...args: Parameters<TeamErrand['deliver']>) {
    return this.serialize(() => this.team.deliver(...args))
  }

  private validateInvite(fromId: string, targetId: string) {
    if (fromId === targetId) throw new Error('cannot_invite_self')
    const room = this.rooms.room(fromId)
    const from = room?.members.get(fromId)
    const target = room?.members.get(targetId)
    if (!room || this.rooms.room(targetId) !== room)
      throw new Error('different_room')
    if (!from?.socket || !target?.socket)
      throw new Error('player_not_connected')
    if (this.current(targetId)) throw new Error('already_in_party')
    if ((this.current(fromId)?.members.length ?? 1) >= 4)
      throw new Error('party_full')
    if (
      Math.hypot(
        ...from.player.position.map(
          (coordinate, index) => coordinate - target.player.position[index]
        )
      ) > 8
    )
      throw new Error('too_far')
  }

  private clearInvites(playerId: string) {
    for (const [id, invite] of this.invites)
      if (invite.fromId === playerId || invite.targetId === playerId)
        this.invites.delete(id)
  }

  private publicInvite(invite: Invite): PartyInvite {
    const { inviteId, fromId, fromName, expiresAt } = invite
    return { inviteId, fromId, fromName, expiresAt }
  }
}

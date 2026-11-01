import { Client, type Room } from '@colyseus/sdk'
import {
  type ClientSocketMessage,
  cityFromRoomState,
  type Emote,
  type PartyClientMessage,
  type ServerSocketMessage,
  ServerSocketMessageSchema,
  toPresence,
  WORLD_ROOM,
  type WorldRoomState,
} from '@saigon/shared'
import { motion } from '@/shared/runtime/motion'
import { game, notify } from '@/shared/state/game'
import { applyCity, cityHeadline, resetCity } from './city'
import {
  acknowledgeWorld,
  currentEventBatch,
  nextEventBatch,
  resetEventSequence,
} from './events'
import { clearExpiredInvite, handlePartyMessage } from './party'
import {
  clearPresence,
  EMOTE_TEXT,
  npcSpeech,
  recordPlayers,
  speech,
} from './presence'
import { API_BASE, sessionToken } from './session'
import { net, updateNet } from './status'

/** Colyseus endpoint: the API base, absolute, keeping any path prefix. */
export function realtimeUrl(base = API_BASE, origin = location.href) {
  return new URL(base.replace(/\/$/, ''), origin).toString().replace(/\/$/, '')
}
let activeRoom: Room<unknown, WorldRoomState> | null = null
let lastEmote = -Infinity

function sendMessage({ type, ...payload }: ClientSocketMessage) {
  if (!activeRoom || net.state.connection !== 'connected') return false
  activeRoom.send(type, payload)
  return true
}
export function sendParty(message: PartyClientMessage) {
  if (sendMessage(message)) return true
  notify('Connect to the neighborhood to join a team.')
  return false
}
export function sendEmote(emote: Emote) {
  if (performance.now() - lastEmote < 1000) return false
  if (!sendMessage({ type: 'emote', emote })) return false
  lastEmote = performance.now()
  return true
}

function handle(message: ServerSocketMessage, room: Room) {
  if (message.type === 'welcome') {
    updateNet({
      connection: 'connected',
      selfId: message.selfId,
      room: message.room,
    })
    const batch = currentEventBatch()
    if (batch) room.send('events', batch)
  } else if (
    message.type === 'party' ||
    message.type === 'party-invited' ||
    message.type === 'quest-completed'
  )
    handlePartyMessage(message)
  else if (message.type === 'city-headline') cityHeadline(message.headline)
  else if (message.type === 'world') acknowledgeWorld(message)
  else if (message.type === 'emote')
    speech.set(message.playerId, {
      text: EMOTE_TEXT[message.emote],
      until: performance.now() + 4500,
    })
  else if (message.type === 'npc-line')
    npcSpeech.set(message.npcId, {
      text: message.reply,
      until: performance.now() + 7000,
    })
  else if (message.type === 'error') {
    notify(message.message)
    // A stuck event batch is resent after reconnecting.
    if (currentEventBatch()) void room.leave(false)
  }
}

/** Presence lives in Colyseus state; only roster metadata enters the store. */
function syncRoster(state: WorldRoomState) {
  applyCity(cityFromRoomState(state))
  const players = [...state.players.values()].map(toPresence)
  recordPlayers(players, net.state.selfId ?? '')
  const roster = players.map(({ id, name, color }) => ({ id, name, color }))
  if (JSON.stringify(roster) !== JSON.stringify(net.state.players))
    updateNet({ players: roster })
}

export function installRealtime() {
  let disposed = false
  let guest: string | null = null
  let room: Room<unknown, WorldRoomState> | null = null
  let retry: ReturnType<typeof setTimeout> | undefined
  let attempt = 0
  let joining = false
  let batchSentAt = 0
  let sentSequence: number | null = null

  const offline = () => {
    activeRoom = null
    clearPresence()
    resetCity()
    updateNet({
      connection: 'offline',
      room: null,
      players: [],
      party: null,
      invite: null,
    })
  }
  const disconnect = () => {
    clearTimeout(retry)
    const current = room
    room = null
    if (current) void current.leave()
    offline()
  }
  const schedule = () => {
    clearTimeout(retry)
    updateNet({ connection: 'reconnecting', players: [], invite: null })
    retry = setTimeout(connect, Math.min(10000, 500 * 2 ** attempt++))
  }
  const connect = async () => {
    if (disposed || joining || room || !guest) return
    if (game.state.guestStatus !== 'online') return
    joining = true
    updateNet({ connection: attempt ? 'reconnecting' : 'connecting' })
    const client = new Client(realtimeUrl())
    client.auth.token = sessionToken() ?? ''
    try {
      const joined = await client.joinOrCreate<WorldRoomState>(WORLD_ROOM)
      if (disposed || game.state.guestId !== guest) {
        void joined.leave()
        return
      }
      room = joined
      activeRoom = joined
      attempt = 0
      joined.onMessage('*', (_type, payload) => {
        const parsed = ServerSocketMessageSchema.safeParse(payload)
        if (parsed.success && room === joined) handle(parsed.data, joined)
      })
      joined.onStateChange((state) => {
        if (room === joined) syncRoster(state)
      })
      joined.onDrop(() => {
        if (room !== joined) return
        clearPresence()
        resetCity()
        updateNet({ connection: 'reconnecting', players: [], invite: null })
      })
      joined.onReconnect(() => {
        if (room !== joined) return
        updateNet({ connection: 'connected' })
        const batch = currentEventBatch()
        if (batch) joined.send('events', batch)
      })
      joined.onLeave(() => {
        if (room !== joined) return
        resetCity()
        room = null
        activeRoom = null
        clearPresence()
        if (!disposed && game.state.guestStatus === 'online') schedule()
        else offline()
      })
    } catch {
      if (!disposed) schedule()
    } finally {
      joining = false
    }
  }
  const sync = () => {
    const next = game.state.guestId
    if (next !== guest) {
      disconnect()
      resetEventSequence()
      guest = next
      attempt = 0
      void connect()
    } else if (game.state.guestStatus !== 'online') disconnect()
    else if (!room) void connect()
  }
  const unsubscribe = game.subscribe(sync)
  sync()
  const timer = setInterval(() => {
    clearExpiredInvite()
    if (!room || net.state.connection !== 'connected') return
    room.send('state', {
      position: motion.position.toArray() as [number, number, number],
      heading: motion.heading,
      ride:
        game.state.screen === 'title'
          ? 'loading'
          : (game.state.ride?.mode ?? null),
    })
    const batch = nextEventBatch()
    if (batch) {
      room.send('events', batch)
      batchSentAt = performance.now()
      sentSequence = batch.sequence
    }
    const outstanding = currentEventBatch()
    if (
      outstanding &&
      outstanding.sequence === sentSequence &&
      performance.now() - batchSentAt > 4000
    )
      void room.leave(false)
  }, 100)
  return () => {
    disposed = true
    unsubscribe.unsubscribe()
    clearInterval(timer)
    disconnect()
  }
}

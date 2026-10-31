import {
  type ClientSocketMessage,
  type Emote,
  type PartyClientMessage,
  ServerSocketMessageSchema,
} from '@saigon/shared'
import { motion } from '../core/motion'
import { game, notify } from '../state/game'
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
  presence,
  recordPlayer,
  recordPlayers,
  speech,
} from './presence'
import { API_BASE, guestToken } from './session'
import { net, updateNet } from './status'

export function sendParty(message: PartyClientMessage) {
  if (
    net.state.connection !== 'connected' ||
    activeSocket?.readyState !== WebSocket.OPEN
  ) {
    notify('Connect to the neighborhood to join a team.')
    return false
  }
  activeSocket.send(JSON.stringify(message))
  return true
}

export function socketUrl(base = API_BASE, origin = location.href) {
  const url = new URL(`${base.replace(/\/$/, '')}/ws`, origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}
let activeSocket: WebSocket | null = null
let lastEmote = -Infinity
export function sendEmote(emote: Emote) {
  if (
    net.state.connection !== 'connected' ||
    performance.now() - lastEmote < 1000
  )
    return false
  lastEmote = performance.now()
  activeSocket?.send(JSON.stringify({ type: 'emote', emote }))
  return true
}
export function installRealtime() {
  let disposed = false
  let guest: string | null = null
  let socket: WebSocket | null = null
  let retry: ReturnType<typeof setTimeout> | undefined
  let handshake: ReturnType<typeof setTimeout> | undefined
  let attempt = 0
  let ready = false
  let batchSentAt = 0
  let sentSequence: number | null = null
  const send = (message: ClientSocketMessage) => {
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message))
  }
  const disconnect = () => {
    clearTimeout(retry)
    clearTimeout(handshake)
    if (socket) {
      socket.onclose = null
      socket.close(1000)
    }
    socket = null
    activeSocket = null
    ready = false
    clearPresence()
    updateNet({
      connection: 'offline',
      room: null,
      players: [],
      party: null,
      invite: null,
    })
  }
  const connect = () => {
    if (disposed || !guest || game.state.guestStatus !== 'online') return
    updateNet({ connection: attempt ? 'reconnecting' : 'connecting' })
    socket = new WebSocket(socketUrl())
    activeSocket = socket
    const connection = socket
    handshake = setTimeout(() => connection.close(), 6000)
    connection.onopen = () => {
      send({ type: 'hello', token: guestToken() ?? '', protocol: 1 })
    }
    connection.onmessage = (event) => {
      if (socket !== connection) return
      let parsed: ReturnType<typeof ServerSocketMessageSchema.safeParse>
      try {
        parsed = ServerSocketMessageSchema.safeParse(JSON.parse(event.data))
      } catch {
        return
      }
      if (!parsed.success) return
      const message = parsed.data
      if (message.type === 'welcome') {
        clearTimeout(handshake)
        ready = true
        attempt = 0
        updateNet({
          connection: 'connected',
          selfId: message.selfId,
          room: message.room,
          players: message.players.map(({ id, name, color }) => ({
            id,
            name,
            color,
          })),
        })
        recordPlayers(message.players, message.selfId)
        const batch = currentEventBatch()
        if (batch) {
          send({ type: 'events', ...batch })
          batchSentAt = performance.now()
          sentSequence = batch.sequence
        }
      } else if (message.type === 'players') {
        recordPlayers(message.players, net.state.selfId ?? '')
        // Only roster metadata enters the store; movement stays in the buffer.
        const roster = message.players.map(({ id, name, color }) => ({
          id,
          name,
          color,
        }))
        if (JSON.stringify(roster) !== JSON.stringify(net.state.players))
          updateNet({ players: roster })
      } else if (message.type === 'player-joined') {
        if (message.player.id !== net.state.selfId) recordPlayer(message.player)
        updateNet({
          players: [
            ...net.state.players.filter((p) => p.id !== message.player.id),
            {
              id: message.player.id,
              name: message.player.name,
              color: message.player.color,
            },
          ],
        })
      } else if (message.type === 'player-left') {
        presence.delete(message.playerId)
        updateNet({
          players: net.state.players.filter((p) => p.id !== message.playerId),
        })
      } else if (
        message.type === 'party' ||
        message.type === 'party-invited' ||
        message.type === 'quest-completed'
      )
        handlePartyMessage(message)
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
        if (currentEventBatch()) connection.close()
      }
    }
    connection.onclose = () => {
      if (socket !== connection || disposed) return
      clearTimeout(handshake)
      ready = false
      activeSocket = null
      clearPresence()
      updateNet({ connection: 'reconnecting', players: [], invite: null })
      retry = setTimeout(connect, Math.min(10000, 500 * 2 ** attempt++))
    }
    connection.onerror = () => connection.close()
  }
  const sync = () => {
    const next = game.state.guestId
    if (next !== guest) {
      disconnect()
      resetEventSequence()
      guest = next
      attempt = 0
      if (next && game.state.guestStatus === 'online') connect()
    } else if (game.state.guestStatus !== 'online') disconnect()
    else if (!socket && guest) connect()
  }
  const unsubscribe = game.subscribe(sync)
  sync()
  const timer = setInterval(() => {
    clearExpiredInvite()
    if (!ready) return
    const position = motion.position.toArray() as [number, number, number]
    send({
      type: 'state',
      position,
      heading: motion.heading,
      ride:
        game.state.screen === 'title'
          ? 'loading'
          : (game.state.ride?.mode ?? null),
    })
    const batch = nextEventBatch()
    if (batch) {
      send({ type: 'events', ...batch })
      batchSentAt = performance.now()
      sentSequence = batch.sequence
    }
    const outstanding = currentEventBatch()
    if (
      outstanding &&
      outstanding.sequence === sentSequence &&
      performance.now() - batchSentAt > 4000
    )
      socket?.close()
  }, 100)
  return () => {
    disposed = true
    unsubscribe.unsubscribe()
    clearInterval(timer)
    disconnect()
  }
}

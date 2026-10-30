import { Store } from '@tanstack/store'

export interface NetState {
  connection: 'offline' | 'connecting' | 'connected' | 'reconnecting'
  selfId: string | null
  room: string | null
  players: { id: string; name: string; color: string }[]
  emotesOpen: boolean
}
export const net = new Store<NetState>({
  connection: 'offline',
  selfId: null,
  room: null,
  players: [],
  emotesOpen: false,
})
export const updateNet = (patch: Partial<NetState>) =>
  net.setState((state) => ({ ...state, ...patch }))

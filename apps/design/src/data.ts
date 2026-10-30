import {
  Home,
  type LucideIcon,
  Map as MapIcon,
  Route,
  UsersRound,
} from 'lucide-react'

export const navItems: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'journey', label: 'Journal', icon: MapIcon },
  { id: 'neighbors', label: 'Neighbors', icon: UsersRound },
  { id: 'routes', label: 'Rides', icon: Route },
]

/* Pin positions are percentages of the Chợ Bến Thành diorama image. */
export const pins = [
  { id: 'market', label: 'Chợ Bến Thành', x: 45.5, y: 49, here: true },
  { id: 'roundabout', label: 'Bùng binh', x: 36.5, y: 63 },
  { id: 'bus', label: 'Bus stop', x: 83, y: 61 },
  { id: 'park', label: 'Công viên', x: 89, y: 77 },
]

export const steps = [
  { title: 'Meet Cô Hoa', detail: 'Market stall', state: 'done' },
  { title: 'Deliver the herbs', detail: 'Chị Linh, in the park', state: 'now' },
  { title: 'Make a memory', detail: 'Earn a postcard', state: 'next' },
] as const

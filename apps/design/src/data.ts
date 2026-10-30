import {
  Home,
  type LucideIcon,
  Map as MapIcon,
  Route,
  UsersRound,
} from 'lucide-react'

export const navItems: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'journey', label: 'Journey journal', icon: MapIcon },
  { id: 'neighbors', label: 'Neighbors', icon: UsersRound },
  { id: 'routes', label: 'Routes & rides', icon: Route },
]
export const stops = [
  { label: 'Bến Thành', x: '18%', y: '53%', tone: 'gold', icon: '✦' },
  { label: 'Công viên', x: '67%', y: '32%', tone: 'coral', icon: '●' },
  { label: 'Nhà thờ', x: '77%', y: '69%', tone: 'cream', icon: '✚' },
  { label: 'Bến sông', x: '38%', y: '82%', tone: 'jade', icon: '≈' },
]

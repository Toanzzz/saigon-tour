import type { CSSProperties } from 'react'

const paths = {
  arrow: 'M4 12h15M13 6l6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
  pause: 'M8 5v14M16 5v14',
  sound: 'M11 5 5 9H2v6h3l6 4V5Zm4 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14',
  muted: 'M11 5 5 9H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6',
  book: 'M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2V4Z',
  map: 'm2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3V5Zm7-3v17m6-14v17',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v8m-3-4h6',
  leaf: 'M5 19c-9-11 7-17 15-15 2 10-4 22-15 15Zm0 0L16 8',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  bus: 'M5 17V5c0-3 14-3 14 0v12H5Zm0-10h14M5 13h14M7 17v3m10-3v3M8 15h1m6 0h1',
  compass: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4 5-3 7-6 3 3-7 6-3Z',
  check: 'm5 12 5 5L20 7',
  home: 'M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6',
  users:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10c0-4 3-6 7-6s7 2 7 6m1-10a3 3 0 1 0 0-6m2 16c0-3-1-5-3-6',
  stamp: 'M9 3h6v5l-2 3v3h7v4H4v-4h7v-3L9 8V3Zm-5 18h16',
  play: 'M7 4v16l13-8L7 4Z',
  dice: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
} as const

export function Icon({
  name,
  size = 20,
  style,
}: {
  name: keyof typeof paths
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}

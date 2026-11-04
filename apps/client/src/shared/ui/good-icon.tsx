import type { MarketItemId } from '@saigon/shared'

const paths: Record<MarketItemId, string> = {
  coffee:
    'M5 8h13l-1 13H6L5 8Zm-1 0h15M8 4h8M11 4V2m3 6 2-6M18 11h2a3 3 0 0 1-2 6',
  banana:
    'M19 3c1 8-3 16-10 17-4 0-6-3-5-5 7 2 13-2 14-10l1-2ZM4 15l-2-2m17-9 2-1',
  baguette:
    'm5 20 15-15c3-3-1-6-4-3L2 16c-3 3 0 7 3 4Zm1-9 3 3m1-7 3 3m1-7 3 3',
  pho: 'M3 13h18c0 11-18 11-18 0ZM2 13h20M7 5c-3 3 3 3 0 6m5-8c-3 3 3 3 0 6m5-6c-3 3 3 3 0 6',
}
export function GoodIcon({ id }: { id: MarketItemId }) {
  return (
    <svg
      className="good-icon"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[id]} />
    </svg>
  )
}

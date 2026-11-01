import { m } from '@/shared/i18n'

export const AFFINITY_TIERS = [
  { id: 'cold', min: -5, label: m.friendship_cold },
  { id: 'wary', min: -2, label: m.friendship_wary },
  { id: 'neutral', min: 0, label: m.friendship_neutral },
  { id: 'warm', min: 2, label: m.friendship_warm },
  { id: 'close', min: 4, label: m.friendship_close },
] as const
export type AffinityTier = (typeof AFFINITY_TIERS)[number]['id']

export function affinityTier(level: number) {
  let index = 0
  for (let i = 0; i < AFFINITY_TIERS.length; i++)
    if (level >= AFFINITY_TIERS[i].min) index = i
  return { index, tier: AFFINITY_TIERS[Math.max(0, index)] }
}

const HEART =
  'M12 20.2c-.3 0-8.6-4.9-8.6-11a4.6 4.6 0 0 1 8.6-2.3 4.6 4.6 0 0 1 8.6 2.3c0 6.1-8.3 11-8.6 11Z'
const FILL: Record<AffinityTier, string> = {
  cold: 'var(--pool)',
  wary: '#c8d3e8',
  neutral: 'var(--wall-hi)',
  warm: 'var(--roof-hi)',
  close: 'var(--bus-red)',
}

export function AffinityIcon({
  tier,
  size = 20,
}: {
  tier: AffinityTier
  size?: number
}) {
  const warm = tier === 'warm' || tier === 'close'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`affinity-icon affinity-${tier}`}
    >
      <path
        d={HEART}
        fill={FILL[tier]}
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {tier === 'cold' && (
        <path
          d="m12.4 7.6-1.9 3.6 2.6 1.6-1.6 3.6"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {tier === 'wary' && (
        <path
          d="M8.6 12.4h6.8"
          stroke="var(--ink)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
      {warm && (
        <path
          d="M6.6 9.4a2.3 2.3 0 0 1 2.2-2.2"
          fill="none"
          stroke="var(--wall-hi)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
      {tier === 'close' && (
        <path
          d="m19.3 1.6.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z"
          fill="var(--bus)"
          stroke="var(--ink)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

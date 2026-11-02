import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, type Group, SRGBColorSpace } from 'three'
import { game } from '@/shared/state/game'
import type { Vec3 } from './assets'
import { CULTURAL_FOOTPRINTS } from './district'
import { Nearby } from './nearby'

/**
 * Postcards floating above the central post office on ink wires, with a gentle
 * bob that freezes under reduced motion. No collision. The canvas texture is a
 * stamp with a hand-drawn landmark and a diegetic "SÀI GÒN" postmark.
 */

type Landmark = 'tower' | 'spire' | 'dome'

function stampTexture(landmark: Landmark, paper: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 320
  const c = canvas.getContext('2d')
  if (!c) return new CanvasTexture(canvas)
  c.fillStyle = paper
  c.fillRect(0, 0, 256, 320)
  // Perforated stamp border.
  c.strokeStyle = '#2b2230'
  c.lineWidth = 6
  c.setLineDash([10, 8])
  c.strokeRect(22, 22, 212, 240)
  c.setLineDash([])
  // Hand-drawn landmark silhouette.
  c.fillStyle = '#c8643f'
  c.strokeStyle = '#2b2230'
  c.lineWidth = 4
  c.beginPath()
  if (landmark === 'tower') {
    c.rect(96, 120, 64, 120)
    c.moveTo(96, 120)
    c.lineTo(128, 72)
    c.lineTo(160, 120)
  } else if (landmark === 'spire') {
    c.moveTo(100, 240)
    c.lineTo(128, 70)
    c.lineTo(156, 240)
    c.closePath()
  } else {
    c.arc(128, 170, 56, Math.PI, 0)
    c.rect(72, 170, 112, 70)
  }
  c.fill()
  c.stroke()
  // Postmark circle + diegetic text.
  c.strokeStyle = '#2b2230'
  c.lineWidth = 3
  c.beginPath()
  c.arc(188, 70, 34, 0, Math.PI * 2)
  c.stroke()
  c.fillStyle = '#2b2230'
  c.font = 'bold 16px Georgia, serif'
  c.textAlign = 'center'
  c.fillText('SÀI GÒN', 188, 75)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const FACE_YAW = -Math.PI / 2 // card planes face −x, toward the plaza
const CARDS: {
  offset: Vec3
  yaw: number
  landmark: Landmark
  paper: string
}[] = [
  { offset: [-6.6, 7.6, -3.2], yaw: 0.2, landmark: 'tower', paper: '#f4e7c6' },
  { offset: [-6.9, 8.4, -0.8], yaw: -0.1, landmark: 'spire', paper: '#f7eccb' },
  { offset: [-6.4, 7.9, 1.6], yaw: 0.16, landmark: 'dome', paper: '#f1e3c0' },
  { offset: [-6.8, 8.6, 3.8], yaw: -0.24, landmark: 'tower', paper: '#f6ead0' },
  { offset: [-6.5, 7.2, 0.4], yaw: 0.06, landmark: 'spire', paper: '#f3e6c4' },
]

export function PostOfficePostcards() {
  const { x, z } = CULTURAL_FOOTPRINTS.postoffice
  // Cull from afar so the cathedral perf pose (≈35 m away) doesn't pay for it.
  return (
    <Nearby at={[x, z]} distance={30}>
      <group position={[x, 0, z]}>
        {CARDS.map((card, i) => (
          <Postcard
            key={`${card.offset[0]}/${card.offset[1]}`}
            card={card}
            seed={i}
          />
        ))}
      </group>
    </Nearby>
  )
}

function Postcard({
  card,
  seed,
}: {
  card: (typeof CARDS)[number]
  seed: number
}) {
  const group = useRef<Group>(null)
  const texture = useMemo(
    () => stampTexture(card.landmark, card.paper),
    [card.landmark, card.paper]
  )
  useEffect(() => () => texture.dispose(), [texture])
  const [ox, oy, oz] = card.offset
  useFrame(() => {
    if (!group.current) return
    const bob = game.state.reducedMotion
      ? 0
      : Math.sin(Date.now() / 900 + seed) * 0.18
    group.current.position.y = oy + bob
    group.current.rotation.z = game.state.reducedMotion
      ? 0
      : Math.sin(Date.now() / 1400 + seed) * 0.06
  })
  return (
    <group
      ref={group}
      position={[ox, oy, oz]}
      rotation={[0, FACE_YAW + card.yaw, 0]}
    >
      {/* Ink wire down to the façade. */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.02, 1.8, 0.02]} />
        <meshBasicMaterial color="#2b2230" toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.9, 1.15]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

import { useXR } from '@react-three/xr'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Vec3 } from '@/shared/world/assets'

export interface XRPanelButton {
  id: string
  label: string
  onClick: () => void
}

interface XRWorldPanelProps {
  title: string
  lines: string[]
  buttons?: XRPanelButton[]
  position?: Vec3
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/)
  let line = ''
  let row = 0
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width > width && line) {
      context.fillText(line, x, y + row * lineHeight)
      row += 1
      line = word
    } else line = next
  }
  if (line) context.fillText(line, x, y + row * lineHeight)
  return row + 1
}

// Mirrors packages/shared/tokens.css; canvas textures cannot read CSS variables.
const TONE = {
  wall: '#f6e5aa',
  roof: '#ee7448',
  roofSide: '#c2532f',
  ink: '#262835',
}
const DISPLAY = '"Baloo 2 Variable", system-ui, sans-serif'
const BODY = '"Be Vietnam Pro", system-ui, sans-serif'

function panelTexture(title: string, lines: string[]): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.fillStyle = TONE.wall
  context.fillRect(0, 0, canvas.width, canvas.height)
  for (let x = 0; x < canvas.width; x += 30) {
    context.fillStyle = TONE.roof
    context.fillRect(x, 0, 26, 40)
    context.fillStyle = TONE.roofSide
    context.fillRect(x + 26, 0, 4, 40)
  }
  context.strokeStyle = TONE.ink
  context.lineWidth = 8
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)
  context.fillStyle = TONE.ink
  context.fillRect(0, 40, canvas.width, 6)
  context.font = `800 54px ${DISPLAY}`
  context.fillText(title, 54, 116)
  context.font = `30px ${BODY}`
  let y = 170
  for (const line of lines) {
    y += drawText(context, line, 54, y, 916, 40) * 40 + 14
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function XRWorldPanel({
  title,
  lines,
  buttons = [],
  position = [0, 1.6, -2],
}: XRWorldPanelProps) {
  const active = useXR((state) => Boolean(state.session))
  const texture = useMemo(() => panelTexture(title, lines), [title, lines])
  useEffect(() => () => texture.dispose(), [texture])
  if (!active) return null
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[1.8, 1.13]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {buttons.map((button, index) => (
        <XRWorldButton
          key={button.id}
          label={button.label}
          position={[
            -0.58 + (index % 2) * 0.64,
            -0.83 - Math.floor(index / 2) * 0.24,
            0.01,
          ]}
          onClick={button.onClick}
        />
      ))}
    </group>
  )
}

function XRWorldButton({
  label,
  position,
  onClick,
}: {
  label: string
  position: Vec3
  onClick: () => void
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 112
    const context = canvas.getContext('2d')
    if (context) {
      context.fillStyle = TONE.roof
      context.fillRect(0, 0, 512, 112)
      context.fillStyle = TONE.roofSide
      context.fillRect(0, 92, 512, 20)
      context.strokeStyle = TONE.ink
      context.lineWidth = 8
      context.strokeRect(4, 4, 504, 104)
      context.fillStyle = TONE.ink
      context.font = `800 34px ${DISPLAY}`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(label, 256, 56, 480)
    }
    const result = new CanvasTexture(canvas)
    result.colorSpace = SRGBColorSpace
    return result
  }, [label])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: XR ray pointers target this mesh.
    <mesh position={position} onClick={onClick}>
      <planeGeometry args={[0.56, 0.12]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

import { useXR } from '@react-three/xr'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Vec3 } from '../../world/assets'

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

function panelTexture(title: string, lines: string[]): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) return new CanvasTexture(canvas)
  context.fillStyle = '#123b36'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#f4cb76'
  context.lineWidth = 8
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
  context.fillStyle = '#f4cb76'
  context.font = 'bold 48px Georgia, serif'
  context.fillText(title, 54, 82)
  context.fillStyle = '#fff4db'
  context.font = '30px Arial, sans-serif'
  let y = 142
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
      context.fillStyle = '#e89768'
      context.fillRect(0, 0, 512, 112)
      context.fillStyle = '#fff4db'
      context.font = 'bold 30px Arial, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(label.slice(0, 26), 256, 56)
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

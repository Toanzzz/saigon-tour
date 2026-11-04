import { useSelector } from '@tanstack/react-store'
import { navigationView } from './navigation'
export function NavigationMarker() {
  const target = useSelector(navigationView, (value) => value)
  if (!target) return null
  return (
    <mesh
      position={[target.point[0], 0.16, target.point[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      userData={{ navigationMarker: true }}
    >
      <ringGeometry args={[0.35, 0.5, 24]} />
      <meshBasicMaterial color="#f5e4a1" depthWrite={false} />
    </mesh>
  )
}

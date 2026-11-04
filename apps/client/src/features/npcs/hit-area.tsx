/** Generous mouse target for character silhouettes, including narrow poses. */
export function NpcHitArea() {
  return (
    <mesh position={[0, 1.2, 0]}>
      <boxGeometry args={[1.1, 2.4, 0.9]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

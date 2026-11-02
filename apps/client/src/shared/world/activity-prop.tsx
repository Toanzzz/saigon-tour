import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import type { Object3D } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { modelUrl } from './assets'

/** Props follow the model's arm rather than floating at a fixed world position. */
export function ActivityProp({ root, path }: { root: Object3D; path: string }) {
  const { scene } = useGLTF(modelUrl(path), `${import.meta.env.BASE_URL}draco/`)
  const object = useMemo(() => clone(scene), [scene])
  useEffect(() => {
    const hand = root.getObjectByName('arm-right')
    if (!hand) return
    object.scale.setScalar(path.endsWith('cup-coffee') ? 0.16 : 0.22)
    object.position.set(0, -0.25, 0.08)
    object.userData.activityProp = path
    hand.add(object)
    return () => {
      object.removeFromParent()
    }
  }, [root, object, path])
  return null
}

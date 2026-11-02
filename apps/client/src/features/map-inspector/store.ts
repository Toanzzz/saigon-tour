import { Store } from '@tanstack/store'

export { mapInspectorEnabled } from '@/shared/world/map-debug'

const initial = () => ({ focus: 'all', overhead: false, colliders: false })
export const mapInspector = new Store(initial())
export const resetMapInspector = () => mapInspector.setState(initial)
export function inspectMap(patch: Partial<ReturnType<typeof initial>>) {
  mapInspector.setState((state) => ({ ...state, ...patch }))
}

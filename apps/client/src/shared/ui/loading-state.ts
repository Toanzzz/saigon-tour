import { Store } from '@tanstack/store'

export const loadingPanels = new Store<ReadonlySet<string>>(new Set<string>())

export function setLoadingPanel(scope: string, pending: boolean) {
  loadingPanels.setState((current) => {
    if (current.has(scope) === pending) return current
    const next = new Set(current)
    if (pending) next.add(scope)
    else next.delete(scope)
    return next
  })
}

export function resetLoadingPanels() {
  loadingPanels.setState(() => new Set<string>())
}

import { Store } from '@tanstack/store'

type Status = 'ready' | 'failed'
export const wardrobeThumbnails = new Store<Record<string, Status>>({})

export function thumbnailStatus(path: string, status: Status) {
  wardrobeThumbnails.setState((state) =>
    state[path] === status ? state : { ...state, [path]: status }
  )
}

export function resetWardrobeThumbnails() {
  wardrobeThumbnails.setState(() => ({}))
}

export function retryThumbnail(path: string) {
  wardrobeThumbnails.setState((state) => {
    const next = { ...state }
    delete next[path]
    return next
  })
}

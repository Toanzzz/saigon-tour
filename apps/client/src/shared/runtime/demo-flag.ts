export function readDemo(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.has('demo') && params.get('demo') !== '0'
}

export const DEMO = typeof location !== 'undefined' && readDemo(location.search)

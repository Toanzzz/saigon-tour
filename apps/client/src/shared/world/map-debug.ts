/** Standalone inspection keeps scenery visible from the overview camera. */
export const mapInspectorEnabled = () =>
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('mapDebug')

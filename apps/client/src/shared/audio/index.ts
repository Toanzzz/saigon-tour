export type AudioEvent = 'click' | 'pickup' | 'board' | 'arrive' | 'reward'

type SoundId = 'confirm' | 'bell' | 'reward' | 'city'
type AudioGroup = 'ui' | 'sfx' | 'ambience'
const EVENTS: Record<
  AudioEvent,
  { sound: SoundId; group: AudioGroup; gain: number }
> = {
  click: { sound: 'confirm', group: 'ui', gain: 0.45 },
  pickup: { sound: 'confirm', group: 'sfx', gain: 0.6 },
  board: { sound: 'bell', group: 'sfx', gain: 0.55 },
  arrive: { sound: 'bell', group: 'sfx', gain: 0.55 },
  reward: { sound: 'reward', group: 'sfx', gain: 0.7 },
}
const SOUND_IDS: SoundId[] = ['confirm', 'bell', 'reward', 'city']

export interface AudioStats {
  state: AudioContextState | 'locked' | 'unavailable'
  loaded: string[]
  errors: string[]
  muted: boolean
  volume: number
  paused: boolean
  activeEffects: number
  ambienceLoops: number
  events: Record<AudioEvent, number>
}

class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private groups = new Map<AudioGroup, GainNode>()
  private buffers = new Map<SoundId, AudioBuffer>()
  private effects = new Map<AudioBufferSourceNode, GainNode>()
  private ambience: AudioBufferSourceNode | null = null
  private loadPromise: Promise<void> | null = null
  private loadAbort: AbortController | null = null
  private syncPromise: Promise<void> = Promise.resolve()
  private muted = false
  private volume = 0.65
  private paused = false
  private hidden = false
  private unavailable = false
  private errors: string[] = []
  private lastPlayed = new Map<AudioEvent, number>()
  private events: Record<AudioEvent, number> = {
    click: 0,
    pickup: 0,
    board: 0,
    arrive: 0,
    reward: 0,
  }

  private onVisibility = () => {
    this.hidden = document.hidden
    void this.syncPlayback()
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      if (typeof AudioContext === 'undefined') {
        this.unavailable = true
        this.recordError('Web Audio is unavailable in this browser.')
        return
      }
      try {
        this.context = new AudioContext()
        this.master = this.context.createGain()
        this.master.gain.value = this.muted ? 0 : this.volume
        this.master.connect(this.context.destination)
        for (const group of ['ui', 'sfx', 'ambience'] as const) {
          const gain = this.context.createGain()
          gain.gain.value = group === 'ambience' ? 0.22 : 1
          gain.connect(this.master)
          this.groups.set(group, gain)
        }
        this.hidden = document.hidden
        document.addEventListener('visibilitychange', this.onVisibility)
      } catch {
        this.unavailable = true
        this.recordError('Audio could not start in this browser.')
        return
      }
    }
    const context = this.context
    try {
      // Resume directly within the gesture before asynchronous asset loading.
      if (!this.paused && !this.hidden) await context.resume()
    } catch {
      this.recordError('Audio playback needs a new player gesture.')
      return
    }
    if (!this.loadPromise) this.loadPromise = this.load(context)
    await this.loadPromise
    await this.syncPlayback()
  }

  play(event: AudioEvent): void {
    const context = this.context
    if (context?.state !== 'running' || this.paused || this.hidden) return
    const now = context.currentTime
    if (
      now - (this.lastPlayed.get(event) ?? -1) <
      (event === 'click' ? 0.08 : 0.12)
    )
      return
    const { sound, group, gain: level } = EVENTS[event]
    const buffer = this.buffers.get(sound)
    const output = this.groups.get(group)
    if (!buffer || !output || this.effects.size >= 8) return
    this.lastPlayed.set(event, now)
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = level
    source.connect(gain).connect(output)
    this.effects.set(source, gain)
    source.onended = () => {
      source.disconnect()
      gain.disconnect()
      this.effects.delete(source)
    }
    source.start()
    this.events[event] += 1
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.updateGain()
  }

  setVolume(volume: number): void {
    if (!Number.isFinite(volume)) return
    this.volume = Math.max(0, Math.min(1, volume))
    this.updateGain()
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    void this.syncPlayback()
  }

  dispose(): void {
    this.loadAbort?.abort()
    this.stopSources()
    const context = this.context
    this.context = null
    if (context) void context.close().catch(() => undefined)
    this.master?.disconnect()
    for (const group of this.groups.values()) group.disconnect()
    this.groups.clear()
    this.buffers.clear()
    this.master = null
    this.loadPromise = null
    this.loadAbort = null
    this.lastPlayed.clear()
    this.paused = false
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility)
    }
  }

  stats(): AudioStats {
    return {
      state:
        this.context?.state ?? (this.unavailable ? 'unavailable' : 'locked'),
      loaded: [...this.buffers.keys()],
      errors: [...this.errors],
      muted: this.muted,
      volume: this.volume,
      paused: this.paused || this.hidden,
      activeEffects: this.effects.size,
      ambienceLoops: this.ambience ? 1 : 0,
      events: { ...this.events },
    }
  }

  private async load(context: AudioContext): Promise<void> {
    const abort = new AbortController()
    this.loadAbort = abort
    await Promise.all(
      SOUND_IDS.map(async (id) => {
        try {
          const response = await fetch(
            `${import.meta.env.BASE_URL}audio/${id}.mp3`,
            {
              signal: abort.signal,
            }
          )
          if (!response.ok) throw new Error('load')
          const buffer = await context.decodeAudioData(
            await response.arrayBuffer()
          )
          if (this.context === context && !abort.signal.aborted)
            this.buffers.set(id, buffer)
        } catch {
          if (!abort.signal.aborted)
            this.recordError(`Could not load audio/${id}.mp3`)
        }
      })
    )
  }

  private syncPlayback(): Promise<void> {
    const context = this.context
    this.syncPromise = this.syncPromise
      .then(async () => {
        if (!context || this.context !== context) return
        if (this.paused || this.hidden) {
          this.stopSources()
          if (context.state === 'running') await context.suspend()
        } else {
          if (context.state === 'suspended') await context.resume()
          if (this.context === context && !this.paused && !this.hidden)
            this.startAmbience()
        }
      })
      .catch(() => this.recordError('Audio playback was interrupted.'))
    return this.syncPromise
  }

  private startAmbience(): void {
    const buffer = this.buffers.get('city')
    const output = this.groups.get('ambience')
    if (!this.context || this.ambience || !buffer || !output) return
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(output)
    source.start()
    this.ambience = source
  }

  private stopSources(): void {
    if (this.ambience) {
      this.ambience.stop()
      this.ambience.disconnect()
      this.ambience = null
    }
    for (const [source, gain] of this.effects) {
      source.stop()
      source.disconnect()
      gain.disconnect()
    }
    this.effects.clear()
  }

  private updateGain(): void {
    if (!this.master || !this.context) return
    this.master.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.context.currentTime,
      0.02
    )
  }

  private recordError(message: string): void {
    if (!this.errors.includes(message)) this.errors.push(message)
  }
}

export const audio = new GameAudio()

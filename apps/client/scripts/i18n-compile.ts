import { compile } from '@inlang/paraglide-js'
import { paraglideOptions } from '../paraglide.config'

// Regenerates src/paraglide from messages/*.json; Vite and vitest do this on their own.
await compile({ ...paraglideOptions, fs: await import('node:fs') })

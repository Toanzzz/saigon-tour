import type { CompilerOptions } from '@inlang/paraglide-js'

/** Shared by the Vite plugin (dev, build, vitest) and the `i18n:compile` script. */
export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/paraglide',
  // Saved choice (query cache) wins, then the browser language, then English.
  strategy: ['custom-saved', 'preferredLanguage', 'baseLocale'],
  outputStructure: 'locale-modules',
  emitTsDeclarations: true,
} satisfies CompilerOptions

import { createRoot } from 'react-dom/client'
import { localeReady } from '@/shared/i18n'
import { LOOK } from '@/shared/world/look-flag'
import { App, GameBoundary } from './app'
import '@fontsource-variable/baloo-2/wght.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@saigon/shared/tokens.css'
import './styles.css'

// First paint uses the saved language, not a flash of the default.
void localeReady.then(() => {
  // Expose the world look to CSS once, so comic bubble styling gates off it
  // (classic keeps today's bubbles) without any component logic.
  document.documentElement.dataset.look = LOOK
  const root = document.getElementById('root')
  if (root)
    createRoot(root).render(
      <GameBoundary>
        <App />
      </GameBoundary>
    )
})

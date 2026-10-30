import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import '@fontsource-variable/baloo-2/wght.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@saigon/shared/tokens.css'
import './styles/foundation.css'
import './styles/hero.css'
import './styles/cards.css'
import './styles/city.css'
import './styles/responsive.css'

const root = document.getElementById('root')
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import './styles/foundation.css'
import './styles/cards.css'
import './styles/map.css'
import './styles/rides.css'
import './styles/responsive.css'

const root = document.getElementById('root')
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )

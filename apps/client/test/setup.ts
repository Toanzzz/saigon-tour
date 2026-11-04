import { beforeEach } from 'vitest'
import { resetCarry } from '@/features/carry'
import { resetMapInspector } from '@/features/map-inspector/store'
import { resetCommerce, resetShop } from '@/features/shop'
import { resetStamina } from '@/features/stamina'
import { resetAsides } from '@/features/transport/asides'
import { resetVoiceClips } from '@/features/voice/clips'
import { resetVoice } from '@/features/voice/store'
import { resetWorkshop } from '@/features/workshop/store'
import { setLocale } from '@/paraglide/runtime'
import { resetEventSequence } from '@/shared/api/events'
import { resetPresenceView } from '@/shared/api/presence-view'
import { resetNavigation } from '@/shared/state/navigation'
import { resetRiddles } from '@/shared/state/riddles'
import { resetTwists } from '@/shared/state/twists'
import { resetUiStores } from '@/shared/state/ui'
import { resetViewStores } from '@/shared/state/view'
import { resetLoadingPanels } from '@/shared/ui/loading-state'
import { resetWardrobeThumbnails } from '@/shared/ui/wardrobe-thumbnail-state'
import { resetXr } from '@/shared/xr'

// Assertions are written against English; never follow the machine's language.
void setLocale('en', { reload: false })

beforeEach(() => {
  resetMapInspector()
  resetUiStores()
  resetViewStores()
  resetTwists()
  resetRiddles()
  resetAsides()
  resetCarry()
  resetCommerce()
  resetShop()
  resetStamina()
  resetEventSequence()
  resetNavigation()
  resetPresenceView()
  resetXr()
  resetWorkshop()
  resetWardrobeThumbnails()
  resetLoadingPanels()
  resetVoice()
  resetVoiceClips()
})

import { beforeEach } from 'vitest'
import { resetCarry } from '@/features/carry'
import { setLocale } from '@/paraglide/runtime'
import { resetPresenceView } from '@/shared/api/presence-view'
import { resetTwists } from '@/shared/state/twists'
import { resetUiStores } from '@/shared/state/ui'
import { resetViewStores } from '@/shared/state/view'
import { resetXr } from '@/shared/xr'

// Assertions are written against English; never follow the machine's language.
void setLocale('en', { reload: false })

beforeEach(() => {
  resetUiStores()
  resetViewStores()
  resetTwists()
  resetCarry()
  resetPresenceView()
  resetXr()
})

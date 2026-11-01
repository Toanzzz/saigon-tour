import { beforeEach } from 'vitest'
import { setLocale } from '@/paraglide/runtime'
import { resetUiStores } from '@/shared/state/ui'
import { resetViewStores } from '@/shared/state/view'
import { resetXr } from '@/shared/xr'

// Assertions are written against English; never follow the machine's language.
void setLocale('en', { reload: false })

beforeEach(() => {
  resetUiStores()
  resetViewStores()
  resetXr()
})

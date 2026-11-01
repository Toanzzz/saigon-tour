import { beforeEach } from 'vitest'
import { setLocale } from '@/paraglide/runtime'
import { resetXr } from '@/shared/xr'

// Assertions are written against English; never follow the machine's language.
void setLocale('en', { reload: false })

beforeEach(() => {
  resetXr()
})

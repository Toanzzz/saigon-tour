import { setLocale } from '@/paraglide/runtime'

// Assertions are written against English; never follow the machine's language.
void setLocale('en', { reload: false })

import { useMutation } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { m } from '@/shared/i18n'
import { commerce, retryCommerce } from './api'

export function CommerceRetry() {
  const uncertain = useSelector(commerce, (state) => state.uncertain)
  const retry = useMutation({ mutationFn: retryCommerce })
  if (!uncertain) return null
  return (
    <div className="shop-retry" role="alert">
      <p>{m.shop_retry_needed()}</p>
      <button
        type="button"
        disabled={retry.isPending}
        onClick={() => retry.mutate()}
      >
        {m.app_try_again()}
      </button>
    </div>
  )
}

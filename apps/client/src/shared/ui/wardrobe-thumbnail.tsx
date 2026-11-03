import type { AvatarBody, UnlockId } from '@saigon/shared'
import { useSelector } from '@tanstack/react-store'
import { m, unlockLabel } from '@/shared/i18n'
import {
  retryThumbnail,
  thumbnailStatus,
  wardrobeThumbnails,
} from './wardrobe-thumbnail-state'

/** The same baked wearable preview in catalog cards and completion rewards. */
export function WardrobeThumbnail({
  body,
  id,
  eager = false,
}: {
  body: AvatarBody
  id: UnlockId
  eager?: boolean
}) {
  const path = `${import.meta.env.BASE_URL}images/wardrobe/${body}/${id}.webp`
  const status = useSelector(wardrobeThumbnails, (state) => state[path])
  return (
    <div className="wardrobe-thumbnail">
      {status !== 'failed' && (
        <img
          src={path}
          alt={unlockLabel(id)}
          width={256}
          height={256}
          loading={eager ? 'eager' : 'lazy'}
          onLoad={() => thumbnailStatus(path, 'ready')}
          onError={() => thumbnailStatus(path, 'failed')}
        />
      )}
      {!status && <span role="status">{m.app_loading()}</span>}
      {status === 'failed' && (
        <span role="alert">
          {m.preview_failed()}
          <button type="button" onClick={() => retryThumbnail(path)}>
            {m.app_try_again()}
          </button>
        </span>
      )}
    </div>
  )
}

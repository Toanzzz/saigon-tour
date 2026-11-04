import { useSelector } from '@tanstack/react-store'
import { failShopArt, shopView } from './store'

/** Product illustrations stay flat, including wearable listings. */
export function ShopItemArt({ id, label }: { id: string; label: string }) {
  const failed = useSelector(shopView, (state) => state.failedArt.includes(id))
  return (
    <span className="shop-art good-icon" data-item-art={id} aria-hidden="true">
      {failed ? (
        <span className="shop-art-fallback">{label}</span>
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}images/shop/${id}.webp`}
          alt=""
          width={256}
          height={256}
          draggable={false}
          onError={() => failShopArt(id)}
        />
      )}
    </span>
  )
}

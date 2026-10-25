import { SLOTS, slotSrc, type SlotName } from '@/lib/images'
import { cn } from '@/lib/utils'

/**
 * A feathered photo card bound to a named image slot (see src/lib/images.ts).
 * Missing files fall back to a neutral warm-gray placeholder.
 */
export function SlotImage({ slot, className, feather = true, eager = false, children }: {
  slot: SlotName; className?: string; feather?: boolean; eager?: boolean; children?: React.ReactNode
}) {
  const s = SLOTS[slot]
  const src = slotSrc(slot)
  return (
    <div data-slot={slot} className={cn('relative overflow-hidden', feather && 'feather', className)} style={{ aspectRatio: s.aspect }}>
      {src ? (
        <img src={src} alt={s.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_30%_20%,#ECEBE7,#DEDED9_55%,#CFCEC8)]" role="img" aria-label={s.alt || undefined}>
          <span className="absolute bottom-[18%] left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[.08em] text-g-500/70">{slot}</span>
        </div>
      )}
      {children}
    </div>
  )
}

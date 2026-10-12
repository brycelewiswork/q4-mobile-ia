import { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { IconBuildingStore, IconCheck } from "@tabler/icons-react"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { LOCATIONS } from "@/data/locations"
import { useLocationStore } from "@/store/useLocationStore"

/**
 * iOS context menu for the location title. One menu, one store: whatever is
 * picked here drives every widget on every screen.
 *
 * Mount it as a direct child of the screen; it fills the screen with a
 * dismiss layer and anchors itself under the toolbar title.
 */
export function LocationMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locationId = useLocationStore((s) => s.locationId)
  const setLocation = useLocationStore((s) => s.setLocation)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-30" onPointerDown={onClose}>
          <motion.div
            role="menu"
            aria-label="Location"
            // No opacity on an ancestor of the glass (it would isolate the backdrop, then snap in at 1).
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8, transition: { duration: 0.12 } }}
            transition={SPRING_FAST.snappy}
            style={{ transformOrigin: "top left", top: "calc(var(--safe-top) + 51px)" }}
            className="absolute left-4 w-max max-w-[calc(100%-32px)]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <LiquidGlass mode="medium" radius={34} className="py-[10px]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.16, delay: 0.04 }}
              >
              {LOCATIONS.map((l) => {
                const selected = l.id === locationId
                return (
                  <button
                    key={l.id}
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      setLocation(l.id)
                      window.setTimeout(onClose, 120)
                    }}
                    className="flex h-10 w-full items-center gap-[13px] pl-[25px] pr-5 text-left tracking-[-0.43px] text-black active:bg-black/5"
                  >
                    <span className="flex w-[18px] shrink-0 justify-center">
                      {selected && <IconCheck size={20} stroke={2.5} />}
                    </span>
                    <IconBuildingStore size={22} stroke={1.5} className="shrink-0" />
                    <span className="truncate text-[17px] leading-[22px]">{l.name}</span>
                  </button>
                )
              })}
              </motion.div>
            </LiquidGlass>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

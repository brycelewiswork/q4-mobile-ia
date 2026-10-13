import { useEffect, type ReactNode } from "react"
import { motion } from "motion/react"
import { IconChevronLeft } from "@tabler/icons-react"
import { EdgeBlur } from "@/components/ios/EdgeBlur"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"

/**
 * A full-screen page pushed over the app, like a navigation push (not a sheet): it slides in from the
 * right, covers the toolbar and the tab bar, and comes back with the glass back button (or Escape).
 * Its layer is above the nav (20) and below the status bar (40), so the clock and battery stay visible.
 * Mount it inside AnimatePresence so the slide-out plays.
 */
export function FullPage({ title, onBack, children, action }: { title: string; onBack: () => void; children: ReactNode; /** A glass button at the right of the header (e.g. a checkmark to confirm). */ action?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onBack])

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", ...SPRING_FAST.snappy }}
      role="dialog"
      aria-label={title}
      className="absolute inset-0 z-[30] bg-[#f3f2f6]"
    >
      <div
        className="[scrollbar-width:none] absolute inset-0 overflow-y-auto px-4 [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: "calc(var(--safe-top) + 54px)", paddingBottom: "calc(var(--safe-bottom) + 24px)" }}
      >
        {children}
      </div>

      <EdgeBlur top={{ strength: 24, steps: 6, height: "calc(var(--safe-top) + 64px)" }} bottom={false} />

      <div className="absolute inset-x-4 z-10 flex h-11 items-center justify-center" style={{ top: "var(--safe-top)" }}>
        <LiquidGlass mode="small" radius={999} className="absolute left-0 flex size-11 items-center justify-center">
          <button onClick={onBack} aria-label="Back" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
            <IconChevronLeft size={24} stroke={2} />
          </button>
        </LiquidGlass>
        <h2 className="text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#1a1a1a]">{title}</h2>
        {action && (
          <LiquidGlass mode="small" radius={999} className="absolute right-0 flex size-11 items-center justify-center">
            {action}
          </LiquidGlass>
        )}
      </div>
    </motion.div>
  )
}

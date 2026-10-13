import { useEffect, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { IconArrowLeft, IconCheck } from "@tabler/icons-react"
import { addDays, mondayOf, sameDay, WEEKDAYS_SHORT } from "@/lib/dates"
import { cn } from "@/lib/utils"

/** Material 3 building blocks for the Android structure cut. Flat, tonal, no glass: lists sit straight on the surface. */

const SHEET = { type: "tween", duration: 0.28, ease: [0.2, 0, 0, 1] } as const

export function ABar({ w = "100%", h = 12, className }: { w?: number | string; h?: number; className?: string }) {
  return <span aria-hidden className={cn("bg-m-skeleton block shrink-0 rounded-full", className)} style={{ width: w, height: h }} />
}

export function ALines({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-2 py-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <ABar key={i} w={i === lines - 1 ? "62%" : "100%"} h={14} />
      ))}
    </div>
  )
}

/** Filled tonal card with a title and an empty body. */
export function ACard({ title, h = 112, className, children, onClick, dataAnno }: { title?: ReactNode; h?: number; className?: string; children?: ReactNode; onClick?: () => void; dataAnno?: string }) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp onClick={onClick} data-anno={dataAnno} className={cn("bg-m-container text-m-on-surface flex w-full flex-col rounded-[16px] p-4 text-left", onClick && "active:opacity-80", className)} style={{ minHeight: h }}>
      {title && <span className="text-[16px] font-medium leading-6">{title}</span>}
      {children}
    </Comp>
  )
}

/** A section title, with an optional text button at the end. */
export function ASection({ children, action, onAction, dataAnno, trailing }: { children: ReactNode; action?: string; onAction?: () => void; dataAnno?: string; /** Anything at the end of the row, e.g. an icon button. */ trailing?: ReactNode }) {
  return (
    <div data-anno={dataAnno} className="flex items-center justify-between px-1 pb-1 pt-3">
      <h2 className="text-m-variant text-[14px] font-medium leading-5 tracking-[0.1px]">{children}</h2>
      {action && (
        <button onClick={onAction} className="text-m-primary -my-2 h-10 px-2 text-[14px] font-medium tracking-[0.1px] active:opacity-60">
          {action}
        </button>
      )}
      {trailing}
    </div>
  )
}

/** Skeleton list rows straight on the surface, hairline dividers between them. */
export function AList({ rows = 3, avatar = true, trailing = false, onRow }: { rows?: number; avatar?: boolean; trailing?: boolean; onRow?: () => void }) {
  return (
    <div aria-hidden={!onRow}>
      {Array.from({ length: rows }, (_, i) => {
        const Comp = onRow ? "button" : "div"
        return (
          <Comp key={i} onClick={onRow} className={cn("flex min-h-[72px] w-full items-center gap-4 px-1 py-3 text-left", onRow && "active:bg-black/5", i > 0 && "border-m-divider border-t")}>
            {avatar && <span className="bg-m-skeleton size-10 shrink-0 rounded-full" />}
            <span className="flex min-w-0 flex-1 flex-col gap-[9px]">
              <ABar w="55%" h={12} />
              <ABar w="35%" h={10} />
            </span>
            {trailing && <ABar w={40} h={12} />}
          </Comp>
        )
      })}
    </div>
  )
}

/** A navigation row for Settings: icon, label, and nothing else. */
export function ARow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-m-on-surface flex h-14 w-full items-center gap-4 px-1 text-left active:bg-black/5">
      <span className="text-m-variant flex size-6 items-center justify-center">{icon}</span>
      <span className="flex-1 text-[16px] leading-6">{label}</span>
    </button>
  )
}

/** M3 switch: a 52 × 32 track with a thumb that grows when it's on. */
export function ASwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => !disabled && onChange(!checked)} className={cn("relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-200", checked ? "bg-m-primary border-transparent" : "border-m-outline bg-m-high")}>
      <motion.span
        className={cn("absolute top-1/2 rounded-full", checked ? "bg-m-on-primary" : "bg-m-outline")}
        animate={{ x: checked ? 22 : 4, width: checked ? 24 : 16, height: checked ? 24 : 16, y: "-50%" }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        style={{ left: 0 }}
      />
    </button>
  )
}

/** M3 filter chip. */
export function AChip({ children = null, selected, onClick, leading, trailing }: { children?: ReactNode; selected?: boolean; onClick?: () => void; leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-[8px] border px-3 text-[14px] font-medium tracking-[0.1px] active:opacity-70",
        selected ? "bg-m-secondary-container text-m-on-secondary-container border-transparent" : "border-m-outline text-m-variant",
      )}
    >
      {selected ? <IconCheck size={18} stroke={2} /> : leading}
      {children}
      {trailing}
    </button>
  )
}

export function AChips({ children }: { children: ReactNode }) {
  return <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
}

/** Seven days, Monday first. The selected day is a filled circle; tapping sets the shared date. */
export function WeekStrip({ date, onPick, dots }: { date: Date; onPick: (d: Date) => void; dots?: (i: number) => boolean }) {
  const mon = mondayOf(date)
  return (
    <div className="flex justify-between pb-2 pt-1">
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(mon, i)
        const on = sameDay(d, date)
        return (
          <button key={i} onClick={() => onPick(d)} aria-pressed={on} className="flex w-11 flex-col items-center gap-1">
            <span className="text-m-variant text-[12px] font-medium leading-4">{WEEKDAYS_SHORT[i][0]}</span>
            <span className={cn("flex size-10 items-center justify-center rounded-full text-[16px] leading-6", on ? "bg-m-primary text-m-on-primary font-medium" : "text-m-on-surface")}>{d.getDate()}</span>
            <span className={cn("size-[6px] rounded-full", dots?.(i) ? "bg-m-primary" : "bg-transparent")} />
          </button>
        )
      })}
    </div>
  )
}

export function AIconButton({ label, onClick, children, className }: { label: string; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className={cn("text-m-variant flex size-12 items-center justify-center rounded-full active:bg-black/10", className)}>
      {children}
    </button>
  )
}

/** Floating action button: standard (icon) or extended (icon + label). */
export function AFab({ label, icon, extended, onClick }: { label: string; icon: ReactNode; extended?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "bg-m-primary-container text-m-on-primary-container flex h-14 items-center justify-center gap-3 rounded-[16px] shadow-[0_3px_8px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.12)] active:opacity-85",
        extended ? "px-4" : "w-14",
      )}
    >
      {icon}
      {extended && <span className="pr-1 text-[14px] font-medium tracking-[0.1px]">{label}</span>}
    </button>
  )
}

/** Modal bottom sheet: scrim, drag handle, rounded top corners. */
export function ASheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div className="absolute inset-0 z-[50]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SHEET} onClick={onClose} className="absolute inset-0 bg-[var(--m-scrim)]" />
      <motion.div
        role="dialog"
        aria-label={title}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={SHEET}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => i.offset.y > 120 && onClose()}
        className="bg-m-low text-m-on-surface absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-[28px] pb-8"
      >
        <span aria-hidden className="bg-m-variant mx-auto mt-3 h-1 w-8 shrink-0 rounded-full opacity-40" />
        <h2 className="shrink-0 px-6 pb-2 pt-4 text-[22px] font-normal leading-7">{title}</h2>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
      </motion.div>
    </div>
  )
}

/** Modal navigation drawer: a tray from the start edge over a scrim. Tap the scrim, swipe it back, or press Esc to close. */
export function ADrawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div className="absolute inset-0 z-[55]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SHEET} onClick={onClose} className="absolute inset-0 bg-[var(--m-scrim)]" />
      <motion.aside
        role="dialog"
        aria-label="Navigation drawer"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={SHEET}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.6, right: 0 }}
        onDragEnd={(_, i) => i.offset.x < -80 && onClose()}
        className="bg-m-low text-m-on-surface absolute inset-y-0 left-0 flex w-[360px] max-w-[88%] flex-col rounded-r-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ paddingTop: "calc(var(--safe-top) + 8px)" }}>
          {children}
        </div>
      </motion.aside>
    </div>
  )
}

/** A full-screen destination: top app bar with a back arrow, content below. Slides in from the right. */
export function APage({ title, onBack, children, bar, footer, action, z = 40 }: { title: string; onBack: () => void; children: ReactNode; /** A text button at the end of the top bar (e.g. Save). */ action?: ReactNode; /** Replaces the title (e.g. a search field). */ bar?: ReactNode; /** Pinned under the scrolling content (e.g. a composer). */ footer?: ReactNode; z?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onBack])
  return (
    <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={SHEET} className="bg-m-surface absolute inset-0 flex flex-col" style={{ zIndex: z }}>
      <div className="flex h-16 shrink-0 items-center gap-1 px-1" style={{ marginTop: "var(--safe-top)" }}>
        <AIconButton label="Back" onClick={onBack} className="text-m-on-surface">
          <IconArrowLeft size={24} stroke={1.75} />
        </AIconButton>
        {bar ?? <h1 className="text-m-on-surface min-w-0 flex-1 text-[22px] leading-7">{title}</h1>}
        {action && <div className="pr-3">{action}</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
      {footer && <div className="shrink-0 px-4 pb-8 pt-2">{footer}</div>}
    </motion.div>
  )
}

export { AnimatePresence }

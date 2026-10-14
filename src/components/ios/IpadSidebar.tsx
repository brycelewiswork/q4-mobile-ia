import { motion } from "motion/react"
import { IconLayoutSidebar } from "@tabler/icons-react"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { Initials } from "@/components/ios/list"
import { TABS, type TabId } from "@/components/ios/TabBar"
import { SPRING_FAST } from "@/lib/motion"
import { ANON, useStructure } from "@/store/useViewStore"
import { cn } from "@/lib/utils"

const BRAND = "#8f55e5"

/** Sidebar width, including the 8pt of air around the panel. */
export const SIDEBAR_W = 260
/** The pane beside the sidebar slides with the same spring. */
export const SIDEBAR_SPRING = { type: "spring" as const, ...SPRING_FAST.snappy }

function Mask({ src, color, size }: { src: string; color: string; size: number }) {
  return (
    <span
      aria-hidden
      className="block shrink-0"
      style={{ width: size, height: size, backgroundColor: color, maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}
    />
  )
}

/** The glass button that shows and hides the sidebar: in the sidebar's header while it's open, in the toolbar once it's closed. */
export function SidebarToggle({ open, onClick, className }: { open: boolean; onClick: () => void; className?: string }) {
  return (
    <LiquidGlass mode="small" radius={999} className={cn("flex size-11 shrink-0 items-center justify-center", className)}>
      <button onClick={onClick} aria-label={open ? "Hide sidebar" : "Show sidebar"} aria-expanded={open} className="flex size-9 items-center justify-center rounded-full text-[#141414]">
        <IconLayoutSidebar size={24} stroke={1.75} />
      </button>
    </LiquidGlass>
  )
}

const row = "relative flex h-11 w-full items-center gap-3 rounded-full px-3 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-black active:opacity-60"

export type SidebarClock = { title: string; subtitle: string; status: "out" | "in" | "break"; onOpen: () => void }

/**
 * The time clock at the foot of the sidebar: the status on the bottom row, with break and meal above it while
 * clocked in (or the main action while not). Tapping any of it opens the Time Clock sheet.
 */
function ClockCard({ title, subtitle, status, onOpen }: SidebarClock) {
  return (
    <div data-anno="clock-accessory" className="rounded-[24px] bg-[#787880]/[0.12] p-1">
      {status === "in" ? (
        <>
          <button onClick={onOpen} aria-label="Start break" className={row}>
            <img src="/phone/break-solid.svg" alt="" className="size-6" />
            Take break
          </button>
          <button onClick={onOpen} aria-label="Start meal break" className={row}>
            <img src="/phone/meal.svg" alt="" className="size-6 p-[2px]" />
            Take meal
          </button>
        </>
      ) : (
        <button onClick={onOpen} className="mb-1 flex h-11 w-full items-center justify-center rounded-full bg-[#8f55e5] text-[17px] font-[590] tracking-[-0.43px] text-white active:opacity-80">
          {status === "break" ? "End break" : "Clock in"}
        </button>
      )}
      <button onClick={onOpen} aria-haspopup="dialog" aria-label={subtitle ? `${title}. ${subtitle}` : title} className={cn(row, "h-12")}>
        <span className="relative size-6 shrink-0">
          <img src="/phone/clock-stroke.svg" alt="" className="size-6" />
          {status === "in" && <span aria-hidden className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-[1.5px] ring-white" />}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-[590]">{title}</span>
          {subtitle && <span className="truncate text-[13px] leading-[15px] text-[#7f7f7f]">{subtitle}</span>}
        </span>
      </button>
    </div>
  )
}

/**
 * Apple's sidebar, for iPad: a frosted panel down the leading edge with the app's destinations, the toggle in its
 * header, and (here, for parity with Android's rail) the avatar and assistant on top and the time clock at the foot.
 * Hidden, it leaves only the toggle in the toolbar. The app's content pane slides over to make room (see IosHome).
 */
export function IpadSidebar({
  tabs,
  tab,
  onTab,
  dots,
  open,
  onToggle,
  onProfile,
  onAssistant,
  clock,
}: {
  tabs: readonly TabId[]
  tab: TabId
  onTab: (t: TabId) => void
  dots?: Partial<Record<TabId, boolean>>
  open: boolean
  onToggle: () => void
  onProfile: () => void
  onAssistant?: () => void
  clock: SidebarClock
}) {
  const wire = useStructure()
  const shown = tabs.map((id) => TABS.find((t) => t.id === id)!)
  return (
    <motion.aside
      aria-label="Sidebar"
      aria-hidden={!open}
      inert={!open}
      initial={false}
      // Hidden once it has closed, so nothing in it can be tabbed to, hit, or pointed at by a note.
      animate={open ? { width: SIDEBAR_W, visibility: "visible" } : { width: 0, transitionEnd: { visibility: "hidden" } }}
      transition={SIDEBAR_SPRING}
      className="absolute inset-y-0 left-0 z-30 overflow-hidden"
    >
      <div
        data-anno="sidebar"
        className="absolute bottom-2 left-2 top-2 flex flex-col rounded-[30px] bg-white/70 px-3 pb-3 shadow-[0_0_0_0.5px_rgba(0,0,0,0.07),0_10px_30px_rgba(20,20,40,0.08)] backdrop-blur-2xl"
        style={{ width: SIDEBAR_W - 16, paddingTop: "calc(var(--safe-top) - 8px)" }}
      >
        <div className="flex h-11 items-center justify-between gap-2">
          <button onClick={onProfile} aria-haspopup="dialog" aria-label="Profile and settings" data-anno="profile" className={cn(row, "h-11 min-w-0 flex-1 gap-2 px-1")}>
            {wire ? <Initials name={ANON.name} size={36} /> : <img src="/phone/avatar.jpg" alt="" className="size-9 rounded-full object-cover" />}
            <span className="truncate font-[590]">{ANON.name}</span>
          </button>
          <SidebarToggle open={open} onClick={onToggle} />
        </div>
        {onAssistant && (
          <div className="mt-3 flex flex-col gap-1">
            <button onClick={onAssistant} aria-haspopup="dialog" className={row}>
              <img src="/phone/tab-assistant.svg" alt="" className="size-6" />
              Assistant
            </button>
          </div>
        )}
        <nav className="mt-3 flex flex-col gap-1 border-t border-black/[0.08] pt-3">
          {shown.map((t) => {
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => onTab(t.id)} aria-current={active ? "page" : undefined} aria-label={dots?.[t.id] ? `${t.label}, unread` : t.label} className={row}>
                {active && <motion.span layoutId="sidebar-selection" transition={SPRING_FAST.snappy} className="absolute inset-0 rounded-full bg-[#787880]/[0.2]" />}
                <span className="relative flex items-center gap-3">
                  <span className="relative">
                    <Mask src={active ? t.fill : t.icon} color={BRAND} size={24} />
                    {dots?.[t.id] && <span aria-hidden data-unread-dot className="absolute -right-[2px] top-0 size-[9px] rounded-full bg-[#ff3b30] ring-[1.5px] ring-white/80" />}
                  </span>
                  <span className={active ? "font-[590]" : undefined}>{t.label}</span>
                </span>
              </button>
            )
          })}
        </nav>
        <div className="mt-auto">
          <ClockCard {...clock} />
        </div>
      </div>
    </motion.aside>
  )
}

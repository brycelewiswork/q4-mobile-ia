import { useEffect, useState, type ReactNode } from "react"
import { animate, motion, useMotionValue } from "motion/react"
import { IconCheck, IconSelector } from "@tabler/icons-react"
import { CustomizeIcon } from "@/components/icons/CustomizeIcon"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"

const BRAND = "#8f55e5"
const LABEL_VIBRANT = "#141414"

export const TABS = [
  { id: "home", label: "Home", icon: "/phone/tab-home.svg", fill: "/phone/tab-home-fill.svg" },
  { id: "money", label: "Money", icon: "/phone/tab-money.svg", fill: "/phone/tab-money-fill.svg" },
  { id: "shifts", label: "Shifts", icon: "/phone/tab-shifts.svg", fill: "/phone/tab-shifts-fill.svg" },
  { id: "time", label: "Time", icon: "/phone/tab-time.svg", fill: "/phone/tab-time-fill.svg" },
  { id: "chat", label: "Messages", icon: "/phone/tab-chat.svg", fill: "/phone/tab-chat-fill.svg" },
] as const
export type TabId = (typeof TABS)[number]["id"]

function Mask({ src, color, w, h }: { src: string; color: string; w: number; h: number }) {
  return (
    <span
      aria-hidden
      className="block shrink-0 transition-colors duration-200"
      style={{
        width: w,
        height: h,
        backgroundColor: color,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  )
}

/** Figma tab-bar `BG`: the glass sits 4px OUTSIDE the content box on every side. */
const GlassBacking = () => <LiquidGlass mode="small" radius={999} className="absolute -inset-1" />

/**
 * Mirrors SwiftUI's `tabViewBottomAccessoryPlacement`: `expanded` floats above
 * the tab bar, `inline` sits inside the minimized tab bar.
 */
type AccessoryPlacement = "expanded" | "inline"

/** The accessory's inner row — shared by the glass bar and the half sheet's collapsed state. */
export function AccessoryContent({
  title,
  subtitle,
  inline,
  active,
  onOpen,
}: {
  title: string
  subtitle: string
  inline?: boolean
  /** Clocked in: shows the green active dot on the icon. */
  active?: boolean
  onOpen?: () => void
}) {
  return (
    <>
      {/* Icon + text open the half sheet; the trailing actions stay their own buttons. */}
      <button
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`${title}. ${subtitle}`}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="relative size-5 shrink-0">
          <img src="/phone/clock-stroke.svg" alt="" className="size-5" />
          {active && (
            <span
              aria-hidden
              data-active-dot
              className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-[1.5px] ring-white"
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col tracking-[-0.43px]">
          <span className="truncate text-[15px] font-[590] leading-[17px] text-black">{title}</span>
          {!inline && <span className="truncate text-[13px] leading-[15px] text-[#7f7f7f]">{subtitle}</span>}
        </span>
      </button>
      {!inline && (
        <div className="flex items-center gap-4">
          <button aria-label="Start break" className="active:opacity-60">
            <img src="/phone/break-solid.svg" alt="" className="size-6" />
          </button>
          <button aria-label="Start meal break" className="active:opacity-60">
            <img src="/phone/meal.svg" alt="" className="size-6 p-[2px]" />
          </button>
        </div>
      )}
    </>
  )
}

export function BottomAccessory({
  placement,
  title,
  subtitle,
  active,
  onOpen,
  className,
}: {
  placement: AccessoryPlacement
  title: string
  subtitle: string
  active?: boolean
  onOpen?: () => void
  className?: string
}) {
  const inline = placement === "inline"
  return (
    <LiquidGlass
      mode="small"
      radius={999}
      className={cn(
        "flex h-12 items-center gap-2 pl-3 pr-4",
        inline && "h-[54px] min-w-0 flex-1",
        className,
      )}
    >
      <AccessoryContent title={title} subtitle={subtitle} inline={inline} active={active} onOpen={onOpen} />
    </LiquidGlass>
  )
}

export type MoreItem = { id: string; label: string; icon: ReactNode; /** A small red dot, for something waiting. */ dot?: boolean; /** Its page is the one showing: the More item takes the selected look. */ active?: boolean; /** The icon More wears while this item's page is showing (28px, takes the brand color). */ activeIcon?: ReactNode; /** The page showing right now: tinted in the menu, without selecting More itself. */ current?: boolean; }

const MORE_ROW = 40
const MORE_HEAD = 48
/** The hairline under the header row: 1px plus 4px of air above and below. */
const MORE_RULE = 9
/** The menu stops growing here and scrolls: it has to clear the status bar and the Dynamic Island. */
const MORE_MAX = 640
const MORE_PAD = 8
const BAR_H = 62 // the bar's glass: 54 of content plus the 4px it sits outside on each side

export function TabBar({
  tabs,
  dots,
  tab,
  onTab,
  minimized,
  onExpand,
  inlineAccessory,
  onAssistant,
  more,
  clock,
}: {
  /** Which tabs this kind of user gets, in order. */
  tabs: readonly TabId[]
  /** A simple unread dot on a tab's icon. */
  dots?: Partial<Record<TabId, boolean>>
  /** Null when a page opened from More is showing: no tab is selected. */
  tab: TabId | null
  onTab: (t: TabId) => void
  minimized: boolean
  onExpand: () => void
  inlineAccessory: ReactNode
  onAssistant?: () => void
  /** The last item in the bar: opens a menu that the bar's own glass grows into. */
  /** Employees: the Time Clock button, beside the bar. */
  clock?: { active: boolean; onOpen: () => void }
  more?: {
    items: MoreItem[]
    onSelect: (id: string) => void
    /** The top row: the business account on the left (a different thing from the location), Settings on the right. */
    header?: { account: string; accounts: string[]; onAccount: (name: string) => void; onSettings: () => void }
  }
}) {
  const [picking, setPicking] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const menuH = Math.min(MORE_MAX, (more?.items.length ?? 0) * MORE_ROW + (more?.header ? MORE_HEAD + MORE_RULE : 0) + MORE_PAD * 2)
  const glassH = useMotionValue(BAR_H)
  useEffect(() => {
    const c = animate(glassH, moreOpen ? menuH : BAR_H, SPRING_FAST.snappy)
    return () => c.stop()
  }, [moreOpen, menuH, glassH])
  useEffect(() => {
    if (!moreOpen) setPicking(false)
  }, [moreOpen])
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [moreOpen])
  const moreActive = !!more?.items.some((m) => m.active)
  const shown = tabs.map((id) => TABS.find((t) => t.id === id)!)
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-center gap-4 px-[25px] pt-4"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      {minimized ? (
        <>
          <div className="relative size-[54px] shrink-0">
            <GlassBacking />
            <button
              onClick={onExpand}
              aria-label={`${current.label} tab, expand tab bar`}
              className="relative flex size-full items-center justify-center"
            >
              <Mask src={current.fill} color={BRAND} w={28} h={28} />
            </button>
          </div>
          {inlineAccessory}
        </>
      ) : (
        <div data-anno="tab-bar" className="relative flex min-w-0 flex-1 items-center px-[2px]">
          {/* Tapping anywhere outside the open menu puts it away. */}
          {moreOpen && <button aria-label="Close menu" tabIndex={-1} onClick={() => setMoreOpen(false)} className="absolute bottom-0 left-[-40px] -z-10 h-[1400px] w-[600px] cursor-default" />}
          {/* The glass is one piece: a pill behind the tabs that grows upward into the menu. */}
          <motion.div className="pointer-events-none absolute -inset-x-1 -bottom-1" style={{ height: glassH }}>
            <LiquidGlass mode="small" radius={31} className="size-full" />
            {/* Open, the menu needs more body than the bar: a white wash over the glass, faded in with the morph. */}
            <motion.div aria-hidden initial={false} animate={{ opacity: moreOpen ? 1 : 0 }} transition={{ duration: 0.25 }} className="absolute inset-0 rounded-[31px] bg-white/65" />
          </motion.div>
          {more && (
            <motion.ul
              role="menu"
              aria-label="More"
              initial={false}
              animate={{ opacity: moreOpen ? 1 : 0 }}
              transition={moreOpen ? { duration: 0.2, delay: 0.1 } : { duration: 0.1 }}
              className="absolute inset-x-0 bottom-0 flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ height: menuH - 4, padding: `${MORE_PAD}px ${MORE_PAD}px 4px`, pointerEvents: moreOpen ? "auto" : "none" }}
            >
              {more.header && (
                <li role="none" className="flex shrink-0 items-center justify-between pl-1" style={{ height: MORE_HEAD }}>
                  <button
                    onClick={() => setPicking((p) => !p)}
                    aria-haspopup="listbox"
                    aria-expanded={picking}
                    tabIndex={moreOpen ? 0 : -1}
                    className="flex h-10 min-w-0 items-center gap-2 rounded-full pl-2 pr-2 active:bg-[#787880]/20"
                  >
                    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#8f55e5] text-[14px] font-[590] text-white">
                      {more.header.account.charAt(0)}
                    </span>
                    <span className="truncate text-[15px] font-[590] tracking-[-0.24px] text-[#141414]">{more.header.account}</span>
                    <IconSelector size={18} stroke={1.75} className="shrink-0 text-[#8a8a8e]" />
                  </button>
                  <button
                    onClick={() => {
                      setMoreOpen(false)
                      more.header?.onSettings()
                    }}
                    aria-haspopup="dialog"
                    aria-label="Customize"
                    tabIndex={moreOpen ? 0 : -1}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#141414] active:bg-[#787880]/20"
                  >
                    <CustomizeIcon size={24} />
                  </button>
                </li>
              )}
              {more.header && <li role="separator" className="mx-3 my-1 h-px shrink-0 bg-black/[0.08]" />}
              {picking && more.header
                ? more.header.accounts.map((a) => (
                    <li key={a} role="none" className="shrink-0">
                      <button
                        role="option"
                        aria-selected={a === more.header?.account}
                        onClick={() => {
                          more.header?.onAccount(a)
                          setPicking(false)
                        }}
                        className="flex w-full items-center gap-3 rounded-full px-3 text-left text-[15px] font-[510] tracking-[-0.24px] text-[#141414] active:bg-[#787880]/20"
                        style={{ height: MORE_ROW }}
                      >
                        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#8f55e5]/15 text-[12px] font-[590] text-[#8f55e5]">
                          {a.charAt(0)}
                        </span>
                        <span className="flex-1 truncate">{a}</span>
                        {a === more.header?.account && <IconCheck size={20} stroke={2} />}
                      </button>
                    </li>
                  ))
                : more.items.map((m) => (
                <li key={m.id} role="none" className="shrink-0">
                  <button
                    role="menuitem"
                    tabIndex={moreOpen ? 0 : -1}
                    onClick={() => {
                      setMoreOpen(false)
                      more.onSelect(m.id)
                    }}
                    aria-current={m.current ? "page" : undefined}
                    className={cn("flex w-full items-center gap-3 rounded-full px-3 text-left text-[15px] font-[510] tracking-[-0.24px] text-[#141414] active:bg-[#787880]/20", (m.current || m.active) && "bg-[#787880]/20")}
                    style={{ height: MORE_ROW }}
                  >
                    <span className="relative flex size-6 shrink-0 items-center justify-center">
                      {m.icon}
                      {m.dot && <span aria-hidden className="absolute -right-[2px] -top-[1px] size-[9px] rounded-full bg-[#ff3b30] ring-[1.5px] ring-white/80" />}
                    </span>
                    {m.label}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
          <motion.div
            className="relative flex min-w-0 flex-1 items-center"
            animate={{ opacity: moreOpen ? 0 : 1 }}
            transition={{ duration: moreOpen ? 0.1 : 0.2, delay: moreOpen ? 0 : 0.12 }}
            style={{ pointerEvents: moreOpen ? "none" : "auto" }}
            inert={moreOpen}
          >
          {shown.map((t) => {
            const active = tab === t.id
            const color = active ? BRAND : LABEL_VIBRANT
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                aria-label={dots?.[t.id] ? `${t.label}, unread` : t.label}
                aria-current={active}
                className="relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center"
              >
                {active && (
                  <motion.span
                    layoutId="tab-selection"
                    transition={SPRING_FAST.snappy}
                    className="absolute -inset-x-[2px] inset-y-0 rounded-full bg-[#787880]/20"
                  />
                )}
                                <span className="relative flex flex-col items-center gap-[3px]">
                  <span className="relative">
                    <Mask src={active ? t.fill : t.icon} color={color} w={28} h={28} />
                    {dots?.[t.id] && (
                      <span aria-hidden data-unread-dot className="absolute -right-[1px] top-[1px] size-[9px] rounded-full bg-[#ff3b30] ring-[1.5px] ring-white/80" />
                    )}
                  </span>
                </span>
              </button>
            )
          })}
          {more && (
            <button
              onClick={() => setMoreOpen(true)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-label="More"
              className="relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center"
            >
              {moreActive && (
                <motion.span layoutId="tab-selection" transition={SPRING_FAST.snappy} className="absolute -inset-x-[2px] inset-y-0 rounded-full bg-[#787880]/20" />
              )}
              <span className="relative flex flex-col items-center gap-[3px]">
                {moreActive && more.items.find((m) => m.active)?.activeIcon ? (
                  <span className="flex size-7 items-center justify-center text-[#8f55e5]">{more.items.find((m) => m.active)?.activeIcon}</span>
                ) : (
                  <Mask src={moreActive ? "/phone/tab-more-fill.svg" : "/phone/tab-more.svg"} color={moreActive ? BRAND : LABEL_VIBRANT} w={28} h={28} />
                )}
              </span>
            </button>
          )}
          </motion.div>
        </div>
      )}
      {/* Employees: the Time Clock button, a button of its own beside the bar (where managers have the assistant). */}
      {clock && (
        <div className="relative flex size-[54px] shrink-0 items-center justify-center">
          <GlassBacking />
          <button onClick={clock.onOpen} aria-haspopup="dialog" aria-label={clock.active ? "Time clock, clocked in" : "Time clock"} className="relative flex size-full items-center justify-center">
            <span className="relative size-7">
              <Mask src="/phone/clock-stroke.svg" color={LABEL_VIBRANT} w={28} h={28} />
              {clock.active && <span aria-hidden className="absolute -right-[1px] top-[1px] size-[9px] rounded-full bg-[#34c759] ring-[1.5px] ring-white/80" />}
            </span>
          </button>
        </div>
      )}
      {/* Employees don't get the assistant: no handler, no button. */}
      {onAssistant && (
        <div className="relative flex size-[54px] shrink-0 items-center justify-center">
          <GlassBacking />
          <button onClick={onAssistant} aria-haspopup="dialog" className="relative flex size-full items-center justify-center" aria-label="Assistant">
            <img src="/phone/tab-assistant.svg" alt="" className="size-7" />
          </button>
        </div>
      )}
    </div>
  )
}


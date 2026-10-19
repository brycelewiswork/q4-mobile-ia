import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  IconAlertHexagon,
  IconBell,
  IconBriefcase,
  IconFilter,
  IconCalendar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconCash,
  IconCheck,
  IconChevronDown,
  IconMessages,
  IconX,
  IconChevronRight,
  IconClock,
  IconGift,
  IconHeartbeat,
  IconHelp,
  IconLock,
  IconMapPin,
  IconMenu2,
  IconSelector,
  IconMenuDeep,
  IconPlus,
  IconSearch,
  IconSend,
  IconSettings,
  IconUsers,
  IconChecklist,
  IconNotebook,
  IconPigMoney,
  IconReportMoney,
  IconUserPlus,
} from "@tabler/icons-react"
import { AchievementBadge } from "@/components/AchievementBadge"
import { LinearBlur } from "@/components/ui/progressive-blur"
import { UserTypeToggle } from "@/components/ios/UserTypeToggle"
import { PrototypeFooter } from "@/components/ios/PrototypeFooter"
import { AndroidFrame } from "@/pages/android/AndroidFrame"
import { ABar, ACard, ASideSheet, AChip, AChips, AFab, AIconButton, AList, ALines, APage, ARow, ACheckRow, AFormSheet, ASection, ASheet, ASwitch, WeekStrip } from "@/pages/android/m3"
import { shortMoney } from "@/components/WireBars"
import { LocationBadges, useCounts } from "@/components/LocationBadges"
import { COMPANIES, LOCATIONS, USER_SCHEDULE, nextShiftAt, shortLocationName, type Location } from "@/data/locations"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { locationsOf, useGroupsStore } from "@/store/useGroupsStore"
import { ExpandSurface, boxOf, type Box } from "@/components/ExpandSurface"
import { CustomizeSheet, MoreMenu, type MoreItem } from "@/pages/android/AndroidMore"
import { DrawerSurface } from "@/components/ios/DrawerSurface"
import { SCREENS } from "@/lib/device"
import { HomebaseLogo } from "@/components/icons/HomebaseLogo"
import { MenuTwoLine } from "@/components/icons/MenuTwoLine"
import { inMenuOrder, useMoreMenuStore } from "@/store/useMoreMenuStore"
import { OpenLocationContext, ScopeContext, useLocation, useLocationStore, useScope } from "@/store/useLocationStore"
import { ANON, useLocName, useLocTitle, useStructure, useViewStore } from "@/store/useViewStore"
import { useDateStore } from "@/store/useDateStore"
import { NOW_MIN, scheduledToday, shiftRange, useClock, useTimeClockStore } from "@/store/useTimeClockStore"
import { pendingFor, useRequestsStore } from "@/store/useRequestsStore"
import { cn } from "@/lib/utils"
import { dayLabel, payPeriodOf, rangeLabel } from "@/lib/dates"

/**
 * The Android structure cut. Same data, stores and information architecture as the iOS version, but it speaks
 * Material 3 where the two platforms differ:
 *
 *   iOS                                     Android
 *   floating glass tab bar                  M3 navigation bar with a pill indicator
 *   glass toolbar buttons + "+" menus       one floating action button per tab (extended for the main action)
 *   time clock accessory above the tab bar  extended FAB on Home, opening a modal bottom sheet
 *   inset grouped cards for lists           flat lists on the surface; cards only for widgets
 *   filter dropdown / glass chips           M3 filter chips
 *   Settings as a sheet over the app        Settings as a full-screen destination with a back arrow
 *   search bar pinned at the bottom         search field in the top app bar
 *   location title menu                     M3 dropdown menu from the top app bar title
 */

type TabId = "home" | "money" | "shifts" | "time" | "chat"
// Labels and icons from the android-nav sketch (solid 24dp). Money has no Android icon yet, so it borrows the iOS one.
const TABS: Record<TabId, { label: string; icon: string }> = {
  home: { label: "Home", icon: "/android/home-solid.svg" },
  money: { label: "Money", icon: "/phone/tab-money-fill.svg" },
  shifts: { label: "Shifts", icon: "/android/calendar-solid.svg" },
  time: { label: "Time", icon: "/android/time-solid.svg" },
  chat: { label: "Messages", icon: "/android/chat-solid.svg" },
}

type PageSpec = { id: string; kind: "log" | "earnings" | "timeoff" | "account" | "locations" | "timecard" | "shoutouts" | "stats" | "shiftmates" | "achievements" | "clock" | "settings" | "team" | "assistant" | "generic"; title: string; /** The item the page opens focused on (a location's id on Locations). */ arg?: string }
const LOG: PageSpec = { id: "log", kind: "log", title: "Manager Log" }
const EARNINGS: PageSpec = { id: "earnings", kind: "earnings", title: "Money" }
const CLOCK: PageSpec = { id: "clock", kind: "clock", title: "Time clock" }
const TASKS: PageSpec = { id: "tasks", kind: "generic", title: "Task Manager" }
const SETTINGS: PageSpec = { id: "settings", kind: "settings", title: "Settings" }
const SHIFTMATES: PageSpec = { id: "shiftmates", kind: "shiftmates", title: "Shiftmates" }

/** Placeholder avatar: the user's two initials on a tonal circle. */
function Avatar({ size }: { size: number }) {
  const initials = ANON.name.split(" ").map((w) => w[0]).slice(0, 2).join("")
  return (
    <span className="bg-m-primary-container text-m-on-primary-container flex shrink-0 items-center justify-center rounded-full font-medium" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

function TopBar({ onMenu, menuOpen, title: titleOverride, subtitle, hideProfile, loc, tab, canSwitch, scrolled, pending, showClock, clockActive, rail, plus, onTitle, onBell, onClock, onProfile }: { /** The side menu is open (or opening): the menu button's badge fades away. */ menuOpen?: boolean; /** The menu button, top left on every main page: slides the app aside to show the menu (phones, not employees). */ onMenu?: () => void; /** The location, under the title, for pages scoped to one: tapping it switches. */ subtitle?: string; /** No avatar up here (phones, owners and managers: Settings is in the More menu). */ hideProfile?: boolean; /** Replaces the location title (Home is an overview, so it names its scope instead). */ title?: string; rail: boolean; /** The tab's add action, grouped with the other actions up here (phones; tablets use a FAB). */ plus?: { label: string; onClick: () => void }; loc: Location; tab: TabId; canSwitch: boolean; scrolled: boolean; pending: number; showClock: boolean; clockActive: boolean; onTitle: () => void; onBell: () => void; onClock: () => void; onProfile: () => void }) {
  const storeTitle = useLocTitle(loc)
  const title = titleOverride ?? storeTitle
  const centered = !rail && !!onMenu
  return (
    // The bar's fill runs up behind the status bar too (an opaque surface, tonal once scrolled), so nothing shows through there.
    <div className={cn("absolute inset-x-0 top-0 z-20 grid items-center gap-1 px-2 transition-colors duration-200", centered ? "grid-cols-[1fr_minmax(0,auto)_1fr]" : "grid-cols-[minmax(0,1fr)_auto]", scrolled ? "bg-m-container" : "bg-m-surface")} style={{ height: "calc(var(--safe-top) + 64px)", paddingTop: "var(--safe-top)" }}>
      {centered && (
      <div className="flex items-center justify-start">
        {!rail && onMenu && (
          <AIconButton label={pending ? `Menu, ${pending} requests waiting` : "Menu"} onClick={onMenu}>
            <span className="relative">
              <MenuTwoLine size={24} stroke={1.75} />
              {/* The bell lives in the menu now, so the menu button says when something is waiting there. */}
              {pending > 0 && <motion.span aria-hidden initial={false} animate={{ opacity: menuOpen ? 0 : 1 }} transition={{ duration: 0.2 }} className="bg-[var(--m-error)] absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none text-white">{pending}</motion.span>}
            </span>
          </AIconButton>
        )}
      </div>
      )}
      {/* The title is centered in the bar, between the menu button and the actions; with no menu button (employees) it takes the left. */}
      <button onClick={canSwitch ? onTitle : undefined} disabled={!canSwitch} aria-haspopup={canSwitch ? "menu" : undefined} className={cn("text-m-on-surface flex min-w-0 items-center gap-1", centered ? "justify-center px-1 text-center" : "justify-start pl-3 text-left")}>
        {subtitle ? (
          <span className={cn("flex min-w-0 flex-col justify-center", centered ? "items-center" : "items-start")}>
            <span className="truncate text-[18px] font-medium leading-6">{title}</span>
            <span className="text-m-variant flex items-center text-[13px] leading-4">
              <span className="truncate">{subtitle}</span>
              {canSwitch && <IconChevronDown size={16} stroke={2} className="ml-0.5 shrink-0" />}
            </span>
          </span>
        ) : (
          <>
            <span className="line-clamp-2 min-w-0 text-[18px] font-medium leading-6">{title}</span>
            {canSwitch && <IconChevronDown size={20} stroke={2} className="text-m-variant shrink-0" />}
          </>
        )}
      </button>
      <div className="flex items-center justify-end gap-1">
      {showClock && (
        <AIconButton label="Time clock" onClick={onClock}>
          <span className="relative">
            <IconClock size={24} stroke={1.75} />
            {clockActive && <span aria-hidden className="absolute -right-[2px] -top-[2px] size-[9px] rounded-full bg-[#34c759]" />}
          </span>
        </AIconButton>
      )}
      {plus && (
        <span data-anno="plus" className="contents">
          <AIconButton label={plus.label} onClick={plus.onClick}>
            <IconPlus size={24} stroke={1.75} />
          </AIconButton>
        </span>
      )}
      {/* Messages has its own action up here (search) and, like iOS, no bell. */}
      {tab === "chat" && (
        <AIconButton label="Search messages">
          <IconSearch size={24} stroke={1.75} />
        </AIconButton>
      )}
      {tab !== "chat" && !onMenu && (
        <AIconButton label={pending ? `Requests, ${pending} waiting` : "Requests"} onClick={onBell}>
          <span className="relative">
            <IconBell size={24} stroke={1.75} />
            {pending > 0 && <span className="bg-[var(--m-error)] absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none text-white">{pending}</span>}
          </span>
        </AIconButton>
      )}
      {/* The avatar opens Settings, at the top right like iOS (with a rail, the avatar lives in the rail instead). */}
      {!rail && !hideProfile && (
        <button onClick={onProfile} aria-label="Open settings" aria-haspopup="dialog" data-anno="profile" className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-black/10">
          <Avatar size={32} />
        </button>
      )}
      </div>
    </div>
  )
}

const maskStyle = (src: string, w: number) => ({ width: w, height: w, maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }) as const

/**
 * V5 · Split, labelled (android-nav): no pill, no bar fill. The tabs cluster at the start (24dp solid icons over
 * 12sp labels, 20dp apart) and the assistant is a circle alone at the far end, lifted 5dp so it reads centred.
 * Without the assistant the tabs spread evenly across the bar. The bar floats on a progressive
 * blur and a fade to the page colour.
 */
function NavBar({ tabs, tab, onTab, unread, onAssistant, more, clock, faded }: { tabs: TabId[]; /** Null while a page opened from More is showing. */ tab: TabId | null; onTab: (t: TabId) => void; unread: number; onAssistant?: () => void; /** Owners and managers: the More menu. */ more?: { items: MoreItem[]; header: Parameters<typeof MoreMenu>[0]["header"]; onSelect: (id: string) => void }; /** Employees: the Time Clock button, beside the pill. */ clock?: { active: boolean; onOpen: () => void }; /** Fades the whole bar out (the side menu is opening) and takes it out of reach. */ faded?: boolean }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const cluster = useRef<HTMLDivElement>(null)
  const [clusterW, setClusterW] = useState(0)
  useLayoutEffect(() => {
    const el = cluster.current
    if (!el) return
    const measure = () => setClusterW(el.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const moreItem = more?.items.find((m) => m.active)
  const moreOn = !!moreItem
  const slot = "relative flex h-12 min-w-0 flex-1 items-center justify-center"
  const selected = <motion.span layoutId="android-tab-selection" transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }} className="absolute inset-y-0 -inset-x-0.5 rounded-full bg-black/[0.08]" />
  return (
    <motion.div data-anno="nav-bar" initial={false} animate={{ opacity: faded ? 0 : 1 }} transition={{ duration: 0.2 }} style={{ pointerEvents: faded ? "none" : undefined }} className={cn("absolute inset-x-0 bottom-0 isolate", moreOpen ? "z-30" : "z-20")}>
      <LinearBlur side="bottom" strength={10} className="-z-10" style={{ top: -16 }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10" style={{ top: -16, background: "linear-gradient(to top, color-mix(in srgb, var(--m-surface) 28%, transparent) 15%, transparent)" }} />
      <nav className="flex w-full items-end gap-3" style={{ padding: "16px 20px 20px", minHeight: 92 }}>
        {/* Like iOS: the tabs and More share one frosted pill. Its surface is the More menu's, so it grows into the menu. */}
        <div ref={cluster} className="relative h-14 min-w-0 flex-1">
          {more ? (
            <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} clusterW={clusterW} items={more.items} header={more.header} onSelect={more.onSelect} />
          ) : (
            // No menu (employees): the pill is just the pill.
            <div aria-hidden className="absolute inset-0 rounded-[28px] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.14),0_4px_18px_rgba(0,0,0,0.14)] backdrop-blur-[22px] backdrop-saturate-[1.6]" style={{ backgroundColor: "color-mix(in srgb, var(--m-high) 62%, transparent)" }} />
          )}
          <motion.div initial={false} animate={{ opacity: moreOpen ? 0 : 1 }} transition={{ duration: moreOpen ? 0.1 : 0.2, delay: moreOpen ? 0 : 0.14 }} inert={moreOpen} className="absolute inset-0 flex items-center px-1">
            {tabs.map((id) => {
              const { label, icon } = TABS[id]
              const on = tab === id
              return (
                <button key={id} onClick={() => onTab(id)} aria-label={id === "chat" && unread > 0 ? `${label}, ${unread} unread` : label} aria-current={on ? "page" : undefined} className={slot} style={{ color: on ? "var(--m-nav-active)" : "var(--m-nav-inactive)" }}>
                  {on && selected}
                  <span className="relative">
                    <span aria-hidden className="block bg-current" style={maskStyle(icon, 24)} />
                    {id === "chat" && unread > 0 && (
                      <span aria-hidden className="bg-[var(--m-badge)] absolute -top-[5px] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none tabular-nums text-white" style={{ left: 16 }}>
                        {unread}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
            {more && (
            <button onClick={() => setMoreOpen(true)} aria-label="More" aria-haspopup="menu" aria-expanded={moreOpen} className={slot} style={{ color: moreOn ? "var(--m-nav-active)" : "var(--m-nav-inactive)" }}>
              {moreOn && selected}
              <span className="relative flex size-6 items-center justify-center">{moreItem?.activeIcon ?? <span aria-hidden className="block bg-current" style={maskStyle("/phone/tab-more-fill.svg", 24)} />}</span>
            </button>
            )}
          </motion.div>
        </div>
        {clock && (
          // Employees: the Time Clock button, a button of its own beside the pill (where managers have the assistant).
          <button onClick={clock.onOpen} aria-haspopup="dialog" aria-label={clock.active ? "Time clock, clocked in" : "Time clock"} className="text-m-on-surface relative flex size-14 shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.14),0_4px_18px_rgba(0,0,0,0.14)] backdrop-blur-[22px] backdrop-saturate-[1.6] active:opacity-70" style={{ backgroundColor: "color-mix(in srgb, var(--m-high) 62%, transparent)" }}>
            <span className="relative">
              <IconClock size={24} stroke={1.75} />
              {clock.active && <span aria-hidden className="absolute -right-[2px] -top-[2px] size-[9px] rounded-full bg-[#34c759]" />}
            </span>
          </button>
        )}
        {onAssistant && (
          // Frosted like the pill, with the icon in plain ink: the assistant stays quiet until you reach for it.
          <button onClick={onAssistant} aria-label="Assistant" aria-haspopup="dialog" className="text-m-on-surface relative flex size-14 shrink-0 items-center justify-center rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.14),0_4px_18px_rgba(0,0,0,0.14)] backdrop-blur-[22px] backdrop-saturate-[1.6] active:opacity-70" style={{ backgroundColor: "color-mix(in srgb, var(--m-high) 62%, transparent)" }}>
            <span aria-hidden className="block bg-current" style={maskStyle("/android/assistant-solid-24.svg", 24)} />
          </button>
        )}
      </nav>
    </motion.div>
  )
}

/** Rail widths: collapsed (icon over label) and expanded (icon beside label). */
const RAIL_W = 96
const RAIL_OPEN_W = 220
const RAIL_EASE = { duration: 0.3, ease: [0.2, 0, 0, 1] } as const

/**
 * Material 3 navigation rail, for tablets. Top to bottom: the menu
 * button that expands and collapses the rail, the avatar (opens settings), the assistant (managers), then the
 * destinations. Collapsed it is 96dp wide with labels under the icons; expanded the labels sit beside them.
 * The app's content slides right as it grows (see AndroidApp).
 */
function NavRail({ tabs, tab, onTab, unread, open, onToggle, onProfile, onAssistant, locations, more }: { /** The location switcher, first in the list: a row naming the current location that opens a menu. */ locations?: { title: string; open: boolean; onOpen: (el: HTMLElement) => void }; /** The rest of what the app provides, in a drop-down under the tabs. */ more?: { items: { id: string; label: string; icon: ReactNode; current?: boolean }[]; onSelect: (id: string) => void }; tabs: TabId[]; /** Null while a page opened from More is showing. */ tab: TabId | null; onTab: (t: TabId) => void; unread: number; open: boolean; onToggle: () => void; onProfile: () => void; onAssistant?: () => void }) {
  const [moreOpen, setMoreOpen] = useState(true)
  const pill = (on: boolean) => cn("flex items-center transition-colors", open ? "h-14 w-full gap-3 rounded-full pl-4 pr-6" : "h-8 w-14 justify-center rounded-full", on && "bg-m-secondary-container")
  const label = (text: string, strong?: boolean) => (open ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.15 }} className={cn("whitespace-nowrap text-[14px] leading-5", strong ? "font-bold" : "font-medium")}>{text}</motion.span> : null)
  return (
    <motion.nav
      data-anno="nav-rail"
      aria-label="Primary"
      initial={false}
      animate={{ width: open ? RAIL_OPEN_W : RAIL_W }}
      transition={RAIL_EASE}
      className="bg-m-container absolute inset-y-0 left-0 z-30 flex flex-col overflow-hidden"
      style={{ paddingTop: "calc(var(--safe-top) + 8px)", paddingBottom: 16 }}
    >
      <div className={cn("flex flex-col", open ? "items-stretch px-3" : "items-center")}>
        <button onClick={onToggle} aria-label={open ? "Collapse navigation rail" : "Expand navigation rail"} aria-expanded={open} className={cn("text-m-variant flex size-14 items-center justify-center rounded-full active:bg-black/10", open && "ml-1")}>
          {open ? <IconMenuDeep size={24} stroke={1.75} /> : <IconMenu2 size={24} stroke={1.75} />}
        </button>
      </div>
      <div className={cn("mt-6 flex min-h-0 shrink flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", open ? "gap-1 px-3" : "items-center gap-3")}>
        {locations && (
          <button onClick={(e) => locations.onOpen(e.currentTarget)} aria-haspopup="menu" aria-expanded={locations.open} aria-label={open ? undefined : "Locations"} data-anno="rail-locations" className={cn("text-m-on-surface flex", open ? "w-full" : "flex-col items-center gap-1")}>
            <span className={pill(false)}>
              <IconMapPin size={24} stroke={1.75} className="shrink-0" />
              {open && (
                <>
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left text-[14px] font-bold leading-5">{locations.title}</span>
                  <IconSelector size={18} stroke={2} className="text-m-variant shrink-0" />
                </>
              )}
            </span>
            {!open && <span className="whitespace-nowrap text-[12px] font-medium leading-normal">Location</span>}
          </button>
        )}
        {tabs.map((id) => {
          const { label: text, icon } = TABS[id]
          const on = tab === id
          return (
            <button key={id} onClick={() => onTab(id)} aria-current={on ? "page" : undefined} className={cn("flex", open ? "w-full" : "flex-col items-center gap-1")} style={{ color: on ? "var(--m-nav-active)" : "var(--m-nav-inactive)" }}>
              <span className={pill(on)}>
                <span className="relative flex">
                  <span aria-hidden className="block bg-current" style={maskStyle(icon, 24)} />
                  {id === "chat" && unread > 0 && (
                    <span aria-label={`${unread} unread`} className="bg-[var(--m-badge)] absolute -top-[5px] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none tabular-nums text-white" style={{ left: 16 }}>
                      {unread}
                    </span>
                  )}
                </span>
                {label(text, on)}
              </span>
              {!open && <span className={cn("whitespace-nowrap text-[12px] leading-normal", on ? "font-bold" : "font-medium")}>{text}</span>}
            </button>
          )
        })}
        {more && (open ? (
          <div data-anno="rail-more">
            <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} className="text-m-outline flex h-10 w-full items-center gap-3 rounded-full pl-4 pr-6">
              <span className="flex-1 text-left text-[14px] font-medium leading-5">More</span>
              <IconChevronDown size={18} stroke={2} className={cn("shrink-0 transition-transform duration-200", !moreOpen && "-rotate-90")} />
            </button>
            <motion.div initial={false} animate={moreOpen ? { height: "auto", visibility: "visible" } : { height: 0, transitionEnd: { visibility: "hidden" } }} transition={RAIL_EASE} className="overflow-hidden" inert={!moreOpen}>
              {more.items.map((m) => (
                <button key={m.id} onClick={() => more.onSelect(m.id)} aria-current={m.current ? "page" : undefined} className={cn("text-m-on-surface flex h-14 w-full items-center gap-3 rounded-full pl-4 pr-6 transition-colors", m.current && "bg-m-secondary-container")}>
                  <span className="flex size-6 shrink-0 items-center justify-center">{m.icon}</span>
                  <span className="truncate whitespace-nowrap text-[14px] font-medium leading-5">{m.label}</span>
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          // Collapsed there is no room for the list: More opens the rail.
          <button onClick={onToggle} aria-label="More" data-anno="rail-more" className="flex flex-col items-center gap-1" style={{ color: more.items.some((m) => m.current) ? "var(--m-nav-active)" : "var(--m-nav-inactive)" }}>
            <span className={pill(more.items.some((m) => m.current))}>
              <span aria-hidden className="block bg-current" style={maskStyle("/phone/tab-more-fill.svg", 24)} />
            </span>
            <span className="whitespace-nowrap text-[12px] font-medium leading-normal">More</span>
          </button>
        ))}
      </div>
      {/* The foot of the rail: New chat, and the avatar (Settings) at the very bottom. */}
      <div className={cn("mt-auto flex shrink-0 flex-col gap-3 pt-3", open ? "items-stretch px-3" : "items-center")}>
        {onAssistant && (
          <button onClick={onAssistant} aria-label="New chat" aria-haspopup="dialog" className={cn("flex h-14 items-center justify-center gap-3 self-center rounded-[16px] bg-[#8f55e5] text-white shadow-[0_6px_16px_rgba(143,85,229,0.35),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85", open ? "w-full px-4" : "w-14")}>
            <span aria-hidden className="block shrink-0 bg-white" style={maskStyle("/android/assistant-solid-24.svg", 24)} />
            {open && <span className="whitespace-nowrap text-[14px] font-medium leading-5">New chat</span>}
          </button>
        )}
        <button onClick={onProfile} aria-label="Open settings" aria-haspopup="dialog" data-anno="profile" className={cn("text-m-on-surface flex items-center rounded-full active:bg-black/10", open ? "h-14 w-full gap-3 pl-3 pr-6" : "size-14 justify-center")}>
          <Avatar size={40} />
          {open && <span className="truncate text-[14px] font-medium leading-5">{ANON.name}</span>}
        </button>
      </div>
    </motion.nav>
  )
}

/** Plus Group: pick the locations to combine (two or more), then name the group. It shows in the switcher and is selected. */
function AGroupSheet({ onClose }: { onClose: () => void }) {
  const wire = useStructure()
  const locName = useLocName()
  const add = useGroupsStore((s) => s.add)
  const setGroup = useLocationStore((s) => s.setGroup)
  const [step, setStep] = useState<"pick" | "name">("pick")
  const [picked, setPicked] = useState<string[]>([])
  const [name, setName] = useState("")
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const create = () => { if (name.trim()) { setGroup(add(name, picked)); onClose() } }
  return (
    <ASheet
      title={step === "pick" ? "Combine locations" : "Name group"}
      onClose={onClose}
      full
      footer={
        <div className="flex gap-3 pb-2">
          {step === "name" && <button onClick={() => setStep("pick")} className="border-m-outline text-m-primary h-12 flex-1 rounded-full border text-[15px] font-medium active:bg-black/5">Back</button>}
          {step === "pick" ? (
            <button disabled={picked.length < 2} onClick={() => setStep("name")} className="bg-m-primary text-m-on-primary h-12 flex-1 rounded-full text-[15px] font-medium tracking-[0.1px] active:opacity-85 disabled:opacity-40">
              {picked.length < 2 ? "Choose two or more" : `Next · ${picked.length} locations`}
            </button>
          ) : (
            <button disabled={!name.trim()} onClick={create} className="bg-m-primary text-m-on-primary h-12 flex-1 rounded-full text-[15px] font-medium tracking-[0.1px] active:opacity-85 disabled:opacity-40">Create group</button>
          )}
        </div>
      }
    >
      {step === "pick" ? (
        COMPANIES.map((c, ci) => (
          <div key={c.name}>
            <p className="text-m-variant px-1 pb-1 pt-3 text-[14px] font-medium leading-5">{wire ? `Company ${ci + 1}` : c.name}</p>
            {c.locations.map((l) => (
              <ACheckRow key={l.id} checked={picked.includes(l.id)} onChange={() => toggle(l.id)}>{wire ? locName(l) : shortLocationName(l)}</ACheckRow>
            ))}
          </div>
        ))
      ) : (
        <div className="pt-2">
          <label className="border-m-outline focus-within:border-m-primary flex h-14 items-center rounded-[4px] border px-4">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} maxLength={40} placeholder="Group name" aria-label="Group name" className="text-m-on-surface placeholder:text-m-variant min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
          </label>
          <p className="text-m-variant px-1 pt-3 text-[14px] leading-5">
            {picked.map((id) => LOCATIONS.find((l) => l.id === id)).map((l) => (l ? (wire ? locName(l) : shortLocationName(l)) : "")).join(", ")}
          </p>
        </div>
      )}
    </ASheet>
  )
}

/** A location's row in the menu: name over labor share, a wireframe sales-and-labor chart, and today's sales. Also what its overview grows out of. */
function AndroidMenuRowBody({ l }: { l: Location }) {
  const wire = useStructure()
  const locName = useLocName()
  const employee = useUserTypeStore((s) => s.type) === "employee"
  const counts = useCounts([l])
  // The second line says something about the location, with what is waiting there at its end: unread messages and requests.
  // An employee sees when they next work here, a manager the labor share. Never the other's numbers.
  const next = nextShiftAt(l.id)
  const sub = wire ? (
    <span className="flex items-center gap-2">
      {!employee && <ABar w={32} h={8} />}
      <ABar w={56} h={8} />
    </span>
  ) : employee ? (
    <span className="truncate">{next ? `Next shift ${next}` : "No shifts this week"}</span>
  ) : (
    <span className="flex items-center gap-[6px]">
      <span className="text-m-on-surface font-medium">{shortMoney(l.sales)}</span>
      <span aria-hidden>·</span>
      <span aria-hidden className="size-[7px] rounded-full" style={{ backgroundColor: l.laborPct < 15 ? "#12a53b" : "#d0161f" }} />
      {l.laborPct}% labor
    </span>
  )
  return (
    <span className="flex w-full items-center gap-3 text-left">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[16px] leading-6">{wire ? locName(l) : shortLocationName(l)}</span>
        <span className="text-m-variant flex items-center justify-between gap-2 text-[12px] leading-4">
          {sub}
          <LocationBadges android {...counts} />
        </span>
      </span>
    </span>
  )
}

function LocationMenu({ open, onClose, onAll, onNewGroup, onAddLocation, anchorEl, onPickLocation }: { open: boolean; onClose: () => void; /** Anchor under this element (the rail's Locations row) instead of under the top bar's title. */ anchorEl?: HTMLElement | null; /** Also called when a location is picked (a tablet's Home opens that location's view). */ onPickLocation?: (l: Location) => void; /** Show every location at once. */ onAll?: () => void; /** Plus Group: start combining locations into a named group. */ onNewGroup?: () => void; /** One location only: the menu offers to add another instead of listing more. */ onAddLocation?: () => void }) {
  const wire = useStructure()
  const id = useLocationStore((s) => s.locationId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const all = useLocationStore((s) => s.all)
  const groupId = useLocationStore((s) => s.groupId)
  const setGroup = useLocationStore((s) => s.setGroup)
  const groups = useGroupsStore((s) => s.groups)
  const single = useUserTypeStore((s) => s.type) === "oam"
  const allCounts = useCounts()
  const overlay = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const o = overlay.current
    if (!open || !anchorEl || !o) return setPos(null)
    const a = anchorEl.getBoundingClientRect()
    const r = o.getBoundingClientRect()
    const sc = r.width / o.offsetWidth || 1 // the device frame is scaled; position in local px
    setPos({ left: (a.left - r.left) / sc, top: (a.bottom - r.top) / sc + 4 })
  }, [open, anchorEl])
  return (
    <AnimatePresence>
      {open && (
        <div ref={overlay} className="absolute inset-0 z-[30]" onPointerDown={onClose}>
          <motion.div
            role="menu"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onPointerDown={(e) => e.stopPropagation()}
            style={anchorEl && pos ? { top: pos.top, left: pos.left, transformOrigin: "top left" } : { top: "calc(var(--safe-top) + 56px)", transformOrigin: "top left" }}
            className={cn("bg-m-high text-m-on-surface absolute w-[340px] max-w-[calc(100%-32px)] overflow-hidden rounded-[12px] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]", !(anchorEl && pos) && "left-4")}
          >
            {single && (
              <>
                <div className="flex min-h-14 items-center gap-3 px-4 py-1 text-[16px] leading-6">
                  <span className="min-w-0 flex-1 truncate">{wire ? "Location 1" : LOCATIONS[0].name}</span>
                  <IconCheck size={20} stroke={2} className="text-m-primary shrink-0" />
                </div>
                {onAddLocation && (
                  <button onClick={() => { onAddLocation(); onClose() }} className="border-m-outline/30 text-m-primary mt-1 flex h-12 w-full items-center gap-3 border-t px-4 text-left text-[16px] font-medium active:bg-black/10">
                    <IconPlus size={20} stroke={2} />
                    Add location
                  </button>
                )}
              </>
            )}
            {!single && onAll && (
              <button role="menuitemradio" aria-checked={all} onClick={() => { onAll(); onClose() }} className="border-m-outline/30 flex w-full items-center gap-3 border-b px-4 py-2 text-left active:bg-black/10">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[16px] font-medium leading-6">All Locations</span>
                  <span className="text-m-variant flex items-center justify-between gap-2 text-[12px] leading-4">
                    {LOCATIONS.length} locations
                    <LocationBadges android {...allCounts} />
                  </span>
                </span>
                {all && <IconCheck size={20} stroke={2} className="text-m-primary shrink-0" />}
              </button>
            )}
            {!single && groups.length > 0 && (
              <div role="group" aria-label="Groups" className="border-m-outline/30 border-b pb-1">
                <div className="text-m-variant px-4 pb-1 pt-2 text-[14px] font-medium leading-5">Groups</div>
                {groups.map((g) => (
                  <button key={g.id} role="menuitemradio" aria-checked={groupId === g.id} onClick={() => { setGroup(g.id); onClose() }} className="flex min-h-14 w-full items-center gap-3 px-4 py-1 text-left active:bg-black/10">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[16px] leading-6">{g.name}</span>
                      <span className="text-m-variant text-[12px] leading-4">{locationsOf(g).length} locations</span>
                    </span>
                    {groupId === g.id && <IconCheck size={20} stroke={2} className="text-m-primary shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            {!single && COMPANIES.map((c, ci) => (
              <div key={c.name} role="group" aria-label={wire ? `Company ${ci + 1}` : c.name} className={ci > 0 ? "border-m-outline/30 mt-1 border-t pt-1" : undefined}>
                <div className="text-m-variant px-4 pb-1 pt-2 text-[14px] font-medium leading-5">{wire ? `Company ${ci + 1}` : c.name}</div>
                {c.locations.map((l) => (
                  <button key={l.id} role="menuitem" onClick={() => { setLocation(l.id); onPickLocation?.(l); onClose() }} className="flex min-h-14 w-full items-center gap-3 px-4 py-1 text-left active:bg-black/10">
                    <AndroidMenuRowBody l={l} />
                    {!all && !groupId && l.id === id && <IconCheck size={20} stroke={2} className="text-m-primary shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
            {onNewGroup && (
              <button onClick={() => { onNewGroup(); onClose() }} className="border-m-outline/30 text-m-primary mt-1 flex h-12 w-full items-center gap-3 border-t px-4 text-left text-[16px] font-medium active:bg-black/10">
                <IconPlus size={20} stroke={2} />
                Group
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const Section = ({ title, action, onAction, headerAnno, children }: { title: string; action?: string; onAction?: () => void; /** A data-anno on the header, so a note can point at it. */ headerAnno?: string; children: ReactNode }) => (
  <section>
    <ASection action={action} onAction={onAction} dataAnno={headerAnno}>{title}</ASection>
    {children}
  </section>
)

/** Two columns for a wide screen (tablet landscape): a fixed-width side and a flexible side, each scrolling on its own. */
function SplitCols({ left, right }: { left: ReactNode; right: ReactNode }) {
  const col = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-y-auto px-4 pb-6"
  return (
    <div className="absolute inset-0 flex" style={{ paddingTop: "calc(var(--safe-top) + 64px)" }}>
      <div className={cn(col, "w-[380px] shrink-0")}>{left}</div>
      <div className={cn(col, "min-w-0 flex-1 pl-2")}>{right}</div>
    </div>
  )
}

/** A chosen item, opened: skeleton cards under their titles. */
function DetailCards({ cards }: { cards: [string, number][] }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      {cards.map(([t, h]) => <ACard key={t} title={t} h={h} />)}
    </div>
  )
}

/** Wherever data from several locations could sit side by side ("all locations"), each location's share gets its own caption. */
function AByLocation({ children }: { children: (l: Location, grouped: boolean, index: number) => ReactNode }) {
  const scope = useScope()
  const locName = useLocName()
  const openLocation = useContext(OpenLocationContext)
  if (scope.length === 1) return <>{children(scope[0], false, 0)}</>
  return (
    <>
      {scope.map((l, i) => (
        <div key={l.id}>
          <p className="text-m-variant px-4 pb-1 pt-3 text-[13px] font-medium leading-5">
            {/* On the Home overview a caption is also the way into that location's own view. */}
            {openLocation ? (
              <button onClick={(e) => openLocation(l, e.currentTarget, <span className="text-m-variant px-4 text-[13px] font-medium leading-5">{locName(l)}</span>)} className="flex items-center gap-[2px] text-left active:opacity-60">
                {locName(l)}
                <IconChevronRight size={14} stroke={2} className="shrink-0" />
              </button>
            ) : locName(l)}
          </p>
          {children(l, true, i)}
        </div>
      ))}
    </>
  )
}

/** The Status card's shape without its content: the title, the three-way switch, and a row of hours each with a figure over a plan. */
function StatusSkeleton() {
  return (
    <ACard dataAnno="status" h={150}>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[16px] font-medium leading-6">Status</span>
          <ABar w={64} h={10} className="mt-1" />
        </div>
        <span aria-hidden className="bg-m-skeleton/60 flex h-8 w-[120px] items-center justify-around rounded-full px-2">
          {[0, 1, 2].map((i) => <span key={i} className={cn("size-4 rounded-full", i === 0 ? "bg-m-outline/50" : "bg-m-skeleton")} />)}
        </span>
      </div>
      <div aria-hidden className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex w-12 shrink-0 flex-col items-center gap-3">
            <ABar w={i === 0 ? 30 : 22} h={14} />
            <div className="flex flex-col items-center gap-[6px]">
              <ABar w={26} h={14} />
              <ABar w={20} h={10} className="opacity-60" />
            </div>
          </div>
        ))}
      </div>
    </ACard>
  )
}

/** The week chart's shape: seven days, a bar for when each is worked (one dashed: free), a day marker under each, and the hours down the side. */
function WeekSkeleton({ card }: { card?: boolean }) {
  const bars: ([number, number] | "free" | null)[] = [[34, 110], [14, 86], [58, 100], "free", [28, 96], null, [44, 70]]
  const chart = (
    <div aria-hidden className="relative mx-auto flex h-[216px] w-full max-w-[338px] items-start justify-between">
      {[7, 59, 111, 163].map((y) => <span key={y} className="border-m-divider absolute left-0 right-[30px] border-t border-dashed" style={{ top: y }} />)}
      {bars.map((b, i) => (
        <span key={i} className="relative h-[216px] w-8">
          {b === "free" && <span className="border-m-outline/60 absolute left-[6px] w-4 rounded-[4px] border border-dashed" style={{ top: 44, height: 92 }} />}
          {Array.isArray(b) && <span className={cn("absolute left-[6px] w-4 rounded-[4px]", i === 2 ? "bg-m-outline/50" : "bg-m-skeleton")} style={{ top: b[0], height: b[1] }} />}
          <span className={cn("absolute left-0 top-[184px] size-7 rounded-full", i === 2 ? "bg-m-outline/50" : "bg-m-skeleton")} />
        </span>
      ))}
      <span className="flex h-[170px] w-[21px] flex-col items-end justify-between">
        {[0, 1, 2, 3].map((i) => <ABar key={i} w={18} h={8} />)}
      </span>
    </div>
  )
  return card ? <div className="bg-m-container rounded-[16px] p-3">{chart}</div> : chart
}

function HomeEmployee({ split, onOpen }: { split?: boolean; onOpen: (p: PageSpec) => void }) {
  const hero = (
    <>
      <WeekSkeleton />
      <ALines />
    </>
  )
  const rest = (
    <>
      <div className="flex gap-3">
        <ACard title="Earnings" h={112} onClick={() => onOpen(EARNINGS)} className="flex-1" />
        <ACard title="Shiftmates" h={112} onClick={() => onOpen(SHIFTMATES)} className="flex-1" />
      </div>
      <Section title="Events"><AList rows={3} avatar={false} trailing /></Section>
      <Section title="Task Manager" action="See all" onAction={() => onOpen(TASKS)}><AList rows={3} avatar={false} trailing onRow={() => onOpen(TASKS)} /></Section>
      <Section title="Manager Log" action="See all" onAction={() => onOpen(LOG)}><AList rows={2} avatar={false} onRow={() => onOpen(LOG)} /></Section>
    </>
  )
  if (split) return <SplitCols left={<div className="flex flex-col gap-3">{hero}</div>} right={<div className="flex flex-col gap-3">{rest}</div>} />
  return (
    <div className="flex flex-col gap-3">
      {hero}
      {rest}
    </div>
  )
}

/**
 * One location's own view, opened from the overview: the same home, for just that location. It grows out of the row or
 * caption that was tapped (a container transform) and the X shrinks it back into it.
 */
function AndroidLocationView({ loc, from, clone, employee, onClosed }: { loc: Location; from: Box; clone: ReactNode; employee: boolean; onClosed: () => void }) {
  const locName = useLocName()
  const noop = () => {}
  return (
    <ExpandSurface
      from={from}
      clone={clone}
      cardClass="bg-m-container"
      pageClass="bg-m-surface"
      onClosed={onClosed}
      z={31}
      button={(close) => (
        <button onClick={close} aria-label="Close" className="text-m-on-surface flex size-12 items-center justify-center rounded-full active:bg-black/10">
          <IconX size={24} stroke={1.75} />
        </button>
      )}
    >
      <ScopeContext.Provider value={[loc]}>
        <OpenLocationContext.Provider value={null}>
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 px-4" style={{ paddingTop: "calc(var(--safe-top) + 64px)", paddingBottom: 40 }}>
            <h1 className="text-m-on-surface text-[28px] leading-9">{locName(loc)}</h1>
            {employee ? <HomeEmployee onOpen={noop} /> : <HomeManager onOpen={noop} />}
          </div>
        </OpenLocationContext.Provider>
      </ScopeContext.Provider>
    </ExpandSurface>
  )
}

/** The overview's breakdown of the hero number: the biggest few locations, each a tap into that location. Only on the overview of several locations. */
function LocationBreakdown() {
  const open = useContext(OpenLocationContext)
  const scope = useScope()
  const locName = useLocName()
  if (!open || scope.length < 2) return null
  const top = [...scope].sort((a, b) => b.sales - a.sales).slice(0, 4)
  return (
    <Section title="Locations">
      <div data-anno="location-breakdown" className="bg-m-container overflow-hidden rounded-[16px]">
        {top.map((l, i) => {
          // What the row shows: also what its location's view grows out of.
          const body = (
            <span className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
              <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
                <span className="truncate text-[16px] leading-6">{locName(l)}</span>
                <ABar w="45%" h={8} />
              </span>
              <ABar w={44} h={12} />
              <IconChevronRight size={20} stroke={2} className="text-m-variant shrink-0" />
            </span>
          )
          return (
            <button key={l.id} onClick={(e) => open(l, e.currentTarget, body)} className={cn("block w-full active:bg-black/5", i > 0 && "border-m-divider border-t")}>
              {body}
            </button>
          )
        })}
      </div>
    </Section>
  )
}

function HomeManager({ split, onOpen }: { split?: boolean; onOpen: (p: PageSpec) => void }) {
  const hero = (
    <>
      <div className="flex flex-col gap-1 py-2">
        <ABar w={150} h={34} />
        <p className="text-m-variant pt-1 text-[16px] leading-6">Total sales</p>
      </div>
      <ALines />
      <LocationBreakdown />
      <StatusSkeleton />
    </>
  )
  const rest = (
    <>
      <Section title="My Week"><WeekSkeleton card /></Section>
      <Section title="Needs Review"><AList rows={3} avatar={false} trailing /></Section>
      <Section title="Task Manager" action="See all" onAction={() => onOpen(TASKS)}><AList rows={3} avatar={false} trailing onRow={() => onOpen(TASKS)} /></Section>
      <Section title="Manager Log" action="See all" onAction={() => onOpen(LOG)}><AList rows={2} avatar={false} onRow={() => onOpen(LOG)} /></Section>
      <Section title="Events"><AList rows={3} avatar={false} trailing /></Section>
    </>
  )
  if (split) return <SplitCols left={<div className="flex flex-col gap-3">{hero}</div>} right={<div className="flex flex-col gap-3">{rest}</div>} />
  return (
    <div className="flex flex-col gap-3">
      {hero}
      {rest}
    </div>
  )
}

const SHIFT_FILTERS = [
  { id: "all", label: "All shifts" },
  { id: "mine", label: "My shifts" },
  { id: "open", label: "Open shifts" },
] as const

/** Shifts: the week strip, then the day's summary with the filter as a dropdown beside it, like iOS. */
function ShiftsTab({ split }: { split?: boolean }) {
  const [sel, setSel] = useState(0)
  const date = useDateStore((s) => s.date)
  const setDate = useDateStore((s) => s.setDate)
  const [filter, setFilter] = useState<(typeof SHIFT_FILTERS)[number]["id"]>("all")
  const [menu, setMenu] = useState(false)
  const main = (
    <div>
      <WeekStrip date={date} onPick={setDate} dots={(i) => !!USER_SCHEDULE[i]} label={dayLabel(date)} />
      <div className="relative flex items-start justify-between gap-3 pb-3 pt-1">
        <div className="flex flex-col gap-2 pt-1">
          <ABar w={90} h={26} />
          <ABar w={150} h={12} />
        </div>
        <AChip onClick={() => setMenu((o) => !o)} trailing={<IconChevronDown size={18} stroke={2} />}>
          {SHIFT_FILTERS.find((f) => f.id === filter)!.label}
        </AChip>
        <AnimatePresence>
          {menu && (
            <>
              <div className="fixed inset-0 z-[25]" onPointerDown={() => setMenu(false)} />
              <motion.div
                role="menu"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ transformOrigin: "top right" }}
                className="bg-m-high text-m-on-surface absolute right-0 top-10 z-[26] w-[200px] overflow-hidden rounded-[12px] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              >
                {SHIFT_FILTERS.map((f) => (
                  <button key={f.id} role="menuitemradio" aria-checked={f.id === filter} onClick={() => { setFilter(f.id); setMenu(false) }} className="flex h-12 w-full items-center gap-3 px-4 text-left text-[16px] active:bg-black/10">
                    <span className="flex-1">{f.label}</span>
                    {f.id === filter && <IconCheck size={20} stroke={2} className="text-m-primary" />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      <AByLocation>
        {(_, g, gi) => {
          const n = g ? (split ? 4 : 3) : split ? 14 : 6
          return <AList rows={n} trailing selected={split ? sel - gi * n : undefined} onPick={split ? (i) => setSel(i + gi * n) : undefined} />
        }}
      </AByLocation>
    </div>
  )
  if (!split) return main
  return <SplitCols left={main} right={<DetailCards cards={[["Shift", 120], ["Details", 200], ["Notes", 96]]} />} />
}

/** The pay period at a glance: the hours paid and what each person was paid. */
function PayPeriodPane() {
  return (
    <div className="flex flex-col gap-1 pt-2">
      <ASection>Pay period</ASection>
      <AByLocation>
        {(_, g) => (
          <>
            <ABar w={150} h={34} />
            <p className="text-m-variant pb-2 pt-1 text-[16px] leading-6">Total paid</p>
            <AList rows={g ? 4 : 9} trailing />
          </>
        )}
      </AByLocation>
    </div>
  )
}

type FilterKind = "team" | "issues" | "roles"
type TimeFilters = Record<FilterKind, string[]>

function TimeTab({ split, filters, onFilter }: { split?: boolean; filters: TimeFilters; onFilter: (k: FilterKind) => void }) {
  const date = useDateStore((s) => s.date)
  const setDate = useDateStore((s) => s.setDate)
  const storedView = useDateStore((s) => s.timeView)
  // Split view shows both, so the Day / Pay period choice doesn't apply.
  const view = split ? "day" : storedView
  const setView = useDateStore((s) => s.setTimeView)
  const chip = (kind: FilterKind) => ({ selected: filters[kind].length > 0, onClick: () => onFilter(kind) })
  const count = (kind: FilterKind) => (filters[kind].length ? ` ${filters[kind].length}` : "")
  const main = (
    <div>
      <WeekStrip date={date} onPick={setDate} label={view === "day" ? dayLabel(date) : rangeLabel(...payPeriodOf(date))} />
      <AChips>
        <AChip leading={<IconSearch size={18} stroke={2} />} {...chip("team")}>{`Team Members${count("team")}`}</AChip>
        <AChip leading={<IconAlertHexagon size={18} stroke={2} />} trailing={<IconFilter size={16} stroke={2} />} {...chip("issues")}>{`Issues${count("issues")}`}</AChip>
        <AChip leading={<IconBriefcase size={18} stroke={2} />} trailing={<IconFilter size={16} stroke={2} />} {...chip("roles")}>{`Roles${count("roles")}`}</AChip>
        {!split && <AChip selected={view === "period"} onClick={() => setView(view === "period" ? "day" : "period")}>Pay period</AChip>}
      </AChips>
      {view === "day" ? (
        <>
          <ASection>Needs review</ASection>
          <AByLocation>
            {(_, g) => (
              <div className="flex flex-col gap-3 pt-1">
                {Array.from({ length: g ? 2 : split ? 6 : 4 }, (_, i) => <ACard key={i} h={150} />)}
              </div>
            )}
          </AByLocation>
        </>
      ) : (
        <>
          <ASection>Pay period</ASection>
          <AByLocation>{(_, g) => <AList rows={g ? 3 : 4} avatar={false} trailing />}</AByLocation>
        </>
      )}
    </div>
  )
  if (!split) return main
  return <SplitCols left={main} right={<PayPeriodPane />} />
}

function MoneyTab() {
  return (
    <div className="flex flex-col gap-1 pt-2">
      <ACard title="This pay period" h={110} />
      <Section title="Today"><AList rows={2} avatar={false} trailing /></Section>
      <Section title="Recent pay stubs"><AByLocation>{(_, g) => <AList rows={g ? 2 : 3} avatar={false} trailing />}</AByLocation></Section>
    </div>
  )
}

function MessagesTab({ selected, onPick }: { /** Split view (tablet landscape): the open conversation and what choosing one does. */ selected?: number; onPick?: (i: number) => void }) {
  const [filter, setFilter] = useState<"all" | "unread" | "threads">("all")
  const toggle = (f: "unread" | "threads") => setFilter((c) => (c === f ? "all" : f))
  return (
    <div className="pt-2">
      <AChips>
        <AChip selected={filter === "unread"} onClick={() => toggle("unread")}>Unread</AChip>
        <AChip selected={filter === "threads"} onClick={() => toggle("threads")}>Threads</AChip>
      </AChips>
      <AByLocation>
        {(_, g, gi) => {
          const n = g ? (onPick ? 4 : 3) : onPick ? 14 : 7
          return <AList rows={n} selected={selected === undefined ? undefined : selected - gi * n} onPick={onPick ? (i) => onPick(i + gi * n) : undefined} />
        }}
      </AByLocation>
    </div>
  )
}

/** One conversation, opened: who it's with, the thread, and the composer, as skeletons. */
function ConversationPane() {
  const bubble = "block rounded-[20px]"
  return (
    <div className="bg-m-container flex h-full flex-col overflow-hidden rounded-[28px]">
      <div className="border-m-divider flex shrink-0 items-center gap-4 border-b px-5 py-4">
        <span className="bg-m-skeleton size-10 shrink-0 rounded-full" />
        <span className="flex flex-col gap-[9px]">
          <ABar w={140} h={12} />
          <ABar w={80} h={10} />
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
        <span aria-hidden className={cn(bubble, "bg-m-skeleton h-14 w-[55%] self-start")} />
        <span aria-hidden className={cn(bubble, "bg-m-primary-container h-10 w-[38%] self-end")} />
        <span aria-hidden className={cn(bubble, "bg-m-skeleton h-20 w-[62%] self-start")} />
        <span aria-hidden className={cn(bubble, "bg-m-primary-container h-10 w-[30%] self-end")} />
      </div>
      <div className="shrink-0 px-4 pb-4">
        <div className="border-m-outline h-12 rounded-full border" />
      </div>
    </div>
  )
}

/** Tablet Messages: the list on the left, the open conversation on the right. */
function MessagesSplit() {
  const [sel, setSel] = useState(0)
  const col = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  return (
    <div className="absolute inset-0 flex" style={{ paddingTop: "calc(var(--safe-top) + 64px)" }}>
      <div className={cn(col, "w-[40%] min-w-[240px] max-w-[380px] shrink-0 overflow-y-auto px-4 pb-6")}>
        <MessagesTab selected={sel} onPick={setSel} />
      </div>
      <div className="min-w-0 flex-1 pb-4 pl-1 pr-4 pt-2">
        <ConversationPane />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sheets and pages
// ---------------------------------------------------------------------------

const ISSUE_OPTIONS = ["Missing paid break", "Missing unpaid break", "Late clock-in", "Early clock-out", "Overtime"]

/** The Time page's filters, each a full-height bottom sheet (a side sheet on a tablet): pick options, then apply. */
function TimeFilterSheet({ kind, loc, side, value, onApply, onClose }: { kind: FilterKind; loc: Location; side?: boolean; value: string[]; onApply: (v: string[]) => void; onClose: () => void }) {
  const Shell = side ? ASideSheet : ASheet
  const [draft, setDraft] = useState(value)
  const toggle = (id: string) => setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))
  const roles = Array.from(new Set(loc.team.map((m) => m.role)))
  const title = kind === "team" ? "Team Members" : kind === "issues" ? "Issues" : "Roles"
  return (
    <Shell
      title={title}
      onClose={onClose}
      {...(side ? {} : { full: true })}
      footer={
        <div className="flex gap-3 pb-2">
          <button onClick={() => setDraft([])} className="border-m-outline text-m-primary h-12 flex-1 rounded-full border text-[15px] font-medium active:bg-black/5">Clear</button>
          <button onClick={() => onApply(draft)} className="bg-m-primary text-m-on-primary h-12 flex-1 rounded-full text-[15px] font-medium tracking-[0.1px] active:opacity-85">Apply</button>
        </div>
      }
    >
      {kind === "team" && (
        <div className="bg-m-high mb-2 flex h-12 items-center gap-3 rounded-full px-4">
          <IconSearch size={22} stroke={1.75} className="text-m-variant shrink-0" />
          <span className="text-m-variant text-[16px]">Search team members</span>
        </div>
      )}
      {kind === "team" && loc.team.map((m, i) => (
        <ACheckRow key={m.name} checked={draft.includes(String(i))} onChange={() => toggle(String(i))}>
          <span className="bg-m-skeleton size-10 shrink-0 rounded-full" />
          <ABar w={110} h={12} />
        </ACheckRow>
      ))}
      {kind === "issues" && ISSUE_OPTIONS.map((o) => <ACheckRow key={o} checked={draft.includes(o)} onChange={() => toggle(o)}>{o}</ACheckRow>)}
      {kind === "roles" && roles.map((r) => <ACheckRow key={r} checked={draft.includes(r)} onChange={() => toggle(r)}>{r}</ACheckRow>)}
    </Shell>
  )
}

function RequestsSheet({ loc, multi, side, onClose }: { loc: Location; multi: boolean; /** A side sheet instead of a bottom sheet (wide screens). */ side?: boolean; onClose: () => void }) {
  const Shell = side ? ASideSheet : ASheet
  const locName = useLocName()
  const wire = useStructure()
  const filters = [wire ? locName(loc) : shortLocationName(loc), "Mine", ...(multi ? ["All locations"] : []), "Archive"]
  const [f, setF] = useState(filters[0])
  return (
    <Shell title="Requests" onClose={onClose} {...(side ? {} : { full: true })}>
      <AChips>
        {filters.map((x) => (
          <AChip key={x} selected={f === x} onClick={() => setF(x)}>{x}</AChip>
        ))}
      </AChips>
      <AList rows={4} />
    </Shell>
  )
}

const toMinutes = (t: string) => {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  return (Number(m[1]) % 12) * 60 + Number(m[2]) + (m[3].toUpperCase() === "PM" ? 720 : 0)
}

type ClockTile = { icon: string; label: string; onClick: () => void; muted?: boolean; /** Two taps: the first arms it (it spans the row in the primary colour), the second does it. */ confirm?: string }

/**
 * The action tiles, as on iOS: tinted, icon over label. Clock out is the risky one, so it is grey and sits on the left,
 * and it takes two taps: the first makes it span the whole row in the primary colour, the second confirms.
 */
function ClockTiles({ tiles }: { tiles: ClockTile[] }) {
  const [armed, setArmed] = useState<string | null>(null)
  useEffect(() => {
    if (!armed) return
    const off = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest("[data-armed]")) setArmed(null)
    }
    document.addEventListener("pointerdown", off)
    return () => document.removeEventListener("pointerdown", off)
  }, [armed])
  return (
    <div className="flex gap-3">
      {tiles.map((t) => {
        const on = armed === t.label
        if (armed && !on) return null
        return (
          <button
            key={t.label}
            data-armed={on ? "" : undefined}
            aria-label={on && t.confirm ? t.confirm : t.label}
            onClick={() => (t.confirm && !on ? setArmed(t.label) : t.onClick())}
            className={cn("flex h-[68px] min-w-0 flex-1 flex-col items-center justify-center gap-[2px] rounded-[16px] active:opacity-70", on ? "bg-m-primary text-m-on-primary" : t.muted ? "bg-[rgba(120,120,128,0.16)] text-[#6b6b73]" : "bg-[rgba(143,85,229,0.14)] text-[#7440d1]")}
          >
            <span aria-hidden className="block bg-current" style={maskStyle(t.icon, 24)} />
            <span className="whitespace-nowrap text-[13px] font-medium leading-[18px]">{on && t.confirm ? t.confirm : t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * The time clock, as a full page like iOS's sheet: a map, what state you're in, then either the details with a
 * primary Confirm Clock in (pinned under the page), or your shift's progress with the action tiles.
 */
function ClockPage({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const locName = useLocName()
  const st = useClock(loc)
  const clock = useTimeClockStore()
  const { shift, role: defaultRole } = loc.employee.timeClock
  const role = st.role ?? defaultRole
  const live = st.status !== "out"
  const today = scheduledToday(loc)
  const [start, end] = shiftRange(shift)
  const pct = Math.min(1, Math.max(0, (NOW_MIN - toMinutes(start)) / Math.max(1, toMinutes(end) - toMinutes(start))))
  const heading = st.status === "out" ? (today ? "Ready to clock in" : "Not scheduled today") : st.status === "break" ? `On a ${st.breakKind}` : "Clocked in"
  const clockOut: ClockTile = { icon: "/phone/tile-clock-out.svg", label: "Clock out", confirm: "Confirm clock out", muted: true, onClick: () => { onClose(); clock.clockOut(loc.id) } }
  const tiles: ClockTile[] =
    st.status === "break"
      ? [clockOut, { icon: "/phone/tile-break.svg", label: "End break", onClick: () => clock.endBreak(loc.id) }]
      : [clockOut, { icon: "/phone/tile-break.svg", label: "10 min break", onClick: () => clock.startBreak(loc.id, "10 min break", 10) }, { icon: "/phone/meal.svg", label: "30 min meal", onClick: () => clock.startBreak(loc.id, "30 min meal", 30) }]
  return (
    <div className="flex flex-col gap-4 pt-1">
      <div aria-hidden className="bg-m-skeleton relative h-[200px] overflow-hidden rounded-[20px]">
        <span className="bg-m-primary border-m-surface absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow-md" />
      </div>
      <div>
        <h2 className="text-m-on-surface text-[24px] leading-8">{heading}</h2>
        {live && (
          <div className="text-m-variant pt-1 text-[14px] leading-5">
            {st.status === "break" && <ABar w={90} h={10} className="mb-2" />}
            <p>{locName(loc)}</p>
            <p>{role}</p>
          </div>
        )}
      </div>
      {live ? (
        <>
          <div>
            <div role="progressbar" aria-label="Shift progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} className="bg-m-skeleton h-[6px] overflow-hidden rounded-[3px]">
              <div className="bg-m-primary h-full rounded-[3px]" style={{ width: `${pct * 100}%` }} />
            </div>
            <div className="flex justify-between pt-2">
              <ABar w={52} h={10} />
              <ABar w={52} h={10} />
            </div>
          </div>
          <ClockTiles tiles={tiles} />
        </>
      ) : (
        <div className="bg-m-container overflow-hidden rounded-[20px]">
          {[
            ["Location", <span key="l">{locName(loc)}</span>],
            [today ? "Shift" : "Next shift", <ABar key="s" w={90} h={12} />],
            ["Role", <span key="r">{role}</span>],
            // The location PIN lives here, where someone needs it to clock in, not on a card in the drawer.
            ["PIN", <ABar key="p" w={56} h={12} />],
          ].map(([label, value], i) => (
            <div key={label as string} className={cn("flex min-h-[52px] items-center justify-between gap-4 px-4 text-[16px] leading-6", i > 0 && "border-m-divider border-t")}>
              <span>{label}</span>
              <span className="text-m-variant">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TimeCardForm() {
  const locName = useLocName()
  const loc = useLocation()
  return (
    <div className="flex flex-col gap-3 pt-2">
      <Field label="Employee" />
      <Field label="Role" />
      <Field label="Date" />
      <p className="text-m-variant px-1 text-[14px] leading-5">{`at ${locName(loc)}`}</p>
      <Section title="Worked">
        {/* Clocked in and out on one two-sided slider (empty here, like the other fields). */}
        <div className="flex justify-between pb-3">
          <span><span className="text-m-variant block text-[12px] leading-4">Clocked in</span><ABar w={56} h={10} className="mt-2" /></span>
          <span className="flex flex-col items-end"><span className="text-m-variant block text-[12px] leading-4">Clocked out</span><ABar w={56} h={10} className="mt-2" /></span>
        </div>
        <div aria-label="Clocked in and out" role="group" className="relative mx-3 h-6">
          <span className="bg-m-skeleton absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />
          <span className="bg-m-primary absolute top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ left: "25%", right: "30%" }} />
          <span className="bg-m-primary absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ left: "25%" }} />
          <span className="bg-m-primary absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ left: "70%" }} />
        </div>
      </Section>
      <section>
        <ASection trailing={<button aria-label="Add a break" className="text-m-primary -my-1 flex size-10 items-center justify-center rounded-full active:bg-black/10"><IconPlus size={24} stroke={2} /></button>}>Breaks</ASection>
      </section>
      <Section title="Tips">
        <div className="flex gap-3">
          <div className="flex-1"><Field label="Cash tips" /></div>
          <div className="flex-1"><Field label="Credit tips" /></div>
        </div>
      </Section>
    </div>
  )
}

function Field({ label }: { label: string }) {
  return (
    <div className="border-m-outline flex h-14 flex-col justify-center gap-[7px] rounded-[4px] border px-4">
      <span className="text-m-variant text-[12px] leading-4">{label}</span>
      <ABar w="40%" h={10} />
    </div>
  )
}

/** A row in a form card: the label, the current choice and a chevron; tapping opens a small menu of the options. */
function SelectRow({ label, value, options, onPick, first }: { label: string; value: ReactNode; options: { id: string; label: string }[]; onPick: (id: string) => void; first?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn("relative", !first && "border-m-divider border-t")}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-black/5">
        <span className="flex-1 text-[16px] leading-6">{label}</span>
        <span className="text-m-variant flex items-center text-[16px] leading-6">{value}</span>
        <IconChevronDown size={20} stroke={2} className="text-m-variant shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onPointerDown={() => setOpen(false)} />
          <div role="menu" className="bg-m-high text-m-on-surface absolute right-2 top-12 z-[56] w-[230px] overflow-hidden rounded-[12px] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            {options.map((o) => (
              <button key={o.id} role="menuitem" onClick={() => { onPick(o.id); setOpen(false) }} className="flex h-12 w-full items-center px-4 text-left text-[16px] active:bg-black/10">
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const FormCard = ({ children }: { children: ReactNode }) => <div className="bg-m-container overflow-visible rounded-[16px]">{children}</div>

/** Add shift (Shifts tab, Add shift): the same fields as iOS, with empty values where the data would be. */
function AddShiftSheet({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const locName = useLocName()
  const multi = useUserTypeStore((s) => canSwitchLocation(s.type))
  const [locId, setLocId] = useState(loc.id)
  const target = LOCATIONS.find((l) => l.id === locId) ?? loc
  const roles = target.employee.timeClock?.roles ?? Array.from(new Set(target.team.map((m) => m.role)))
  const [who, setWho] = useState("open")
  const [role, setRole] = useState(roles[0])
  const people = [{ id: "open", label: "Open shift" }, ...target.team.map((_, i) => ({ id: String(i), label: `Person ${i + 1}` }))]
  return (
    <AFormSheet title="Add shift" onClose={onClose}>
      <ASection>Basic details</ASection>
      <FormCard>
        {multi ? (
          <SelectRow first label="Location" value={locName(target)} options={LOCATIONS.map((l) => ({ id: l.id, label: locName(l) }))} onPick={(id) => { setLocId(id); setWho("open") }} />
        ) : (
          <div className="flex min-h-14 items-center px-4 text-[16px]"><span className="flex-1">Location</span><span className="text-m-variant">{locName(target)}</span></div>
        )}
        <SelectRow label="Team member" value={people.find((p) => p.id === who)!.label} options={people} onPick={setWho} />
        <SelectRow label="Role" value={role} options={roles.map((r) => ({ id: r, label: r }))} onPick={setRole} />
      </FormCard>

      <ASection>Date & time</ASection>
      <FormCard>
        <div className="flex min-h-14 items-center px-4 text-[16px]"><span className="flex-1">Date</span><ABar w={80} h={12} /></div>
        <div className="border-m-divider flex min-h-14 items-center border-t px-4 text-[16px]"><span className="flex-1">Time</span><ABar w={40} h={12} /></div>
        <div className="border-m-divider border-t px-4 pb-3 pt-6">
          <div className="flex justify-between"><ABar w={52} h={10} /><ABar w={52} h={10} /></div>
          <div aria-label="Start and end time" role="group" className="relative mx-1 mt-3 h-6">
            <span className="bg-m-skeleton absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />
            <span className="bg-m-primary absolute top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ left: "25%", right: "30%" }} />
            <span className="bg-m-primary absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ left: "25%" }} />
            <span className="bg-m-primary absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)]" style={{ left: "70%" }} />
          </div>
        </div>
      </FormCard>

      <div className="mt-3">
        <FormCard>
          <textarea rows={3} aria-label="Shift note" placeholder="Add a shift note..." className="text-m-on-surface placeholder:text-m-outline block w-full resize-none rounded-[16px] bg-transparent p-4 text-[16px] leading-6 outline-none" />
        </FormCard>
      </div>
    </AFormSheet>
  )
}

/** Create event (Shifts tab, Add event): the title up top (and mirrored in the sheet's top row), then the details. */
function AddEventSheet({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const locName = useLocName()
  const multi = useUserTypeStore((s) => canSwitchLocation(s.type))
  const [locId, setLocId] = useState(loc.id)
  const target = LOCATIONS.find((l) => l.id === locId) ?? loc
  const [title, setTitle] = useState("")
  return (
    <AFormSheet title="Create event" ready={title.trim().length > 0} onClose={onClose} titleNode={<span className="truncate text-[20px] leading-7">{title.trim() || "Create event"}</span>}>
      <FormCard>
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Event title" placeholder="Event title" className="text-m-on-surface placeholder:text-m-outline block w-full rounded-[16px] bg-transparent px-4 py-4 text-center text-[24px] font-medium leading-8 outline-none" />
      </FormCard>

      <ASection>Event details</ASection>
      <FormCard>
        {multi ? (
          <SelectRow first label="Location" value={locName(target)} options={LOCATIONS.map((l) => ({ id: l.id, label: locName(l) }))} onPick={setLocId} />
        ) : (
          <div className="flex min-h-14 items-center px-4 text-[16px]"><span className="flex-1">Location</span><span className="text-m-variant">{locName(target)}</span></div>
        )}
        <div className="border-m-divider flex min-h-14 items-center border-t px-4 text-[16px]"><span className="flex-1">Date</span><ABar w={80} h={12} /></div>
        <div className="border-m-divider border-t">
          <textarea rows={4} aria-label="Event details" placeholder="Add details for this event..." className="text-m-on-surface placeholder:text-m-outline block w-full resize-none bg-transparent p-4 text-[16px] leading-6 outline-none" />
        </div>
      </FormCard>
      <p className="text-m-variant px-2 pt-3 text-[14px] leading-5">Events will be added to the schedule for the entire team to view.</p>
    </AFormSheet>
  )
}

function SearchField() {
  return (
    <div className="bg-m-high mr-3 flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full px-4">
      <IconSearch size={22} stroke={1.75} className="text-m-variant shrink-0" />
      <span className="text-m-variant text-[16px]">Search team</span>
    </div>
  )
}

/**
 * The profile cards: shoutouts, stats, badges. One card at a time, switched from a tab row. Not a swipe
 * carousel: inside a drawer, sideways swipes close it and vertical ones scroll it.
 */
function ProfileCarousel({ onOpen }: { onOpen: (p: PageSpec) => void }) {
  const [page, setPage] = useState<"shoutouts" | "stats" | "achievements">("stats")
  const stats = ["On-time rate", "Shifts worked", "Hours/week", "Avg shift rating", "Missed clock-outs", "No-shows"]
  const tabs = [
    ["stats", "Stats"],
    ["achievements", "Badges"],
    ["shoutouts", "Shoutouts"],
  ] as const
  return (
    <div data-anno="drawer-carousel" className="flex flex-col gap-3 pb-1 pt-1">
      <div role="tablist" aria-label="Profile cards" className="bg-m-container flex h-10 rounded-full p-1">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={page === id} onClick={() => setPage(id)} className={cn("flex-1 rounded-full text-[14px] font-medium transition-colors", page === id ? "bg-m-secondary-container text-m-on-secondary-container" : "text-m-variant")}>
            {label}
          </button>
        ))}
      </div>
      {page === "shoutouts" && (
        <ACard title="Shoutouts" h={168} onClick={() => onOpen({ id: "shoutouts", kind: "shoutouts", title: "Shoutouts" })}>
          <ALines lines={3} className="pt-3" />
          <ABar w={80} h={10} className="mt-2 self-end" />
        </ACard>
      )}
      {page === "achievements" && (
        <ACard title="Achievements" h={168} onClick={() => onOpen({ id: "achievements", kind: "achievements", title: "Achievements" })}>
          <div className="flex flex-1 items-center justify-between pt-2">
            {[0, 1, 2, 3, 4].map((i) => <AchievementBadge key={i} value="" empty size={48} />)}
          </div>
          <div className="text-m-primary flex items-center justify-between pt-2 text-[14px] font-medium">
            <ABar w={110} h={10} />
            <IconChevronRight size={20} stroke={2} />
          </div>
        </ACard>
      )}
      {page === "stats" && (
        <ACard title="Stats" h={168} onClick={() => onOpen({ id: "stats", kind: "stats", title: "Stats" })}>
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 pt-3">
            {stats.map((l) => (
              <div key={l} className="flex flex-col gap-[6px]">
                <ABar w={44} h={14} />
                <span className="text-m-variant text-[13px] leading-4">{l}</span>
              </div>
            ))}
          </div>
        </ACard>
      )}
    </div>
  )
}

function SettingsPage({ onOpen }: { onOpen: (p: PageSpec) => void }) {
  const row = (label: string, icon: ReactNode, kind: PageSpec["kind"] = "generic", trailing?: string) => (
    <ARow key={label} icon={icon} label={label} trailing={trailing} onClick={() => onOpen({ id: `${kind}:${label}`, kind, title: label })} />
  )
  return (
    <div className="flex flex-col gap-1">
      {/* The account row: opens Account. */}
      <button onClick={() => onOpen({ id: "account", kind: "account", title: "Account" })} data-anno="drawer-profile" className="-mx-1 flex items-center gap-4 rounded-[12px] px-1 py-3 text-left active:bg-black/5">
        <Avatar size={56} />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] leading-6">{ANON.name}</span>
          <span className="text-m-variant block truncate text-[14px] leading-5">{ANON.email}</span>
        </span>
        <IconChevronRight size={20} stroke={2} className="text-m-variant shrink-0" />
      </button>
      <ProfileCarousel onOpen={onOpen} />
      <Section title="Account" headerAnno="drawer-account">
        {row("Locations", <IconMapPin size={24} stroke={1.75} />, "locations")}
        {row("Calendar Sync", <IconCalendar size={24} stroke={1.75} />, "generic", "Not Connected")}
        {row("Notifications & Alerts", <IconBell size={24} stroke={1.75} />)}
        {row("Password & Security", <IconLock size={24} stroke={1.75} />)}
        {row("Support", <IconHelp size={24} stroke={1.75} />)}
      </Section>
      {/* The iOS action pills, as simple cards. */}
      <div data-anno="drawer-actions" className="flex gap-2 py-3">
        {[
          ["Insurance", IconHeartbeat],
          ["Refer a friend", IconGift],
          ["Cash out", IconCash],
        ].map(([label, Icon]) => {
          const I = Icon as typeof IconGift
          return (
            <button key={label as string} className="bg-m-container text-m-on-surface flex min-w-0 flex-1 flex-col items-center gap-2 rounded-[16px] px-2 py-3 active:opacity-80">
              <I size={24} stroke={1.75} className="text-m-primary" />
              <span className="text-center text-[13px] font-medium leading-4">{label as string}</span>
            </button>
          )
        })}
      </div>
      {/* Footer: the logo, small, then the version and legal link as quiet subtext (as on iOS). */}
      <div className="flex flex-col items-center gap-3 pb-4 pt-6">
        <img src="/phone/logo-h.png" alt="Homebase" className="h-7 w-auto" />
        <p className="flex items-center gap-2 text-[13px] leading-[18px] text-[color-mix(in_srgb,var(--m-outline)_65%,var(--m-container-low))]">
          <span>Version 5.22 (5271)</span>
          <span aria-hidden>•</span>
          <button className="active:opacity-60">Terms &amp; privacy</button>
        </p>
      </div>
    </div>
  )
}

/** A switch row inside a location card. Defined at the top level so it keeps its identity (and the thumb its animation) across renders. */
function SwitchRow({ title, checked, onChange, disabled }: { title: string; checked: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <div className="border-m-divider flex min-h-14 items-center gap-4 border-t py-2">
      <span className="min-w-0 flex-1 text-[16px] leading-6">{title}</span>
      <ASwitch disabled={disabled} checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

/** Every location the user works at, one card each with its own settings: not tied to the one selected on Home. */
function LocationsPage({ multi, focus }: { multi: boolean; /** Opened from one location's row on Account: scroll to it and flash it. */ focus?: string }) {
  const locName = useLocName()
  const [flash, setFlash] = useState<string | null>(focus ?? null)
  useEffect(() => {
    if (!focus) return
    const t1 = window.setTimeout(() => document.querySelector(`[data-location="${focus}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 420)
    const t2 = window.setTimeout(() => setFlash(null), 1800)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [focus])
  const [on, setOn] = useState<Record<string, { mobile: boolean; geofence: boolean }>>({})
  // The switches only respond while their location is being edited.
  const [editing, setEditing] = useState<string | null>(null)
  const get = (id: string) => on[id] ?? { mobile: true, geofence: false }
  const set = (id: string, patch: Partial<{ mobile: boolean; geofence: boolean }>) => setOn((o) => ({ ...o, [id]: { ...get(id), ...patch } }))
  return (
    <div className="flex flex-col gap-1 pt-1">
      {LOCATIONS.filter((_, i) => multi || i === 0).map((l) => {
        const isEditing = editing === l.id
        return (
          <section key={l.id} data-location={l.id}>
            <ASection action={isEditing ? "Done" : "Edit"} onAction={() => setEditing(isEditing ? null : l.id)}>{locName(l)}</ASection>
            <ACard h={0} className={cn("transition-shadow duration-500", flash === l.id && "ring-2 ring-[var(--m-primary)]")}>
              <div className="flex min-h-12 items-center justify-between gap-4 pb-2 text-[16px] leading-6">
                PIN
                <ABar w={48} h={10} />
              </div>
              <SwitchRow title="Mobile app clock-in" disabled={!isEditing} checked={get(l.id).mobile} onChange={(v) => set(l.id, { mobile: v })} />
              <SwitchRow title="Geofence" disabled={!isEditing} checked={get(l.id).geofence} onChange={(v) => set(l.id, { geofence: v })} />
            </ACard>
          </section>
        )
      })}
      {/* A past location: greyed out, no PIN, nothing to set. */}
      {multi && (
        <section>
          <ASection>{`Location ${LOCATIONS.length + 1}`}</ASection>
          <ACard h={0}>
            <span className="text-m-outline text-[16px] leading-6">You no longer work here</span>
          </ACard>
        </section>
      )}
    </div>
  )
}

function PageBody({ spec, multi, onOpen, onClose }: { spec: PageSpec; multi: boolean; onOpen: (p: PageSpec) => void; onClose: () => void }) {
  const locName = useLocName()
  const loc = useLocation()
  const tablet = useViewStore((v) => v.device === "tablet")
  switch (spec.kind) {
    case "clock": return <ClockPage loc={loc} onClose={onClose} />
    case "locations": return <LocationsPage multi={multi} focus={spec.arg} />
    case "shoutouts": return <div className="flex flex-col gap-3 pt-2">{[0, 1, 2].map((i) => <ACard key={i} h={112}><ALines lines={3} className="pt-1" /></ACard>)}</div>
    case "achievements": return (
      <div className="flex flex-col gap-4 pt-2">
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 8 }, (_, i) => <AchievementBadge key={i} value="" empty size={72} className="mx-auto" />)}</div>
        <AList rows={4} />
      </div>
    )
    case "stats": return (
      <div className="flex flex-col gap-1 pt-2">
        <div className="flex gap-3">
          <ACard title="On-time rate" h={96} className="flex-1" />
          <ACard title="Rating" h={96} className="flex-1" />
        </div>
        <Section title="Attendance"><AList rows={3} avatar={false} trailing /></Section>
        <Section title="Work"><AList rows={2} avatar={false} trailing /></Section>
        <Section title="Feedback"><AList rows={1} avatar={false} trailing /></Section>
      </div>
    )
    case "timecard": return <TimeCardForm />
    case "log": return <div className="pt-2"><AList rows={5} avatar={false} /></div>
    // Earnings is one card on the Money tab, so it opens that tab's content as a page.
    case "earnings": return <MoneyTab />
    case "shiftmates":
    case "team": return <div className="pt-2"><AList rows={8} trailing={spec.kind === "shiftmates"} /></div>
    case "timeoff": return (
      <div className="flex flex-col gap-3 pt-2">
        <ACard title="Balance" h={110} />
        <Section title="Upcoming"><AList rows={2} avatar={false} trailing /></Section>
      </div>
    )
    case "account": return (
      <div className="flex flex-col gap-1 pt-1">
        <Section title="Availability">
          {tablet ? (
            // A tablet has the width to lay the week out across: each day's heading with its availability underneath.
            <div className="grid grid-cols-7">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <div key={d} className={cn("flex min-w-0 flex-col items-center gap-2 px-1 py-4", i > 0 && "border-m-divider border-l")}>
                  <span className="text-[14px] font-medium leading-5">{d}</span>
                  <ABar w={40} h={12} />
                </div>
              ))}
            </div>
          ) : (
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => (
              <div key={d} className={cn("flex h-14 items-center justify-between px-1", i > 0 && "border-m-divider border-t")}>
                <span className="text-[16px]">{d}</span>
                <ABar w={72} h={12} />
              </div>
            ))
          )}
        </Section>
        <Section title="Your information">
          {["Personal Information", "Shared Name", "Tax Information", "Bank Information"].map((l, i) => (
            <button key={l} onClick={() => onOpen({ id: l.toLowerCase().replace(/\W+/g, "-"), kind: "generic", title: l })} className={cn("flex h-14 w-full items-center justify-between px-1 text-left text-[16px] active:bg-black/5", i > 0 && "border-m-divider border-t")}>
              {l}
              <IconChevronRight size={20} stroke={2} className="text-m-variant" />
            </button>
          ))}
        </Section>
        {/* View only: each place you work, your role there, what you're paid and your PIN. */}
        <Section title="Where you work">
          {LOCATIONS.filter((_, i) => multi || i === 0).map((l, i) => (
            <div key={l.id} className={cn("flex min-h-[76px] items-center justify-between gap-3 px-1 py-4", i > 0 && "border-m-divider border-t")}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[16px] leading-6">{locName(l)}</span>
                <span className="text-m-variant truncate text-[14px] leading-5">{l.employee.timeClock.role}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-[6px]">
                <ABar w={64} h={12} />
                <ABar w={44} h={10} />
              </span>
            </div>
          ))}
        </Section>
        <Section title="Resume">
          {["Experience", "Education", "Certifications"].map((l, i) => (
            <button key={l} onClick={() => onOpen({ id: l.toLowerCase(), kind: "generic", title: l })} className={cn("flex h-14 w-full items-center justify-between px-1 text-left text-[16px] active:bg-black/5", i > 0 && "border-m-divider border-t")}>
              {l}
              <IconChevronRight size={20} stroke={2} className="text-m-variant" />
            </button>
          ))}
          <button className="border-m-divider text-m-primary flex h-14 w-full items-center border-t px-1 text-left text-[16px] active:bg-black/5">Export to PDF...</button>
        </Section>
        <button className="mt-2 h-14 w-full px-1 text-left text-[16px] text-[var(--m-error)] active:bg-black/5">Sign out</button>
      </div>
    )
    case "settings": return <SettingsPage onOpen={onOpen} />
    case "assistant": return (
      <div className="flex flex-col gap-4 pt-2">
        <ALines lines={3} />
        <div className="flex flex-wrap gap-2">{[120, 150, 100].map((w, i) => <span key={i} className="border-m-outline flex h-8 items-center rounded-[8px] border px-3"><ABar w={w - 24} h={8} /></span>)}</div>
      </div>
    )
    default: return <div className="pt-2"><ALines lines={3} /><AList rows={4} avatar={false} trailing /></div>
  }
}

/**
 * A chat, as a full page that rises from the bottom: the menu button at the top left (it opens the same menu), a down
 * chevron at the top right, and the composer at the foot. A new chat shows the greeting and suggestions just above the
 * composer; a past one shows its thread.
 */
/** The pages the More menu opens as main pages. Placeholders for now: skeletons under the page's own title. */
const EXTRA_PAGES = {
  // `scoped`: the page is about a location, so its title carries the location switcher.
  tips: { label: "Tip Manager", Icon: IconPigMoney, scoped: true },
  team: { label: "Team", Icon: IconUsers, scoped: true },
  hiring: { label: "Hiring", Icon: IconUserPlus, scoped: false },
  tasks: { label: "Task Manager", Icon: IconChecklist, scoped: true },
  payroll: { label: "Payroll", Icon: IconReportMoney, scoped: true },
  log: { label: "Manager Log", Icon: IconNotebook, scoped: true },
} as const
type ExtraId = keyof typeof EXTRA_PAGES

function ExtraPage({ id }: { id: ExtraId }) {
  // Team keeps what it had in Settings: a searchable list of people.
  if (id === "team") {
    return (
      <>
        <SearchField />
        <AList rows={8} />
      </>
    )
  }
  return (
    <>
      <ACard className="flex flex-col gap-4 p-4">
        <ABar w="38%" h={14} />
        <ABar w="64%" h={30} />
      </ACard>
      <AList rows={4} />
    </>
  )
}

/** The menu under the app: the tabs, then the assistant's past conversations, with a search and New chat; the avatar opens Settings. */
function AndroidMenu({ tabs, onTab, pending, onBell, onOpenChat, onNewChat, onProfile }: { tabs: TabId[]; onTab: (t: TabId) => void; /** Requests waiting: the badge on the bell. */ pending: number; onBell: () => void; onOpenChat: () => void; onNewChat: () => void; onProfile: () => void }) {
  const label = "text-m-outline px-4 pb-1 pt-7 text-[14px] font-medium leading-5"
  const row = (i: number) => (
    <button key={i} onClick={onOpenChat} className="flex min-h-10 w-full items-center px-4 text-left active:bg-black/5">
      <ABar w={`${[78, 62, 70, 54, 66, 58, 74][i % 7]}%`} h={12} />
    </button>
  )
  return (
    <div className="absolute inset-0 flex flex-col" style={{ paddingTop: "calc(var(--safe-top) + 4px)" }}>
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 pl-4 pr-2">
        <HomebaseLogo aria-hidden className="text-m-on-surface h-[18px] w-auto" />
        {/* The notifications (requests) button, moved here from the top right of every page. */}
        <AIconButton label={pending ? `Requests, ${pending} waiting` : "Requests"} onClick={onBell}>
          <span className="relative">
            <IconBell size={24} stroke={1.75} />
            {pending > 0 && <span className="bg-[var(--m-error)] absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none text-white">{pending}</span>}
          </span>
        </AIconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          <nav aria-label="Tabs">
            <h3 className={cn(label, "pt-6")}>Tabs</h3>
            <div className="flex flex-col px-2">
              {tabs.map((id) => {
                const { label: text, icon } = TABS[id]
                return (
                  <button key={id} onClick={() => onTab(id)} className="text-m-on-surface flex h-10 w-full items-center gap-3 rounded-full px-3 text-left active:bg-black/10">
                    <span aria-hidden className="block bg-current" style={maskStyle(icon, 22)} />
                    <span className="text-[16px] font-medium leading-6">{text}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}
        <h3 className={label}>Pinned</h3>
        {[0, 1, 2].map(row)}
        <h3 className={label}>Recents</h3>
        {[3, 4, 5, 6].map(row)}
      </div>
      <div className="absolute inset-x-0 flex items-center justify-between px-5" style={{ bottom: 20 }}>
        <button onClick={onProfile} aria-label="Settings" aria-haspopup="dialog" data-anno="profile" className="flex size-11 items-center justify-center rounded-full active:opacity-80">
          <Avatar size={40} />
        </button>
        <button onClick={onNewChat} className="flex h-12 items-center gap-2 rounded-[16px] bg-[#8f55e5] px-4 text-[15px] font-medium tracking-[0.1px] text-white shadow-[0_6px_16px_rgba(143,85,229,0.35),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85">
          <span aria-hidden className="block bg-white" style={maskStyle("/android/assistant-solid-24.svg", 20)} />
          New chat
        </button>
      </div>
    </div>
  )
}

function AndroidChat({ past, history = true, onDismiss }: { past: boolean; /** Show the Conversations button (off beside a rail, which lists them). */ history?: boolean; onDismiss: () => void }) {
  const [list, setList] = useState(false)
  const bubble = "block rounded-[20px]"
  return (
    <div className="absolute inset-0 z-[45]">
    <motion.button
      type="button"
      aria-label="Dismiss"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onDismiss}
      className="absolute inset-0 bg-black/32"
    />
    {/* A full-height bottom sheet: rises to just under the status bar, so the app shows above it. */}
    <motion.div
      role="dialog"
      aria-label="Assistant"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="bg-m-surface absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px]"
      style={{ top: "calc(var(--safe-top) + 12px)" }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-2">
        <AIconButton label="Close" onClick={onDismiss}>
          <IconChevronDown size={24} stroke={1.75} />
        </AIconButton>
        {history ? (
          <AIconButton label="Conversations" onClick={() => setList(true)}>
            <IconMessages size={24} stroke={1.75} />
          </AIconButton>
        ) : (
          <span aria-hidden className="size-12" />
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-y-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {past ? (
          <>
            <span aria-hidden className={cn(bubble, "bg-m-primary-container h-10 w-[42%] self-end")} />
            <span aria-hidden className={cn(bubble, "bg-m-skeleton h-16 w-[62%] self-start")} />
            <span aria-hidden className={cn(bubble, "bg-m-primary-container h-10 w-[34%] self-end")} />
            <span aria-hidden className={cn(bubble, "bg-m-skeleton h-24 w-[70%] self-start")} />
          </>
        ) : (
          <>
            <div aria-hidden className="flex flex-col items-center gap-2 pb-2">
              <ABar w="85%" h={16} />
              <ABar w="55%" h={16} />
            </div>
            <div className="flex flex-col gap-[6px]">
              {[70, 90, 64].map((w, i) => (
                <span key={i} className="bg-m-container flex items-center gap-2 rounded-[12px] px-3 py-2.5">
                  <span aria-hidden className="block shrink-0 bg-[#8f55e5]" style={maskStyle("/android/assistant-solid-24.svg", 18)} />
                  <ABar w={`${w}%`} h={10} />
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="shrink-0 px-4 pb-8 pt-2">
        <Composer />
      </div>
      {/* Conversations: a second sheet that rises over this one. */}
      <AnimatePresence>
        {list && (
          <>
            <motion.button
              type="button"
              aria-label="Close conversations"
              tabIndex={-1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setList(false)}
              className="absolute inset-0 bg-black/32"
            />
            <motion.div
              role="dialog"
              aria-label="Conversations"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="bg-m-container absolute inset-x-0 bottom-0 top-3 flex flex-col overflow-hidden rounded-t-[28px]"
            >
              <div className="flex h-16 shrink-0 items-center px-2">
                <AIconButton label="Close" onClick={() => setList(false)}>
                  <IconChevronDown size={24} stroke={1.75} />
                </AIconButton>
                <h2 className="text-m-on-surface ml-2 text-[20px] font-medium leading-7">Conversations</h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {["Pinned", "Recents"].map((label, g) => (
                  <section key={label}>
                    <h3 className="text-m-outline px-3 pb-1 pt-4 text-[12px] font-medium leading-4">{label}</h3>
                    {[0, 1, 2].map((i) => (
                      <button key={i} onClick={() => setList(false)} className="flex h-12 w-full items-center rounded-full px-4 text-left active:bg-black/10">
                        <ABar w={`${[78, 62, 70, 54, 66, 58][i + g * 3]}%`} h={10} />
                      </button>
                    ))}
                  </section>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  )
}

function Composer() {
  return (
    <div className="bg-m-high flex h-14 items-center gap-3 rounded-full pl-5 pr-2">
      <span className="text-m-variant flex-1 text-[16px]">Ask anything</span>
      <span className="bg-m-primary text-m-on-primary flex size-10 items-center justify-center rounded-full"><IconSend size={20} stroke={1.75} /></span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function AndroidApp() {
  const userType = useUserTypeStore((s) => s.type)
  const employee = userType === "employee"
  const multi = canSwitchLocation(userType)
  const tabs: TabId[] = employee ? ["home", "money", "shifts", "chat"] : ["home", "shifts", "time", "chat"]
  const loc = useLocation()
  const setLocation = useLocationStore((s) => s.setLocation)
  const setAll = useLocationStore((s) => s.setAll)
  const [groupOpen, setGroupOpen] = useState(false)
  // The assistant's chat, open over the app as a bottom sheet (not for employees).
  // The menu under the app (the tabs and the assistant's past conversations): phones, not employees.
  const [menuDrawer, setMenuDrawer] = useState(false)
  const [chat, setChat] = useState<{ past: boolean; n: number } | null>(null)
  const [tab, setTab] = useState<TabId>("home")
  // A page opened from the More menu: a main page of its own (the bar stays, and More takes that page's icon).
  const [extra, setExtra] = useState<ExtraId | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  // The rail's Locations row, while its menu is open (the menu hangs from it).
  const [railLocEl, setRailLocEl] = useState<HTMLElement | null>(null)
  const [account, setAccount] = useState(COMPANIES[0].name)
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  // Tablets (600dp and wider in either orientation) swap the bottom bar for a side rail. A phone on its side keeps its
  // portrait layout, turned in the frame (see AndroidFrame).
  const device = useViewStore((v) => v.device)
  const rail = device === "tablet"
  const landscape = useViewStore((v) => v.orientation === "landscape")
  // Tablet on its side has room for two columns on Home, Shifts and Time (Messages splits in both orientations).
  const split = rail && landscape
  const [railOpen, setRailOpen] = useState(false)
  const railW = rail ? (railOpen ? RAIL_OPEN_W : RAIL_W) : 0
  // Shifts' plus offers two things, like the iOS menu: add a shift or an event.
  const [fabMenu, setFabMenu] = useState(false)
  const [sheet, setSheet] = useState<null | "requests" | "shift" | "event">(null)
  // The Time page's filters: which sheet is open, and what each has chosen.
  const [filterSheet, setFilterSheet] = useState<FilterKind | null>(null)
  const [timeFilters, setTimeFilters] = useState<TimeFilters>({ team: [], issues: [], roles: [] })
  const [stack, setStack] = useState<PageSpec[]>([])
  // Home is a fixed overview of every location the person has. One location's own view opens from a caption on it
  // (or, on a tablet, from the rail), in the same place, and back returns to the overview.
  const [locOpen, setLocOpen] = useState<{ loc: Location; from: Box; clone: ReactNode } | null>(null)
  const homeScope = multi ? LOCATIONS : [loc]
  const openLocation = (l: Location, row?: HTMLElement, clone?: ReactNode) => {
    setLocation(l.id)
    setStack([])
    setExtra(null)
    setTab("home")
    const from = row ? boxOf(row) : null
    // The view fills the content pane, so measure from the pane's edge (the rail's), not the screen's.
    if (from) setLocOpen({ loc: l, from: { ...from, left: from.left - railW }, clone: clone ?? <AndroidMenuRowBody l={l} /> })
  }
  const goTab = (t: TabId) => { setStack([]); setLocOpen(null); setExtra(null); setTab(t) }
  const open = (p: PageSpec) => setStack((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]))
  const pop = () => setStack((s) => s.slice(0, -1))

  useEffect(() => { setTab("home"); setExtra(null); setStack([]); setLocOpen(null) }, [userType])
  useEffect(() => { if (!multi) setLocation(LOCATIONS[0].id) }, [multi, setLocation])
  useEffect(() => { setScrolled(false); setFabMenu(false) }, [tab, extra])
  // Phone-first prototype: the page itself never scrolls, only the screen does.
  useEffect(() => {
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => { document.documentElement.style.overflow = prev }
  }, [])

  const decided = useRequestsStore((s) => s.decided)
  const added = useRequestsStore((s) => s.added)
  const scope = useScope()
  const pending = scope.reduce((n, l) => n + pendingFor(l, decided, added).length, 0)
  const clock = useClock(loc)
  const timeClock = useTimeClockStore()

  // The tab's add action. Phones put it in the top bar with the other actions (a FAB would fight the assistant
  // button); tablets keep a FAB, since the assistant lives in the rail there.
  const plus =
    tab === "shifts" ? { label: "Add", onClick: () => setFabMenu((o) => !o) }
    : tab === "time" ? { label: "Add time entry", onClick: () => open({ id: "timecard", kind: "timecard", title: "Add time card" }) }
    : tab === "chat" ? { label: "New message", onClick: () => {} }
    : null
  // Tablet Messages is a split view with its own composer where the FAB would sit, so its new-message action goes in the top bar instead.
  const fab = !rail || tab === "chat" ? null
    : tab === "shifts" ? <AFab label="Add" icon={<IconPlus size={24} stroke={1.75} />} onClick={() => setFabMenu((o) => !o)} />
    : tab === "time" ? <AFab label="Add time entry" icon={<IconPlus size={24} stroke={1.75} />} onClick={() => open({ id: "timecard", kind: "timecard", title: "Add time card" })} />
    : null
  const addMenu = (cls: string, origin: string) => (
    <AnimatePresence>
      {fabMenu && tab === "shifts" && (
        <>
          <div className="fixed inset-0 -z-10" onPointerDown={() => setFabMenu(false)} />
          <motion.div role="menu" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.15 }} style={{ transformOrigin: origin }} className={cn("bg-m-high text-m-on-surface absolute w-[200px] overflow-hidden rounded-[12px] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]", cls)}>
            {[["Add shift", IconCalendarPlus, () => setSheet("shift")], ["Add event", IconCalendarEvent, () => setSheet("event")]].map(([label, Icon, run]) => {
              const I = Icon as typeof IconCalendarPlus
              return (
                <button key={label as string} role="menuitem" onClick={() => { setFabMenu(false); (run as () => void)() }} className="flex h-12 w-full items-center gap-3 px-4 text-left text-[16px] active:bg-black/10">
                  <I size={22} stroke={1.5} className="text-m-variant" />
                  {label as string}
                </button>
              )
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // Beside a rail the assistant starts a new chat; the rail lists the past ones.
  const newChat = () => setChat((c) => ({ past: false, n: (c?.n ?? 0) + 1 }))
  const assistant = employee ? undefined : newChat
  const unread = scope.reduce((n, l) => n + l.messages.filter((m) => m.unread).length, 0)

  // The More menu's items, in the person's own order (Customize, from the top row of the menu).
  const moreOrder = useMoreMenuStore((s) => s.order)
  const moreItems: MoreItem[] = inMenuOrder(
    [
      // The primary tabs first (Time, for owners and managers, is only here), then the rest of the app.
      ...(["home", "money", "shifts", "time", "chat"] as const).filter((t) => tabs.includes(t)).map((t) => {
        const here = !extra && tab === t
        return { id: `tab:${t}`, label: TABS[t].label, icon: <span aria-hidden className="block bg-current" style={maskStyle(TABS[t].icon, 24)} />, activeIcon: <span aria-hidden className="block bg-current" style={maskStyle(TABS[t].icon, 24)} />, current: here, active: t === "time" && here, badge: t === "chat" ? unread : 0 }
      }),
      ...(employee
        ? []
        : (Object.entries(EXTRA_PAGES) as [ExtraId, (typeof EXTRA_PAGES)[ExtraId]][]).map(([id, { label, Icon }]) => ({
            id,
            label,
            icon: <Icon size={24} stroke={1.75} />,
            activeIcon: <Icon size={24} stroke={2} />,
            current: extra === id,
            active: extra === id,
          }))),
      { id: "settings", label: "Settings", icon: <IconSettings size={24} stroke={1.75} /> },
    ],
    moreOrder,
  )
  const onMoreSelect = (id: string) => {
    if (id.startsWith("tab:")) goTab(id.slice(4) as TabId)
    else if (id in EXTRA_PAGES) { setStack([]); setLocOpen(null); setExtra(id as ExtraId) }
    else if (id === "settings") open(SETTINGS)
  }
  const locTitle = useLocTitle(loc)

  // Pages open over the whole screen, so on a phone they sit outside the app surface that slides aside; beside a rail they stay in the pane.
  const pagesLayer = (
      <AnimatePresence>
        {stack.map((p, i) => (
          <APage
            key={p.id}
            title={p.title}
            z={40 + i}
            onBack={pop}
            close={p.kind === "settings" || p.kind === "clock"}
            rise={p.kind === "settings" && !rail}
            bar={p.kind === "team" ? <SearchField /> : undefined}
            footer={
              p.kind === "assistant" ? <Composer />
              : p.kind === "clock" && clock.status === "out" ? (
                <button onClick={() => timeClock.clockIn(loc.id, clock.role ?? loc.employee.timeClock.role)} disabled={!scheduledToday(loc)} className="bg-m-primary text-m-on-primary h-12 w-full rounded-full text-[16px] font-medium tracking-[0.1px] active:opacity-85 disabled:bg-[rgba(120,120,128,0.2)] disabled:text-[#8e8e93]">
                  {scheduledToday(loc) ? "Confirm Clock in" : "No shift to clock in to"}
                </button>
              )
              : undefined
            }
            action={p.kind === "timecard" ? <button onClick={pop} className="text-m-primary h-10 rounded-full px-3 text-[14px] font-medium tracking-[0.1px] active:bg-black/10">Save</button> : undefined}
          >
            <ScopeContext.Provider value={homeScope}><PageBody spec={p} multi={multi} onOpen={open} onClose={pop} /></ScopeContext.Provider>
          </APage>
        ))}
      </AnimatePresence>
  )

  return (
    <AndroidFrame header={<UserTypeToggle />} footer={<PrototypeFooter />}>
      <DrawerSurface
        enabled={!rail && !employee}
        open={menuDrawer}
        onOpenChange={setMenuDrawer}
        surfaceClass="bg-m-surface"
        drawerClass="bg-m-container"
        radiusMax={SCREENS.android.phone.radius}
        drawer={(close) => (
          <AndroidMenu
            tabs={tabs}
            pending={pending}
            // Requests rise over the menu; closing the sheet just dismisses it.
            onBell={() => setSheet("requests")}
            onTab={(t) => { close(); setChat(null); goTab(t) }}
            onOpenChat={() => { close(); setChat((c) => ({ past: true, n: (c?.n ?? 0) + 1 })) }}
            onNewChat={() => { close(); setChat((c) => ({ past: false, n: (c?.n ?? 0) + 1 })) }}
            // Settings rises over the menu; closing it just dismisses it.
            onProfile={() => open(SETTINGS)}
          />
        )}
      >
      {rail && <NavRail tabs={tabs} tab={extra ? null : tab} onTab={goTab} unread={unread} open={railOpen} onToggle={() => setRailOpen((o) => !o)} onProfile={() => open(SETTINGS)} onAssistant={assistant} locations={{ title: locTitle, open: !!railLocEl, onOpen: setRailLocEl }} more={{ items: moreItems.filter((m) => !m.id.startsWith("tab:") && m.id !== "settings"), onSelect: onMoreSelect }} />}
      {/* Everything but the overlays lives in this pane, which slides right as the rail expands. */}
      <motion.div initial={false} animate={{ left: railW }} transition={RAIL_EASE} className="absolute inset-y-0 right-0">
      {!extra && tab === "chat" && rail && <MessagesSplit key={loc.id} />}
      {!extra && split && tab !== "chat" && tab !== "money" && (
        <motion.div key={`${tab}:${tab === "home" && multi ? "overview" : loc.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="absolute inset-0">
          {tab === "home" && <ScopeContext.Provider value={homeScope}><OpenLocationContext.Provider value={multi ? openLocation : null}>{employee ? <HomeEmployee split onOpen={open} /> : <HomeManager split onOpen={open} />}</OpenLocationContext.Provider></ScopeContext.Provider>}
          {tab === "shifts" && <ShiftsTab split />}
          {tab === "time" && <TimeTab split filters={timeFilters} onFilter={setFilterSheet} />}
        </motion.div>
      )}
      {extra && <motion.div key={`extra:${extra}:${loc.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)} className="absolute inset-0 flex flex-col gap-4 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ paddingTop: "calc(var(--safe-top) + 72px)", paddingBottom: 200 }}><ExtraPage id={extra} /></motion.div>}
      {!extra && !(tab === "chat" && rail) && !(split && tab !== "money") && <motion.div
        key={`${tab}:${tab === "home" && multi ? "overview" : loc.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}
        className="absolute inset-0 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: "calc(var(--safe-top) + 72px)", paddingBottom: rail ? 120 : 200 }}
      >
        {tab === "home" && <ScopeContext.Provider value={homeScope}><OpenLocationContext.Provider value={multi ? openLocation : null}>{employee ? <HomeEmployee onOpen={open} /> : <HomeManager onOpen={open} />}</OpenLocationContext.Provider></ScopeContext.Provider>}
        {tab === "shifts" && <ShiftsTab />}
        {tab === "time" && <TimeTab filters={timeFilters} onFilter={setFilterSheet} />}
        {tab === "money" && <MoneyTab />}
        {tab === "chat" && <MessagesTab />}
      </motion.div>}

      <TopBar
        loc={loc}
        tab={tab}
        // The overview has no title: it is the page you land on, and a title would only name the scope.
        title={extra ? EXTRA_PAGES[extra].label : tab === "home" ? "Home" : undefined}
        subtitle={extra && EXTRA_PAGES[extra].scoped ? locTitle : undefined}
        // Settings is in the More menu for owners and managers on a phone, so no avatar up here.
        hideProfile={!employee}
        onMenu={!rail && !employee ? () => setMenuDrawer(true) : undefined}
        menuOpen={menuDrawer}
        // Home is a fixed overview, so only the other tabs have a switcher.
        canSwitch={extra ? EXTRA_PAGES[extra].scoped : tab !== "home"}
        scrolled={scrolled}
        pending={pending}
        // The time clock button, top right: on every page of a tablet; on a phone, for owners and managers on Home (employees have the clock bar).
        showClock={rail || (!employee && tab === "home" && !extra)}
        clockActive={clock.status === "in"}
        rail={rail}
        plus={extra || (rail && tab !== "chat") ? undefined : (plus ?? undefined)}
        onTitle={() => setMenu((m) => !m)}
        onBell={() => setSheet("requests")}
        onClock={() => open(CLOCK)}
        onProfile={() => open(SETTINGS)}
      />
      {!rail && <NavBar tabs={tabs.filter((t) => t !== "time")} tab={extra ? null : tab} onTab={goTab} unread={unread} onAssistant={assistant} more={employee ? undefined : { items: moreItems, header: { account, accounts: COMPANIES.map((c) => c.name), onAccount: setAccount, onCustomize: () => setCustomizeOpen(true) }, onSelect: onMoreSelect }} clock={employee ? { active: clock.status === "in", onOpen: () => open(CLOCK) } : undefined} faded={menuDrawer} />}
      {fab && (
        <div data-anno="fab" className="absolute right-4 z-20" style={{ bottom: 24 }}>
          {fab}
          {addMenu("bottom-16 right-0", "bottom right")}
        </div>
      )}
      {!rail && <div className="absolute inset-x-0 top-0 z-30">{addMenu("right-3 top-[calc(var(--safe-top)+56px)]", "top right")}</div>}
      {rail && (
        <LocationMenu
          open={!!railLocEl}
          anchorEl={railLocEl}
          onClose={() => setRailLocEl(null)}
          onAll={multi ? () => { setAll(true); setLocOpen(null); setStack([]); setExtra(null); setTab("home") } : undefined}
          onNewGroup={multi ? () => setGroupOpen(true) : undefined}
          onAddLocation={multi ? undefined : () => {}}
          // On Home, picking a location opens its overview in the main area; on other pages it just changes the location.
          onPickLocation={tab === "home" || extra ? (l) => openLocation(l, railLocEl ?? undefined, <span />) : undefined}
        />
      )}
      <LocationMenu open={menu} onClose={() => setMenu(false)} onAll={multi ? () => setAll(true) : undefined} onNewGroup={multi ? () => setGroupOpen(true) : undefined} onAddLocation={multi ? undefined : () => {}} />
      {locOpen && <AndroidLocationView key={locOpen.loc.id} loc={locOpen.loc} from={locOpen.from} clone={locOpen.clone} employee={employee} onClosed={() => setLocOpen(null)} />}


      {rail && <AnimatePresence>{chat && <AndroidChat key={chat.n} past={chat.past} history={false} onDismiss={() => setChat(null)} />}</AnimatePresence>}
      {rail && pagesLayer}
      </motion.div>



      {!rail && <AnimatePresence>{chat && <AndroidChat key={chat.n} past={chat.past} onDismiss={() => setChat(null)} />}</AnimatePresence>}
      </DrawerSurface>
      <AnimatePresence>
        {filterSheet && <TimeFilterSheet key={filterSheet} kind={filterSheet} loc={loc} side={rail} value={timeFilters[filterSheet]} onApply={(v) => { setTimeFilters((f) => ({ ...f, [filterSheet]: v })); setFilterSheet(null) }} onClose={() => setFilterSheet(null)} />}
        {sheet === "requests" && <RequestsSheet key="requests" loc={loc} multi={multi} side={rail} onClose={() => setSheet(null)} />}
        {sheet === "shift" && <AddShiftSheet key="shift" loc={loc} onClose={() => setSheet(null)} />}
        {sheet === "event" && <AddEventSheet key="event" loc={loc} onClose={() => setSheet(null)} />}
        {groupOpen && <AGroupSheet key="group" onClose={() => setGroupOpen(false)} />}
      </AnimatePresence>
      {!rail && <AnimatePresence>{customizeOpen && <CustomizeSheet key="customize" items={moreItems} onClose={() => setCustomizeOpen(false)} />}</AnimatePresence>}
      {!rail && pagesLayer}
    </AndroidFrame>
  )
}

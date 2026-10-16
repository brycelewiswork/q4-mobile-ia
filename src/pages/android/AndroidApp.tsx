import { useContext, useEffect, useState, type ReactNode } from "react"
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
  IconArrowLeft,
  IconChevronRight,
  IconClock,
  IconGift,
  IconHeartbeat,
  IconHelp,
  IconLock,
  IconMapPin,
  IconMenu2,
  IconMenuDeep,
  IconPlus,
  IconSearch,
  IconSend,
  IconUsers,
} from "@tabler/icons-react"
import { AchievementBadge } from "@/components/AchievementBadge"
import { LinearBlur } from "@/components/ui/progressive-blur"
import { UserTypeToggle } from "@/components/ios/UserTypeToggle"
import { PrototypeFooter } from "@/components/ios/PrototypeFooter"
import { AndroidFrame } from "@/pages/android/AndroidFrame"
import { ABar, ACard, ASideSheet, AChip, AChips, AFab, AIconButton, AList, ALines, APage, ARow, ACheckRow, AFormSheet, ASection, ASheet, ASwitch, WeekStrip } from "@/pages/android/m3"
import { WireBars, shortMoney } from "@/components/WireBars"
import { COMPANIES, LOCATIONS, USER_SCHEDULE, nextShiftAt, shortLocationName, unreadAt, type Location } from "@/data/locations"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { locationsOf, useGroupsStore } from "@/store/useGroupsStore"
import { OpenLocationContext, ScopeContext, useLocation, useLocationStore, useScope } from "@/store/useLocationStore"
import { ANON, useLocName, useLocTitle, useStructure, useViewStore } from "@/store/useViewStore"
import { useDateStore } from "@/store/useDateStore"
import { NOW_MIN, accessoryFor, scheduledToday, shiftRange, useClock, useTimeClockStore } from "@/store/useTimeClockStore"
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

function TopBar({ title: titleOverride, back, loc, tab, canSwitch, scrolled, pending, showClock, clockActive, rail, plus, onTitle, onBell, onClock, onProfile }: { /** Replaces the location title (Home is an overview, so it names its scope instead). */ title?: string; /** Back out of one location's view to the overview (phones; replaces the avatar). */ back?: () => void; rail: boolean; /** The tab's add action, grouped with the other actions up here (phones; tablets use a FAB). */ plus?: { label: string; onClick: () => void }; loc: Location; tab: TabId; canSwitch: boolean; scrolled: boolean; pending: number; showClock: boolean; clockActive: boolean; onTitle: () => void; onBell: () => void; onClock: () => void; onProfile: () => void }) {
  const storeTitle = useLocTitle(loc)
  const title = titleOverride ?? storeTitle
  return (
    // The bar's fill runs up behind the status bar too (an opaque surface, tonal once scrolled), so nothing shows through there.
    <div className={cn("absolute inset-x-0 top-0 z-20 flex items-center gap-1 pl-2 pr-2 transition-colors duration-200", scrolled ? "bg-m-container" : "bg-m-surface")} style={{ height: "calc(var(--safe-top) + 64px)", paddingTop: "var(--safe-top)" }}>
      {/* The avatar opens the navigation drawer (with a rail, the avatar lives in the rail instead). */}
      {!rail && back && (
        <button onClick={back} aria-label="Back to all locations" className="text-m-on-surface flex size-12 shrink-0 items-center justify-center rounded-full active:bg-black/10">
          <IconArrowLeft size={24} stroke={1.75} />
        </button>
      )}
      {!rail && !back && (
        <button onClick={onProfile} aria-label="Open navigation drawer" aria-haspopup="dialog" data-anno="profile" className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-black/10">
          <Avatar size={32} />
        </button>
      )}
      <button onClick={canSwitch ? onTitle : undefined} disabled={!canSwitch} aria-haspopup={canSwitch ? "menu" : undefined} className={cn("text-m-on-surface flex min-w-0 flex-1 items-center gap-1 text-left", rail && "pl-2")}>
        <span className="line-clamp-2 min-w-0 text-[18px] font-medium leading-6">{title}</span>
        {canSwitch && <IconChevronDown size={20} stroke={2} className="text-m-variant shrink-0" />}
      </button>
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
      {tab !== "chat" && (
        <AIconButton label={pending ? `Requests, ${pending} waiting` : "Requests"} onClick={onBell}>
          <span className="relative">
            <IconBell size={24} stroke={1.75} />
            {pending > 0 && <span className="bg-[var(--m-error)] absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none text-white">{pending}</span>}
          </span>
        </AIconButton>
      )}
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
function NavBar({ tabs, tab, onTab, unread, onAssistant }: { tabs: TabId[]; tab: TabId; onTab: (t: TabId) => void; unread: number; onAssistant?: () => void }) {
  return (
    <div data-anno="nav-bar" className="absolute inset-x-0 bottom-0 z-20 isolate">
      <LinearBlur side="bottom" strength={24} className="-z-10" style={{ top: -24 }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10" style={{ top: -24, background: "linear-gradient(to top, color-mix(in srgb, var(--m-surface) 50%, transparent) 15%, transparent)" }} />
      <nav className="flex w-full items-center" style={{ padding: "16px 24px 20px", gap: onAssistant ? 14 : 0, minHeight: 92 }}>
        {tabs.map((id) => {
          const { label, icon } = TABS[id]
          const on = tab === id
          return (
            <button key={id} onClick={() => onTab(id)} aria-current={on ? "page" : undefined} className={cn("relative flex min-w-[48px] flex-col items-center justify-end gap-1", onAssistant ? "flex-none" : "flex-1")} style={{ color: on ? "var(--m-nav-active)" : "var(--m-nav-inactive)" }}>
              <span className="relative">
                <span aria-hidden className="block bg-current" style={maskStyle(icon, 24)} />
                {id === "chat" && unread > 0 && (
                  <span aria-label={`${unread} unread`} className="bg-[var(--m-badge)] absolute -top-[5px] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none tabular-nums text-white" style={{ left: 16 }}>
                    {unread}
                  </span>
                )}
              </span>
              <span className={cn("whitespace-nowrap text-[12px] leading-normal", on ? "font-bold" : "font-medium")}>{label}</span>
            </button>
          )
        })}
        {onAssistant && (
          <button onClick={onAssistant} aria-label="Assistant" aria-haspopup="dialog" className="relative ml-auto flex size-14 items-center justify-center rounded-full bg-[#8f55e5] shadow-[0_6px_16px_rgba(143,85,229,0.4),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85" style={{ top: -5 }}>
            <span aria-hidden className="block bg-white" style={maskStyle("/android/assistant-solid-24.svg", 24)} />
          </button>
        )}
      </nav>
    </div>
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
function NavRail({ tabs, tab, onTab, unread, open, onToggle, onProfile, onAssistant, clock, locations }: { /** Multi-location users: the locations below the tabs; tapping one opens its overview in the main area. */ locations?: { activeId?: string | null; onOpen: (l: Location, row: HTMLElement) => void; /** Every location at once. */ onAll?: () => void; allActive?: boolean }; clock?: { title: string; status: "out" | "in" | "break"; onOpen: () => void }; tabs: TabId[]; tab: TabId; onTab: (t: TabId) => void; unread: number; open: boolean; onToggle: () => void; onProfile: () => void; onAssistant?: () => void }) {
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
        <button onClick={onProfile} aria-label="Open settings" aria-haspopup="dialog" data-anno="profile" className={cn("text-m-on-surface mt-1 flex items-center rounded-full active:bg-black/10", open ? "h-14 w-full gap-3 pl-3 pr-6" : "size-14 justify-center")}>
          <Avatar size={40} />
          {open && <span className="truncate text-[14px] font-medium leading-5">{ANON.name}</span>}
        </button>
        {onAssistant && (
          <button onClick={onAssistant} aria-label="Assistant" aria-haspopup="dialog" className={cn("mt-3 flex h-14 items-center justify-center gap-3 self-center rounded-[16px] bg-[#8f55e5] text-white shadow-[0_6px_16px_rgba(143,85,229,0.35),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85", open ? "w-full px-4" : "w-14")}>
            <span aria-hidden className="block shrink-0 bg-white" style={maskStyle("/android/assistant-solid-24.svg", 24)} />
            {open && <span className="whitespace-nowrap text-[14px] font-medium leading-5">Assistant</span>}
          </button>
        )}
      </div>
      <div className={cn("mt-6 flex flex-col", open ? "gap-1 px-3" : "items-center gap-3")}>
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
      </div>
      {locations && <RailLocations open={open} {...locations} />}
      {clock && <RailClock open={open} {...clock} />}
    </motion.nav>
  )
}

const railMoney = (n: number) => `$${Math.round(n / 1000)}K`

/**
 * The locations under the tabs. Collapsed: a round chip with the location's initials. Expanded:
 * the name over its labor share, with sales at the end, under a small heading for each company.
 */
function RailLocations({ open, activeId, onOpen, onAll, allActive }: { open: boolean; activeId?: string | null; onOpen: (l: Location, row: HTMLElement) => void; onAll?: () => void; allActive?: boolean }) {
  const wire = useStructure()
  const locName = useLocName()
  const employee = useUserTypeStore((s) => s.type) === "employee"
  const chip = (l: Location) => (wire ? `L${LOCATIONS.findIndex((x) => x.id === l.id) + 1}` : shortLocationName(l).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase())
  return (
    <div data-anno="rail-locations" role="group" aria-label="Locations" className={cn("border-m-divider mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto border-t pt-2 [scrollbar-width:none]", open ? "gap-0 px-3" : "items-center")}>
      {onAll && (open ? (
        <button onClick={onAll} aria-current={allActive ? "page" : undefined} className={cn("text-m-on-surface flex h-14 w-full items-center gap-2 rounded-full pl-4 pr-4 text-left active:bg-black/10", allActive && "bg-m-secondary-container")}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] font-medium leading-5">All Locations</span>
            <span className="text-m-variant text-[12px] leading-4">{LOCATIONS.length} locations</span>
          </span>
        </button>
      ) : (
        <button onClick={onAll} aria-current={allActive ? "page" : undefined} aria-label="All locations" className="text-m-on-surface flex flex-col items-center gap-[2px] py-1">
          <span className={cn("flex size-10 items-center justify-center rounded-full text-[13px] font-medium", allActive ? "bg-m-secondary-container" : "bg-m-high")}>All</span>
        </button>
      ))}
      {COMPANIES.map((c, ci) => (
        <div key={c.name} role="group" aria-label={wire ? `Company ${ci + 1}` : c.name} className={cn("flex flex-col", open ? "" : "items-center gap-2 py-1", !open && ci > 0 && "border-m-divider mt-1 border-t pt-2")}>
          {open && <p className="text-m-variant px-3 pb-1 pt-2 text-[12px] font-medium leading-4">{wire ? `Company ${ci + 1}` : c.name}</p>}
          {c.locations.map((l) => {
            const on = activeId === l.id
            return open ? (
              <button key={l.id} onClick={(e) => onOpen(l, e.currentTarget)} aria-current={on ? "page" : undefined} className={cn("text-m-on-surface flex h-14 w-full items-center gap-2 rounded-full pl-4 pr-4 text-left active:bg-black/10", on && "bg-m-secondary-container")}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-medium leading-5">{wire ? locName(l) : shortLocationName(l)}</span>
                  {!wire && <span className="text-m-variant truncate text-[12px] leading-4">{employee ? (nextShiftAt(l.id) ? `Next ${nextShiftAt(l.id)}` : "No shifts this week") : `${l.laborPct}% labor`}</span>}
                </span>
                {!wire && (employee ? <AUnread n={unreadAt(l)} /> : <span className="shrink-0 text-[14px] font-medium leading-5">{railMoney(l.sales)}</span>)}
              </button>
            ) : (
              <button key={l.id} onClick={(e) => onOpen(l, e.currentTarget)} aria-current={on ? "page" : undefined} aria-label={wire ? locName(l) : `${shortLocationName(l)}, ${railMoney(l.sales)}`} className="text-m-on-surface flex flex-col items-center gap-[2px]">
                <span className={cn("relative flex size-10 items-center justify-center rounded-full text-[13px] font-medium", on ? "bg-m-secondary-container" : "bg-m-high")}>
                  {chip(l)}
                  {employee && !wire && unreadAt(l) > 0 && <span aria-hidden className="bg-[var(--m-badge)] absolute right-0 top-0 size-[10px] rounded-full" />}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/**
 * The time clock at the foot of the rail. Collapsed: a round vertical pill, the break and meal buttons over the
 * status icon. Expanded: a squarer card that adds the status text. Either opens the time clock dialog.
 */
function RailClock({ open, title, status, onOpen }: { open: boolean; title: string; status: "out" | "in" | "break"; onOpen: () => void }) {
  // One layout in both states: the rows stay put and the expanded card just reveals each row's text.
  const row = cn("flex items-center rounded-full active:bg-black/10", open ? "h-10 w-full gap-3 pl-0 pr-4" : "size-10 justify-center")
  const text = (t: string) => (open ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.15 }} className="whitespace-nowrap text-[14px] font-medium leading-5">{t}</motion.span> : null)
  const icon = (src: string) => <span aria-hidden className="flex size-10 shrink-0 items-center justify-center"><span className="block bg-current" style={maskStyle(src, 24)} /></span>
  return (
    <div data-anno="clock-accessory" className={cn("bg-m-high text-m-on-surface mt-auto flex flex-col gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.14)]", open ? "mx-3 rounded-[20px] p-1" : "mx-auto w-14 items-center rounded-full py-2")}>
      {status === "in" && (
        <>
          <button onClick={onOpen} aria-label="Take break" className={row}>{icon("/phone/break-solid.svg")}{text("Take break")}</button>
          <button onClick={onOpen} aria-label="Take meal" className={row}>{icon("/phone/meal.svg")}{text("Take meal")}</button>
        </>
      )}
      {status !== "in" && open && (
        <button onClick={onOpen} className="bg-m-primary text-m-on-primary m-1 h-10 rounded-full px-4 text-[14px] font-medium tracking-[0.1px] active:opacity-85">{status === "break" ? "End break" : "Clock in"}</button>
      )}
      <button onClick={onOpen} aria-haspopup="dialog" aria-label={title} className={row}>
        <span className="relative flex size-10 shrink-0 items-center justify-center">
          <IconClock size={24} stroke={1.75} />
          {status === "in" && <span aria-hidden className="absolute right-[7px] top-[7px] size-[9px] rounded-full bg-[#34c759] ring-2 ring-[var(--m-container-high)]" />}
        </span>
        {text(title)}
      </button>
    </div>
  )
}

/** The unread count on a location, as a small badge. */
function AUnread({ n }: { n: number }) {
  if (!n) return null
  return <span aria-label={`${n} unread`} className="bg-[var(--m-badge)] flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-medium leading-none tabular-nums text-white">{n}</span>
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

const sumWeek = (pick: (l: Location) => number[]) => LOCATIONS[0].weekSales.map((_, i) => LOCATIONS.reduce((n, l) => n + pick(l)[i], 0))

/** A location's row in the menu: name over labor share, a wireframe sales-and-labor chart, and today's sales. Also what its overview grows out of. */
function AndroidMenuRowBody({ l }: { l: Location }) {
  const wire = useStructure()
  const locName = useLocName()
  const employee = useUserTypeStore((s) => s.type) === "employee"
  // An employee sees when they next work here and what's unread, not the location's numbers.
  if (employee) {
    const next = nextShiftAt(l.id)
    return (
      <span className="flex w-full items-center gap-3 text-left">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[16px] leading-6">{wire ? locName(l) : shortLocationName(l)}</span>
          {wire ? <ABar w="45%" h={8} /> : <span className="text-m-variant truncate text-[12px] leading-4">{next ? `Next shift ${next}` : "No shifts this week"}</span>}
        </span>
        {wire ? <span aria-hidden className="bg-m-skeleton block size-4 shrink-0 rounded-full" /> : <AUnread n={unreadAt(l)} />}
      </span>
    )
  }
  return (
    <span className="flex w-full items-center gap-3 text-left">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[16px] leading-6">{wire ? locName(l) : shortLocationName(l)}</span>
        {wire ? <ABar w="45%" h={8} /> : (
          <span className="text-m-variant flex items-center gap-[6px] text-[12px] leading-4">
            <span aria-hidden className="size-[7px] rounded-full" style={{ backgroundColor: l.laborPct < 15 ? "#12a53b" : "#d0161f" }} />
            {l.laborPct}% labor
          </span>
        )}
      </span>
      <WireBars sales={l.weekSales} labor={l.weekLabor} forecast={l.weekForecast} />
      {wire ? <ABar w={36} h={12} /> : <span className="w-[46px] shrink-0 text-right text-[14px] font-medium leading-5">{shortMoney(l.sales)}</span>}
    </span>
  )
}

function LocationMenu({ open, onClose, onAll, onNewGroup, onAddLocation }: { open: boolean; onClose: () => void; /** Show every location at once. */ onAll?: () => void; /** Plus Group: start combining locations into a named group. */ onNewGroup?: () => void; /** One location only: the menu offers to add another instead of listing more. */ onAddLocation?: () => void }) {
  const wire = useStructure()
  const id = useLocationStore((s) => s.locationId)
  const setLocation = useLocationStore((s) => s.setLocation)
  const all = useLocationStore((s) => s.all)
  const groupId = useLocationStore((s) => s.groupId)
  const setGroup = useLocationStore((s) => s.setGroup)
  const groups = useGroupsStore((s) => s.groups)
  const employee = useUserTypeStore((s) => s.type) === "employee"
  const single = useUserTypeStore((s) => s.type) === "oam"
  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-[30]" onPointerDown={onClose}>
          <motion.div
            role="menu"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ top: "calc(var(--safe-top) + 56px)", transformOrigin: "top left" }}
            className="bg-m-high text-m-on-surface absolute left-4 w-[340px] max-w-[calc(100%-32px)] overflow-hidden rounded-[12px] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
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
                  <span className="text-m-variant text-[12px] leading-4">{LOCATIONS.length} locations</span>
                </span>
                {employee ? (
                  wire ? <span aria-hidden className="bg-m-skeleton block size-4 shrink-0 rounded-full" /> : <AUnread n={LOCATIONS.reduce((n, l) => n + unreadAt(l), 0)} />
                ) : (
                  <>
                    <WireBars sales={sumWeek((l) => l.weekSales)} labor={sumWeek((l) => l.weekLabor)} forecast={sumWeek((l) => l.weekForecast)} />
                    <span className="w-[46px] shrink-0" />
                  </>
                )}
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
                  <button key={l.id} role="menuitem" onClick={() => { setLocation(l.id); onClose() }} className="flex min-h-14 w-full items-center gap-3 px-4 py-1 text-left active:bg-black/10">
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
              <button onClick={() => openLocation(l)} className="flex items-center gap-[2px] text-left active:opacity-60">
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

function HomeManager({ split, onOpen }: { split?: boolean; onOpen: (p: PageSpec) => void }) {
  const hero = (
    <>
      <div className="flex flex-col gap-1 py-2">
        <ABar w={150} h={34} />
        <p className="text-m-variant pt-1 text-[16px] leading-6">Total sales</p>
      </div>
      <ALines />
      <StatusSkeleton />
    </>
  )
  const rest = (
    <>
      <Section title="My Week (Shifts)"><WeekSkeleton card /></Section>
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

/**
 * The time clock as one long bar above the navigation (the same idea as iOS's accessory): the status on the left,
 * the actions on the right. A bar rather than a FAB because it carries state and more than one action.
 */
function ClockBar({ title, status, bottom, onOpen }: { bottom: number; title: string; status: "out" | "in" | "break"; onOpen: () => void }) {
  const glyph = (src: string) => ({ width: 24, height: 24, maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }) as const
  const round = "flex size-10 items-center justify-center rounded-full active:bg-black/10"
  return (
    <div data-anno="clock-accessory" className="bg-m-high text-m-on-surface absolute inset-x-4 z-20 flex h-14 items-center gap-3 rounded-full pl-4 pr-2 shadow-[0_2px_8px_rgba(0,0,0,0.14)]" style={{ bottom }}>
      <button onClick={onOpen} aria-haspopup="dialog" aria-label={title} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative size-6 shrink-0">
          <IconClock size={24} stroke={1.75} />
          {status === "in" && <span aria-hidden className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-2 ring-[var(--m-container-high)]" />}
        </span>
        <span className="truncate text-[15px] font-medium leading-5">{title}</span>
      </button>
      {status === "in" && (
        <>
          <button onClick={onOpen} aria-label="Start break" className={round}><span aria-hidden className="block bg-current" style={glyph("/phone/break-solid.svg")} /></button>
          <button onClick={onOpen} aria-label="Start meal break" className={round}><span aria-hidden className="block bg-current" style={glyph("/phone/meal.svg")} /></button>
        </>
      )}
      {status !== "in" && (
        <button onClick={onOpen} className="bg-m-primary text-m-on-primary h-10 rounded-full px-5 text-[14px] font-medium tracking-[0.1px] active:opacity-85">
          {status === "break" ? "End break" : "Clock in"}
        </button>
      )}
    </div>
  )
}

/** Add time card: the labels and sections, with empty fields. */
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

function SettingsPage({ manager, onOpen }: { manager: boolean; onOpen: (p: PageSpec) => void }) {
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
      <div className="flex gap-3 pb-1">
        <ACard title="Earnings" h={96} className="flex-1" dataAnno="drawer-earnings" onClick={() => onOpen({ id: "earnings", kind: "earnings", title: "Money" })} />
        <ACard title="Time off balance" h={96} className="flex-1" dataAnno="drawer-timeoff" onClick={() => onOpen({ id: "timeoff", kind: "timeoff", title: "Time off" })} />
      </div>
      {manager && (
        <Section title="Work">
          {row("Team", <IconUsers size={24} stroke={1.75} />, "team")}
          {row("Payroll", <IconCash size={24} stroke={1.75} />)}
        </Section>
      )}
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

function PageBody({ spec, manager, multi, onOpen, onClose }: { spec: PageSpec; manager: boolean; multi: boolean; onOpen: (p: PageSpec) => void; onClose: () => void }) {
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
    case "settings": return <SettingsPage manager={manager} onOpen={onOpen} />
    case "assistant": return (
      <div className="flex flex-col gap-4 pt-2">
        <ALines lines={3} />
        <div className="flex flex-wrap gap-2">{[120, 150, 100].map((w, i) => <span key={i} className="border-m-outline flex h-8 items-center rounded-[8px] border px-3"><ABar w={w - 24} h={8} /></span>)}</div>
      </div>
    )
    default: return <div className="pt-2"><ALines lines={3} /><AList rows={4} avatar={false} trailing /></div>
  }
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
  const allLoc = useLocationStore((s) => s.all)
  const groupId = useLocationStore((s) => s.groupId)
  const [groupOpen, setGroupOpen] = useState(false)
  const [tab, setTab] = useState<TabId>("home")
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
  const [locView, setLocView] = useState<Location | null>(null)
  const locNameOf = useLocName()
  const homeScope = multi ? LOCATIONS : [loc]
  const viewScope = locView ? [locView] : homeScope
  const openLocation = (l: Location) => { setLocation(l.id); setLocView(l); setStack([]); setTab("home") }
  const goTab = (t: TabId) => { setStack([]); setLocView(null); setTab(t) }
  const open = (p: PageSpec) => setStack((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]))
  const pop = () => setStack((s) => s.slice(0, -1))

  useEffect(() => { setTab("home"); setStack([]); setLocView(null) }, [userType])
  useEffect(() => { if (!multi) setLocation(LOCATIONS[0].id) }, [multi, setLocation])
  useEffect(() => { setScrolled(false); setFabMenu(false) }, [tab])
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
  const { title: clockTitle } = accessoryFor(loc, clock)
  // Employees get the clock as a bar above the navigation on every tab but Messages, like iOS: status plus actions.
  const showClockBar = employee && tab !== "chat" && !rail

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

  const assistant = employee ? undefined : () => open({ id: "assistant", kind: "assistant", title: "Assistant" })
  const unread = scope.reduce((n, l) => n + l.messages.filter((m) => m.unread).length, 0)

  return (
    <AndroidFrame header={<UserTypeToggle />} footer={<PrototypeFooter />}>
      {rail && <NavRail tabs={tabs} tab={tab} onTab={goTab} unread={unread} open={railOpen} onToggle={() => setRailOpen((o) => !o)} onProfile={() => open(SETTINGS)} onAssistant={assistant} clock={{ title: clockTitle, status: clock.status, onOpen: () => open(CLOCK) }} locations={multi ? { activeId: locView ? locView.id : tab !== "home" && !allLoc && !groupId ? loc.id : null, onOpen: openLocation, onAll: () => { setAll(true); setLocView(null); setStack([]); setTab("home") }, allActive: tab === "home" ? !locView : allLoc } : undefined} />}
      {/* Everything but the overlays lives in this pane, which slides right as the rail expands. */}
      <motion.div initial={false} animate={{ left: railW }} transition={RAIL_EASE} className="absolute inset-y-0 right-0">
      {tab === "chat" && rail && <MessagesSplit key={loc.id} />}
      {split && tab !== "chat" && tab !== "money" && (
        <motion.div key={`${tab}:${locView ? locView.id : tab === "home" && multi ? "overview" : loc.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="absolute inset-0">
          {tab === "home" && <ScopeContext.Provider value={viewScope}><OpenLocationContext.Provider value={multi && !locView ? openLocation : null}>{employee ? <HomeEmployee split onOpen={open} /> : <HomeManager split onOpen={open} />}</OpenLocationContext.Provider></ScopeContext.Provider>}
          {tab === "shifts" && <ShiftsTab split />}
          {tab === "time" && <TimeTab split filters={timeFilters} onFilter={setFilterSheet} />}
        </motion.div>
      )}
      {!(tab === "chat" && rail) && !(split && tab !== "money") && <motion.div
        key={`${tab}:${locView ? locView.id : tab === "home" && multi ? "overview" : loc.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}
        className="absolute inset-0 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: "calc(var(--safe-top) + 72px)", paddingBottom: rail ? 120 : 200 }}
      >
        {tab === "home" && <ScopeContext.Provider value={viewScope}><OpenLocationContext.Provider value={multi && !locView ? openLocation : null}>{employee ? <HomeEmployee onOpen={open} /> : <HomeManager onOpen={open} />}</OpenLocationContext.Provider></ScopeContext.Provider>}
        {tab === "shifts" && <ShiftsTab />}
        {tab === "time" && <TimeTab filters={timeFilters} onFilter={setFilterSheet} />}
        {tab === "money" && <MoneyTab />}
        {tab === "chat" && <MessagesTab />}
      </motion.div>}

      <TopBar
        loc={loc}
        tab={tab}
        // The overview has no title: it is the page you land on, and a title would only name the scope.
        title={tab === "home" ? (locView ? locNameOf(locView) : "") : undefined}
        back={tab === "home" && locView ? () => setLocView(null) : undefined}
        // Home is a fixed overview, so only the other tabs have a switcher.
        canSwitch={tab !== "home"}
        scrolled={scrolled}
        pending={pending}
        showClock={!employee && tab === "home" && !rail}
        clockActive={clock.status === "in"}
        rail={rail}
        plus={rail && tab !== "chat" ? undefined : (plus ?? undefined)}
        onTitle={() => setMenu((m) => !m)}
        onBell={() => setSheet("requests")}
        onClock={() => open(CLOCK)}
        onProfile={() => open(SETTINGS)}
      />
      {!rail && <NavBar tabs={tabs} tab={tab} onTab={goTab} unread={unread} onAssistant={assistant} />}
      {showClockBar && <ClockBar title={clockTitle} status={clock.status} bottom={100} onOpen={() => open(CLOCK)} />}
      {fab && (
        <div data-anno="fab" className="absolute right-4 z-20" style={{ bottom: 24 }}>
          {fab}
          {addMenu("bottom-16 right-0", "bottom right")}
        </div>
      )}
      {!rail && <div className="absolute inset-x-0 top-0 z-30">{addMenu("right-3 top-[calc(var(--safe-top)+56px)]", "top right")}</div>}
      <LocationMenu open={menu} onClose={() => setMenu(false)} onAll={multi ? () => setAll(true) : undefined} onNewGroup={multi ? () => setGroupOpen(true) : undefined} onAddLocation={multi ? undefined : () => {}} />


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
            <ScopeContext.Provider value={viewScope}><PageBody spec={p} manager={!employee} multi={multi} onOpen={open} onClose={pop} /></ScopeContext.Provider>
          </APage>
        ))}
      </AnimatePresence>
      </motion.div>


      <AnimatePresence>
        {filterSheet && <TimeFilterSheet key={filterSheet} kind={filterSheet} loc={loc} side={rail} value={timeFilters[filterSheet]} onApply={(v) => { setTimeFilters((f) => ({ ...f, [filterSheet]: v })); setFilterSheet(null) }} onClose={() => setFilterSheet(null)} />}
        {sheet === "requests" && <RequestsSheet key="requests" loc={loc} multi={multi} side={rail} onClose={() => setSheet(null)} />}
        {sheet === "shift" && <AddShiftSheet key="shift" loc={loc} onClose={() => setSheet(null)} />}
        {sheet === "event" && <AddEventSheet key="event" loc={loc} onClose={() => setSheet(null)} />}
        {groupOpen && <AGroupSheet key="group" onClose={() => setGroupOpen(false)} />}
      </AnimatePresence>

          </AndroidFrame>
  )
}

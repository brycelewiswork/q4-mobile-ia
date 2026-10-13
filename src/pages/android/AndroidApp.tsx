import { useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  IconBell,
  IconBriefcase,
  IconCalendar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconCash,
  IconCheck,
  IconChecklist,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconGift,
  IconHeartbeat,
  IconHelp,
  IconLock,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSend,
  IconUsers,
} from "@tabler/icons-react"
import { LinearBlur } from "@/components/ui/progressive-blur"
import { UserTypeToggle } from "@/components/ios/UserTypeToggle"
import { PrototypeFooter } from "@/components/ios/PrototypeFooter"
import { AndroidFrame } from "@/pages/android/AndroidFrame"
import { ABar, ACard, ADrawer, AChip, AChips, AFab, AIconButton, AList, ALines, APage, ARow, ASection, ASheet, ASwitch, WeekStrip } from "@/pages/android/m3"
import { LOCATIONS, USER_SCHEDULE, type Location } from "@/data/locations"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { useLocation, useLocationStore } from "@/store/useLocationStore"
import { ANON, useLocName } from "@/store/useViewStore"
import { useDateStore } from "@/store/useDateStore"
import { accessoryFor, useClock } from "@/store/useTimeClockStore"
import { pendingFor, useRequestsStore } from "@/store/useRequestsStore"
import { cn } from "@/lib/utils"

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

type PageSpec = { id: string; kind: "log" | "earnings" | "timeoff" | "account" | "locations" | "timecard" | "shiftmates" | "settings" | "team" | "assistant" | "generic"; title: string }
const LOG: PageSpec = { id: "log", kind: "log", title: "Manager Log" }
const EARNINGS: PageSpec = { id: "earnings", kind: "earnings", title: "Earnings" }
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

function TopBar({ loc, tab, canSwitch, scrolled, pending, showClock, clockActive, onTitle, onBell, onClock, onProfile }: { loc: Location; tab: TabId; canSwitch: boolean; scrolled: boolean; pending: number; showClock: boolean; clockActive: boolean; onTitle: () => void; onBell: () => void; onClock: () => void; onProfile: () => void }) {
  const locName = useLocName()
  return (
    <div className={cn("absolute inset-x-0 z-20 flex h-16 items-center gap-1 pl-2 pr-2 transition-colors duration-200", scrolled ? "bg-m-container" : "bg-m-surface")} style={{ top: "var(--safe-top)" }}>
      {/* The avatar opens the navigation drawer. */}
      <button onClick={onProfile} aria-label="Open navigation drawer" aria-haspopup="dialog" data-anno="profile" className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-black/10">
        <Avatar size={32} />
      </button>
      <button onClick={canSwitch ? onTitle : undefined} disabled={!canSwitch} aria-haspopup={canSwitch ? "menu" : undefined} className="text-m-on-surface flex min-w-0 flex-1 items-center gap-1 text-left">
        <span className="line-clamp-2 min-w-0 text-[18px] font-medium leading-6">{locName(loc)}</span>
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
      <nav className="flex w-full items-center" style={{ padding: "16px 24px 20px", gap: onAssistant ? 20 : 0, minHeight: 92 }}>
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

function LocationMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locName = useLocName()
  const id = useLocationStore((s) => s.locationId)
  const setLocation = useLocationStore((s) => s.setLocation)
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
            className="bg-m-high text-m-on-surface absolute left-4 w-[280px] overflow-hidden rounded-[12px] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
          >
            {LOCATIONS.map((l) => (
              <button key={l.id} role="menuitem" onClick={() => { setLocation(l.id); onClose() }} className="flex h-12 w-full items-center gap-3 px-4 text-left text-[16px] active:bg-black/10">
                <span className="flex-1 truncate">{locName(l)}</span>
                {l.id === id && <IconCheck size={20} stroke={2} className="text-m-primary" />}
              </button>
            ))}
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

function HomeEmployee({ onOpen }: { onOpen: (p: PageSpec) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <ACard title="My week" h={216} />
      <ALines />
      <div className="flex gap-3">
        <ACard title="Earnings" h={112} onClick={() => onOpen(EARNINGS)} className="flex-1" />
        <ACard title="Shiftmates" h={112} onClick={() => onOpen(SHIFTMATES)} className="flex-1" />
      </div>
      <Section title="Events"><AList rows={3} avatar={false} trailing /></Section>
      <Section title="Manager Log" action="See all" onAction={() => onOpen(LOG)}><AList rows={2} avatar={false} onRow={() => onOpen(LOG)} /></Section>
    </div>
  )
}

function HomeManager({ multi, onOpen }: { multi: boolean; onOpen: (p: PageSpec) => void }) {
  const locName = useLocName()
  const setLocation = useLocationStore((s) => s.setLocation)
  return (
    <div className="flex flex-col gap-3">
      {multi ? (
        <ACard title="All locations" h={200} dataAnno="all-locations">
          <span aria-hidden className="bg-m-skeleton mt-3 block h-24 rounded-[12px]" />
          {LOCATIONS.map((l) => (
            <button key={l.id} onClick={() => setLocation(l.id)} aria-label={locName(l)} className="mt-3 flex items-center gap-3 text-left active:opacity-60">
              <ABar w="45%" h={12} />
              <span className="flex-1" />
              <ABar w={40} h={12} />
            </button>
          ))}
        </ACard>
      ) : (
        <div className="flex flex-col gap-1 py-2">
          <ABar w={150} h={34} />
          <p className="text-m-variant pt-1 text-[16px] leading-6">Total sales</p>
        </div>
      )}
      <ALines />
      <ACard title="Status" h={150} />
      <Section title="Needs Review"><AList rows={3} avatar={false} trailing /></Section>
      <Section title="Manager Log" action="See all" onAction={() => onOpen(LOG)}><AList rows={2} avatar={false} onRow={() => onOpen(LOG)} /></Section>
      <Section title="My Week (Shifts)"><AList rows={3} avatar={false} trailing /></Section>
      <Section title="Events"><AList rows={3} avatar={false} trailing /></Section>
    </div>
  )
}

const SHIFT_FILTERS = [
  { id: "all", label: "All shifts" },
  { id: "mine", label: "My shifts" },
  { id: "open", label: "Open shifts" },
] as const

/** Shifts: the week strip, then the day's summary with the filter as a dropdown beside it, like iOS. */
function ShiftsTab() {
  const date = useDateStore((s) => s.date)
  const setDate = useDateStore((s) => s.setDate)
  const [filter, setFilter] = useState<(typeof SHIFT_FILTERS)[number]["id"]>("all")
  const [menu, setMenu] = useState(false)
  return (
    <div>
      <WeekStrip date={date} onPick={setDate} dots={(i) => !!USER_SCHEDULE[i]} />
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
      <AList rows={6} trailing />
    </div>
  )
}

function TimeTab() {
  const date = useDateStore((s) => s.date)
  const setDate = useDateStore((s) => s.setDate)
  const view = useDateStore((s) => s.timeView)
  const setView = useDateStore((s) => s.setTimeView)
  const [issues, setIssues] = useState(false)
  return (
    <div>
      <WeekStrip date={date} onPick={setDate} />
      <AChips>
        <AChip leading={<IconSearch size={18} stroke={2} />} />
        <AChip selected={issues} onClick={() => setIssues((v) => !v)}>Issues</AChip>
        <AChip trailing={<IconChevronDown size={18} stroke={2} />}>Roles</AChip>
        <AChip selected={view === "period"} onClick={() => setView(view === "period" ? "day" : "period")}>Pay period</AChip>
      </AChips>
      {view === "day" ? (
        <>
          <ASection>Needs review</ASection>
          <div className="flex flex-col gap-3 pt-1">
            <ACard h={150} />
            <ACard h={150} />
          </div>
        </>
      ) : (
        <>
          <ASection>Pay period</ASection>
          <AList rows={4} avatar={false} trailing />
        </>
      )}
    </div>
  )
}

function MoneyTab() {
  return (
    <div className="flex flex-col gap-1 pt-2">
      <ACard title="This pay period" h={110} />
      <Section title="Today"><AList rows={2} avatar={false} trailing /></Section>
      <Section title="Recent pay stubs"><AList rows={3} avatar={false} trailing /></Section>
    </div>
  )
}

function MessagesTab() {
  const [filter, setFilter] = useState<"all" | "unread" | "threads">("all")
  const toggle = (f: "unread" | "threads") => setFilter((c) => (c === f ? "all" : f))
  return (
    <div className="pt-2">
      <AChips>
        <AChip selected={filter === "unread"} onClick={() => toggle("unread")}>Unread</AChip>
        <AChip selected={filter === "threads"} onClick={() => toggle("threads")}>Threads</AChip>
      </AChips>
      <AList rows={7} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sheets and pages
// ---------------------------------------------------------------------------

function RequestsSheet({ multi, onClose }: { multi: boolean; onClose: () => void }) {
  const filters = ["Team", "Mine", "Store", ...(multi ? ["All locations"] : [])]
  const [f, setF] = useState("Team")
  return (
    <ASheet title="Requests" onClose={onClose}>
      <AChips>
        {filters.map((x) => (
          <AChip key={x} selected={f === x} onClick={() => setF(x)}>{x}</AChip>
        ))}
      </AChips>
      <AList rows={4} />
    </ASheet>
  )
}

function ClockSheet({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const locName = useLocName()
  const st = useClock(loc)
  const role = st.role ?? loc.employee.timeClock.role
  const main = st.status === "out" ? "Clock in" : st.status === "break" ? "End break" : "Clock out"
  return (
    <ASheet title="Time clock" onClose={onClose}>
      <div aria-hidden className="bg-m-skeleton h-36 rounded-[16px]" />
      <div className="py-2">
        <ARow icon={<IconMapPin size={24} stroke={1.75} />} label={locName(loc)} />
        <ARow icon={<IconBriefcase size={24} stroke={1.75} />} label={role} />
      </div>
      {st.status !== "out" && (
        <div className="flex gap-2 pb-3">
          {["10 min break", "30 min meal"].map((l) => (
            <button key={l} className="border-m-outline text-m-primary h-10 flex-1 rounded-full border text-[14px] font-medium">{l}</button>
          ))}
        </div>
      )}
      <button onClick={onClose} className="bg-m-primary text-m-on-primary h-12 w-full rounded-full text-[15px] font-medium tracking-[0.1px] active:opacity-85">{main}</button>
    </ASheet>
  )
}

/**
 * The time clock as one long bar above the navigation (the same idea as iOS's accessory): the status on the left,
 * the actions on the right. A bar rather than a FAB because it carries state and more than one action.
 */
function ClockBar({ title, status, onOpen }: { title: string; status: "out" | "in" | "break"; onOpen: () => void }) {
  const glyph = (src: string) => ({ width: 24, height: 24, maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }) as const
  const round = "flex size-10 items-center justify-center rounded-full active:bg-black/10"
  return (
    <div data-anno="clock-accessory" className="bg-m-high text-m-on-surface absolute inset-x-4 z-20 flex h-14 items-center gap-3 rounded-full pl-4 pr-2 shadow-[0_2px_8px_rgba(0,0,0,0.14)]" style={{ bottom: 100 }}>
      <button onClick={onOpen} aria-haspopup="dialog" aria-label={title} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative size-6 shrink-0">
          <IconClock size={24} stroke={1.75} />
          {status === "in" && <span aria-hidden className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-2 ring-[var(--m-container-high)]" />}
        </span>
        <span className="truncate text-[15px] font-medium leading-5">{title}</span>
      </button>
      {status === "in" && (
        <>
          <button onClick={onOpen} aria-label="Clock out" className={round}><span aria-hidden className="block bg-current" style={glyph("/phone/clock-solid.svg")} /></button>
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

function AddShiftSheet({ onClose }: { onClose: () => void }) {
  return (
    <ASheet title="Add shift" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-4 pt-1">
        {["Who", "Role", "Day", "Start", "End"].map((l) => <Field key={l} label={l} />)}
      </div>
      <button onClick={onClose} className="bg-m-primary text-m-on-primary h-12 w-full rounded-full text-[15px] font-medium tracking-[0.1px] active:opacity-85">Add shift</button>
    </ASheet>
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
 * The profile cards: the location PIN, shoutouts, stats. One card at a time, switched from a tab row. Not a swipe
 * carousel: inside the drawer, sideways swipes close it and vertical ones scroll it.
 */
function ProfileCarousel() {
  const loc = useLocation()
  const locName = useLocName()
  const [page, setPage] = useState<"pin" | "shoutouts" | "stats">("pin")
  const stats = ["On-time rate", "Shifts worked", "Hours/week", "Avg shift rating", "Missed clock-outs", "No-shows"]
  const tabs = [
    ["pin", "PIN"],
    ["shoutouts", "Shoutouts"],
    ["stats", "Stats"],
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
      {page === "pin" && (
        <div aria-label="PIN card" data-anno="pin-card" className="flex h-[168px] flex-col justify-between rounded-[20px] bg-[#8f55e5] p-4 text-white">
          <div className="flex items-center gap-3">
            <img src="/phone/pin-logo.svg" alt="" className="h-8 w-[22px]" />
            <span className="truncate text-[16px] font-medium leading-5">{locName(loc)}</span>
          </div>
          <div>
            <p className="text-[14px] leading-5 text-white/75">PIN</p>
            <span aria-hidden className="mt-1 block h-[14px] w-24 rounded-full bg-white/40" />
          </div>
        </div>
      )}
      {page === "shoutouts" && (
        <ACard title="Shoutouts" h={168}>
          <ALines lines={3} className="pt-3" />
          <ABar w={80} h={10} className="mt-2 self-end" />
        </ACard>
      )}
      {page === "stats" && (
        <ACard title="Stats" h={168}>
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
  const row = (label: string, icon: ReactNode, kind: PageSpec["kind"] = "generic") => (
    <ARow key={label} icon={icon} label={label} onClick={() => onOpen({ id: `${kind}:${label}`, kind, title: label })} />
  )
  return (
    <div className="flex flex-col gap-1">
      {/* The account row: opens Account Settings. */}
      <button onClick={() => onOpen({ id: "account", kind: "account", title: "Account Settings" })} data-anno="drawer-profile" className="-mx-1 flex items-center gap-4 rounded-[12px] px-1 py-3 text-left active:bg-black/5">
        <Avatar size={56} />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] leading-6">{ANON.name}</span>
          <span className="text-m-variant block truncate text-[14px] leading-5">{ANON.email}</span>
        </span>
        <IconChevronRight size={20} stroke={2} className="text-m-variant shrink-0" />
      </button>
      <ProfileCarousel />
      <div className="flex gap-3 pb-1">
        <ACard title="Earnings" h={96} className="flex-1" dataAnno="drawer-earnings" onClick={() => onOpen({ id: "earnings", kind: "earnings", title: "Earnings" })} />
        <ACard title="Time off" h={96} className="flex-1" dataAnno="drawer-timeoff" onClick={() => onOpen({ id: "timeoff", kind: "timeoff", title: "Time off" })} />
      </div>
      {manager && (
        <Section title="Work">
          {row("Team", <IconUsers size={24} stroke={1.75} />, "team")}
          {row("Task Manager", <IconChecklist size={24} stroke={1.75} />)}
          {row("Payroll", <IconCash size={24} stroke={1.75} />)}
        </Section>
      )}
      <Section title="Account" headerAnno="drawer-account">
        {row("Locations", <IconMapPin size={24} stroke={1.75} />, "locations")}
        {row("Calendar Sync", <IconCalendar size={24} stroke={1.75} />)}
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
      <button className="h-12 w-full px-1 text-left text-[16px] text-[var(--m-error)] active:bg-black/5">Sign out</button>
    </div>
  )
}

/** Every location the user works at, one card each with its own settings: not tied to the one selected on Home. */
function LocationsPage({ multi }: { multi: boolean }) {
  const locName = useLocName()
  const [on, setOn] = useState<Record<string, { mobile: boolean; geofence: boolean }>>({})
  // The switches only respond while their location is being edited.
  const [editing, setEditing] = useState<string | null>(null)
  const get = (id: string) => on[id] ?? { mobile: true, geofence: false }
  const set = (id: string, patch: Partial<{ mobile: boolean; geofence: boolean }>) => setOn((o) => ({ ...o, [id]: { ...get(id), ...patch } }))
  const Row = ({ title, checked, onChange, disabled }: { title: string; checked: boolean; onChange: (v: boolean) => void; disabled: boolean }) => (
    <div className="border-m-divider flex min-h-14 items-center gap-4 border-t py-2">
      <span className="min-w-0 flex-1 text-[16px] leading-6">{title}</span>
      <ASwitch disabled={disabled} checked={checked} onChange={onChange} label={title} />
    </div>
  )
  return (
    <div className="flex flex-col gap-1 pt-1">
      {LOCATIONS.filter((_, i) => multi || i === 0).map((l) => {
        const isEditing = editing === l.id
        return (
          <section key={l.id}>
            <ASection action={isEditing ? "Done" : "Edit"} onAction={() => setEditing(isEditing ? null : l.id)}>{locName(l)}</ASection>
            <ACard h={0}>
              <div className="flex min-h-12 items-center justify-between gap-4 pb-2 text-[16px] leading-6">
                PIN
                <ABar w={48} h={10} />
              </div>
              <Row title="Mobile app clock-in" disabled={!isEditing} checked={get(l.id).mobile} onChange={(v) => set(l.id, { mobile: v })} />
              <Row title="Geofence" disabled={!isEditing} checked={get(l.id).geofence} onChange={(v) => set(l.id, { geofence: v })} />
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

function PageBody({ spec, manager, multi, onOpen }: { spec: PageSpec; manager: boolean; multi: boolean; onOpen: (p: PageSpec) => void }) {
  switch (spec.kind) {
    case "locations": return <LocationsPage multi={multi} />
    case "timecard": return <TimeCardForm />
    case "log": return <div className="pt-2"><AList rows={5} avatar={false} /></div>
    case "earnings": return (
      <div className="flex flex-col gap-3 pt-2">
        <ABar w={130} h={34} />
        <ACard title="This pay period" h={110} />
        <Section title="Recent pay stubs"><AList rows={3} avatar={false} trailing /></Section>
      </div>
    )
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
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => (
            <div key={d} className={cn("flex h-14 items-center justify-between px-1", i > 0 && "border-m-divider border-t")}>
              <span className="text-[16px]">{d}</span>
              <ABar w={72} h={12} />
            </div>
          ))}
        </Section>
        <div className="pt-2">
          {["Personal Information", "Shared Name", "Tax & Bank Information", "Resume"].map((l) => (
            <button key={l} className="flex h-14 w-full items-center justify-between px-1 text-left text-[16px] active:bg-black/5">
              {l}
              <IconChevronRight size={20} stroke={2} className="text-m-variant" />
            </button>
          ))}
        </div>
        <Section title="Locations"><AList rows={2} avatar={false} /></Section>
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
  const [tab, setTab] = useState<TabId>("home")
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const [drawer, setDrawer] = useState(false)
  // Shifts' plus offers two things, like the iOS menu: add a shift or an event.
  const [fabMenu, setFabMenu] = useState(false)
  const [sheet, setSheet] = useState<null | "requests" | "clock" | "shift">(null)
  const [stack, setStack] = useState<PageSpec[]>([])
  const open = (p: PageSpec) => setStack((s) => (s.some((x) => x.id === p.id) ? s : [...s, p]))
  const pop = () => setStack((s) => s.slice(0, -1))

  useEffect(() => { setTab("home"); setStack([]) }, [userType])
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
  const pending = pendingFor(loc, decided, added).length
  const clock = useClock(loc)
  const { title: clockTitle } = accessoryFor(loc, clock)
  // Employees get the clock as a bar above the navigation on every tab but Messages, like iOS: status plus actions.
  const showClockBar = employee && tab !== "chat"

  // One FAB per tab. The main action of the tab is extended (icon + label); the rest are icon-only.
  const fab =
    tab === "home" ? null
    : tab === "shifts" ? <AFab label="Add" icon={<IconPlus size={24} stroke={1.75} />} onClick={() => setFabMenu((o) => !o)} />
    : tab === "time" ? <AFab label="Add time entry" icon={<IconPlus size={24} stroke={1.75} />} onClick={() => open({ id: "timecard", kind: "timecard", title: "Add time card" })} />
    : tab === "chat" ? <AFab extended label="New message" icon={<IconPencil size={24} stroke={1.75} />} />
    : null

  return (
    <AndroidFrame header={<UserTypeToggle />} footer={<PrototypeFooter />}>
      <motion.div
        key={`${tab}:${loc.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 2)}
        className="absolute inset-0 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingTop: "calc(var(--safe-top) + 72px)", paddingBottom: 200 }}
      >
        {tab === "home" && (employee ? <HomeEmployee onOpen={open} /> : <HomeManager multi={userType === "multi"} onOpen={open} />)}
        {tab === "shifts" && <ShiftsTab />}
        {tab === "time" && <TimeTab />}
        {tab === "money" && <MoneyTab />}
        {tab === "chat" && <MessagesTab />}
      </motion.div>

      <TopBar
        loc={loc}
        tab={tab}
        canSwitch={multi}
        scrolled={scrolled}
        pending={pending}
        showClock={!employee && tab === "home"}
        clockActive={clock.status === "in"}
        onTitle={() => setMenu((m) => !m)}
        onBell={() => setSheet("requests")}
        onClock={() => setSheet("clock")}
        onProfile={() => setDrawer(true)}
      />
      <NavBar tabs={tabs} tab={tab} onTab={setTab} unread={loc.messages.filter((m) => m.unread).length} onAssistant={employee ? undefined : () => open({ id: "assistant", kind: "assistant", title: "Assistant" })} />
      {showClockBar && <ClockBar title={clockTitle} status={clock.status} onOpen={() => setSheet("clock")} />}
      {fab && (
        <div data-anno="fab" className="absolute right-4 z-20" style={{ bottom: showClockBar ? 172 : 108 }}>
          {fab}
          <AnimatePresence>
            {fabMenu && tab === "shifts" && (
              <>
                <div className="fixed inset-0 -z-10" onPointerDown={() => setFabMenu(false)} />
                <motion.div role="menu" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.15 }} style={{ transformOrigin: "bottom right" }} className="bg-m-high text-m-on-surface absolute bottom-16 right-0 w-[200px] overflow-hidden rounded-[12px] py-2 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                  {[["Add shift", IconCalendarPlus, () => setSheet("shift")], ["Add event", IconCalendarEvent, () => undefined]].map(([label, Icon, run]) => {
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
        </div>
      )}

      <LocationMenu open={menu} onClose={() => setMenu(false)} />

      <AnimatePresence>
        {sheet === "requests" && <RequestsSheet key="requests" multi={multi} onClose={() => setSheet(null)} />}
        {sheet === "clock" && <ClockSheet key="clock" loc={loc} onClose={() => setSheet(null)} />}
        {sheet === "shift" && <AddShiftSheet key="shift" onClose={() => setSheet(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {drawer && (
          <ADrawer key="drawer" onClose={() => setDrawer(false)}>
            {/* Same content as the Settings sheet; picking a row closes the tray and opens that page. */}
            <SettingsPage manager={!employee} onOpen={(p) => { setDrawer(false); open(p) }} />
          </ADrawer>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stack.map((p, i) => (
          <APage
            key={p.id}
            title={p.title}
            z={40 + i}
            onBack={pop}
            bar={p.kind === "team" ? <SearchField /> : undefined}
            footer={p.kind === "assistant" ? <Composer /> : undefined}
            action={p.kind === "timecard" ? <button onClick={pop} className="text-m-primary h-10 rounded-full px-3 text-[14px] font-medium tracking-[0.1px] active:bg-black/10">Save</button> : undefined}
          >
            <PageBody spec={p} manager={!employee} multi={multi} onOpen={open} />
          </APage>
        ))}
      </AnimatePresence>
          </AndroidFrame>
  )
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from "motion/react"
import {
  IconBell,
  IconCheck,
  IconCurrencyDollar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconPlus,
  IconSearch,
  IconChevronRight,
  IconSelector,
  IconUser,
  IconUserFilled,
  IconClockFilled,
  IconWalk,
  IconX,
} from "@tabler/icons-react"
import { IosFrame } from "@/components/ios/IosFrame"
import { HANDOFF, HalfSheet, OverlayRoot } from "@/components/ios/HalfSheet"
import { PrototypeFooter } from "@/components/ios/PrototypeFooter"
import { UserTypeToggle } from "@/components/ios/UserTypeToggle"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { AddEventSheet } from "@/components/ios/AddEventSheet"
import { AddShiftSheet } from "@/components/ios/AddShiftSheet"
import { AssistantSheet } from "@/components/ios/AssistantSheet"
import { ContextMenu } from "@/components/ios/ContextMenu"
import { LocationMenu } from "@/components/ios/LocationMenu"
import { TimeClockContent, sheetHeightFor } from "@/components/ios/TimeClockContent"
import { ExpandSurface, boxOf, type Box } from "@/components/ExpandSurface"
import { FullPage } from "@/components/ios/FullPage"
import { TimeCardSheet } from "@/components/ios/TimeCardSheet"
import { HOME_PAGE_TITLES, HomePage, TaskTick, type HomePageId } from "@/pages/HomePages"
import { taskKey, useTasksStore } from "@/store/useTasksStore"
import { ProfileSheet } from "@/components/ios/ProfileSheet"
import { RequestsSheet } from "@/components/ios/RequestsSheet"
import { AccessoryContent, BottomAccessory, TabBar, type TabId } from "@/components/ios/TabBar"
import { IpadSidebar, SIDEBAR_SPRING, SIDEBAR_W, SidebarToggle } from "@/components/ios/IpadSidebar"
import { Squircle } from "@/components/squircle"
import { EdgeBlur } from "@/components/ios/EdgeBlur"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { NO_FILTERS, TimeFilterSheet, type FilterKind, type TimeFilters } from "@/components/ios/TimeFilterSheet"
import { ChatPage, MessagesSplit, MoneyPage, ShiftsPage, TimePage } from "@/pages/TabPages"
import { HOUR_LABELS, LOCATIONS, USER_EARNINGS, USER_AVAILABILITY, type Location, type SegmentId } from "@/data/locations"
import { useLocation, useLocationStore } from "@/store/useLocationStore"
import { Initials, ListRow } from "@/components/ios/list"
import { ANON, useLocName, useStructure, useViewStore } from "@/store/useViewStore"
import { Annotations } from "@/components/Annotations"
import { AndroidApp } from "@/pages/android/AndroidApp"
import { Bar, BarLines, WireCard, WireList } from "@/components/wire/Wire"
import { accessoryFor, useClock } from "@/store/useTimeClockStore"
import { pendingFor, useRequestsStore } from "@/store/useRequestsStore"

const PURPLE_200 = "#c6b3f1"
const PURPLE_600 = "#8f55e5"

type View = "employee" | "manager"
type ScrollHandler = (e: React.UIEvent<HTMLDivElement>) => void

const money = (n: number) => `$${n.toLocaleString("en-US")}`

function Card({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <Squircle as="div" cornerRadius={26} className={cn("bg-white", className)}>
      {children}
    </Squircle>
  )
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-4 pb-1 pt-[14px] text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#747182]">
      {children}
    </h2>
  )
}

/** Grouped-list card: rows with inset dividers, or an empty message. */
function ListCard({
  rows,
  empty,
}: {
  rows: { key: string; title: string; detail: string }[]
  empty: ReactNode
}) {
  if (rows.length === 0) {
    return <Card className="flex h-[62px] items-center justify-center gap-2 text-[#999]">{empty}</Card>
  }
  return (
    <Card className="overflow-hidden">
      {rows.map((r, i) => (
        <div
          key={r.key}
          className={cn(
            "flex min-h-[52px] items-center justify-between gap-3 px-4 py-2 tracking-[-0.43px]",
            i > 0 && "border-t border-black/[0.07]",
          )}
        >
          <span className="text-[17px] leading-[22px] text-black">{r.title}</span>
          <span className="shrink-0 text-[15px] text-[#7f7f7f]">{r.detail}</span>
        </div>
      ))}
    </Card>
  )
}

/** Manager log, moved here from Settings: a full-width widget of the latest notes, newest first. */
/** The dashboard's Task Manager: the first few tasks, tickable, and a See all that opens the whole list. */
function TaskManagerWidget({ loc, onOpen }: { loc: Location; onOpen: () => void }) {
  const wire = useStructure()
  const doneMap = useTasksStore((s) => s.done)
  const toggle = useTasksStore((s) => s.toggle)
  const shown = loc.tasks.slice(0, 3)
  return (
    <section>
      <div className="flex items-end justify-between">
        <SectionHeader>Task Manager</SectionHeader>
        <button onClick={onOpen} className="pb-[5px] pr-4 text-[15px] leading-5 tracking-[-0.24px] text-[#8f55e5] active:opacity-60">
          See all
        </button>
      </div>
      {wire ? (
        <button onClick={onOpen} aria-label="Open the task manager" className="block w-full text-left active:opacity-80">
          <WireList rows={3} avatar={false} trailing />
        </button>
      ) : (
        <Card className="overflow-hidden">
          {shown.map((t, i) => {
            const done = doneMap[taskKey(loc, t.id)] ?? t.done
            return (
              <ListRow key={t.id} first={i === 0} onClick={() => toggle(taskKey(loc, t.id), done)} leading={<TaskTick done={done} />} title={t.title} titleClassName={done ? "text-[#928fa0] line-through" : undefined} trailing={<span className="text-[15px]">{t.due}</span>} />
            )
          })}
        </Card>
      )}
    </section>
  )
}

function ManagerLogWidget({ loc, onOpen }: { loc: Location; onOpen: () => void }) {
  const wire = useStructure()
  return (
    <section>
      <div className="flex items-end justify-between">
        <SectionHeader>Manager Log</SectionHeader>
        <button onClick={onOpen} className="pb-[5px] pr-4 text-[15px] leading-5 tracking-[-0.24px] text-[#8f55e5] active:opacity-60">
          See all
        </button>
      </div>
      {wire ? (
        <button onClick={onOpen} aria-label="Open the manager log" className="block w-full text-left active:opacity-80">
          <WireList rows={2} avatar={false} />
        </button>
      ) : loc.managerLog.length === 0 ? (
        <Card className="flex h-[62px] items-center justify-center text-[17px] text-[#999]">No notes yet</Card>
      ) : (
        <button onClick={onOpen} aria-label="Open the manager log" className="block w-full text-left active:opacity-80">
          <Card className="overflow-hidden">
            {loc.managerLog.map((e, i) => (
              <div key={e.when + e.author} className={cn("px-4 py-3 tracking-[-0.43px]", i > 0 && "border-t border-black/[0.07]")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-[590] leading-5 text-black">{e.author}</span>
                  <span className="shrink-0 text-[13px] leading-[18px] text-[#8e8e93]">{e.when}</span>
                </div>
                <p className="line-clamp-2 pt-[2px] text-[15px] leading-5 text-[#2c2935]">{e.note}</p>
              </div>
            ))}
          </Card>
        </button>
      )}
    </section>
  )
}

const EventsSection = ({ loc }: { loc: Location }) => {
  const wire = useStructure()
  return (
  <section>
    <SectionHeader>Events</SectionHeader>
    {wire ? <WireList rows={3} avatar={false} trailing /> : <ListCard
      rows={loc.events.map((e) => ({ key: e.title, title: e.title, detail: e.when }))}
      empty={<span className="text-[17px] leading-6">No events this week</span>}
    />}
  </section>
  )
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function BellButton({ unread, onClick }: { unread: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-haspopup="dialog"
      className="flex size-9 items-center justify-center rounded-full"
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <span className="relative">
        <IconBell size={24} stroke={1.75} className="text-[#141414]" />
        {unread > 0 && (
          <span className="absolute right-[1px] top-[1px] size-2 rounded-full bg-[#ff3b30] ring-2 ring-white/70" />
        )}
      </span>
    </button>
  )
}

/**
 * The location title: wraps to two lines, then shrinks its box to the widest line. That leaves the
 * chevron parked right after the text and vertically centered on the whole title, however it wraps.
 */
function TitleText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.width = ""
      const range = document.createRange()
      range.selectNodeContents(el)
      const rects = [...range.getClientRects()]
      if (!rects.length) return
      const scale = el.getBoundingClientRect().width / el.offsetWidth || 1
      const w = Math.max(...rects.map((r) => r.right)) - Math.min(...rects.map((r) => r.left))
      el.style.width = `${Math.ceil(w / scale) + 1}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el.parentElement!)
    return () => ro.disconnect()
  }, [text])
  return (
    <span ref={ref} className="line-clamp-2 min-w-0 text-left text-[18px] font-[590] leading-[21px]">
      {text}
    </span>
  )
}

function Toolbar({ view, loc, unread, actions, hideBell, leading, hideProfile, canSwitch, onClock, clockActive, showClock, onTitle, onProfile, onBell }: { view: View; loc: Location; unread: number; /** Per-tab actions, shown at the left of the top-right cluster. */ actions?: ReactNode; /** Drop the bell on tabs that don't want it (Chat). */ hideBell?: boolean; /** Shown before the title (iPad: the sidebar toggle once the sidebar is hidden). */ leading?: ReactNode; /** The avatar lives in the sidebar instead (iPad). */ hideProfile?: boolean; /** Only users with several locations get the location switcher. */ canSwitch?: boolean; /** Show the owner/manager time clock button (Home only). */ showClock?: boolean; /** Owner/manager time clock button: opens the same half sheet the accessory does. */ onClock?: () => void; clockActive?: boolean; onTitle: () => void; onProfile: () => void; onBell: () => void }) {
  const manager = view === "manager"
  const wire = useStructure()
  const locName = useLocName()
  return (
    <div
      className="absolute inset-x-4 z-20 flex items-start justify-between gap-3 pb-[10px]"
      style={{ top: "var(--safe-top)" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {leading}
        <button
          onClick={canSwitch ? onTitle : undefined}
          aria-haspopup={canSwitch ? "menu" : undefined}
          data-anno="location-title"
          disabled={!canSwitch}
          className="flex h-11 min-w-0 flex-1 items-center justify-start tracking-[-0.43px] text-[#1a1a1a]"
        >
          <TitleText text={locName(loc)} />
          {canSwitch && <IconSelector size={17} stroke={2.5} className="ml-[3px] shrink-0 text-[#4e4e4e]" />}
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-[10px]">
        {/* Like iOS: every action beside the bell shares ONE glass container. Buttons are 36pt on an 8pt gap, so icons sit 44pt apart (the Figma 18pt gap read wide for a group). */}
        <LiquidGlass mode="small" radius={999} className="flex h-11 items-center justify-center gap-2 px-1">
          {actions}
          {/* Owners and managers get the time clock up here (no bottom accessory): the same clock icon, with the green dot while clocked in. */}
          {manager && showClock && (
            <button onClick={onClock} aria-haspopup="dialog" className="flex size-9 items-center justify-center rounded-full active:opacity-60" aria-label="Time clock">
              <span className="relative size-6">
                <img src="/phone/clock-stroke.svg" alt="" className="size-6" />
                {clockActive && <span aria-hidden className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-[1.5px] ring-white" />}
              </span>
            </button>
          )}
          {!hideBell && <BellButton unread={unread} onClick={onBell} />}
        </LiquidGlass>
        {!hideProfile && (
          <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
            <button onClick={onProfile} aria-label="Profile and settings" aria-haspopup="dialog" data-anno="profile" className="size-[42px] rounded-full">
              {wire ? <Initials name={ANON.name} size={42} /> : <img src="/phone/avatar.jpg" alt="" className="size-full rounded-full object-cover" />}
            </button>
          </LiquidGlass>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scroll container shared by both dashboards. Re-keyed per location so the
// content cross-fades when the switcher changes.
// ---------------------------------------------------------------------------

function ScreenScroll({
  locationId,
  onScroll,
  top,
  className,
  fade = true,
  children,
}: {
  locationId: string
  onScroll: ScrollHandler
  top: number
  className?: string
  /** Cross-fade in on mount. Off for pages with glass: an opacity < 1 ancestor stops it refracting until the fade ends. */
  fade?: boolean
  children: ReactNode
}) {
  // Room for the floating tab bar and clock accessory on a phone; an iPad has neither.
  const tablet = useViewStore((s) => s.device === "tablet")
  return (
    <motion.div
      key={locationId}
      initial={fade ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onScroll={onScroll}
      className={cn(
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 absolute inset-0 flex flex-col overflow-y-auto px-4",
        className,
      )}
      style={{
        paddingTop: `calc(var(--safe-top) + ${top}px)`,
        paddingBottom: `calc(var(--safe-bottom) + ${tablet ? 32 : 160}px)`,
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Two columns for a wide screen (iPad landscape): a fixed-width side with the headline content, and a scrolling
 * side with everything else. Each column scrolls on its own; the toolbar floats over both.
 */
function SplitScroll({ locationId, onScroll, gap, left, right }: { locationId: string; onScroll: ScrollHandler; gap?: string; left: ReactNode; right: ReactNode }) {
  const col = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 flex flex-col overflow-y-auto"
  const pad = { paddingTop: "calc(var(--safe-top) + 66px)", paddingBottom: "calc(var(--safe-bottom) + 32px)" }
  return (
    <motion.div key={locationId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex">
      <div className={cn(col, "w-[380px] shrink-0 pl-4 pr-2", gap)} style={pad}>{left}</div>
      <div onScroll={onScroll} className={cn(col, "min-w-0 flex-1 pl-2 pr-4", gap)} style={pad}>{right}</div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Manager dashboard
// ---------------------------------------------------------------------------

const SEGMENTS = [
  { id: "people", Icon: IconUser, label: "Employees", fmt: (n: number) => String(n) },
  { id: "sales", Icon: IconCurrencyDollar, label: "Sales", fmt: (n: number) => `$${(n / 1000).toFixed(1)}k` },
  { id: "traffic", Icon: IconWalk, label: "Foot traffic", fmt: (n: number) => String(n) },
] as const satisfies readonly { id: SegmentId; Icon: unknown; label: string; fmt: (n: number) => string }[]

function StatusWidget({ loc }: { loc: Location }) {
  const wire = useStructure()
  const [seg, setSeg] = useState<SegmentId>("people")
  if (wire) return <div data-anno="status"><WireCard title="Status" h={150} /></div>
  const current = SEGMENTS.find((s) => s.id === seg)!
  const data = loc.status[seg]
  return (
    <div data-anno="status">
    <Card className="overflow-hidden p-4">
      <div className="flex items-end justify-between">
        <div className="tracking-[-0.43px] text-black">
          <p className="text-[17px] font-bold leading-[normal]">Status</p>
          <p className="text-[13px] font-[510] leading-[normal]">{current.label}</p>
        </div>
        <div
          role="tablist"
          className="relative flex h-8 w-[131px] items-center gap-1 rounded-full bg-[#767680]/[0.12] p-[2px]"
        >
          {SEGMENTS.map(({ id, Icon, label }) => {
            const active = seg === id
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                aria-label={label}
                onClick={() => setSeg(id)}
                className="relative flex h-7 flex-1 items-center justify-center rounded-full text-[#2c2935]"
              >
                {active && (
                  <motion.span
                    layoutId="seg"
                    transition={SPRING_FAST.snappy}
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
                  />
                )}
                <Icon size={16} stroke={2.25} className="relative" />
              </button>
            )
          })}
        </div>
      </div>
      <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {HOUR_LABELS.map((h, i) => (
          <div key={i} className="flex w-12 shrink-0 flex-col items-center gap-3 tracking-[-0.43px]">
            <div className="flex items-baseline gap-px font-[590] text-black">
              <span className="text-[17px]">{h}</span>
              {i > 0 && <span className="text-[13px]">PM</span>}
            </div>
            <div className="flex flex-col items-center gap-px">
              <span className="text-[17px] font-[590] leading-[22px] text-black">{current.fmt(data.actual[i])}</span>
              <span className="text-[13px] leading-[18px] text-[#9a9a9a]">{current.fmt(data.planned[i])}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
    </div>
  )
}

const fmtK = (n: number) => `$${(n / 1000).toFixed(1)}K`
const BLUE = "#8f55e5"
const GREEN = "#12a53b"

/**
 * The sales-vs-labor week: a pair of bars per day, labelled with the day's sales. Days that have happened are solid; the
 * days still to come are a lighter projection, so the week reads as a whole instead of stopping at today. Used by the
 * all-locations widget and each business.
 */
function SalesLaborChart({ sales, labor, forecast, forecastLaborPct, H = 84 }: { sales: number[]; labor: number[]; forecast?: number[]; /** Labor for projected days, as a share of their sales. */ forecastLaborPct?: number; H?: number }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"]
  const proj = forecast ?? days.map(() => 0)
  const max = Math.max(...sales, ...proj, 1)
  const TOP = 24 // the chart's top padding
  const rule = "rgba(120,120,128,0.2)"
  return (
    <div className="relative px-1 pb-3 pt-6">
      {/* Faint rules at the baseline, halfway and the top of the scale. */}
      {[0, 1, 2].map((k) => (
        <span key={k} aria-hidden className="pointer-events-none absolute inset-x-1" style={{ top: TOP + 22 + H - (k * H) / 2, borderTop: `1px ${k === 0 ? "solid" : "dashed"} ${rule}` }} />
      ))}
      <div className="relative flex items-end justify-between">
        {days.map((d, i) => {
          const actual = sales[i] > 0
          const value = actual ? sales[i] : proj[i]
          const lab = actual ? labor[i] : (proj[i] * (forecastLaborPct ?? 13)) / 100
          return (
            <div key={i} className="flex w-[44px] flex-col items-center">
              <div className="relative flex items-end gap-[6px]" style={{ height: H + 22, opacity: actual ? 1 : 0.4 }}>
                {value > 0 && (
                  <>
                    <span className="absolute left-1/2 -translate-x-[78%] whitespace-nowrap text-[11px] font-[590] leading-4" style={{ bottom: (value / max) * H + 4, color: BLUE }}>
                      {fmtK(value)}
                    </span>
                    <span className="w-[7px] rounded-full" style={{ height: (value / max) * H, backgroundColor: BLUE }} />
                    <span className="w-[7px] rounded-full" style={{ height: Math.max(4, (lab / max) * H), backgroundColor: GREEN }} />
                  </>
                )}
              </div>
              <span className="pt-1 text-[12px] font-[590] leading-4 text-[#747182]">{d}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** One location's row in the all-locations card: name, headcount, clocked in, sales, labor %. Also what the page grows out of. */
function LocationRowBody({ l }: { l: Location }) {
  const locName = useLocName()
  const wire = useStructure()
  if (wire) {
    // Enough going on to read as a real, tappable row: the name over a line, a figure and a chip, and a chevron.
    return (
      <span className="flex w-full items-center gap-3 py-3 text-left tracking-[-0.43px]">
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="truncate text-[17px] font-normal leading-[22px] text-black">{locName(l)}</span>
          <Bar w="45%" h={10} />
        </span>
        <span className="flex shrink-0 flex-col items-end gap-[6px]">
          <Bar w={46} h={12} />
          <span aria-hidden className="block h-[18px] w-10 rounded-[7px] bg-[#dedde4]" />
        </span>
        <IconChevronRight size={18} stroke={2.5} className="shrink-0 text-[#c7c7cc]" />
      </span>
    )
  }
  const clocked = l.team.filter((m) => m.status === "on").length
  return (
    <span className="flex w-full items-start justify-between gap-3 py-3 text-left tracking-[-0.43px]">
      <span className="min-w-0">
        <span className="block text-[17px] font-normal leading-[22px] text-black">{locName(l)}</span>
        <span className="mt-1 flex items-center gap-3 text-[15px] leading-5 text-[#7f7f7f]">
          <span className="flex items-center gap-1">
            <IconUserFilled size={16} />
            {l.team.length}
          </span>
          <span className="flex items-center gap-1">
            <IconClockFilled size={16} />
            {clocked}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[17px] font-[590] leading-[22px] text-black">{money(l.sales)}</span>
        <span className="rounded-[7px] px-[7px] py-[1px] text-[13px] font-[510] leading-[18px] text-white" style={{ backgroundColor: l.laborPct < 15 ? GREEN : "#d0161f" }}>
          {l.laborPct}%
        </span>
      </span>
    </span>
  )
}

/**
 * Multiple locations only: every location side by side — a sales-vs-labor week chart over the combined
 * numbers, then a row per location. Tapping a row opens that business's overview, growing out of the row.
 */
function AllLocationsWidget({ onOpen }: { onOpen: (l: Location, row: HTMLElement) => void }) {
  const locName = useLocName()
  const wire = useStructure()
  if (wire) {
    return (
      <div data-anno="all-locations">
      <WireCard h={200}>
        <span aria-hidden className="mb-3 mt-3 block h-24 rounded-[14px] bg-[#dedde4]" />
        <div className="border-t border-black/10">
          {LOCATIONS.map((l, i) => (
            <button key={l.id} onClick={(e) => onOpen(l, e.currentTarget)} aria-label={locName(l)} className={cn("block w-full text-left active:opacity-60", i > 0 && "border-t border-black/10")}>
              <LocationRowBody l={l} />
            </button>
          ))}
        </div>
      </WireCard>
      </div>
    )
  }
  const days = [0, 1, 2, 3, 4, 5, 6]
  const sales = days.map((i) => LOCATIONS.reduce((n, l) => n + l.weekSales[i], 0))
  const labor = days.map((i) => LOCATIONS.reduce((n, l) => n + l.weekLabor[i], 0))
  const forecast = days.map((i) => LOCATIONS.reduce((n, l) => n + l.weekForecast[i], 0))
  const pct = LOCATIONS.reduce((n, l) => n + l.laborPct, 0) / LOCATIONS.length
  return (
    <div data-anno="all-locations">
    <Card className="bg-[#e9e8ec] p-4 tracking-[-0.43px]">
      <SalesLaborChart sales={sales} labor={labor} forecast={forecast} forecastLaborPct={pct} />
      <div className="border-t border-black/10">
        {LOCATIONS.map((l, i) => (
          <button key={l.id} onClick={(e) => onOpen(l, e.currentTarget)} className={cn("block w-full text-left active:opacity-60", i > 0 && "border-t border-black/10")}>
            <LocationRowBody l={l} />
          </button>
        ))}
      </div>
    </Card>
    </div>
  )
}

/** The big page title: fades out as the page scrolls, while the toolbar's copy fades in (the iOS large-title behaviour). */
function LargeTitle({ scrollY, children }: { scrollY: MotionValue<number>; children: ReactNode }) {
  const opacity = useTransform(scrollY, [0, 50], [1, 0])
  return <motion.h1 style={{ opacity }} className="text-[28px] font-[590] leading-[34px] text-black">{children}</motion.h1>
}

function ToolbarTitle({ scrollY, children }: { scrollY: MotionValue<number>; children: ReactNode }) {
  const opacity = useTransform(scrollY, [30, 70], [0, 1])
  return (
    <motion.h2 style={{ opacity }} className="flex h-11 items-center justify-center px-16 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#1a1a1a]">
      <span className="truncate">{children}</span>
    </motion.h2>
  )
}

/**
 * One business's overview (multiple locations): its own hero graph, then the same kinds of cards the dashboard has,
 * for just this location. It grows out of the row that was tapped; the X shrinks it back.
 */
function BusinessOverview({ loc, from, clone, onClosed }: { loc: Location; from: Box; clone: ReactNode; onClosed: () => void }) {
  const wire = useStructure()
  const locName = useLocName()
  const on = loc.team.filter((m) => m.status === "on").length
  return (
    <ExpandSurface
      from={from}
      clone={clone}
      cardClass={wire ? "bg-white" : "bg-[#e9e8ec]"}
      pageClass="bg-[#f3f2f6]"
      onClosed={onClosed}
      // Like a large title: the name in the toolbar fades in as the big one scrolls away.
      frostedToolbar
      toolbar={(scrollY) => <ToolbarTitle scrollY={scrollY}>{locName(loc)}</ToolbarTitle>}
      button={(close) => (
        <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
          <button onClick={close} aria-label="Close" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
            <IconX size={24} stroke={2} />
          </button>
        </LiquidGlass>
      )}
    >
      {(scrollY) => (
      <div className="flex flex-col gap-4 px-4 tracking-[-0.43px]" style={{ paddingTop: "calc(var(--safe-top) + 62px)", paddingBottom: "calc(var(--safe-bottom) + 32px)" }}>
        <LargeTitle scrollY={scrollY}>{locName(loc)}</LargeTitle>

        {wire ? (
          <>
            <WireCard title="Sales and labor" h={260} />
            <div className="flex gap-3">
              <WireCard title="Labor" h={96} className="flex-1" />
              <WireCard title="Team" h={96} className="flex-1" />
            </div>
          </>
        ) : (
          <>
            <Card className="p-4">
              <p className="text-[34px] font-[590] leading-[41px] text-black">{money(loc.sales)}</p>
              <p className="text-[15px] font-[510] leading-5 text-[#939393]">Total sales</p>
              <SalesLaborChart sales={loc.weekSales} labor={loc.weekLabor} forecast={loc.weekForecast} forecastLaborPct={loc.laborPct} H={120} />
              <div className="flex gap-4 text-[13px] leading-[18px] text-[#747182]">
                <span className="flex items-center gap-[6px]"><span className="size-2 rounded-full" style={{ backgroundColor: BLUE }} />Sales</span>
                <span className="flex items-center gap-[6px]"><span className="size-2 rounded-full" style={{ backgroundColor: GREEN }} />Labor</span>
              </div>
            </Card>
            <div className="flex gap-3">
              <Card className="flex-1 p-4">
                <p className="text-[15px] font-[510] leading-5 text-black">Labor</p>
                <p className="text-[28px] font-[590] leading-[34px]" style={{ color: loc.laborPct < 15 ? GREEN : "#d0161f" }}>{loc.laborPct}%</p>
                <p className="text-[13px] leading-[18px] text-[#7f7f7f]">of sales</p>
              </Card>
              <Card className="flex-1 p-4">
                <p className="text-[15px] font-[510] leading-5 text-black">Team</p>
                <p className="text-[28px] font-[590] leading-[34px] text-black">{on}<span className="text-[17px] font-normal text-[#7f7f7f]"> of {loc.team.length}</span></p>
                <p className="text-[13px] leading-[18px] text-[#7f7f7f]">clocked in</p>
              </Card>
            </div>
          </>
        )}

        <StatusWidget loc={loc} />

        <section>
          <SectionHeader>Needs Review</SectionHeader>
          {wire ? (
            <WireList rows={3} avatar={false} trailing />
          ) : (
            <ListCard
              rows={loc.review.map((r, i) => ({ key: `${r.title}${i}`, title: r.title, detail: r.detail }))}
              empty={
                <>
                  <IconCheck size={20} stroke={3} className="rounded-full bg-[#999] p-[3px] text-white" />
                  <span className="text-[17px] leading-6">All caught up</span>
                </>
              }
            />
          )}
        </section>

        <section>
          <SectionHeader>Manager Log</SectionHeader>
          {wire ? (
            <WireList rows={2} avatar={false} />
          ) : loc.managerLog.length === 0 ? (
            <Card className="flex h-[62px] items-center justify-center text-[17px] text-[#999]">No notes yet</Card>
          ) : (
            <Card className="overflow-hidden">
              {loc.managerLog.map((e, i) => (
                <div key={e.when + e.author} className={cn("px-4 py-3", i > 0 && "border-t border-black/[0.07]")}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[15px] font-[590] leading-5 text-black">{e.author}</span>
                    <span className="shrink-0 text-[13px] leading-[18px] text-[#8e8e93]">{e.when}</span>
                  </div>
                  <p className="line-clamp-2 pt-[2px] text-[15px] leading-5 text-[#2c2935]">{e.note}</p>
                </div>
              ))}
            </Card>
          )}
        </section>

        <EventsSection loc={loc} />
      </div>
      )}
    </ExpandSurface>
  )
}

function ManagerDashboard({ loc, multi, split, onScroll, onOpenPage, onOpenBusiness }: { loc: Location; multi?: boolean; /** Two columns (iPad landscape). */ split?: boolean; onScroll: ScrollHandler; onOpenPage: (p: HomePageId) => void; onOpenBusiness: (l: Location, row: HTMLElement) => void }) {
  const wire = useStructure()
  const hero = (
    <>
      {multi ? (
        <section className="-mt-2">
          <SectionHeader>All Locations</SectionHeader>
          <AllLocationsWidget onOpen={onOpenBusiness} />
        </section>
      ) : (
        <div className="flex flex-col items-center gap-1 py-3 tracking-[-0.43px]">
          {wire ? <Bar w={150} h={34} className="mb-1 self-start" /> : <p className="w-full text-[41px] font-[590] leading-[normal] text-black">{money(loc.sales)}</p>}
          <p className="w-full text-[18px] font-[510] leading-[normal] text-[#939393]">Total sales</p>
        </div>
      )}

      {wire ? (
        <BarLines />
      ) : (
        <p className="py-3 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-black text-balance">
          {loc.managerMessage}
        </p>
      )}

      <StatusWidget loc={loc} />
    </>
  )
  const rest = (
    <>
      <section>
        <SectionHeader>Needs Review</SectionHeader>
        {wire ? <WireList rows={3} avatar={false} trailing /> : <ListCard
          rows={loc.review.map((r, i) => ({ key: `${r.title}${i}`, title: r.title, detail: r.detail }))}
          empty={
            <>
              <IconCheck size={20} stroke={3} className="rounded-full bg-[#999] p-[3px] text-white" />
              <span className="text-[17px] leading-6">All caught up</span>
            </>
          }
        />}
      </section>

      <TaskManagerWidget loc={loc} onOpen={() => onOpenPage("tasks")} />

      <ManagerLogWidget loc={loc} onOpen={() => onOpenPage("log")} />

      <section>
        <SectionHeader>My Week (Shifts)</SectionHeader>
        {wire ? <WireList rows={3} avatar={false} trailing /> : <ListCard
          rows={loc.myWeek.map((s) => ({ key: s.day, title: `${s.day} · ${s.role}`, detail: s.time }))}
          empty={<span className="text-[17px] leading-6">No shifts this week</span>}
        />}
      </section>

      <EventsSection loc={loc} />
    </>
  )
  if (split) return <SplitScroll locationId={loc.id} onScroll={onScroll} gap="gap-4" left={hero} right={rest} />
  return (
    <ScreenScroll locationId={loc.id} onScroll={onScroll} top={152} className="gap-4">
      {hero}
      {rest}
    </ScreenScroll>
  )
}

// ---------------------------------------------------------------------------
// Employee home (Figma 41:20611)
// ---------------------------------------------------------------------------

const DAYS = ["M", "T", "W", "T", "F", "S", "S"]
const Y_AXIS = ["10p", "5p", "1p", "8a"]
/** Axis ticks as [hour, y px] — the labels aren't evenly spaced in hours, so interpolate between them. */
const TICKS: [number, number][] = [
  [8, 163],
  [13, 111],
  [17, 59],
  [22, 7],
]

function yOf(hour: number) {
  const h = Math.min(Math.max(hour, TICKS[0][0]), TICKS[3][0])
  for (let i = 0; i < TICKS.length - 1; i++) {
    const [h0, y0] = TICKS[i]
    const [h1, y1] = TICKS[i + 1]
    if (h <= h1) return y0 + ((h - h0) / (h1 - h0)) * (y1 - y0)
  }
  return TICKS[3][1]
}

function WeekChart({ loc }: { loc: Location }) {
  const wire = useStructure()
  const [selected, setSelected] = useState(loc.employee.todayIndex)
  if (wire) return <WireCard title="My week" h={216} />
  return (
    <div className="relative flex h-[216px] w-full items-start justify-between">
      <img src="/phone/chart-grid.svg" alt="" className="absolute left-0 top-[7px] h-[156px] w-[338px]" />
      {loc.employee.week.map((here, i) => {
        const active = selected === i
        // Scheduled here > scheduled at another location (grey) > free all day (dashed) > nothing.
        // Scheduled here > scheduled at another location (grey) > free (dashed) > nothing. They can work at several locations.
        const other = !here ? LOCATIONS.find((l) => l.id !== loc.id && l.employee.week[i])?.employee.week[i] ?? null : null
        const free = !here && !other ? USER_AVAILABILITY[i] : null
        const bar = here ?? other ?? free
        const top = bar ? yOf(bar.end) : 0
        const height = bar ? yOf(bar.start) - top : 0
        return (
          <button
            key={i}
            onClick={() => setSelected(i)}
            aria-label={`Day ${i + 1}`}
            aria-pressed={active}
            className="relative h-[216px] w-8"
          >
            {bar && (
              <span
                className={cn(
                  "absolute left-[6px] w-4 rounded-[4px]",
                  free && "border border-dashed border-[#cfcfcf]",
                )}
                style={{
                  top,
                  height,
                  backgroundColor: here ? (here.kind === "today" ? PURPLE_600 : PURPLE_200) : other ? "#e1e0e6" : undefined,
                }}
              />
            )}
            <span
              className={cn(
                "absolute left-0 top-[184px] flex size-7 items-center justify-center rounded-full text-[15px] font-[590] leading-[22px] tracking-[-0.43px] transition-colors duration-200",
                active ? "bg-black text-white" : "bg-black/10 text-[#747182]",
              )}
            >
              {DAYS[i]}
            </span>
          </button>
        )
      })}
      <div className="flex h-[170px] w-[21px] flex-col items-end justify-between text-right text-[12px] font-[590] tracking-[-0.43px] text-[#a2a2a2]">
        {Y_AXIS.map((y) => (
          <span key={y} className="w-full">{y}</span>
        ))}
      </div>
    </div>
  )
}

// [image, left, top, width, height] — the portrait crops from Figma.
const MATES = [
  ["/phone/mate-1.jpg", -7.53, -11.22, 47.95, 60.32],
  ["/phone/mate-2.jpg", -7.53, -11.22, 47.95, 60.32],
  ["/phone/mate-3.jpg", -3.5, -5.5, 39, 49],
  ["/phone/mate-4.jpg", -3.5, -5.5, 39, 49],
] as const

function Shiftmates({ photos, extra }: { photos: number[]; extra: number }) {
  return (
    <div className="absolute left-[13px] top-11 flex items-center">
      {photos.map((p) => {
        const [src, l, t, w, h] = MATES[p]
        return (
          <span
            key={p}
            className="relative -mr-[7px] size-9 shrink-0 overflow-hidden rounded-full border-[1.5px] border-white shadow-[0_2px_20px_rgba(0,0,0,0.1)]"
          >
            <img src={src} alt="" className="absolute max-w-none object-cover" style={{ left: l, top: t, width: w, height: h }} />
          </span>
        )
      })}
      {extra > 0 && (
        <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-b from-[#bfe8e9] to-[#64c3c4] text-[17px] font-[590] tracking-[-0.43px] shadow-[0_2px_20px_rgba(0,0,0,0.1)]">
          <span className="mix-blend-overlay text-black">+{extra}</span>
        </span>
      )}
    </div>
  )
}

const cardLabel = "absolute left-[13px] top-[11px] text-[15px] font-[510] leading-[22px] tracking-[-0.43px] text-black"

function EmployeeDashboard({ loc, split, onScroll, onOpenPage }: { loc: Location; /** Two columns (iPad landscape). */ split?: boolean; onScroll: ScrollHandler; onOpenPage: (p: HomePageId) => void }) {
  const e = loc.employee
  const wire = useStructure()
  const hero = (
    <>
      <WeekChart loc={loc} />

      {wire ? (
        <BarLines />
      ) : (
        <p className="py-3 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-black text-balance">
          {e.greeting}
        </p>
      )}
    </>
  )
  const rest = (
    <>
      <div className="flex gap-3 pt-4">
        <button onClick={() => onOpenPage("earnings")} aria-label="Open earnings" data-anno="earnings" className="flex flex-1 text-left active:opacity-80">
          <Card className="relative h-28 w-full">
            <p className={cardLabel}>Earnings</p>
            {!wire && (
              <div className="absolute inset-x-[13px] bottom-3 tracking-[-0.43px]">
                <p className="text-[28px] font-[590] leading-[34px] text-black">{USER_EARNINGS.today.amount}</p>
                <p className="text-[13px] leading-[16px] text-[#7f7f7f]">{USER_EARNINGS.today.detail}</p>
              </div>
            )}
          </Card>
        </button>
        <button onClick={() => onOpenPage("shiftmates")} aria-label="Open shiftmates" data-anno="shiftmates" className="flex flex-1 text-left active:opacity-80">
          <Card className="relative h-28 w-full">
            <p className={cardLabel}>Shiftmates</p>
            {!wire && <Shiftmates photos={e.shiftmates.photos} extra={e.shiftmates.extra} />}
          </Card>
        </button>
      </div>

      <EventsSection loc={loc} />

      {/* Some employees have access to the manager log. */}
      <TaskManagerWidget loc={loc} onOpen={() => onOpenPage("tasks")} />

      <ManagerLogWidget loc={loc} onOpen={() => onOpenPage("log")} />
    </>
  )
  if (split) return <SplitScroll locationId={loc.id} onScroll={onScroll} left={hero} right={rest} />
  return (
    <ScreenScroll locationId={loc.id} onScroll={onScroll} top={94}>
      {hero}
      {rest}
    </ScreenScroll>
  )
}

export function Home() {
  const platform = useViewStore((s) => s.platform)
  return (
    <>
      {platform === "android" ? <AndroidApp /> : <IosHome />}
      <Annotations />
    </>
  )
}

function IosHome() {
  // Who is looking decides the home page, the bottom nav and whether locations can be switched
  // (toggled from the bar above the phone; see useUserTypeStore).
  const userType = useUserTypeStore((s) => s.type)
  const view: View = userType === "employee" ? "employee" : "manager"
  const multi = canSwitchLocation(userType)
  const tabs: readonly TabId[] = userType === "employee" ? ["home", "money", "shifts", "chat"] : ["home", "shifts", "time", "chat"]
  const loc = useLocation()
  const [tab, setTab] = useState<TabId>("home")
  // iPad: the tab bar becomes Apple's sidebar, and the app's content slides over to make room for it.
  const tablet = useViewStore((s) => s.device === "tablet")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const paneLeft = tablet && sidebarOpen ? SIDEBAR_W : 0
  // iPad on its side has room for two columns: the content splits into a left side and a right side.
  const landscape = useViewStore((s) => s.orientation === "landscape")
  const split = tablet && landscape
  // A different kind of user can have different tabs: start again from Home.
  useEffect(() => {
    setTab("home")
  }, [userType])
  // A single-location owner/manager is pinned to their location (a saved choice from another type doesn't leak over).
  const setLocation = useLocationStore((s) => s.setLocation)
  useEffect(() => {
    if (!multi) setLocation(LOCATIONS[0].id)
  }, [multi, setLocation])
  const [menuOpen, setMenuOpen] = useState(false)
  // The toolbar plus opens an action menu anchored to it; `screen` is where that menu renders.
  const [plusAnchor, setPlusAnchor] = useState<HTMLElement | null>(null)
  const [screen, setScreen] = useState<HTMLDivElement | null>(null)
  const closePlus = useCallback(() => setPlusAnchor(null), [])
  // "Add shift" and "Add event" from the plus menu are bottom sheets.
  const [shiftOpen, setShiftOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  // The Time tab's plus opens the Add time card page.
  const [timeCardOpen, setTimeCardOpen] = useState(false)
  const closeTimeCard = useCallback(() => setTimeCardOpen(false), [])
  const closeShift = useCallback(() => setShiftOpen(false), [])
  const closeEvent = useCallback(() => setEventOpen(false), [])
  // The Time page's filters: which sheet is open, and what each has chosen.
  const [filterSheet, setFilterSheet] = useState<FilterKind | null>(null)
  const [timeFilters, setTimeFilters] = useState<TimeFilters>(NO_FILTERS)
  const [profileOpen, setProfileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const closeAssistant = useCallback(() => setAssistantOpen(false), [])
  const [requestsOpen, setRequestsOpen] = useState(false)
  const closeRequests = useCallback(() => setRequestsOpen(false), [])
  // The bell badge is the number of requests still waiting on a decision.
  const decided = useRequestsStore((s) => s.decided)
  const added = useRequestsStore((s) => s.added)
  const pending = pendingFor(loc, decided, added).length
  const [halfOpen, setHalfOpen] = useState(false)
  const closeHalf = useCallback(() => setHalfOpen(false), [])
  // 0 = accessory, 1 = half sheet. The sheet surface fades in over the (opaque) accessory, which is hidden once covered.
  const halfP = useMotionValue(0)
  // visibility, not opacity: an opacity < 1 ancestor would isolate the glass backdrop and it would snap in at 1.
  const accessoryVisibility = useTransform(halfP, (v) => (v >= HANDOFF ? "hidden" : "visible"))
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  // The dashboard widgets (manager log, earnings, shiftmates) open full pages above the tab bar.
  const [homePage, setHomePage] = useState<HomePageId | null>(null)
  const closeHomePage = useCallback(() => setHomePage(null), [])
  // A business overview grows out of the row that was tapped in the all-locations card.
  const [biz, setBiz] = useState<{ loc: Location; from: Box; clone: ReactNode } | null>(null)
  const openBiz = useCallback((l: Location, row: HTMLElement) => {
    const from = boxOf(row)
    // The overview fills the content pane, so measure from the pane's edge, not the screen's.
    if (from) setBiz({ loc: l, from: { ...from, left: from.left - paneLeft }, clone: <LocationRowBody l={l} /> })
  }, [paneLeft])
  const closeBiz = useCallback(() => setBiz(null), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  // tabBarMinimizeBehavior(.onScrollDown): the tab bar collapses to one icon with the accessory nested beside it as
  // you scroll down, and comes back as you scroll up. Switched OFF: the bar stays fully expanded. Flip to re-enable.
  const MINIMIZE_ON_SCROLL = false
  const [minimized, setMinimized] = useState(false)
  const lastTop = useRef(0)
  const onScroll: ScrollHandler = (e) => {
    if (!MINIMIZE_ON_SCROLL) return
    const top = e.currentTarget.scrollTop
    const dy = top - lastTop.current
    if (Math.abs(dy) < 6) return
    lastTop.current = top
    if (dy > 0 && top > 24) setMinimized(true)
    else if (dy < 0) setMinimized(false)
  }

  // Phone-first prototype: the page itself never scrolls, only the screen does.
  useEffect(() => {
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.documentElement.style.overflow = prev
    }
  }, [])

  // The accessory is a view of the clock state, so it always agrees with the sheet.
  const clockState = useClock(loc)
  const wireCut = useStructure()
  const { title, subtitle: rawSubtitle } = accessoryFor(loc, clockState)
  // The structure cut keeps the status and drops the times.
  const subtitle = wireCut ? "" : rawSubtitle
  // The Chat tab never shows the accessory, whatever the shift state.
  // Employees get the anchored accessory (not on Chat); owners and managers get the time clock button in the toolbar instead.
  const showAccessory = !tablet && tab !== "chat" && userType === "employee"

  return (
    <IosFrame header={<UserTypeToggle />} footer={<PrototypeFooter />}>
      {tablet && (
        <IpadSidebar
          tabs={tabs}
          tab={tab}
          onTab={(t) => { setProfileOpen(false); setHomePage(null); setTab(t) }}
          dots={{ chat: loc.messages.some((m) => m.unread) }}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          onProfile={() => setProfileOpen(true)}
          onAssistant={userType === "employee" ? undefined : () => setAssistantOpen(true)}
          clock={{ title, subtitle, status: clockState.status, onOpen: () => setHalfOpen(true) }}
        />
      )}
      {/* Everything but the sheets lives in this pane, which slides over as the sidebar opens and closes. */}
      <motion.div initial={false} animate={{ left: paneLeft }} transition={SIDEBAR_SPRING} className="absolute inset-y-0 right-0">
      {tab === "home" ? (
        view === "manager" ? (
          <ManagerDashboard loc={loc} split={split} multi={userType === "multi"} onScroll={onScroll} onOpenPage={setHomePage} onOpenBusiness={openBiz} />
        ) : (
          <EmployeeDashboard loc={loc} split={split} onScroll={onScroll} onOpenPage={setHomePage} />
        )
      ) : tab === "chat" && tablet ? (
        <MessagesSplit key={loc.id} loc={loc} />
      ) : tab === "shifts" && split ? (
        <OverlayRoot.Provider value={screen}>
          <ShiftsPage key={loc.id} loc={loc} split />
        </OverlayRoot.Provider>
      ) : tab === "time" && split ? (
        <OverlayRoot.Provider value={screen}>
          <TimePage key={loc.id} loc={loc} split filters={timeFilters} onFilter={setFilterSheet} />
        </OverlayRoot.Provider>
      ) : (
        // Menus opened from a page (e.g. the Shifts filter) render into the screen overlay.
        <OverlayRoot.Provider value={screen}>
        <ScreenScroll key={tab} locationId={`${tab}:${loc.id}`} onScroll={onScroll} top={54} fade={false}>
          {tab === "money" && <MoneyPage loc={loc} />}
          {tab === "shifts" && <ShiftsPage loc={loc} />}
          {tab === "time" && <TimePage loc={loc} filters={timeFilters} onFilter={setFilterSheet} />}
          {tab === "chat" && <ChatPage loc={loc} />}
        </ScreenScroll>
        </OverlayRoot.Provider>
      )}
      <EdgeBlur
        top={{ strength: 24, steps: 6, height: "calc(var(--safe-top) + 64px)" }}
        // Taller and firmer than the top edge: this one has to lift the nav bar (and the clock bar) off whatever scrolls under it.
        bottom={tablet ? false : { strength: 28, steps: 8, height: "calc(var(--safe-bottom) + 140px)", tint: "var(--ios-page-tint-strong, rgba(243,242,246,0.92))" }}
      />
      <Toolbar
        view={view}
        loc={loc}
        unread={pending}
        canSwitch={multi}
        onClock={() => setHalfOpen(true)}
        // The iPad has the time clock in its sidebar, so no clock button up here.
        showClock={tab === "home" && !tablet}
        clockActive={clockState.status === "in"}
        hideBell={tab === "chat"}
        hideProfile={tablet}
        leading={tablet && !sidebarOpen ? <SidebarToggle open={false} onClick={() => setSidebarOpen(true)} /> : undefined}
        actions={
          tab === "shifts" ? (
            <button
              aria-label="Add"
              aria-haspopup="menu"
              onClick={(e) => setPlusAnchor(e.currentTarget)}
              className="flex size-9 items-center justify-center rounded-full text-[#141414]"
            >
              <IconPlus size={24} stroke={1.75} />
            </button>
          ) : tab === "time" ? (
            <button aria-label="Add time entry" onClick={() => setTimeCardOpen(true)} className="flex size-9 items-center justify-center rounded-full text-[#141414]">
              <IconPlus size={24} stroke={1.75} />
            </button>
          ) : tab === "chat" ? (
            <>
              <button aria-label="New message" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconPlus size={24} stroke={1.75} />
              </button>
              <button aria-label="Search messages" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconSearch size={24} stroke={1.75} />
              </button>
            </>
          ) : undefined
        } onBell={() => setRequestsOpen(true)} onTitle={() => setMenuOpen((o) => !o)} onProfile={() => setProfileOpen(true)} />
      <LocationMenu open={menuOpen} onClose={closeMenu} />
      <AnimatePresence>
        {homePage && (
          <FullPage key={homePage} title={HOME_PAGE_TITLES[homePage]} onBack={closeHomePage}>
            <HomePage id={homePage} loc={loc} />
          </FullPage>
        )}
      </AnimatePresence>
      {biz && <BusinessOverview key={biz.loc.id} loc={biz.loc} from={biz.from} clone={biz.clone} onClosed={closeBiz} />}
      {profileOpen && tablet && <ProfileSheet inline loc={loc} onClose={closeProfile} />}
      </motion.div>
      <motion.div style={{ visibility: accessoryVisibility }} className="pointer-events-none absolute inset-0 z-20">
        <AnimatePresence initial={false}>
        {!minimized && showAccessory && (
          <motion.div
            key="accessory"
            // Slide only — no fade (see the note above about glass + opacity).
            initial={{ y: 32 }}
            animate={{ y: 0 }}
            exit={{ y: 32 }}
            transition={SPRING_FAST.snappy}
            data-anno="clock-accessory"
            className="pointer-events-auto absolute inset-x-7"
            style={{ bottom: "calc(var(--safe-bottom) + 64px)" }}
          >
            <BottomAccessory placement="expanded" title={title} subtitle={subtitle} active={clockState.status === "in"} onOpen={() => setHalfOpen(true)} />
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
      {!tablet && (
        <TabBar
          tabs={tabs}
          dots={{ chat: loc.messages.some((m) => m.unread) }}
          tab={tab}
          onTab={(t) => {
            setTab(t)
            setMinimized(false)
            lastTop.current = 0
          }}
          onAssistant={userType === "employee" ? undefined : () => setAssistantOpen(true)}
          minimized={minimized}
          onExpand={() => setMinimized(false)}
          inlineAccessory={!showAccessory ? null : <BottomAccessory placement="inline" title={title} subtitle={subtitle} active={clockState.status === "in"} onOpen={() => setMinimized(false)} />}
        />
      )}
      {halfOpen && (
        <HalfSheet
          progress={halfP}
          height={sheetHeightFor(clockState.status)}
          hideTitle
          // Employees: the sheet grows out of the accessory. Owners and managers have no accessory: a normal bottom sheet.
          variant={userType === "employee" ? "morph" : "slide"}
          title="Time Clock"
          onClosed={closeHalf}
          collapsed={userType === "employee" ? <AccessoryContent title={title} subtitle={subtitle} active={clockState.status === "in"} /> : null}
        >
          {(close) => <TimeClockContent loc={loc} close={close} />}
        </HalfSheet>
      )}
      <div ref={setScreen} className="pointer-events-none absolute inset-0 z-[35]" />
      <ContextMenu
        anchor={plusAnchor}
        container={screen}
        items={[
          { id: "shift", label: "Add Shift", icon: <IconCalendarPlus size={22} stroke={1.5} /> },
          { id: "event", label: "Add Event", icon: <IconCalendarEvent size={22} stroke={1.5} /> },
        ]}
        onSelect={(id) => {
          if (id === "shift") setShiftOpen(true)
          if (id === "event") setEventOpen(true)
        }}
        onClose={closePlus}
      />
      {shiftOpen && <AddShiftSheet loc={loc} onClose={closeShift} />}
      {eventOpen && <AddEventSheet loc={loc} onClose={closeEvent} />}
      {assistantOpen && userType !== "employee" && <AssistantSheet loc={loc} onClose={closeAssistant} />}
      {filterSheet && <TimeFilterSheet key={filterSheet} kind={filterSheet} loc={loc} value={timeFilters[filterSheet]} onApply={(v) => setTimeFilters((f) => ({ ...f, [filterSheet]: v }))} onClose={() => setFilterSheet(null)} />}
      {timeCardOpen && <TimeCardSheet loc={loc} onClose={closeTimeCard} />}
      {profileOpen && !tablet && <ProfileSheet loc={loc} onClose={closeProfile} />}
      {requestsOpen && <RequestsSheet loc={loc} onClose={closeRequests} />}
    </IosFrame>
  )
}

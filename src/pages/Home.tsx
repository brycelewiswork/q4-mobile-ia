import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react"
import {
  IconBell,
  IconCheck,
  IconCurrencyDollar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconEdit,
  IconPlus,
  IconSearch,
  IconSelector,
  IconUser,
  IconUserFilled,
  IconClockFilled,
  IconWalk,
} from "@tabler/icons-react"
import { IPhoneFrame } from "@/components/ios/IPhoneFrame"
import { HANDOFF, HalfSheet, OverlayRoot } from "@/components/ios/HalfSheet"
import { UserTypeToggle } from "@/components/ios/UserTypeToggle"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { AssistantSheet } from "@/components/ios/AssistantSheet"
import { ContextMenu } from "@/components/ios/ContextMenu"
import { LocationMenu } from "@/components/ios/LocationMenu"
import { TimeClockContent, sheetHeightFor } from "@/components/ios/TimeClockContent"
import { ProfileSheet } from "@/components/ios/ProfileSheet"
import { RequestsSheet } from "@/components/ios/RequestsSheet"
import { AccessoryContent, BottomAccessory, TabBar, type TabId } from "@/components/ios/TabBar"
import { Squircle } from "@/components/squircle"
import { EdgeBlur } from "@/components/ios/EdgeBlur"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { ChatPage, MoneyPage, ShiftsPage, TimePage } from "@/pages/TabPages"
import { HOUR_LABELS, LOCATIONS, USER_EARNINGS, USER_AVAILABILITY, type Location, type SegmentId } from "@/data/locations"
import { useLocation, useLocationStore } from "@/store/useLocationStore"
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
    <h2 className="px-4 py-[10px] text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#747182]">
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

const EventsSection = ({ loc }: { loc: Location }) => (
  <section>
    <SectionHeader>Events</SectionHeader>
    <ListCard
      rows={loc.events.map((e) => ({ key: e.title, title: e.title, detail: e.when }))}
      empty={<span className="text-[17px] leading-6">No events this week</span>}
    />
  </section>
)

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

function Toolbar({ view, loc, unread, actions, hideBell, canSwitch, onClock, clockActive, showClock, onTitle, onProfile, onBell }: { view: View; loc: Location; unread: number; /** Per-tab actions, shown at the left of the top-right cluster. */ actions?: ReactNode; /** Drop the bell on tabs that don't want it (Chat). */ hideBell?: boolean; /** Only users with several locations get the location switcher. */ canSwitch?: boolean; /** Show the owner/manager time clock button (Home only). */ showClock?: boolean; /** Owner/manager time clock button: opens the same half sheet the accessory does. */ onClock?: () => void; clockActive?: boolean; onTitle: () => void; onProfile: () => void; onBell: () => void }) {
  const manager = view === "manager"
  return (
    <div
      className="absolute inset-x-4 z-20 flex items-start justify-between gap-3 pb-[10px]"
      style={{ top: "var(--safe-top)" }}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <button
          onClick={canSwitch ? onTitle : undefined}
          aria-haspopup={canSwitch ? "menu" : undefined}
          disabled={!canSwitch}
          className="flex h-11 w-full min-w-0 items-center justify-start tracking-[-0.43px] text-[#1a1a1a]"
        >
          <TitleText text={loc.name} />
          {canSwitch && <IconSelector size={17} stroke={2.5} className="ml-[3px] shrink-0 text-[#4e4e4e]" />}
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-[10px]">
        {/* Like iOS: every action beside the bell shares ONE glass container. */}
        <LiquidGlass mode="small" radius={999} className={cn("flex h-11 items-center justify-center", actions || showClock ? "gap-[18px] px-[6px]" : "px-1")}>
          {actions}
          {!hideBell && <BellButton unread={unread} onClick={onBell} />}
          {/* Owners and managers get the time clock up here (no bottom accessory): the same clock icon, with the green dot while clocked in. */}
          {manager && showClock && (
            <button onClick={onClock} aria-haspopup="dialog" className="flex size-9 items-center justify-center rounded-full active:opacity-60" aria-label="Time clock">
              <span className="relative size-6">
                <img src="/phone/clock-stroke.svg" alt="" className="size-6" />
                {clockActive && <span aria-hidden className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-[1.5px] ring-white" />}
              </span>
            </button>
          )}
        </LiquidGlass>
        <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
          <button onClick={onProfile} aria-label="Profile and settings" aria-haspopup="dialog" className="size-[42px] rounded-full">
            <img src="/phone/avatar.jpg" alt="" className="size-full rounded-full object-cover" />
          </button>
        </LiquidGlass>
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
        paddingBottom: "calc(var(--safe-bottom) + 160px)",
      }}
    >
      {children}
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
  const [seg, setSeg] = useState<SegmentId>("people")
  const current = SEGMENTS.find((s) => s.id === seg)!
  const data = loc.status[seg]
  return (
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
  )
}

const fmtK = (n: number) => `$${(n / 1000).toFixed(1)}K`
const BLUE = "#0f5bd6"
const GREEN = "#12a53b"

/**
 * Multiple locations only: every location side by side — a sales-vs-labor week chart over the combined
 * numbers, then a row per location (headcount, clocked in, sales, labor %). Takes the top of the page.
 */
function AllLocationsWidget({ onPick }: { onPick: (id: string) => void }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"]
  const sales = days.map((_, i) => LOCATIONS.reduce((n, l) => n + l.weekSales[i], 0))
  const labor = days.map((_, i) => LOCATIONS.reduce((n, l) => n + l.weekLabor[i], 0))
  const max = Math.max(...sales)
  const H = 84
  return (
    <Card className="bg-[#e9e8ec] p-4 tracking-[-0.43px]">
      <div className="flex items-end justify-between px-1 pb-3 pt-6">
        {days.map((d, i) => (
          <div key={i} className="flex w-[44px] flex-col items-center">
            <div className="relative flex items-end gap-[6px]" style={{ height: H + 22 }}>
              {sales[i] > 0 && (
                <>
                  <span className="absolute left-1/2 -translate-x-[78%] whitespace-nowrap text-[11px] font-[590] leading-4" style={{ bottom: (sales[i] / max) * H + 4, color: BLUE }}>
                    {fmtK(sales[i])}
                  </span>
                  <span className="w-[7px] rounded-full" style={{ height: (sales[i] / max) * H, backgroundColor: BLUE }} />
                  <span className="w-[7px] rounded-full" style={{ height: (labor[i] / max) * H, backgroundColor: GREEN }} />
                </>
              )}
            </div>
            <span className="pt-1 text-[12px] font-[590] leading-4 text-[#747182]">{d}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-black/10">
        {LOCATIONS.map((l, i) => {
          const clocked = l.team.filter((m) => m.status === "on").length
          return (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              className={cn("flex w-full items-start justify-between gap-3 py-3 text-left active:opacity-60", i > 0 && "border-t border-black/10")}
            >
              <span className="min-w-0">
                <span className="block text-[17px] font-[590] leading-[22px] text-black">{l.name}</span>
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
                <span className="rounded-[8px] px-2 py-[2px] text-[15px] font-[590] leading-5 text-white" style={{ backgroundColor: l.laborPct < 15 ? GREEN : "#d0161f" }}>
                  {l.laborPct}%
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function ManagerDashboard({ loc, multi, onScroll }: { loc: Location; multi?: boolean; onScroll: ScrollHandler }) {
  const setLocation = useLocationStore((s) => s.setLocation)
  return (
    <ScreenScroll locationId={loc.id} onScroll={onScroll} top={112} className="gap-4">
      {multi ? (
        <AllLocationsWidget onPick={setLocation} />
      ) : (
        <div className="flex flex-col items-center gap-1 py-3 tracking-[-0.43px]">
          <p className="w-full text-[41px] font-[590] leading-[normal] text-black">{money(loc.sales)}</p>
          <p className="w-full text-[18px] font-[510] leading-[normal] text-[#939393]">Total sales</p>
        </div>
      )}

      <p className="py-3 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-black text-balance">
        {loc.managerMessage}
      </p>

      <StatusWidget loc={loc} />

      <section>
        <SectionHeader>Needs Review</SectionHeader>
        <ListCard
          rows={loc.review.map((r, i) => ({ key: `${r.title}${i}`, title: r.title, detail: r.detail }))}
          empty={
            <>
              <IconCheck size={20} stroke={3} className="rounded-full bg-[#999] p-[3px] text-white" />
              <span className="text-[17px] leading-6">All caught up</span>
            </>
          }
        />
      </section>

      <section>
        <SectionHeader>My Week (Shifts)</SectionHeader>
        <ListCard
          rows={loc.myWeek.map((s) => ({ key: s.day, title: `${s.day} · ${s.role}`, detail: s.time }))}
          empty={<span className="text-[17px] leading-6">No shifts this week</span>}
        />
      </section>

      <EventsSection loc={loc} />
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
  const [selected, setSelected] = useState(loc.employee.todayIndex)
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

function EmployeeDashboard({ loc, onScroll }: { loc: Location; onScroll: ScrollHandler }) {
  const e = loc.employee
  return (
    <ScreenScroll locationId={loc.id} onScroll={onScroll} top={54}>
      <WeekChart loc={loc} />

      <p className="py-3 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-black text-balance">
        {e.greeting}
      </p>

      <div className="flex gap-3 pt-4">
        <Card className="relative h-28 flex-1">
          <p className={cardLabel}>Earnings</p>
          <div className="absolute inset-x-[13px] bottom-3 tracking-[-0.43px]">
            <p className="text-[28px] font-[590] leading-[34px] text-black">{USER_EARNINGS.today.amount}</p>
            <p className="text-[13px] leading-[16px] text-[#7f7f7f]">{USER_EARNINGS.today.detail}</p>
          </div>
        </Card>
        <Card className="relative h-28 flex-1">
          <p className={cardLabel}>Shiftmates</p>
          <Shiftmates photos={e.shiftmates.photos} extra={e.shiftmates.extra} />
        </Card>
      </div>

      <EventsSection loc={loc} />
    </ScreenScroll>
  )
}

export function Home() {
  // Who is looking decides the home page, the bottom nav and whether locations can be switched
  // (toggled from the bar above the phone; see useUserTypeStore).
  const userType = useUserTypeStore((s) => s.type)
  const view: View = userType === "employee" ? "employee" : "manager"
  const multi = canSwitchLocation(userType)
  const tabs: readonly TabId[] = userType === "employee" ? ["home", "money", "shifts", "chat"] : ["home", "shifts", "time", "chat"]
  const loc = useLocation()
  const [tab, setTab] = useState<TabId>("home")
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
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  // tabBarMinimizeBehavior(.onScrollDown): collapse on scroll down, restore on scroll up.
  const [minimized, setMinimized] = useState(false)
  const lastTop = useRef(0)
  const onScroll: ScrollHandler = (e) => {
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
  const { title, subtitle } = accessoryFor(loc, clockState)
  // The Chat tab never shows the accessory, whatever the shift state.
  // Employees get the anchored accessory (not on Chat); owners and managers get the time clock button in the toolbar instead.
  const showAccessory = tab !== "chat" && userType === "employee"

  return (
    <IPhoneFrame header={<UserTypeToggle />}>
      {tab === "home" ? (
        view === "manager" ? (
          <ManagerDashboard loc={loc} multi={userType === "multi"} onScroll={onScroll} />
        ) : (
          <EmployeeDashboard loc={loc} onScroll={onScroll} />
        )
      ) : (
        // Menus opened from a page (e.g. the Shifts filter) render into the screen overlay.
        <OverlayRoot.Provider value={screen}>
        <ScreenScroll key={tab} locationId={`${tab}:${loc.id}`} onScroll={onScroll} top={54} fade={false}>
          {tab === "money" && <MoneyPage loc={loc} />}
          {tab === "shifts" && <ShiftsPage loc={loc} />}
          {tab === "time" && <TimePage loc={loc} />}
          {tab === "chat" && <ChatPage loc={loc} />}
        </ScreenScroll>
        </OverlayRoot.Provider>
      )}
      <EdgeBlur
        top={{ strength: 24, steps: 6, height: "calc(var(--safe-top) + 64px)" }}
        bottom={{ strength: 20, steps: 6, height: "calc(var(--safe-bottom) + 88px)" }}
      />
      <Toolbar
        view={view}
        loc={loc}
        unread={pending}
        canSwitch={multi}
        onClock={() => setHalfOpen(true)}
        showClock={tab === "home"}
        clockActive={clockState.status === "in"}
        hideBell={tab === "chat"}
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
            <button aria-label="Add time entry" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
              <IconPlus size={24} stroke={1.75} />
            </button>
          ) : tab === "chat" ? (
            <>
              <button aria-label="Search messages" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconSearch size={24} stroke={1.75} />
              </button>
              <button aria-label="New message" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconEdit size={24} stroke={1.75} />
              </button>
            </>
          ) : undefined
        } onBell={() => setRequestsOpen(true)} onTitle={() => setMenuOpen((o) => !o)} onProfile={() => setProfileOpen(true)} />
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
            className="pointer-events-auto absolute inset-x-7"
            style={{ bottom: "calc(var(--safe-bottom) + 64px)" }}
          >
            <BottomAccessory placement="expanded" title={title} subtitle={subtitle} active={clockState.status === "in"} onOpen={() => setHalfOpen(true)} />
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
      <TabBar
        tabs={tabs}
        tab={tab}
        onTab={(t) => {
          setTab(t)
          setMinimized(false)
          lastTop.current = 0
        }}
        onAssistant={() => setAssistantOpen(true)}
        minimized={minimized}
        onExpand={() => setMinimized(false)}
        inlineAccessory={!showAccessory ? null : <BottomAccessory placement="inline" title={title} subtitle={subtitle} active={clockState.status === "in"} onOpen={() => setMinimized(false)} />}
      />
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
        onSelect={() => undefined}
        onClose={closePlus}
      />
      <LocationMenu open={menuOpen} onClose={closeMenu} />
      {assistantOpen && <AssistantSheet loc={loc} onClose={closeAssistant} />}
      {profileOpen && <ProfileSheet loc={loc} onClose={closeProfile} />}
      {requestsOpen && <RequestsSheet loc={loc} onClose={closeRequests} />}
    </IPhoneFrame>
  )
}

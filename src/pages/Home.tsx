import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react"
import {
  IconBell,
  IconCheck,
  IconChevronLeft,
  IconCurrencyDollar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconPlus,
  IconSearch,
  IconSelector,
  IconUser,
  IconWalk,
} from "@tabler/icons-react"
import { IosFrame } from "@/components/ios/IosFrame"
import { SitemapView } from "@/components/sitemap/SitemapView"
import { ViewSwitch } from "@/components/sitemap/ViewSwitch"
import { CommentsLayer } from "@/components/comments/CommentsLayer"
import { HANDOFF, HalfSheet, OverlayRoot } from "@/components/ios/HalfSheet"
import { PrototypeFooter } from "@/components/ios/PrototypeFooter"
import { UserTypeToggle } from "@/components/ios/UserTypeToggle"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { AddEventSheet } from "@/components/ios/AddEventSheet"
import { AddShiftSheet } from "@/components/ios/AddShiftSheet"
import { AssistantSheet } from "@/components/ios/AssistantSheet"
import { ContextMenu } from "@/components/ios/ContextMenu"
import { LocationMenu } from "@/components/ios/LocationMenu"
import { GroupSheet } from "@/components/ios/GroupSheet"
import { TimeClockContent, sheetHeightFor } from "@/components/ios/TimeClockContent"
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
import { HOUR_LABELS, LOCATIONS, USER_EARNINGS, nextShiftAnywhere, shortLocationName, recentLog, upcomingEvents, upcomingTasks, USER_AVAILABILITY, type Location, type SegmentId } from "@/data/locations"
import { OpenLocationContext, ScopeContext, useLocation, useLocationStore, useScope } from "@/store/useLocationStore"
import { Initials, ListRow } from "@/components/ios/list"
import { ANON, useLocName, useLocTitle, useStructure, useViewStore } from "@/store/useViewStore"
import { Annotations } from "@/components/Annotations"
import { AndroidApp } from "@/pages/android/AndroidApp"
import { Bar, BarLines, WireList } from "@/components/wire/Wire"
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
  rows: { key: string; title: string; detail: string; /** A small line under the title, e.g. the location it belongs to. */ tag?: string; /** A second line under the title, in gray. */ sub?: string }[]
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
          <span className="min-w-0">
            <span className="block text-[17px] leading-[22px] text-black">{r.title}</span>
            {r.sub && <span className="block truncate text-[15px] leading-5 text-[#7f7f7f]">{r.sub}</span>}
            {r.tag && <span className="block truncate text-[13px] leading-[18px] text-[#7f7f7f]">{r.tag}</span>}
          </span>
          {r.detail && <span className="shrink-0 text-[15px] text-[#7f7f7f]">{r.detail}</span>}
        </div>
      ))}
    </Card>
  )
}

/** Manager log, moved here from Settings: a full-width widget of the latest notes, newest first. */
/** The dashboard's Task Manager: the first few tasks, tickable, and a See all that opens the whole list. */
function TaskManagerWidget({ scope, onOpen }: { scope: Location[]; onOpen: () => void }) {
  const wire = useStructure()
  const locName = useLocName()
  const doneMap = useTasksStore((s) => s.done)
  const toggle = useTasksStore((s) => s.toggle)
  const all = scope.length > 1
  // Several locations: one list of what is due soonest, each task tagged with its location. One location: its first few.
  const shown = all ? upcomingTasks(scope, 4) : scope[0].tasks.slice(0, 3).map((t) => ({ ...t, loc: scope[0] }))
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
            const done = doneMap[taskKey(t.loc, t.id)] ?? t.done
            return (
              <ListRow key={`${t.loc.id}:${t.id}`} first={i === 0} onClick={() => toggle(taskKey(t.loc, t.id), done)} leading={<TaskTick done={done} />} title={t.title} subtitle={all ? locName(t.loc) : undefined} titleClassName={done ? "text-[#928fa0] line-through" : undefined} trailing={<span className="text-[15px]">{t.due}</span>} />
            )
          })}
        </Card>
      )}
    </section>
  )
}

function ManagerLogWidget({ scope, onOpen }: { scope: Location[]; onOpen: () => void }) {
  const wire = useStructure()
  const locName = useLocName()
  const all = scope.length > 1
  // Several locations: one list of the newest notes, each tagged with its location. One location: its notes.
  const notes = all ? recentLog(scope, 3) : scope[0].managerLog.map((e) => ({ ...e, loc: scope[0] }))
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
      ) : notes.length === 0 ? (
        <Card className="flex h-[62px] items-center justify-center text-[17px] text-[#999]">No notes yet</Card>
      ) : (
        <button onClick={onOpen} aria-label="Open the manager log" className="block w-full text-left active:opacity-80">
          <Card className="overflow-hidden">
            {notes.map((e, i) => (
              <div key={`${e.loc.id}:${e.when}${e.author}`} className={cn("px-4 py-3 tracking-[-0.43px]", i > 0 && "border-t border-black/[0.07]")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-[590] leading-5 text-black">{e.author}</span>
                  <span className="shrink-0 text-[13px] leading-[18px] text-[#8e8e93]">{e.when}</span>
                </div>
                <p className="line-clamp-2 pt-[2px] text-[15px] leading-5 text-[#2c2935]">{e.note}</p>
                {all && <p className="truncate pt-[2px] text-[13px] leading-[18px] text-[#7f7f7f]">{locName(e.loc)}</p>}
              </div>
            ))}
          </Card>
        </button>
      )}
    </section>
  )
}

const EventsSection = ({ scope }: { scope: Location[] }) => {
  const wire = useStructure()
  const locName = useLocName()
  const all = scope.length > 1
  return (
  <section>
    <SectionHeader>Events</SectionHeader>
    {/* Several locations: just the next few events, each tagged with its location, instead of a list per location. */}
    {wire ? <WireList rows={3} avatar={false} trailing /> : <ListCard
      rows={all
        ? upcomingEvents(scope).map((e) => ({ key: `${e.loc.id}:${e.title}`, title: e.title, detail: e.when, tag: locName(e.loc) }))
        : scope[0].events.map((e) => ({ key: e.title, title: e.title, detail: e.when }))}
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

function Toolbar({ title: titleOverride, view, loc, unread, actions, hideBell, leading, hideProfile, canSwitch, onClock, clockActive, showClock, onTitle, onProfile, onBell }: { /** Replaces the location title (Home is an overview, so it names its scope instead). */ title?: string; view: View; loc: Location; unread: number; /** Per-tab actions, shown at the left of the top-right cluster. */ actions?: ReactNode; /** Drop the bell on tabs that don't want it (Chat). */ hideBell?: boolean; /** Shown before the title (iPad: the sidebar toggle once the sidebar is hidden). */ leading?: ReactNode; /** The avatar lives in the sidebar instead (iPad). */ hideProfile?: boolean; /** Only users with several locations get the location switcher. */ canSwitch?: boolean; /** Show the owner/manager time clock button (Home only). */ showClock?: boolean; /** Owner/manager time clock button: opens the same half sheet the accessory does. */ onClock?: () => void; clockActive?: boolean; onTitle: () => void; onProfile: () => void; onBell: () => void }) {
  const manager = view === "manager"
  const wire = useStructure()
  const storeTitle = useLocTitle(loc)
  const title = titleOverride ?? storeTitle
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
          <TitleText text={title} />
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

function StatusWidget({ scope }: { scope: Location[] }) {
  const wire = useStructure()
  const [seg, setSeg] = useState<SegmentId>("people")
  if (wire) {
    // The card's shape without its content: the title, the three-way switch, and a row of hours each with a figure over a plan.
    return (
      <div data-anno="status">
        <Card className="overflow-hidden p-4 tracking-[-0.43px]">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[17px] font-bold leading-[normal] text-black">Status</p>
              <Bar w={64} h={10} className="mt-[5px]" />
            </div>
            <span aria-hidden className="flex h-8 w-[131px] items-center justify-around rounded-full bg-[#767680]/[0.12] px-2">
              {[0, 1, 2].map((i) => <span key={i} className={cn("size-4 rounded-full", i === 0 ? "bg-[#b9b8c1]" : "bg-[#dedde4]")} />)}
            </span>
          </div>
          <div aria-hidden className="mt-4 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex w-12 shrink-0 flex-col items-center gap-3">
                <Bar w={i === 0 ? 30 : 22} h={14} />
                <div className="flex flex-col items-center gap-[6px]">
                  <Bar w={26} h={14} className="bg-[#c9c8d1]" />
                  <Bar w={20} h={10} className="bg-[#ebebf0]" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }
  const current = SEGMENTS.find((s) => s.id === seg)!
  // Several locations add up: headcount, sales and foot traffic hour by hour.
  const data = {
    actual: HOUR_LABELS.map((_, i) => scope.reduce((n, l) => n + l.status[seg].actual[i], 0)),
    planned: HOUR_LABELS.map((_, i) => scope.reduce((n, l) => n + l.status[seg].planned[i], 0)),
  }
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

function ManagerDashboard({ loc, split, onScroll, onOpenPage }: { loc: Location; /** Two columns (iPad landscape). */ split?: boolean; onScroll: ScrollHandler; onOpenPage: (p: HomePageId) => void }) {
  const wire = useStructure()
  const scope = useScope()
  const all = scope.length > 1
  const sales = scope.reduce((n, l) => n + l.sales, 0)
  const on = scope.reduce((n, l) => n + l.team.filter((m) => m.status === "on").length, 0)
  const hero = (
    <>
      <div className="flex flex-col items-center gap-1 py-3 tracking-[-0.43px]">
        {wire ? <Bar w={150} h={34} className="mb-1 self-start" /> : <p className="w-full text-[41px] font-[590] leading-[normal] text-black">{money(sales)}</p>}
        <p className="w-full text-[18px] font-[510] leading-[normal] text-[#939393]">Total sales</p>
      </div>

      {wire ? (
        <BarLines />
      ) : (
        <p className="py-3 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-black text-balance">
          {all ? `${on} people are clocked in right now.` : loc.managerMessage}
        </p>
      )}

      <StatusWidget scope={scope} />
    </>
  )
  const rest = (
    <>
      <section>
        <SectionHeader>My Week (Shifts)</SectionHeader>
        {/* Monday to Sunday, with the hours worked running down each day, like the employee home. Across locations the days combine. */}
        <Card className="py-3">
          <div className="mx-auto w-[338px] max-w-full">
            <WeekChart loc={loc} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader>Needs Review</SectionHeader>
        {/* One list, not one per location: each row says what it is, who it is about, and (with several locations) where. */}
        {wire ? <WireList rows={3} avatar={false} trailing /> : <ListCard
          rows={scope.flatMap((l) => l.review.map((r, i) => ({ key: `${l.id}:${r.title}${i}`, title: r.title, sub: r.detail, detail: all ? shortLocationName(l) : "" })))}
          empty={
            <>
              <IconCheck size={20} stroke={3} className="rounded-full bg-[#999] p-[3px] text-white" />
              <span className="text-[17px] leading-6">All caught up</span>
            </>
          }
        />}
      </section>

      <TaskManagerWidget scope={scope} onOpen={() => onOpenPage("tasks")} />

      <ManagerLogWidget scope={scope} onOpen={() => onOpenPage("log")} />

      <EventsSection scope={scope} />
    </>
  )
  const key = all ? "all" : loc.id
  if (split) return <SplitScroll locationId={key} onScroll={onScroll} gap="gap-4" left={hero} right={rest} />
  return (
    <ScreenScroll locationId={key} onScroll={onScroll} top={152} className="gap-4">
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
  const all = useScope().length > 1
  const [selected, setSelected] = useState(loc.employee.todayIndex)
  // In "all locations" a day is scheduled if it is anywhere.
  const week = all ? loc.employee.week.map((_, i) => LOCATIONS.map((l) => l.employee.week[i]).find(Boolean) ?? null) : loc.employee.week
  if (wire) {
    // Seven days, a bar for when each is worked (one dashed: free), the day marker under it, and the hours down the side.
    const bars: ([number, number] | "free" | null)[] = [[34, 110], [14, 86], [58, 100], "free", [28, 96], null, [44, 70]]
    return (
      <div aria-hidden className="relative flex h-[216px] w-full items-start justify-between">
        {[7, 59, 111, 163].map((y) => <span key={y} className="absolute left-0 right-[30px]" style={{ top: y, borderTop: "1px dashed #e4e3ea" }} />)}
        {bars.map((b, i) => (
          <span key={i} className="relative h-[216px] w-8">
            {b === "free" && <span className="absolute left-[6px] w-4 rounded-[4px] border border-dashed border-[#cfcfcf]" style={{ top: 44, height: 92 }} />}
            {Array.isArray(b) && <span className={cn("absolute left-[6px] w-4 rounded-[4px]", i === 2 ? "bg-[#c9c8d1]" : "bg-[#dedde4]")} style={{ top: b[0], height: b[1] }} />}
            <span className={cn("absolute left-0 top-[184px] size-7 rounded-full", i === 2 ? "bg-[#c9c8d1]" : "bg-[#e7e6ec]")} />
          </span>
        ))}
        <span className="flex h-[170px] w-[21px] flex-col items-end justify-between">
          {[0, 1, 2, 3].map((i) => <Bar key={i} w={18} h={8} />)}
        </span>
      </div>
    )
  }
  return (
    <div className="relative flex h-[216px] w-full items-start justify-between">
      <img src="/phone/chart-grid.svg" alt="" className="absolute left-0 top-[7px] h-[156px] w-[338px]" />
      {week.map((here, i) => {
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
  const scope = useScope()
  const all = scope.length > 1
  const next = nextShiftAnywhere()
  // Shiftmates across locations: everyone's faces, and the overflow added up.
  const mates = all ? { photos: Array.from(new Set(scope.flatMap((l) => l.employee.shiftmates.photos))).slice(0, 4), extra: scope.reduce((n, l) => n + l.employee.shiftmates.extra + l.employee.shiftmates.photos.length, 0) - Math.min(4, new Set(scope.flatMap((l) => l.employee.shiftmates.photos)).size) } : e.shiftmates
  const hero = (
    <>
      {wire ? <Card className="p-3"><div className="mx-auto w-[338px] max-w-full"><WeekChart loc={loc} /></div></Card> : <WeekChart loc={loc} />}

      {wire ? (
        <BarLines />
      ) : (
        <p className="py-3 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-black text-balance">
          {all ? `Good morning!${next ? ` Your next shift is ${next.when} at ${next.loc.name}.` : ""}` : e.greeting}
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
            {!wire && <Shiftmates photos={mates.photos} extra={mates.extra} />}
          </Card>
        </button>
      </div>

      <EventsSection scope={scope} />

      {/* Some employees have access to the manager log. */}
      <TaskManagerWidget scope={scope} onOpen={() => onOpenPage("tasks")} />

      <ManagerLogWidget scope={scope} onOpen={() => onOpenPage("log")} />
    </>
  )
  const key = all ? "all" : loc.id
  if (split) return <SplitScroll locationId={key} onScroll={onScroll} left={hero} right={rest} />
  return (
    <ScreenScroll locationId={key} onScroll={onScroll} top={94}>
      {hero}
      {rest}
    </ScreenScroll>
  )
}

export function Home() {
  const platform = useViewStore((s) => s.platform)
  const view = useViewStore((s) => s.view)
  // The same page, two views: the sitemap of the mobile platform, or the prototype itself.
  if (view === "sitemap") {
    return (
      <>
        <SitemapView />
        <ViewSwitch />
        <CommentsLayer />
      </>
    )
  }
  return (
    <>
      {platform === "android" ? <AndroidApp /> : <IosHome />}
      <Annotations />
      <ViewSwitch />
      <CommentsLayer />
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
    setLocView(null)
  }, [userType])
  // A single-location owner/manager is pinned to their location (a saved choice from another type doesn't leak over).
  const setLocation = useLocationStore((s) => s.setLocation)
  const setAll = useLocationStore((s) => s.setAll)
  const all = useLocationStore((s) => s.all)
  const groupId = useLocationStore((s) => s.groupId)
  useEffect(() => {
    if (!multi) setLocation(LOCATIONS[0].id)
  }, [multi, setLocation])
  const [menuOpen, setMenuOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
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
  const scope = useScope()
  const pending = scope.reduce((n, l) => n + pendingFor(l, decided, added).length, 0)
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
  // Home is a fixed overview of every location the person has. One location's own view opens from a header on it
  // (or, on iPad, from the sidebar), in the same place, and the back button returns to the overview.
  const [locView, setLocView] = useState<Location | null>(null)
  const locName = useLocName()
  const homeScope = multi ? LOCATIONS : [loc]
  const viewScope = locView ? [locView] : homeScope
  const openLocation = useCallback((l: Location) => { setLocation(l.id); setLocView(l); setHomePage(null); setTab("home") }, [setLocation])
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
          onTab={(t) => { setProfileOpen(false); setHomePage(null); setLocView(null); setTab(t) }}
          dots={{ chat: scope.some((l) => l.messages.some((m) => m.unread)) }}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          locations={multi ? { activeId: locView ? locView.id : tab !== "home" && !all && !groupId ? loc.id : null, onOpen: openLocation, onAll: () => { setAll(true); setLocView(null); setHomePage(null); setTab("home") }, allActive: tab === "home" ? !locView : all } : undefined}
          onProfile={() => setProfileOpen(true)}
          onAssistant={userType === "employee" ? undefined : () => setAssistantOpen(true)}
          clock={{ title, subtitle, status: clockState.status, onOpen: () => setHalfOpen(true) }}
        />
      )}
      {/* Everything but the sheets lives in this pane, which slides over as the sidebar opens and closes. */}
      <motion.div initial={false} animate={{ left: paneLeft }} transition={SIDEBAR_SPRING} className="absolute inset-y-0 right-0">
      {tab === "home" ? (
        <ScopeContext.Provider value={viewScope}>
          <OpenLocationContext.Provider value={multi && !locView ? openLocation : null}>
            {view === "manager" ? (
              <ManagerDashboard loc={locView ?? loc} split={split} onScroll={onScroll} onOpenPage={setHomePage} />
            ) : (
              <EmployeeDashboard loc={locView ?? loc} split={split} onScroll={onScroll} onOpenPage={setHomePage} />
            )}
          </OpenLocationContext.Provider>
        </ScopeContext.Provider>
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
        // The overview has no title: it is the page you land on, and a title would only name the scope.
        title={tab === "home" ? (locView ? locName(locView) : "") : undefined}
        // Home is a fixed overview, so only the other tabs have a switcher.
        canSwitch={tab !== "home"}
        onClock={() => setHalfOpen(true)}
        // The iPad has the time clock in its sidebar, so no clock button up here.
        showClock={tab === "home" && !tablet}
        clockActive={clockState.status === "in"}
        hideBell={tab === "chat"}
        hideProfile={tablet}
        leading={
          <>
            {tablet && !sidebarOpen && <SidebarToggle open={false} onClick={() => setSidebarOpen(true)} />}
            {!tablet && tab === "home" && locView && (
              <LiquidGlass mode="small" radius={999} className="flex size-11 shrink-0 items-center justify-center">
                <button onClick={() => setLocView(null)} aria-label="Back to all locations" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                  <IconChevronLeft size={24} stroke={2} />
                </button>
              </LiquidGlass>
            )}
          </>
        }
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
      <LocationMenu open={menuOpen} onClose={closeMenu} onAll={multi ? () => setAll(true) : undefined} onNewGroup={multi ? () => setGroupOpen(true) : undefined} onAddLocation={multi ? undefined : () => {}} />
      {groupOpen && <GroupSheet onClose={() => setGroupOpen(false)} />}
      <AnimatePresence>
        {homePage && (
          <FullPage key={homePage} title={HOME_PAGE_TITLES[homePage]} onBack={closeHomePage}>
            <ScopeContext.Provider value={viewScope}>
              <HomePage id={homePage} loc={locView ?? loc} />
            </ScopeContext.Provider>
          </FullPage>
        )}
      </AnimatePresence>
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
          dots={{ chat: scope.some((l) => l.messages.some((m) => m.unread)) }}
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

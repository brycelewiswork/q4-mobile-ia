import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from "motion/react"
import {
  IconBell,
  IconCheck,
  IconChevronRight,
  IconX,
  IconCurrencyDollar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconChecklist,
  IconPigMoney,
  IconChevronLeft,
  IconSettings,
  IconCoin,
  IconCalendarClock,
  IconHeadset,
  IconStar,
  IconNotebook,
  IconReportMoney,
  IconUserPlus,
  IconPlus,
  IconSearch,
  IconUsers,
  IconSelector,
  IconUser,
  IconWalk,
} from "@tabler/icons-react"
import { IosFrame } from "@/components/ios/IosFrame"
import { HalfSheet, OverlayRoot } from "@/components/ios/HalfSheet"
import { ClockLocationStep } from "@/components/ios/ClockLocationStep"
import { PrototypeFooter } from "@/components/ios/PrototypeFooter"
import { UserTypeToggle } from "@/components/ios/UserTypeToggle"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { AddEventSheet } from "@/components/ios/AddEventSheet"
import { AddShiftSheet } from "@/components/ios/AddShiftSheet"
import { AssistantSheet } from "@/components/ios/AssistantSheet"
import { ContextMenu } from "@/components/ios/ContextMenu"
import { ExpandSurface, boxOf, type Box } from "@/components/ExpandSurface"
import { LocationMenu } from "@/components/ios/LocationMenu"
import { TimeClockContent, sheetHeightFor } from "@/components/ios/TimeClockContent"
import { FullPage } from "@/components/ios/FullPage"
import { TimeCardSheet } from "@/components/ios/TimeCardSheet"
import { HOME_PAGE_TITLES, HomePage, TaskTick, type HomePageId } from "@/pages/HomePages"
import { taskKey, useTasksStore } from "@/store/useTasksStore"
import { ProfileSheet } from "@/components/ios/ProfileSheet"
import { CustomizeMenuSheet } from "@/components/ios/CustomizeMenuSheet"
import { inMenuOrder, useMoreMenuStore } from "@/store/useMoreMenuStore"
import { RequestsSheet } from "@/components/ios/RequestsSheet"
import { PAGES } from "@/components/ios/ProfilePages"
import { SearchBar } from "@/components/ios/SearchBar"
import { TABS, TabBar, type TabId } from "@/components/ios/TabBar"
import { IpadSidebar, SIDEBAR_SPRING, SIDEBAR_W, SidebarLocationBody, SidebarToggle } from "@/components/ios/IpadSidebar"
import { Squircle } from "@/components/squircle"
import { EdgeBlur } from "@/components/ios/EdgeBlur"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { NO_FILTERS, TimeFilterSheet, type FilterKind, type TimeFilters } from "@/components/ios/TimeFilterSheet"
import { DashboardEditContext, DashboardWidget } from "@/components/DashboardEdit"
import { AddWidgetsSheet } from "@/components/ios/AddWidgetsSheet"
import { ChatPage, ConversationPage, MessagesSplit, MoneyPage, ShiftsPage, TimePage, type ConvoRow } from "@/pages/TabPages"
import { HOUR_LABELS, LOCATIONS, USER_EARNINGS, nextShiftAnywhere, shortLocationName, recentLog, upcomingEvents, upcomingTasks, USER_AVAILABILITY, type Location, type SegmentId } from "@/data/locations"
import { OpenLocationContext, ScopeContext, useLocation, useLocationStore, useScope } from "@/store/useLocationStore"
import { Initials, ListRow, SELF_TINT } from "@/components/ios/list"
import { ANON, useLocName, useLocTitle, useStructure, useViewStore } from "@/store/useViewStore"
import { AndroidApp } from "@/pages/android/AndroidApp"
import { Bar, BarLines, WireCard, WireList } from "@/components/wire/Wire"
import { seedClock, useClock, useTimeClockStore } from "@/store/useTimeClockStore"
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
function TitleText({ text, centered = true }: { text: string; centered?: boolean }) {
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
    <span ref={ref} className={cn("line-clamp-2 min-w-0 text-[18px] font-[590] leading-[21px]", centered ? "text-center" : "text-left")}>
      {text}
    </span>
  )
}

function Toolbar({ editDone, title: titleOverride, subtitle, loc, unread, actions, hideBell, leading, hideProfile, canSwitch, onClock, clockActive, showClock, onTitle, onProfile, onBell }: { /** Replaces the location title (Home is an overview, so it names its scope instead). */ /** Customize Dashboard is on: the whole right side becomes one check button that finishes it. */ editDone?: () => void; title?: string; /** The location, under the title, for pages scoped to one: tapping it switches. */ subtitle?: string; view?: View; loc: Location; unread: number; /** Per-tab actions, shown at the left of the top-right cluster. */ actions?: ReactNode; /** Drop the bell on tabs that don't want it (Chat). */ hideBell?: boolean; /** Shown before the title (iPad: the sidebar toggle once the sidebar is hidden). */ leading?: ReactNode; /** The avatar lives in the sidebar instead (iPad). */ hideProfile?: boolean; /** Only users with several locations get the location switcher. */ canSwitch?: boolean; /** Show the owner/manager time clock button (Home only). */ showClock?: boolean; /** Owner/manager time clock button: opens the same half sheet the accessory does. */ onClock?: () => void; clockActive?: boolean; onTitle: () => void; onProfile: () => void; onBell: () => void }) {
  const wire = useStructure()
  const storeTitle = useLocTitle(loc)
  const title = titleOverride ?? storeTitle
  // The title is centered between a leading button and the actions; with no button at the left (employees) it takes that place instead.
  const centered = !!leading
  return (
    <div
      className={cn("absolute inset-x-4 z-20 grid items-start gap-3 pb-[10px]", centered ? "grid-cols-[1fr_minmax(0,auto)_1fr]" : "grid-cols-[minmax(0,1fr)_auto]")}
      style={{ top: "var(--safe-top)" }}
    >
      {centered && (
        <div className="flex min-w-0 items-center justify-start gap-3">
          {leading}
        </div>
      )}
      <div className={cn("flex min-w-0", centered ? "justify-center" : "justify-start")}>
        <button
          onClick={canSwitch ? onTitle : undefined}
          aria-haspopup={canSwitch ? "menu" : undefined}
          data-anno="location-title"
          disabled={!canSwitch}
          className={cn("flex h-11 min-w-0 items-center tracking-[-0.43px] text-[#1a1a1a]", centered ? "justify-center" : "justify-start")}
        >
          {subtitle ? (
            <span className={cn("flex min-w-0 flex-col justify-center", centered ? "items-center" : "items-start")}>
              <span className="max-w-full truncate text-[18px] font-[590] leading-[21px]">{title}</span>
              <span className="flex max-w-full items-center text-[13px] leading-4 tracking-[-0.08px] text-[#6d6a7a]">
                <span className="truncate">{subtitle}</span>
                {canSwitch && <IconSelector size={14} stroke={2.5} className="ml-[2px] shrink-0" />}
              </span>
            </span>
          ) : (
            <>
              <TitleText text={title} centered={centered} />
              {canSwitch && <IconSelector size={17} stroke={2.5} className="ml-[3px] shrink-0 text-[#4e4e4e]" />}
            </>
          )}
        </button>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-[10px]">
        {editDone ? (
          <button onClick={editDone} aria-label="Done customizing" className="flex size-11 items-center justify-center rounded-full bg-[#8f55e5] text-white shadow-[0_6px_16px_rgba(143,85,229,0.4),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85">
            <IconCheck size={24} stroke={2.5} />
          </button>
        ) : (<>
        {/* Like iOS: every action beside the bell shares ONE glass container. Buttons are 36pt on an 8pt gap, so icons sit 44pt apart (the Figma 18pt gap read wide for a group). */}
        {(actions || showClock || !hideBell) && (
        <LiquidGlass mode="small" radius={999} className="flex h-11 items-center justify-center gap-2 px-1">
          {actions}
          {/* The time clock up here (owners and managers on a phone, everyone on a tablet): the clock icon, with the green dot while clocked in. */}
          {showClock && (
            <button onClick={onClock} aria-haspopup="dialog" className="flex size-9 items-center justify-center rounded-full active:opacity-60" aria-label="Time clock">
              <span className="relative size-6">
                <img src="/phone/clock-stroke.svg" alt="" className="size-6" />
                {clockActive && <span aria-hidden className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-[1.5px] ring-white" />}
              </span>
            </button>
          )}
          {!hideBell && <BellButton unread={unread} onClick={onBell} />}
        </LiquidGlass>
        )}
        </>)}
        {!editDone && !hideProfile && (
          <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
            <button onClick={onProfile} aria-label="Profile and settings" aria-haspopup="dialog" data-anno="profile" className="size-[42px] rounded-full">
              {wire ? <Initials name={ANON.name} size={42} tint={SELF_TINT} /> : <img src="/phone/avatar.jpg" alt="" className="size-full rounded-full object-cover" />}
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

/** The big page title: fades out as the page scrolls, while the toolbar's copy fades in (the iOS large-title behaviour). */
function LargeTitle({ scrollY, children }: { scrollY: MotionValue<number>; children: ReactNode }) {
  const opacity = useTransform(scrollY, [0, 50], [1, 0])
  return <motion.h1 style={{ opacity }} className="text-[28px] font-[590] leading-[34px] tracking-[-0.43px] text-black">{children}</motion.h1>
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
 * One location's own view, opened from the overview: the same dashboard, for just that location. It grows out of the
 * row or header that was tapped (a container transform) and the X shrinks it back into it.
 */
function LocationView({ loc, from, clone, employee, onClosed }: { loc: Location; from: Box; clone: ReactNode; employee: boolean; onClosed: () => void }) {
  const locName = useLocName()
  const noop = useCallback(() => {}, [])
  return (
    <ExpandSurface
      from={from}
      clone={clone}
      cardClass="bg-white"
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
        <ScopeContext.Provider value={[loc]}>
          <OpenLocationContext.Provider value={null}>
            <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4" style={{ paddingTop: "calc(var(--safe-top) + 62px)", paddingBottom: "calc(var(--safe-bottom) + 32px)" }}>
              <LargeTitle scrollY={scrollY}>{locName(loc)}</LargeTitle>
              {employee ? <EmployeeDashboard bare loc={loc} onScroll={noop} onOpenPage={noop} /> : <ManagerDashboard bare loc={loc} onScroll={noop} onOpenPage={noop} />}
            </div>
          </OpenLocationContext.Provider>
        </ScopeContext.Provider>
      )}
    </ExpandSurface>
  )
}

/**
 * The overview's breakdown of the hero number: the biggest few locations by sales, each with its labor share, and a tap
 * into that location. Only on the overview of several locations (a single location has nothing to break down).
 */
function LocationBreakdown({ scope }: { scope: Location[] }) {
  const open = useContext(OpenLocationContext)
  const wire = useStructure()
  const locName = useLocName()
  if (!open || scope.length < 2) return null
  const top = [...scope].sort((a, b) => b.sales - a.sales).slice(0, 4)
  return (
    <section data-anno="location-breakdown">
      <SectionHeader>Locations</SectionHeader>
      <Card className="overflow-hidden">
        {top.map((l, i) => {
          // What the row shows: also what its location's view grows out of.
          const body = (
            <span className="flex w-full items-center gap-3 px-4 py-3 text-left tracking-[-0.43px]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] leading-[22px] text-black">{wire ? locName(l) : shortLocationName(l)}</span>
                {wire ? (
                  <Bar w="45%" h={10} className="mt-[6px]" />
                ) : (
                  <span className="flex items-center gap-[6px] text-[13px] leading-[18px] text-[#7f7f7f]">
                    <span aria-hidden className="size-[7px] rounded-full" style={{ backgroundColor: l.laborPct < 15 ? "#12a53b" : "#d0161f" }} />
                    {l.laborPct}% labor
                  </span>
                )}
              </span>
              {wire ? <Bar w={44} h={12} /> : <span className="shrink-0 text-[17px] font-[590] leading-[22px] text-black">{money(l.sales)}</span>}
              <IconChevronRight size={16} stroke={2.5} className="shrink-0 text-[#c7c7cc]" />
            </span>
          )
          return (
            <button key={l.id} onClick={(e) => open(l, e.currentTarget, body)} className={cn("block w-full active:bg-black/[0.04]", i > 0 && "border-t border-black/[0.07]")}>
              {body}
            </button>
          )
        })}
      </Card>
    </section>
  )
}

function ManagerDashboard({ loc, split, bare, onScroll, onOpenPage, onEdit }: { loc: Location; /** Two columns (iPad landscape). */ split?: boolean; /** Just the content, for a page that does its own scrolling and title. */ bare?: boolean; onScroll: ScrollHandler; onOpenPage: (p: HomePageId) => void; /** Customize the dashboard: an Edit button at the top right of the page. */ onEdit?: () => void }) {
  const wire = useStructure()
  const scope = useScope()
  const { editing } = useContext(DashboardEditContext)
  const all = scope.length > 1
  const sales = scope.reduce((n, l) => n + l.sales, 0)
  const on = scope.reduce((n, l) => n + l.team.filter((m) => m.status === "on").length, 0)
  const hero = (
    <>
      {onEdit && !editing && (
        <div className="-mb-3 flex justify-end">
          <button onClick={onEdit} data-anno="home-edit" className="-mr-2 flex h-9 items-center rounded-full px-2 text-[17px] font-[510] tracking-[-0.43px] text-[#8f55e5] active:opacity-60">
            Edit
          </button>
        </div>
      )}
      <DashboardWidget id="sales">
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
      </DashboardWidget>

      <DashboardWidget id="locations" skip={scope.length < 2}>
        <LocationBreakdown scope={scope} />
      </DashboardWidget>

      <DashboardWidget id="status">
        <StatusWidget scope={scope} />
      </DashboardWidget>
    </>
  )
  const rest = (
    <>
      <DashboardWidget id="week">
      <section>
        <SectionHeader>My Week</SectionHeader>
        {/* Monday to Sunday, with the hours worked running down each day, like the employee home. Across locations the days combine. */}
        <Card className="py-3">
          <div className="mx-auto w-[338px] max-w-full">
            <WeekChart loc={loc} />
          </div>
        </Card>
      </section>
      </DashboardWidget>

      <DashboardWidget id="review">
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
      </DashboardWidget>

      <DashboardWidget id="tasks">
        <TaskManagerWidget scope={scope} onOpen={() => onOpenPage("tasks")} />
      </DashboardWidget>

      <DashboardWidget id="log">
        <ManagerLogWidget scope={scope} onOpen={() => onOpenPage("log")} />
      </DashboardWidget>

      <DashboardWidget id="events">
        <EventsSection scope={scope} />
      </DashboardWidget>
    </>
  )
  const key = all ? "all" : loc.id
  if (bare) return <div className="flex flex-col gap-4">{hero}{rest}</div>
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

function EmployeeDashboard({ loc, split, bare, onScroll, onOpenPage }: { loc: Location; /** Two columns (iPad landscape). */ split?: boolean; /** Just the content, for a page that does its own scrolling and title. */ bare?: boolean; onScroll: ScrollHandler; onOpenPage: (p: HomePageId) => void }) {
  const e = loc.employee
  const wire = useStructure()
  const scope = useScope()
  const all = scope.length > 1
  const next = nextShiftAnywhere()
  // Shiftmates across locations: everyone's faces, and the overflow added up.
  const mates = all ? { photos: Array.from(new Set(scope.flatMap((l) => l.employee.shiftmates.photos))).slice(0, 4), extra: scope.reduce((n, l) => n + l.employee.shiftmates.extra + l.employee.shiftmates.photos.length, 0) - Math.min(4, new Set(scope.flatMap((l) => l.employee.shiftmates.photos)).size) } : e.shiftmates
  const hero = (
    <>
      <div className="mx-auto w-[338px] max-w-full"><WeekChart loc={loc} /></div>

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
  if (bare) return <div className="flex flex-col">{hero}{rest}</div>
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
  return platform === "android" ? <AndroidApp /> : <IosHome />
}

/** The pages the More menu opens as main pages. Placeholders for now: skeletons under the page's own title. */
const EXTRA_PAGES = {
  // `scoped`: the page is about one location (or several), so its title carries the location switcher.
  tips: { label: "Tip Manager", Icon: IconPigMoney, scoped: true },
  team: { label: "Team", Icon: IconUsers, scoped: true },
  hiring: { label: "Hiring", Icon: IconUserPlus, scoped: false },
  tasks: { label: "Task Manager", Icon: IconChecklist, scoped: true },
  payroll: { label: "Payroll", Icon: IconReportMoney, scoped: true },
  log: { label: "Manager Log", Icon: IconNotebook, scoped: true },
  // Opened from the avatar and name in the More menu, so it is not one of the menu's rows.
  profile: { label: "My Profile", Icon: IconUser, scoped: false },
  // Opened from the gear in the More menu.
  settings: { label: "Settings", Icon: IconSettings, scoped: false },
  earnings: { label: "Earnings", Icon: IconCoin, scoped: false },
  timeoff: { label: "Time off balance", Icon: IconCalendarClock, scoped: false },
  support: { label: "Support", Icon: IconHeadset, scoped: false },
  developer: { label: "Developer", Icon: IconStar, scoped: false },
} as const
/** The overflow rows under the line, in the design's order. */
/** What employees see below the line: the rest is for owners and managers. */
const EMPLOYEE_MORE: ExtraId[] = ["timeoff", "team", "support"]
const MORE_REST: ExtraId[] = ["earnings", "tasks", "payroll", "timeoff", "team", "support", "developer"]
type ExtraId = keyof typeof EXTRA_PAGES

/** The Team list, moved here from Settings: who works here, with a search above it. */
function TeamExtra({ loc }: { loc: Location }) {
  const [query, setQuery] = useState("")
  const Team = PAGES.team.Component
  return (
    <>
      <div className="-mx-7 -mt-1"><SearchBar value={query} onChange={setQuery} placeholder="Search your team…" /></div>
      <Team loc={loc} query={query} />
    </>
  )
}

/** My Profile: what the avatar in the More menu opens. Two tabs, Profile and Tax and Bank Information. */
function MyProfilePage() {
  const [tab, setTab] = useState<"profile" | "tax">("profile")
  const head = "px-1 pb-2 pt-4 text-[17px] font-[590] tracking-[-0.43px] text-[#141414]"
  return (
    <>
      <div role="tablist" className="flex rounded-full bg-[#787880]/[0.12] p-[3px]">
        {([["profile", "Profile"], ["tax", "Tax and Bank Information"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("h-9 flex-1 rounded-full px-2 text-[14px] font-[510] tracking-[-0.24px] text-[#141414]", tab === id && "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "profile" ? (
        <>
          <p className={head}>Availability</p>
          <WireCard h={130}><Bar w="44%" h={14} /><Bar w="70%" h={14} className="mt-3" /></WireCard>
          <p className={head}>Personal information</p>
          <WireList rows={3} avatar={false} trailing />
          <p className={head}>Resume</p>
          <WireList rows={3} avatar={false} />
          <p className={head}>Stats and achievements</p>
          <WireCard h={130}><Bar w="38%" h={14} /><Bar w="64%" h={30} className="mt-4" /></WireCard>
        </>
      ) : (
        <>
          <p className={head}>Tax information</p>
          <WireList rows={2} avatar={false} trailing />
          <p className={head}>Bank information</p>
          <WireList rows={2} avatar={false} trailing />
        </>
      )}
    </>
  )
}

/** Settings, as it is today: four rows and Sign out. */
function SettingsExtraPage() {
  return (
    <>
      <div className="flex flex-col rounded-[22px] bg-white py-1">
        {["Locations", "Calendar sync", "Notifications and alerts", "Password and security"].map((label, i) => (
          <div key={label}>
            {i > 0 && <div aria-hidden className="mx-4 h-px bg-black/[0.08]" />}
            <button className="flex h-[52px] w-full items-center justify-between px-4 text-left text-[17px] tracking-[-0.43px] text-black active:bg-black/[0.04]">
              {label}
              <IconChevronRight size={18} stroke={2.25} className="text-[#c4c4c7]" />
            </button>
          </div>
        ))}
      </div>
      <button className="mt-4 flex h-[52px] w-full items-center justify-center rounded-[22px] bg-white text-[17px] font-[510] tracking-[-0.43px] text-[#ff3b30] active:bg-black/[0.04]">Sign out</button>
    </>
  )
}

function ExtraPage({ id, loc }: { id: ExtraId; loc: Location }) {
  if (id === "settings") return <SettingsExtraPage />
  if (id === "profile") return <MyProfilePage />
  if (id === "team") return <TeamExtra loc={loc} />
  return (
    <>
      <WireCard h={150}>
        <Bar w="38%" h={14} />
        <Bar w="64%" h={30} className="mt-4" />
      </WireCard>
      <WireList rows={4} />
      <WireList rows={3} />
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
  // A page opened from the More menu (a main page of its own: the tab bar stays, and More takes that page's icon).
  const [extra, setExtra] = useState<ExtraId | null>(null)
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
    setLocOpen(null)
  }, [userType])
  // A single-location owner/manager is pinned to their location (a saved choice from another type doesn't leak over).
  const setLocation = useLocationStore((s) => s.setLocation)
  useEffect(() => {
    if (!multi) setLocation(LOCATIONS[0].id)
  }, [multi, setLocation])
  const locTitle = useLocTitle(loc)
  const [menuOpen, setMenuOpen] = useState(false)
  // The iPad sidebar's Locations row, while its menu is open (the menu hangs from it).
  const [sidebarLocEl, setSidebarLocEl] = useState<HTMLElement | null>(null)
  // The toolbar plus opens an action menu anchored to it; `screen` is where that menu renders.
  const [plusAnchor, setPlusAnchor] = useState<HTMLElement | null>(null)
  // Customize Dashboard (the Edit button on Home): the widgets jiggle and can be removed, the plus adds some back, the check finishes.
  const [editing, setEditing] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  useEffect(() => { setEditing(false) }, [tab, extra])
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
  // Where the profile sheet opens: the avatar goes straight to Account, the gear to the Settings list.
  const [profileStart, setProfileStart] = useState<"account" | undefined>("account")
  const openProfile = (start?: "account") => { setProfileStart(start); setProfileOpen(true) }
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [chatStart, setChatStart] = useState<string | undefined>(undefined)
  // Bumped each time a chat is chosen from the menu, so an open chat swaps in place instead of reopening.
  const [chatToken, setChatToken] = useState(0)
  // The assistant's past conversations (and the tabs) live in a menu under the app: a menu button, top left, slides the app aside.
  const closeAssistant = useCallback(() => setAssistantOpen(false), [])
  const [requestsOpen, setRequestsOpen] = useState(false)
  const closeRequests = useCallback(() => setRequestsOpen(false), [])
  // The bell badge is the number of requests still waiting on a decision.
  const decided = useRequestsStore((s) => s.decided)
  const added = useRequestsStore((s) => s.added)
  const scope = useScope()
  const pending = scope.reduce((n, l) => n + pendingFor(l, decided, added).length, 0)
  const [halfOpen, setHalfOpen] = useState(false)
  // The location the time clock is for. Home has none, so someone with several locations picks one first (unless they're already clocked in somewhere).
  const [clockLoc, setClockLoc] = useState<Location | null>(null)
  const closeHalf = useCallback(() => setHalfOpen(false), [])
  // 0 = closed, 1 = open: the Time Clock half sheet's progress.
  const halfP = useMotionValue(0)
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  // The dashboard widgets (manager log, earnings, shiftmates) open full pages above the tab bar.
  const [homePage, setHomePage] = useState<HomePageId | null>(null)
  const closeHomePage = useCallback(() => setHomePage(null), [])
  // Home is a fixed overview of every location the person has. One location's own view opens from a row or header on it
  // (or, on iPad, from the sidebar), growing out of what was tapped; the X shrinks it back.
  const [locOpen, setLocOpen] = useState<{ loc: Location; from: Box; clone: ReactNode } | null>(null)
  const homeScope = multi ? LOCATIONS : [loc]
  const openLocation = useCallback((l: Location, row?: HTMLElement, clone?: ReactNode) => {
    setLocation(l.id)
    setHomePage(null)
    setExtra(null)
    setTab("home")
    const from = row ? boxOf(row) : null
    // The view fills the content pane, so measure from the pane's edge, not the screen's.
    if (from) setLocOpen({ loc: l, from: { ...from, left: from.left - paneLeft }, clone: clone ?? <SidebarLocationBody l={l} /> })
  }, [setLocation, paneLeft])
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

  // The time clock belongs to a location, but Home has none: the green dot says whether the person is clocked in anywhere.
  const clockByLoc = useTimeClockStore((s) => s.byLocation)
  const clockOf = (l: Location) => clockByLoc[l.id] ?? seedClock(l)
  const liveLoc = LOCATIONS.find((l) => clockOf(l).status !== "out") ?? null
  const clockedIn = LOCATIONS.some((l) => clockOf(l).status === "in")
  const sheetClock = useClock(clockLoc ?? loc)
  const openClock = () => {
    setClockLoc(multi ? liveLoc : loc)
    setHalfOpen(true)
  }

  // The More menu's items, in the person's own order (Customize, from the gear in the menu's top row).
  const moreOrder = useMoreMenuStore((s) => s.order)
  const moreItems = inMenuOrder(
    [

      // The primary tabs first (Time is only here: the bar has no room for it), then the rest of the app.
      ...(["home", "money", "shifts", "chat", "time"] as const).filter((t) => tabs.includes(t) || t === "time").map((t) => {
        const def = TABS.find((x) => x.id === t)!
        const src = def.icon
        const mask = (size: string, url: string) => <span aria-hidden className={`block ${size} bg-current`} style={{ maskImage: `url(${url})`, WebkitMaskImage: `url(${url})`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
        const here = !extra && tab === t
        return { id: `tab:${t}`, label: def.label, icon: mask("size-6", src), activeIcon: mask("size-7", def.fill), current: here, active: t === "time" && here, badge: t === "chat" ? scope.reduce((n, l) => n + l.messages.filter((m) => m.unread).length, 0) : 0 }
      }),
      ...MORE_REST.filter((id) => userType !== "employee" || EMPLOYEE_MORE.includes(id)).map((id) => ({ id, ...EXTRA_PAGES[id] })).map(({ id, label, Icon }) => ({
              id,
              label,
              icon: <Icon size={24} stroke={1.75} />,
              activeIcon: <Icon size={28} stroke={1.8} />,
              current: extra === id,
              active: extra === id,
            })),
    ],
    moreOrder,
  )
  const [customizeOpen, setCustomizeOpen] = useState(false)
  // A Messages conversation opened on a phone: a page of its own over the app.
  const [chatOpen, setChatOpen] = useState<ConvoRow | null>(null)

  return (
    <IosFrame header={<UserTypeToggle />} footer={<PrototypeFooter />}>
      {tablet && (
        <IpadSidebar
          tabs={tabs}
          tab={extra ? null : tab}
          onTab={(t) => { setProfileOpen(false); setHomePage(null); setLocOpen(null); setExtra(null); setTab(t) }}
          dots={{ chat: scope.some((l) => l.messages.some((m) => m.unread)) }}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          locations={{ title: locTitle, open: !!sidebarLocEl, onOpen: setSidebarLocEl }}
          more={{
            items: moreItems.filter((m) => !m.id.startsWith("tab:") && m.id !== "settings"),
            onSelect: (id) => {
              if (id in EXTRA_PAGES) { setHomePage(null); setLocOpen(null); setExtra(id as ExtraId) }
            },
          }}
          onProfile={() => openProfile("account")}
          chats={userType === "employee" ? undefined : {
            onNew: () => { setChatStart(undefined); setChatToken((n) => n + 1); setAssistantOpen(true) },
          }}
        />
      )}
      {/* Everything but the sheets lives in this pane, which slides over as the sidebar opens and closes. */}
      <motion.div initial={false} animate={{ left: paneLeft }} transition={SIDEBAR_SPRING} className="absolute inset-y-0 right-0">
      {extra ? (
        <OverlayRoot.Provider value={screen}>
          <ScreenScroll key={extra} locationId={`${extra}:${loc.id}`} onScroll={onScroll} top={54} fade={false}>
            <ExtraPage id={extra} loc={loc} />
          </ScreenScroll>
        </OverlayRoot.Provider>
      ) : tab === "home" ? (
        <ScopeContext.Provider value={homeScope}>
          <OpenLocationContext.Provider value={multi ? openLocation : null}>
            {view === "manager" ? (
              <DashboardEditContext.Provider value={{ active: true, editing }}>
                <ManagerDashboard loc={loc} split={split} onScroll={onScroll} onOpenPage={setHomePage} onEdit={() => setEditing(true)} />
              </DashboardEditContext.Provider>
            ) : (
              <EmployeeDashboard loc={loc} split={split} onScroll={onScroll} onOpenPage={setHomePage} />
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
          {tab === "chat" && <ChatPage loc={loc} onOpen={setChatOpen} />}
        </ScreenScroll>
        </OverlayRoot.Provider>
      )}
      <EdgeBlur
        // Rounds with the app surface while it is slid aside (the blur would otherwise spill past the corners).
        radius="var(--drawer-radius, 0px)"
        top={{ strength: 24, steps: 6, height: "calc(var(--safe-top) + 64px)" }}
        // Kept light: just enough blur and wash to lift the nav bar (and the clock bar) off whatever scrolls under it.
        bottom={tablet ? false : { strength: 10, steps: 6, height: "calc(var(--safe-bottom) + 96px)", tint: "var(--ios-page-tint, rgba(243,242,246,0.5))" }}
      />
      <Toolbar
        view={view}
        loc={loc}
        editDone={editing ? () => setEditing(false) : undefined}
        unread={pending}
        // The overview is titled Home, like the other pages are titled for what they are; it has no location switcher.
        title={extra ? EXTRA_PAGES[extra].label : tab === "home" ? "Home" : undefined}
        subtitle={extra && EXTRA_PAGES[extra].scoped ? locTitle : undefined}
        // Home is a fixed overview, so only the other tabs have a switcher.
        canSwitch={extra ? EXTRA_PAGES[extra].scoped : tab !== "home"}
        onClock={openClock}
        // The time clock button, top right: on every page of a tablet; on a phone, for owners and managers on Home (employees have the bottom accessory).
        showClock={tablet || (userType === "employee" ? !extra : tab === "home" && !extra)}
        clockActive={clockedIn}
        hideBell={!!extra || tab !== "home"}
        // On a phone the profile is in the More menu; on a tablet, in the sidebar.
        hideProfile
        leading={
          editing ? (
            // Customizing: the menu button gives way to the plus that adds widgets.
            <LiquidGlass mode="small" radius={999} className="flex size-11 shrink-0 items-center justify-center">
              <button onClick={() => setAddOpen(true)} aria-label="Add widgets" aria-haspopup="dialog" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconPlus size={24} stroke={1.75} />
              </button>
            </LiquidGlass>
          ) : extra === "profile" || extra === "settings" ? (
            <LiquidGlass mode="small" radius={999} className="flex size-11 shrink-0 items-center justify-center">
              <button onClick={() => setExtra(null)} aria-label="Back" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconChevronLeft size={24} stroke={2} />
              </button>
            </LiquidGlass>
          ) : tablet ? (
            !sidebarOpen ? <SidebarToggle open={false} onClick={() => setSidebarOpen(true)} /> : undefined
          ) : undefined
        }
        actions={
          extra ? undefined : tab === "shifts" ? (
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
        } onBell={() => setRequestsOpen(true)} onTitle={() => setMenuOpen((o) => !o)} onProfile={() => openProfile("account")} />
      {tablet && (
        <LocationMenu
          open={!!sidebarLocEl}
          anchorEl={sidebarLocEl}
          onClose={() => setSidebarLocEl(null)}
          onAddLocation={multi ? undefined : () => {}}
          // On Home, picking a location opens its overview in the main area; on other pages it just changes the location.
          onPickLocation={tab === "home" || extra ? (l) => openLocation(l, sidebarLocEl ?? undefined, <span />) : undefined}
        />
      )}
      <LocationMenu open={menuOpen} onClose={closeMenu} onAddLocation={multi ? undefined : () => {}} />
      {locOpen && <LocationView key={locOpen.loc.id} loc={locOpen.loc} from={locOpen.from} clone={locOpen.clone} employee={view === "employee"} onClosed={() => setLocOpen(null)} />}
      <AnimatePresence>
        {chatOpen && (
          <FullPage key={chatOpen.id} title={chatOpen.title} onBack={() => setChatOpen(null)}>
            <ConversationPage m={chatOpen} />
          </FullPage>
        )}
        {homePage && (
          <FullPage key={homePage} title={HOME_PAGE_TITLES[homePage]} onBack={closeHomePage}>
            <ScopeContext.Provider value={homeScope}>
              <HomePage id={homePage} loc={loc} />
            </ScopeContext.Provider>
          </FullPage>
        )}
      </AnimatePresence>
      {profileOpen && tablet && <ProfileSheet inline initialPage={profileStart} loc={loc} onClose={closeProfile} />}
      {/* On a tablet the chat opens in the content pane, so the sidebar and its list of chats stay beside it. */}
      {assistantOpen && userType !== "employee" && tablet && <AssistantSheet loc={loc} onClose={closeAssistant} startWith={chatStart} token={chatToken} showHistory={false} />}
      </motion.div>
      {!tablet && (
        <TabBar
          tabs={userType === "oamna" ? tabs : tabs.filter((t) => t !== "time")}
          dots={{ chat: scope.some((l) => l.messages.some((m) => m.unread)) }}
          tab={extra ? null : tab}
          onTab={(t) => {
            setExtra(null)
            setTab(t)
            setMinimized(false)
            lastTop.current = 0
          }}
          more={{
            items: moreItems,
            header: { onProfile: () => { setHomePage(null); setLocOpen(null); setExtra("profile"); setMinimized(false); lastTop.current = 0 }, onSettings: () => { setHomePage(null); setLocOpen(null); setExtra("settings"); setMinimized(false); lastTop.current = 0 } },
            onSelect: (id) => {
              if (id === "tab:time" && userType === "employee") openClock()
              else if (id.startsWith("tab:")) {
                setExtra(null)
                setTab(id.slice(4) as TabId)
                setMinimized(false)
                lastTop.current = 0
              } else if (id in EXTRA_PAGES) {
                setExtra(id as ExtraId)
                setMinimized(false)
                lastTop.current = 0
              }
            },
          }}
          onAssistant={userType === "employee" || userType === "oamna" ? undefined : () => { setChatStart(undefined); setChatToken((n) => n + 1); setAssistantOpen(true) }}
          minimized={minimized}
          onExpand={() => setMinimized(false)}
          inlineAccessory={null}
        />
      )}
      {halfOpen && (
        <HalfSheet
          progress={halfP}
          height={sheetHeightFor(clockLoc ? sheetClock.status : "out")}
          hideTitle
          variant="slide"
          title="Time Clock"
          onClosed={closeHalf}
          collapsed={null}
        >
          {(close) => clockLoc ? <TimeClockContent loc={clockLoc} close={close} onChangeLocation={multi && sheetClock.status === "out" ? () => setClockLoc(null) : undefined} /> : <ClockLocationStep onPick={setClockLoc} />}
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
      {addOpen && <AddWidgetsSheet multi={multi} onClose={() => setAddOpen(false)} />}
      {shiftOpen && <AddShiftSheet loc={loc} onClose={closeShift} />}
      {eventOpen && <AddEventSheet loc={loc} onClose={closeEvent} />}
      {assistantOpen && userType !== "employee" && !tablet && <AssistantSheet loc={loc} onClose={closeAssistant} startWith={chatStart} token={chatToken} />}
      {filterSheet && <TimeFilterSheet key={filterSheet} kind={filterSheet} loc={loc} value={timeFilters[filterSheet]} onApply={(v) => setTimeFilters((f) => ({ ...f, [filterSheet]: v }))} onClose={() => setFilterSheet(null)} />}
      {timeCardOpen && <TimeCardSheet loc={loc} onClose={closeTimeCard} />}
      {requestsOpen && <RequestsSheet loc={loc} onClose={closeRequests} />}
      {/* Outside the surface that slides aside, so they rise over the whole screen, whether or not the menu is open. */}
      {customizeOpen && !tablet && <CustomizeMenuSheet items={moreItems} onClose={() => setCustomizeOpen(false)} />}
      {profileOpen && !tablet && <ProfileSheet initialPage={profileStart} loc={loc} onClose={closeProfile} />}
    </IosFrame>
  )
}

import { useState } from "react"
import { IconAlertHexagonFilled, IconChevronUp, IconSelector, IconClockFilled, IconCoffee, IconSearch, IconSpeakerphone, IconUsers, IconUsersGroup } from "@tabler/icons-react"
import { ContextMenu } from "@/components/ios/ContextMenu"
import { GlassChip } from "@/components/ios/GlassChip"
import { Card, ListRow, SectionHeader } from "@/components/ios/list"
import { roleColor } from "@/lib/roleColor"
import { cn } from "@/lib/utils"
import { USER_EARNINGS, type Location, type Message } from "@/data/locations"
import { WeekCalendar } from "@/components/ios/WeekCalendar"
import { dayLabel, payPeriodOf, rangeLabel, weekdayIndex, weeksFromBase } from "@/lib/dates"
import { useDateStore } from "@/store/useDateStore"
import { shiftKey, useShiftsStore } from "@/store/useShiftsStore"
import { useStructure } from "@/store/useViewStore"
import { Bar, WireCard, WireList } from "@/components/wire/Wire"

/** The big title each tab page opens with. */
export function PageTitle({ children }: { children: string }) {
  return <h1 className="pb-3 pt-3 text-[34px] font-bold leading-[41px] tracking-[0.4px] text-black">{children}</h1>
}


type Row = { who: string; role: string; start: number; end: number; mine?: boolean; open?: boolean }

/** am/pm with minutes: 13.5 → "1:30 pm" */
function clock(h: number) {
  const whole = Math.floor(h)
  const m = Math.round((h - whole) * 60)
  return `${whole % 12 === 0 ? 12 : whole % 12}:${String(m).padStart(2, "0")} ${whole % 24 >= 12 ? "pm" : "am"}`
}
const shortName = (n: string) => {
  const [f, ...rest] = n.split(" ")
  return rest.length ? `${f} ${rest[rest.length - 1][0]}.` : f
}
const initialsOf = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()

/** A day's schedule at a location: the team's shifts (derived from `loc.team`), the user's own, and an open shift on some days. */
function dayRows(loc: Location, i: number): Row[] {
  const starts = [8, 8, 9, 10, 10, 12]
  const lens = [5, 8, 7, 6, 4, 8]
  const rows: Row[] = []
  loc.team.forEach((m, j) => {
    if ((i + j) % 3 === 2) return
    const k = (i + j) % starts.length
    rows.push({ who: shortName(m.name), role: m.role, start: starts[k], end: starts[k] + lens[k] })
  })
  const mine = loc.employee.week[i]
  if (mine) rows.push({ who: "Bryce L.", role: loc.employee.timeClock?.role ?? "Team", start: mine.start, end: mine.end, mine: true })
  if (loc.team.length && i % 3 === 0) {
    const m = loc.team[i % loc.team.length]
    rows.push({ who: "Open shift", role: m.role, start: 16, end: 22, open: true })
  }
  return rows.sort((a, b) => a.start - b.start)
}

type Filter = "all" | "mine" | "open"
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All shifts" },
  { id: "mine", label: "My shifts" },
  { id: "open", label: "Open shifts" },
]

/** Shifts: a week strip, filters, and the selected day's schedule at this location. */
export function ShiftsPage({ loc }: { loc: Location }) {
  const date = useDateStore((s) => s.date)
  const [filter, setFilter] = useState<Filter>("all")
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const day = weekdayIndex(date)
  // The data is a pattern, so different weeks reshuffle it a little.
  const added = useShiftsStore((st) => st.added[shiftKey(loc.id, date)])
  const all = [...dayRows(loc, (((day + weeksFromBase(date) * 3) % 7) + 7) % 7), ...(added ?? [])].sort((a, b) => a.start - b.start)
  const rows = all.filter((r) => (filter === "mine" ? r.mine : filter === "open" ? r.open : true))
  // The day's summary ignores the filters: covered hours are the staffed shifts, open shifts are still to fill.
  const staffed = all.filter((r) => !r.open)
  const hours = Math.round(staffed.reduce((n, r) => n + (r.end - r.start), 0))
  const openCount = all.length - staffed.length
  const wire = useStructure()

  return (
    <>
      <WeekCalendar label={dayLabel(date)} workingDots />

      {/* The hero on the left; the shift filter is a dropdown on the right, level with it. */}
      <div className="flex items-start justify-between gap-3 pb-4 pt-1 tracking-[-0.43px]">
        {wire ? (
          <div className="flex flex-col gap-2 pt-1">
            <Bar w={90} h={26} />
            <Bar w={150} h={12} />
          </div>
        ) : (
          <div>
            <p className="text-[28px] font-[590] leading-[30px] text-black">{`${hours} hrs`}</p>
            <p className="text-[15px] font-[510] leading-5 text-[#939393]">
              {`Covered by ${staffed.length} ${staffed.length === 1 ? "person" : "people"}`}
              {openCount > 0 && ` · ${openCount} open`}
            </p>
          </div>
        )}
        <GlassChip onClick={(e) => setMenu(e.currentTarget)}>
          <span className="flex items-center gap-1">
            {FILTERS.find((f) => f.id === filter)!.label}
            <IconSelector size={14} stroke={2.5} className="text-[#4e4e4e]" />
          </span>
        </GlassChip>
      </div>
      <ContextMenu
        anchor={menu}
        items={FILTERS}
        selectedId={filter}
        onSelect={(id) => setFilter(id as Filter)}
        onClose={() => setMenu(null)}
      />

      {/* One container, a row per shift, hairline dividers between. */}
      {wire ? <WireList rows={6} trailing /> : <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-4 text-[17px] leading-[22px] tracking-[-0.43px] text-[#999]">No shifts</p>
        ) : (
          rows.map((r, i) => (
            // The padding is on the outer row and the divider on the inner one, so dividers stop 16px short of both edges.
            <div key={`${r.who}-${i}`} className="px-4">
            <div className={cn("flex items-center gap-3 py-3 tracking-[-0.43px]", i > 0 && "border-t border-[#ebebeb]")}>
              {/* The role's color: a vertical bar down the left of the row. */}
              <span aria-hidden className="w-1 shrink-0 self-stretch rounded-full" style={{ backgroundColor: roleColor(r.role) }} />
              {/* The avatar leads, then the name over the role. */}
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ece6fb] text-[15px] font-[590] leading-none text-[#6b3fc4]">
                  {r.open ? "?" : initialsOf(r.who)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[17px] font-[590] leading-5 text-black">{r.who}</span>
                  <span className="-mt-px truncate text-[15px] leading-[18px] text-[#8e8e93]">{r.role}</span>
                </span>
              </span>
              {/* Start in the primary color, end secondary beneath it. */}
              <span className="flex shrink-0 flex-col items-end text-right text-[15px] leading-5">
                <span className="text-black">{clock(r.start)}</span>
                <span className="flex items-center gap-[6px] text-[#8e8e93]">
                  {/* Long shifts (8h or more) run into overtime: an orange tonal pill to the left of the end time. */}
                  {r.end - r.start >= 8 && (
                    <span className="rounded-full bg-[rgba(242,153,74,0.2)] px-[6px] py-[1px] text-[11px] font-[590] leading-4 text-[#b8620a]">Overtime</span>
                  )}
                  {clock(r.end)}
                </span>
              </span>
            </div>
            </div>
          ))
        )}
      </Card>}
    </>
  )
}

/** Time (formerly Timesheets): a Day / Pay period segmented control, filter chips, and the timesheets needing review. */
export function TimePage({ loc }: { loc: Location }) {
  const date = useDateStore((s) => s.date)
  const view = useDateStore((s) => s.timeView)
  const setView = useDateStore((s) => s.setTimeView)
  const [resolved, setResolved] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState(true)
  const [role, setRole] = useState("all")
  const [roleMenu, setRoleMenu] = useState<HTMLElement | null>(null)
  const roles = Array.from(new Set(loc.timesheets.map((t) => t.role)))
  const pending = loc.timesheets.filter((t) => !resolved[t.id] && (role === "all" || t.role === role))
  const p = loc.payroll
  const wire = useStructure()
  return (
    <>
      <WeekCalendar label={view === "day" ? dayLabel(date) : rangeLabel(...payPeriodOf(date))} />

      {/* overflow-x:auto also clips vertically, which cut off the chips' drop shadows. Pad the scroller to hold
          them (the glass shadow reaches ~23px below) and cancel the padding with negative margins. */}
      <div className="-mx-4 -mb-3 -mt-3 flex gap-2 overflow-x-auto px-4 pb-7 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Search is just an icon: a square glass chip. */}
        <GlassChip ariaLabel="Search team members" className="w-8 px-0">
          <IconSearch size={18} stroke={1.75} />
        </GlassChip>
        <GlassChip>
          <span className="flex items-center gap-[6px]">
            <IconAlertHexagonFilled size={18} />
            Issues
          </span>
        </GlassChip>
        {/* Filters the timesheets by role: a pull-down; the chip takes the role's name once one is chosen. */}
        <GlassChip active={role !== "all"} onClick={(e) => setRoleMenu(e.currentTarget)}>
          <span className="flex items-center gap-1">
            {role === "all" ? "Roles" : role}
            <IconSelector size={14} stroke={2.5} />
          </span>
        </GlassChip>
        <GlassChip active={view === "period"} onClick={() => setView(view === "period" ? "day" : "period")}>
          Pay period
        </GlassChip>
      </div>

      <ContextMenu
        anchor={roleMenu}
        items={[{ id: "all", label: "All roles" }, ...roles.map((r) => ({ id: r, label: r }))]}
        selectedId={role}
        onSelect={setRole}
        onClose={() => setRoleMenu(null)}
      />

      {view === "day" ? (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center justify-between pb-1 text-left tracking-[-0.43px]"
          >
            <h2 className="text-[15px] font-[590] leading-5 text-[#747182]">
              Needs review{!wire && <> <span className="text-[#b9b8c1]">{pending.length}</span></>}
            </h2>
            <IconChevronUp size={20} stroke={3} className={cn("text-[#747182] transition-transform duration-200", !open && "rotate-180")} />
          </button>

          {open && wire && (
            <div className="flex flex-col gap-2">
              <WireCard h={150} />
              <WireCard h={150} />
            </div>
          )}
          {open && !wire && (
            <div className="flex flex-col gap-2">
              {pending.length === 0 && <Card className="p-4 text-[17px] leading-[22px] tracking-[-0.43px] text-[#999]">All caught up</Card>}
              {pending.map((t) => (
                <Card key={t.id} className="p-4 tracking-[-0.43px]">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ece6fb] text-[17px] font-[590] text-[#6b3fc4]">{initialsOf(t.name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[17px] font-[590] leading-[22px] text-black">{t.name}</span>
                      <span className="block truncate text-[15px] leading-5 text-[#7f7f7f]">{`${t.role} | ${t.dept}`}</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 pl-1 pt-3">
                    <div className="flex items-start gap-3">
                      <IconClockFilled size={20} className="mt-[1px] shrink-0 text-[#928fa0]" />
                      <span>
                        <span className="block text-[17px] leading-[22px] text-black">{`${t.start} - ${t.end}`}</span>
                        <span className="block text-[13px] leading-4 text-[#7f7f7f]">{`Total: ${t.total}`}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <IconCoffee size={20} className="shrink-0 text-[#928fa0]" />
                      <span className="text-[17px] leading-[22px] text-black">{t.rest}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-3">
                    {t.issues.map((i) => (
                      <span key={i} className="rounded-full bg-[#fdeaea] px-3 py-[5px] text-[15px] leading-5 text-[#e00000]">{i}</span>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-[#ebebeb] pt-3">
                    <button
                      onClick={() => setResolved((r) => ({ ...r, [t.id]: true }))}
                      className="h-12 w-full rounded-[14px] border-2 border-[#8f55e5] text-[17px] font-[590] text-[#8f55e5] active:bg-[#8f55e5]/10"
                    >
                      Resolve issues
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="pt-2">
          <SectionHeader>Pay period</SectionHeader>
          {wire ? (
            <WireList rows={4} avatar={false} trailing />
          ) : (
            <Card className="overflow-hidden">
              <ListRow first title="Period" trailing={p.period} />
              <ListRow title="Hours" trailing={p.hours} />
              <ListRow title="Gross pay" trailing={p.gross} />
              <ListRow title="Next payday" trailing={p.nextPayday} />
            </Card>
          )}
        </div>
      )}
    </>
  )
}

/** Money (employees): what they've earned and been paid. Earnings belong to the person; pay stubs come from the location. */
export function MoneyPage({ loc }: { loc: Location }) {
  const wire = useStructure()
  if (wire) {
    return (
      <>
        <WireCard title="This pay period" h={110} className="mt-4" />
        <SectionHeader>Today</SectionHeader>
        <WireList rows={2} avatar={false} trailing />
        <SectionHeader>Recent pay stubs</SectionHeader>
        <WireList rows={3} avatar={false} trailing />
      </>
    )
  }
  return (
    <>
      <Card className="mt-4 p-4 tracking-[-0.43px]">
        <p className="text-[15px] leading-5 text-black">This pay period</p>
        <p className="text-[34px] font-bold leading-[41px] text-black">{USER_EARNINGS.period.amount}</p>
        <p className="text-[15px] leading-5 text-[#7f7f7f]">{USER_EARNINGS.period.payday}</p>
      </Card>
      <SectionHeader>Today</SectionHeader>
      <Card className="overflow-hidden">
        <ListRow first title="Earned" trailing={USER_EARNINGS.today.amount} />
        <ListRow title="Hours and tips" trailing={USER_EARNINGS.today.detail} />
      </Card>
      <SectionHeader>Recent pay stubs</SectionHeader>
      <Card className="overflow-hidden">
        {loc.payroll.stubs.map((st, i) => (
          <ListRow key={st.period} first={i === 0} chevron title={st.period} trailing={st.net} />
        ))}
      </Card>
    </>
  )
}

const TONES = [
  { bg: "#bfe9c6", fg: "#1f6b2e" },
  { bg: "#fde3d6", fg: "#c2491d" },
  { bg: "#e3dcf8", fg: "#5a35b5" },
  { bg: "#ede4fc", fg: "#7440d1" },
]
const MATE_PHOTOS = ["/phone/mate-1.jpg", "/phone/mate-2.jpg", "/phone/mate-3.jpg", "/phone/mate-4.jpg"]

function MessageAvatar({ m }: { m: Message }) {
  if (m.kind !== "dm") {
    const Icon = m.kind === "announcement" ? IconSpeakerphone : m.kind === "team" ? IconUsersGroup : IconUsers
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f1ecfc] text-black">
        <Icon size={22} stroke={1.5} />
      </span>
    )
  }
  if (m.photo !== undefined) return <img src={MATE_PHOTOS[m.photo % 4]} alt="" className="size-11 shrink-0 rounded-full object-cover object-top" />
  const t = TONES[[...m.title].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length]
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-[17px] leading-[22px]" style={{ backgroundColor: t.bg, color: t.fg }}>
      {initialsOf(m.title)}
    </span>
  )
}

/** Messages: this location's conversations. The business is the page title (toolbar), so no group headers. */
export function ChatPage({ loc }: { loc: Location }) {
  const [filter, setFilter] = useState<"all" | "unread" | "threads">("all")
  const rows = loc.messages.filter((m) => (filter === "unread" ? m.unread : filter === "threads" ? m.kind !== "dm" : true))
  const toggle = (f: "unread" | "threads") => setFilter((cur) => (cur === f ? "all" : f))
  const wire = useStructure()
  return (
    <>
      <div className="flex gap-2 pb-4 pt-4">
        <GlassChip active={filter === "unread"} onClick={() => toggle("unread")}>
          <span className="flex items-center gap-[6px]">
            Unread
            <span aria-hidden className="size-2 rounded-full bg-[#8f55e5]" style={filter === "unread" ? { backgroundColor: "#fff" } : undefined} />
          </span>
        </GlassChip>
        <GlassChip active={filter === "threads"} onClick={() => toggle("threads")}>
          Threads
        </GlassChip>
      </div>
      {wire ? <WireList rows={7} /> : <Card className="overflow-hidden">
        {rows.length === 0 && <p className="p-4 text-[17px] leading-[22px] tracking-[-0.43px] text-[#999]">No messages</p>}
        {rows.map((m, i) => (
          <button key={m.id} className={cn("flex w-full items-center gap-3 pl-4 pr-4 text-left tracking-[-0.43px] active:bg-black/[0.04]")}>
            <MessageAvatar m={m} />
            <span className={cn("flex min-w-0 flex-1 flex-col py-3", i > 0 && "border-t border-[#ebebeb]")}>
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[17px] font-[590] leading-[22px] text-black">{m.title}</span>
                <span className="shrink-0 text-[15px] leading-5 text-[#7f7f7f]">{m.time}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-[15px] leading-5 text-[#7f7f7f]">{m.preview}</span>
                {m.unread && <span aria-label="Unread" className="size-[10px] shrink-0 rounded-full bg-[#8f55e5]" />}
              </span>
            </span>
          </button>
        ))}
      </Card>}
    </>
  )
}

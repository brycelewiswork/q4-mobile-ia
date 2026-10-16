import { useLocName } from "@/store/useViewStore"
import { useState } from "react"
import { motion } from "motion/react"
import { IconCheck, IconChevronRight, IconPlus, IconX } from "@tabler/icons-react"
import { Card } from "@/components/ios/list"
import { Sheet } from "@/components/ios/Sheet"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { shortLocationName, type Location, type RequestItem } from "@/data/locations"
import { useLocationStore } from "@/store/useLocationStore"
import { requestsFor, useRequestsStore } from "@/store/useRequestsStore"
import { LOCATIONS } from "@/data/locations"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { useStructure } from "@/store/useViewStore"
import { WireList } from "@/components/wire/Wire"

/** This location's requests (named for it), yours, every location's for people who can switch location, and the archive last. */
type FilterId = "location" | "mine" | "archive" | "all"

/** The exact icons from the Figma file, exported as SVG (UserGroup, User, Storefront, SF Symbol `tray`). */
const ICONS: Record<FilterId, string> = {
  location: "/phone/req-store.svg",
  mine: "/phone/req-user.svg",
  archive: "/phone/req-tray.svg",
  all: "/phone/req-team.svg",
}
type FilterDef = { id: FilterId; label: string }

/** A single-color SVG recolored through its alpha, so one file serves the selected and idle states. */
function Icon({ src, size, color }: { src: string; size: number; color: string }) {
  return (
    <span
      aria-hidden
      className="block shrink-0 transition-colors duration-200"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  )
}

/** Filter chips. The selected one grows to show its label (Figma: brand pill + 3 icon-only 60pt chips). */
function Filters({ filters, value, onChange, counts }: { filters: FilterDef[]; value: FilterId; onChange: (v: FilterId) => void; counts: Record<FilterId, number> }) {
  return (
    <div role="tablist" className="flex gap-2 pt-[10px]">
      {filters.map(({ id, label }) => {
        const icon = ICONS[id]
        const active = id === value
        return (
          <motion.button
            key={id}
            role="tab"
            aria-selected={active}
            aria-label={`${label}, ${counts[id]}`}
            onClick={() => onChange(id)}
            layout
            transition={{ type: "spring", ...SPRING_FAST.snappy }}
            className={cn(
              "flex h-9 items-center justify-center gap-[5px] rounded-full py-2 tracking-[-0.43px]",
              active ? "min-w-0 flex-1 bg-[#8f55e5] px-4 text-white" : "w-[60px] shrink-0 bg-[rgba(120,120,128,0.16)] px-[18px]",
            )}
          >
            <Icon src={icon} size={20} color={active ? "#ffffff" : "#747182"} />
            {active && <span className="min-w-0 truncate whitespace-nowrap text-[17px] font-[510] leading-5">{label}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}

function RequestCard({
  r,
  business,
  status,
  onDecide,
  beforeDivider,
}: {
  /** A divider follows this row, so it gets a little less space below. */
  beforeDivider?: boolean
  r: RequestItem
  business: string
  status?: "approved" | "declined"
  onDecide?: (d: "approved" | "declined") => void
}) {
  return (
    <div className={cn("px-4 pt-4 tracking-[-0.43px]", beforeDivider ? "pb-3" : "pb-4")}>
      <div className="relative flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#d6c9f8] to-[#c1a6fa] text-[17px] font-[590] text-white">
          {r.initials}
        </span>
        <div className="min-w-0 flex-1 pr-14">
          <p className="truncate text-[17px] font-[590] leading-[22px] text-black">{r.title}</p>
          <p className="truncate text-[13px] leading-[18px] text-[#8e8e93]">{r.who}</p>
          <p className="truncate text-[13px] leading-[18px] text-black">{r.detail}</p>
          <p className="flex items-center gap-[3px] text-[13px] leading-[18px] text-[#8e8e93]">
            <Icon src="/phone/req-store.svg" size={14} color="#8e8e93" />
            <span className="truncate">{business}</span>
          </p>
        </div>
        <span className="absolute right-0 top-0 flex items-center gap-[3px] text-[13px] leading-4 text-[#747182]">
          {r.time}
          <IconChevronRight size={13} stroke={2.5} className="text-[#2c2935]" />
        </span>
      </div>

      {onDecide && !status && (
        // Indented past the 40pt avatar + 12pt gap, so the buttons line up under the text, not under the avatar.
        <div className="ml-[52px] mt-3 flex gap-2 text-[15px] leading-5">
          <button
            onClick={() => onDecide("approved")}
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#34c759] px-3 py-[5px] font-normal text-white active:opacity-80"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide("declined")}
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[rgba(118,118,128,0.12)] px-3 py-[5px] font-normal text-[#2c2935] active:opacity-60"
          >
            Decline
          </button>
        </div>
      )}
      {status && (
        <p
          className={cn(
            "mt-3 flex items-center gap-[5px] text-[15px] font-[510] leading-5",
            status === "approved" ? "text-[#1f9d55]" : "text-[#5a5666]",
          )}
        >
          {status === "approved" ? <IconCheck size={16} stroke={2.5} /> : <IconX size={16} stroke={2.5} />}
          {status === "approved" ? "Approved" : "Declined"}
        </p>
      )}
    </div>
  )
}

/** Mock requests the "Add request" button draws from, so adding feels varied. */
const TEMPLATES = [
  { title: "Shift Swap", detail: "Sat, Oct 17 · 9a – 5p" },
  { title: "Unpaid Time Off, 8 hrs", detail: "Mon, Oct 19" },
  { title: "Availability Request", detail: "Starting Oct 26th" },
  { title: "Timesheet Edit", detail: "Wed, Oct 14 · clock-in 8:15a" },
  { title: "Overtime Approval, 2 hrs", detail: "Thu, Oct 15" },
  { title: "Shift Cover", detail: "Sun, Oct 18 · 12p – 8p" },
]
const initialsOf = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()

/**
 * The bell opens this: Requests, as a full-page sheet (Figma 1:15469). Approve / decline
 * writes to `useRequestsStore`, so the card moves to Archive and the bell badge updates.
 */
export function RequestsSheet({ loc, onClose }: { loc: Location; onClose: () => void }) {
  const locName = useLocName()
  const wire = useStructure()
  // In "all locations" the sheet opens on every location's requests.
  const [filter, setFilter] = useState<FilterId>(() => (useLocationStore.getState().all ? "all" : "location"))
  const canAll = useUserTypeStore((s) => canSwitchLocation(s.type))
  const decided = useRequestsStore((s) => s.decided)
  const decide = useRequestsStore((s) => s.decide)
  const added = useRequestsStore((s) => s.added)
  const addRequest = useRequestsStore((s) => s.addRequest)

  // "Add request": a fresh pending request in the current tab, from a teammate at THIS location.
  const add = () => {
    const n = (added[loc.id] ?? []).length
    const scope: RequestItem["scope"] = filter === "mine" ? "mine" : "team"
    const me = scope === "mine"
    const who = me ? "Bryce Lewis" : loc.team[n % loc.team.length].name
    const t = TEMPLATES[n % TEMPLATES.length]
    addRequest(loc.id, { id: `${loc.id}-add-${n}`, scope, initials: initialsOf(who), who, title: t.title, detail: t.detail, time: me ? "Pending" : "Just now" })
    if (filter === "archive") setFilter("location")
  }

  type Entry = { r: RequestItem; loc: Location }
  const entriesOf = (l: Location): Entry[] => requestsFor(l, added).map((r) => ({ r, loc: l }))
  const here = entriesOf(loc)
  const waiting = (es: Entry[]) => es.filter((e) => e.r.scope !== "mine" && !decided[e.r.id])
  const lists: Record<FilterId, Entry[]> = {
    location: waiting(here),
    mine: here.filter((e) => e.r.scope === "mine"),
    archive: here.filter((e) => decided[e.r.id]),
    all: waiting(LOCATIONS.flatMap(entriesOf)),
  }
  const counts = { location: lists.location.length, mine: lists.mine.length, archive: lists.archive.length, all: lists.all.length }
  const items = lists[filter]
  const filters: FilterDef[] = [
    { id: "location", label: wire ? locName(loc) : shortLocationName(loc) },
    { id: "mine", label: "Mine" },
    ...(canAll ? [{ id: "all" as const, label: "All locations" }] : []),
    { id: "archive", label: "Archive" },
  ]

  return (
    <Sheet
      title="Requests"
      onClose={onClose}
      closeSide="left"
      resetKey={filter}
      action={
        <LiquidGlass mode="small" accent="#8f55e5" radius={999} className="absolute right-4 top-4 flex size-11 items-center justify-center">
          <button aria-label="New request" className="flex size-9 items-center justify-center rounded-full text-white">
            <IconPlus size={24} stroke={2} />
          </button>
        </LiquidGlass>
      }
      edgeBlur={{ top: { strength: 16, steps: 5, height: 84 }, bottom: false }}
    >
      <div className="px-4 pt-[10px]">
        <Filters filters={filters} value={filter} onChange={setFilter} counts={counts} />

        {/* One white container, a row per request. */}
        {wire && <WireList rows={4} className="mt-4" />}
        {!wire && <Card className="mt-4 overflow-hidden">
          {items.length === 0 ? (
            <div className="flex h-[62px] items-center justify-center gap-2 text-[#999]">
              <IconCheck size={20} stroke={3} className="rounded-full bg-[#999] p-[3px] text-white" />
              <span className="text-[17px] leading-6 tracking-[-0.43px]">{filter === "archive" ? "Nothing archived yet" : "All caught up"}</span>
            </div>
          ) : (
            items.map(({ r, loc: rl }, i) => (
              <div key={r.id}>
                {/* The divider spans just the button row's width: in 16 + 40 avatar + 12 gap on the left, 16 on the right. */}
                {i > 0 && <div aria-hidden className="ml-[68px] mr-4 border-t border-[#ebebeb]" />}
                <RequestCard
                  r={r}
                  beforeDivider={i < items.length - 1}
                  business={locName(rl)}
                  status={decided[r.id]}
                  onDecide={filter === "mine" || filter === "archive" ? undefined : (d) => decide(r.id, d)}
                />
              </div>
            ))
          )}
        </Card>}

        {/* For when too many have been cleared and you want to play with the interaction again. */}
        <div className={cn("flex justify-center pb-2 pt-5", wire && "hidden")}>
          <button
            onClick={add}
            className="flex items-center gap-[6px] rounded-full bg-[rgba(118,118,128,0.12)] py-2 pl-3 pr-4 text-[15px] font-[510] leading-5 tracking-[-0.24px] text-[#2c2935] active:opacity-60"
          >
            <IconPlus size={16} stroke={2.25} />
            Add request
          </button>
        </div>
      </div>
    </Sheet>
  )
}

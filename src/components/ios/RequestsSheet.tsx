import { useState } from "react"
import { motion } from "motion/react"
import { IconCheck, IconChevronRight, IconPlus, IconX } from "@tabler/icons-react"
import { Sheet } from "@/components/ios/Sheet"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { Location, RequestItem } from "@/data/locations"
import { requestsFor, useRequestsStore } from "@/store/useRequestsStore"

type FilterId = "team" | "mine" | "business" | "archive"

/** The exact icons from the Figma file, exported as SVG (UserGroup, User, Storefront, SF Symbol `tray`). */
const FILTERS: { id: FilterId; label: string; icon: string }[] = [
  { id: "team", label: "Team", icon: "/phone/req-team.svg" },
  { id: "mine", label: "Mine", icon: "/phone/req-user.svg" },
  { id: "business", label: "Business", icon: "/phone/req-store.svg" },
  { id: "archive", label: "Archive", icon: "/phone/req-tray.svg" },
]

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
function Filters({ value, onChange, counts }: { value: FilterId; onChange: (v: FilterId) => void; counts: Record<FilterId, number> }) {
  return (
    <div role="tablist" className="flex gap-2 pt-[10px]">
      {FILTERS.map(({ id, label, icon }) => {
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
              active ? "flex-1 bg-[#8f55e5] px-4 text-white" : "w-[60px] shrink-0 bg-[rgba(120,120,128,0.16)] px-[18px]",
            )}
          >
            <Icon src={icon} size={20} color={active ? "#ffffff" : "#747182"} />
            {active && <span className="text-[17px] font-[510] leading-5">{label}</span>}
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
}: {
  r: RequestItem
  business: string
  status?: "approved" | "declined"
  onDecide?: (d: "approved" | "declined") => void
}) {
  return (
    <div className="rounded-[26px] bg-white p-4 tracking-[-0.43px]">
      <div className="relative flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#d6c9f8] to-[#c1a6fa] text-[17px] font-[590] text-white">
          {r.initials}
        </span>
        <div className="min-w-0 flex-1 pr-14">
          <p className="truncate text-[17px] font-[590] leading-[22px] text-black">{r.title}</p>
          <p className="truncate text-[15px] leading-5 text-[#5a5666]">{r.who}</p>
          <p className="truncate text-[15px] leading-5 text-[#5a5666]">{r.detail}</p>
          <p className="flex items-center gap-[3px] text-[15px] leading-5 text-[#5a5666]">
            <Icon src="/phone/req-store.svg" size={16} color="#5a5666" />
            <span className="truncate">{business}</span>
          </p>
        </div>
        <span className="absolute right-0 top-0 flex items-center gap-[3px] text-[13px] leading-4 text-[#747182]">
          {r.time}
          <IconChevronRight size={13} stroke={2.5} className="text-[#2c2935]" />
        </span>
      </div>

      {onDecide && !status && (
        <div className="mt-4 flex gap-2 text-[17px]">
          <button
            onClick={() => onDecide("declined")}
            className="flex flex-1 items-center justify-center gap-[5px] rounded-full bg-[rgba(118,118,128,0.12)] px-4 py-2 text-[#2c2935] active:opacity-60"
          >
            <IconX size={17} stroke={2} />
            Decline
          </button>
          <button
            onClick={() => onDecide("approved")}
            className="flex flex-1 items-center justify-center gap-[5px] rounded-full bg-[#8f55e5] px-4 py-2 text-white active:opacity-80"
          >
            <IconCheck size={17} stroke={2.25} />
            Approve
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
  const [filter, setFilter] = useState<FilterId>("team")
  const decided = useRequestsStore((s) => s.decided)
  const decide = useRequestsStore((s) => s.decide)
  const added = useRequestsStore((s) => s.added)
  const addRequest = useRequestsStore((s) => s.addRequest)
  const all = requestsFor(loc, added)

  // "Add request": a fresh pending request in the current tab, from a teammate at THIS location.
  const add = () => {
    const n = (added[loc.id] ?? []).length
    const scope: RequestItem["scope"] = filter === "mine" || filter === "business" ? filter : "team"
    const me = scope === "mine"
    const who = me ? "Bryce Lewis" : loc.team[n % loc.team.length].name
    const t = TEMPLATES[(n + (scope === "business" ? 2 : 0)) % TEMPLATES.length]
    addRequest(loc.id, { id: `${loc.id}-add-${n}`, scope, initials: initialsOf(who), who, title: t.title, detail: t.detail, time: me ? "Pending" : "Just now" })
    if (filter === "archive") setFilter("team")
  }

  const undecided = (scope: RequestItem["scope"]) => all.filter((r) => r.scope === scope && !decided[r.id])
  const archive = all.filter((r) => decided[r.id])
  const lists: Record<FilterId, RequestItem[]> = {
    team: undecided("team"),
    mine: all.filter((r) => r.scope === "mine"),
    business: undecided("business"),
    archive,
  }
  const counts = { team: lists.team.length, mine: lists.mine.length, business: lists.business.length, archive: lists.archive.length }
  const items = lists[filter]
  const business = loc.profile.business

  return (
    <Sheet
      title="Requests"
      onClose={onClose}
      closeSide="left"
      resetKey={filter}
      action={
        <LiquidGlass mode="small" accent="#8f55e5" radius={999} className="absolute right-4 top-4 flex size-11 items-center justify-center">
          <button aria-label="New request" className="flex size-9 items-center justify-center rounded-full text-white">
            <IconPlus size={22} stroke={2.25} />
          </button>
        </LiquidGlass>
      }
      edgeBlur={{ top: { strength: 16, steps: 5, height: 84 }, bottom: false }}
    >
      <div className="px-4 pt-[10px]">
        <Filters value={filter} onChange={setFilter} counts={counts} />

        <div className="flex flex-col gap-2 pt-4">
          {items.length === 0 ? (
            <div className="flex h-[62px] items-center justify-center gap-2 rounded-[26px] bg-white text-[#999]">
              <IconCheck size={20} stroke={3} className="rounded-full bg-[#999] p-[3px] text-white" />
              <span className="text-[17px] leading-6 tracking-[-0.43px]">{filter === "archive" ? "Nothing archived yet" : "All caught up"}</span>
            </div>
          ) : (
            items.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                business={business}
                status={decided[r.id]}
                onDecide={filter === "mine" || filter === "archive" ? undefined : (d) => decide(r.id, d)}
              />
            ))
          )}
        </div>

        {/* For when too many have been cleared and you want to play with the interaction again. */}
        <div className="flex justify-center pb-2 pt-5">
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

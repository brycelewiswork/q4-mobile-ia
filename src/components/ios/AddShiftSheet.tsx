import { useState, type MouseEvent } from "react"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { ContextMenu } from "@/components/ios/ContextMenu"
import { Card, ListRow } from "@/components/ios/list"
import { useStructure } from "@/store/useViewStore"
import { WireValue } from "@/components/wire/Wire"
import type { Location } from "@/data/locations"
import { dayLabel } from "@/lib/dates"
import { useDateStore } from "@/store/useDateStore"
import { useShiftsStore } from "@/store/useShiftsStore"

/** 13.5 → "1:30 pm" */
const clock = (h: number) => {
  const whole = Math.floor(h)
  const m = Math.round((h - whole) * 60)
  return `${whole % 12 === 0 ? 12 : whole % 12}:${String(m).padStart(2, "0")} ${whole % 24 >= 12 ? "pm" : "am"}`
}
const shortName = (n: string) => {
  const [f, ...rest] = n.split(" ")
  return rest.length ? `${f} ${rest[rest.length - 1][0]}.` : f
}

/** A − / + pair that moves a time by half an hour. */
function Stepper({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  const btn = "flex size-8 items-center justify-center rounded-full bg-[rgba(120,120,128,0.16)] text-[#2c2935] active:opacity-60 disabled:opacity-30"
  return (
    <span className="flex items-center gap-3">
      <span className="flex min-w-[68px] justify-end text-right text-[17px] leading-[22px] text-[#2c2935]"><WireValue w={56}>{clock(value)}</WireValue></span>
      <button aria-label="Earlier" disabled={value <= min} onClick={() => onChange(value - 0.5)} className={btn}>
        <IconMinus size={16} stroke={2.5} />
      </button>
      <button aria-label="Later" disabled={value >= max} onClick={() => onChange(value + 0.5)} className={btn}>
        <IconPlus size={16} stroke={2.5} />
      </button>
    </span>
  )
}

/**
 * Body of the Add shift bottom sheet: who, role, the day (the shared date), start and end, then Add.
 * Adding puts the shift on that day's list at this location, and closes the sheet.
 */
export function AddShiftContent({ loc, close }: { loc: Location; close: (then?: () => void) => void }) {
  const date = useDateStore((s) => s.date)
  const add = useShiftsStore((s) => s.add)
  const roles = loc.employee.timeClock?.roles ?? Array.from(new Set(loc.team.map((m) => m.role)))
  const [who, setWho] = useState("open")
  const [role, setRole] = useState(roles[0])
  const [start, setStart] = useState(9)
  const [end, setEnd] = useState(17)
  const [menu, setMenu] = useState<{ kind: "who" | "role"; anchor: HTMLElement } | null>(null)
  const open = (kind: "who" | "role") => (e: MouseEvent<HTMLElement>) => setMenu({ kind, anchor: e.currentTarget })

  const wire = useStructure()
  const people = [{ id: "open", label: "Open shift" }, ...loc.team.map((m, i) => ({ id: m.name, label: wire ? `Person ${i + 1}` : m.name }))]
  const pickWho = (id: string) => {
    setWho(id)
    const member = loc.team.find((m) => m.name === id)
    if (member) setRole(member.role)
  }
  const save = () =>
    close(() =>
      add(loc.id, date, {
        who: who === "open" ? "Open shift" : shortName(who),
        role,
        start,
        end,
        open: who === "open",
      }),
    )

  return (
    <div className="absolute inset-0 px-4 pt-[76px] tracking-[-0.43px]">
      <Card className="overflow-hidden bg-white/70">
        <ListRow first compact chevron="updown" onClick={open("who")} title="Who" trailing={<span className="text-[#2c2935]"><WireValue>{people.find((p) => p.id === who)!.label}</WireValue></span>} divider="border-black/[0.09]" />
        <ListRow compact chevron="updown" onClick={open("role")} title="Role" trailing={<span className="text-[#2c2935]"><WireValue>{role}</WireValue></span>} divider="border-black/[0.09]" />
        <ListRow compact title="Day" trailing={<span className="text-[#2c2935]"><WireValue w={110}>{dayLabel(date)}</WireValue></span>} divider="border-black/[0.09]" />
        <ListRow compact title="Start" trailing={<Stepper value={start} onChange={(v) => setStart(Math.min(v, end - 0.5))} min={5} max={end - 0.5} />} divider="border-black/[0.09]" />
        <ListRow compact title="End" trailing={<Stepper value={end} onChange={(v) => setEnd(Math.max(v, start + 0.5))} min={start + 0.5} max={24} />} divider="border-black/[0.09]" />
      </Card>

      <button onClick={save} className="mt-4 h-[46px] w-full rounded-full bg-[#8f55e5] text-[17px] font-[590] tracking-[-0.43px] text-white active:opacity-80">
        Add shift
      </button>

      <ContextMenu anchor={menu?.kind === "who" ? menu.anchor : null} items={people} selectedId={who} onSelect={pickWho} onClose={() => setMenu(null)} />
      <ContextMenu anchor={menu?.kind === "role" ? menu.anchor : null} items={roles.map((r) => ({ id: r, label: r }))} selectedId={role} onSelect={setRole} onClose={() => setMenu(null)} />
    </div>
  )
}

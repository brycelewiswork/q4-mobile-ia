import { Card, GroupLabel, Initials, ListRow } from "@/components/ios/list"
import type { Location } from "@/data/locations"
import { MoneyPage } from "@/pages/TabPages"
import { useStructure } from "@/store/useViewStore"
import { WireList } from "@/components/wire/Wire"

/** The full pages the home dashboard widgets open (see FullPage). */
export type HomePageId = "log" | "earnings" | "shiftmates"

export const HOME_PAGE_TITLES: Record<HomePageId, string> = {
  log: "Manager Log",
  earnings: "Money",
  shiftmates: "Shiftmates",
}

function ManagerLogPage({ loc }: { loc: Location }) {
  if (useStructure()) return <div className="flex flex-col gap-3 pt-2"><WireList rows={3} avatar={false} /><WireList rows={2} avatar={false} /></div>
  return (
    <div className="flex flex-col gap-3 pt-2 tracking-[-0.43px]">
      {loc.managerLog.length === 0 && <Card className="p-4 text-[17px] text-[#999]">No notes yet</Card>}
      {loc.managerLog.map((e) => (
        <Card key={e.when + e.author} className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-[590] leading-5 text-black">{e.author}</span>
            <span className="shrink-0 text-[13px] leading-[18px] text-[#8e8e93]">{e.when}</span>
          </div>
          <p className="pt-1 text-[17px] leading-[22px] text-[#2c2935]">{e.note}</p>
        </Card>
      ))}
    </div>
  )
}

const STATUS = {
  on: { label: "Clocked in", color: "#34c759" },
  scheduled: { label: "Scheduled", color: "#8e8e93" },
  off: { label: "Off", color: "#c7c7cc" },
} as const

/** Who's on with you: this location's team, with their status today. */
function ShiftmatesPage({ loc }: { loc: Location }) {
  const on = loc.team.filter((m) => m.status === "on").length
  if (useStructure()) return <div className="pt-2"><WireList rows={7} trailing /></div>
  return (
    <div className="pt-2">
      <GroupLabel>{`${on} of ${loc.team.length} clocked in`}</GroupLabel>
      <Card className="overflow-hidden">
        {loc.team.map((m, i) => (
          <ListRow
            key={m.name}
            first={i === 0}
            leading={<Initials name={m.name} />}
            title={m.name}
            subtitle={m.role}
            trailing={
              <span className="flex flex-col items-end">
                <span className="flex items-center gap-[6px] text-[15px] leading-5 text-[#2c2935]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: STATUS[m.status].color }} />
                  {STATUS[m.status].label}
                </span>
                <span className="text-[13px] leading-[18px] text-[#747182]">{m.detail}</span>
              </span>
            }
          />
        ))}
      </Card>
    </div>
  )
}

export function HomePage({ id, loc }: { id: HomePageId; loc: Location }) {
  if (id === "log") return <ManagerLogPage loc={loc} />
  // Earnings is one card on the Money tab, so tapping it shows that tab's content as a page.
  if (id === "earnings") return <MoneyPage loc={loc} />
  return <ShiftmatesPage loc={loc} />
}

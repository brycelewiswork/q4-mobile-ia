import { HomePage } from "@/pages/HomePages"
import { useLocName } from "@/store/useViewStore"
import { useStructure } from "@/store/useViewStore"
import { WireCard, WireList, WireValue } from "@/components/wire/Wire"
import { useState, type ComponentType } from "react"
import { IconBan, IconCheck, IconCircleCheckFilled, IconClockFilled, IconMessageCircleFilled, IconPhoneFilled } from "@tabler/icons-react"
import { ContextMenu } from "@/components/ios/ContextMenu"
import { GlassChip } from "@/components/ios/GlassChip"
import { Card, GroupFooter, GroupLabel, Initials, ListRow, SectionHeader, Switch } from "@/components/ios/list"
import { LOCATIONS, type Availability, type Location } from "@/data/locations"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { usePersonStore, type Person } from "@/store/usePersonStore"
import { cn } from "@/lib/utils"

const ROUNDED = 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif'

/** Earnings from the Settings cards: the same page the Home widget opens. */
function Earnings({ loc }: PageProps) {
  return <HomePage id="earnings" loc={loc} />
}

/** Time off: the balance at this location, how it accrues, and what's booked. */
function TimeOff({ loc }: PageProps) {
  const t = loc.profile.timeOff
  if (useStructure()) {
    return (
      <div className="flex flex-col gap-4">
        <WireCard title="Balance" h={110} />
        <div>
          <GroupLabel>Upcoming</GroupLabel>
          <WireList rows={2} avatar={false} trailing />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 tracking-[-0.43px]">
        <p className="text-[14px] leading-5 text-[#2c2935]">Balance</p>
        <p className="text-[34px] font-bold leading-[41px] text-[#2c2935]" style={{ fontFamily: ROUNDED }}>{t.balance}</p>
        <p className="text-[14px] leading-5 text-[#747182]">{t.plan}</p>
        <p className="text-[14px] leading-5 text-[#747182]">{t.accrual}</p>
      </Card>
      <div>
        <GroupLabel>Upcoming</GroupLabel>
        <Card className="overflow-hidden">
          {t.upcoming.length === 0 && <p className="p-4 text-[17px] leading-[22px] tracking-[-0.43px] text-[#999]">Nothing booked</p>}
          {t.upcoming.map((u, i) => (
            <ListRow key={u.range} first={i === 0} title={u.range} trailing={u.status} />
          ))}
        </Card>
      </div>
    </div>
  )
}

export type PageId =
  | "account"
  | "personal"
  | "resume"
  | "team"
  | "tasks"
  | "payroll"
  | "locations"
  | "calendar"
  | "notifications"
  | "security"
  | "support"
  | "earnings"
  | "timeoff"

type PageProps = { loc: Location; editing?: boolean; arg?: string; /** The Team page's search text (the field is pinned to the sheet's bottom). */ query?: string; onOpen?: (p: PageId, arg?: string) => void }

// ---------------------------------------------------------------------------

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const NEXT: Record<Availability["kind"], Availability> = {
  "all-day": { kind: "available" },
  available: { kind: "blocked", range: "3:00 - 6:00 PM" },
  blocked: { kind: "all-day" },
}

function AvailabilityValue({ a }: { a: Availability }) {
  if (useStructure()) return <WireValue>{null}</WireValue>
  if (a.kind === "available") return <span className="text-[#2c2935]">Available</span>
  if (a.kind === "all-day") return <span>All day</span>
  return (
    <span className="flex items-center gap-1">
      <IconBan size={17} stroke={1.75} />
      {a.range}
    </span>
  )
}

function Account({ loc, onOpen }: PageProps) {
  const locName = useLocName()
  const [days, setDays] = useState(loc.profile.availability)
  const [editing, setEditing] = useState(false)
  const name = usePersonStore((p) => p.name)
  const multi = useUserTypeStore((s) => canSwitchLocation(s.type))
  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionHeader action={editing ? "Done" : "Edit"} onAction={() => setEditing((e) => !e)}>
          Availability
        </SectionHeader>
        <Card className="overflow-hidden">
          {DAYS.map((d, i) => (
            <ListRow
              key={d}
              first={i === 0}
              title={d}
              trailing={<AvailabilityValue a={days[i]} />}
              chevron={editing}
              onClick={editing ? () => setDays((all) => all.map((v, j) => (j === i ? NEXT[v.kind] : v))) : undefined}
            />
          ))}
        </Card>
        {editing && <GroupFooter>Tap a day to change it.</GroupFooter>}
      </div>

      <Card className="overflow-hidden">
        <ListRow first chevron onClick={() => onOpen?.("personal")} title="Personal Information" trailing={<WireValue>{name}</WireValue>} />
        <ListRow chevron onClick={() => undefined} title="Shared Name" trailing={<WireValue>{name}</WireValue>} />
      </Card>

      <Card className="overflow-hidden">
        <ListRow first chevron onClick={() => undefined} title="Tax & Bank Information" />
        <ListRow chevron onClick={() => onOpen?.("resume")} title="Resume" />
      </Card>

      <div>
        <SectionHeader>Locations</SectionHeader>
        <Card className="overflow-hidden">
          {LOCATIONS.filter((l) => multi || l.id === loc.id).map((l, i) => (
            <ListRow key={l.id} first={i === 0} chevron onClick={() => onOpen?.("locations")} title={locName(l)} />
          ))}
        </Card>
      </div>

      <div>
        <Card>
          <button className="flex h-[52px] w-full items-center px-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-[#ff2428] active:bg-black/[0.04]">
            Sign Out
          </button>
        </Card>
      </div>
    </div>
  )
}

function Field({
  label,
  k,
  editing,
  readOnly,
  chevron,
  extra,
  first,
}: {
  label: string
  k: keyof Person
  editing?: boolean
  readOnly?: boolean
  chevron?: boolean
  extra?: React.ReactNode
  first?: boolean
}) {
  const person = usePersonStore()
  const value = person[k] as string
  return (
    <ListRow
      first={first}
      title={label}
      chevron={chevron && !editing}
      trailing={
        editing && !readOnly ? (
          <input
            value={value}
            onChange={(e) => person.set({ [k]: e.target.value })}
            aria-label={label}
            placeholder="--"
            className="w-[190px] bg-transparent text-right text-[17px] leading-[22px] tracking-[-0.43px] text-[#5a5666] outline-none placeholder:text-[#928fa0]"
          />
        ) : (
          <span className="flex items-center gap-1">
            <WireValue>{value || "--"}</WireValue>
            {extra}
          </span>
        )
      }
    />
  )
}

function PersonalInformation({ editing }: PageProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <Field editing={editing} first label="Name" k="name" chevron />
        <Field editing={editing} label="Legal first name" k="firstName" />
        <Field editing={editing} label="Legal middle name" k="middleName" />
        <Field editing={editing} label="Legal last name" k="lastName" />
        <Field editing={editing} label="Date of birth" k="dob" />
        <Field editing={editing} label="Social security number" k="ssn" readOnly />
      </Card>

      <Card className="overflow-hidden">
        <Field editing={editing} first label="Phone" k="phone" />
        <Field editing={editing} label="Email" k="email" extra={<IconCircleCheckFilled size={17} className="text-[#5a5666]" />} />
        <Field editing={editing} label="Home address" k="address" />
        <Field editing={editing} label="Emergency contact" k="emergencyName" />
        <Field editing={editing} label="Emergency phone" k="emergencyPhone" />
      </Card>
    </div>
  )
}

/** Opens from the "Resume" row on Account Settings. */
function Resume({ editing }: PageProps) {
  return (
    <Card className="overflow-hidden">
      <Field editing={editing} first label="Experience" k="experience" />
      <Field editing={editing} label="Certifications" k="certifications" />
      <Field editing={editing} label="Education" k="education" />
      <button className="flex h-[52px] w-full items-center border-t border-[#ebebeb] px-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-[#0088ff] active:bg-black/[0.04]">
        Export to PDF...
      </button>
    </Card>
  )
}

/** The Team list: who works here, with a call and a message button. Search is pinned to the sheet's bottom. */
function Team({ loc, query = "" }: PageProps) {
  const locName = useLocName()
  const canSwitch = useUserTypeStore((s) => canSwitchLocation(s.type))
  const wire = useStructure()
  const [scope, setScope] = useState<"here" | "all">(canSwitch ? "all" : "here")
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const pool = (scope === "all" ? LOCATIONS : [loc]).flatMap((l) => l.team.map((m) => ({ ...m, key: `${l.id}-${m.name}` })))
  const q = query.trim().toLowerCase()
  const people = pool
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
  const circle = "flex size-9 shrink-0 items-center justify-center rounded-full bg-[rgba(120,120,128,0.16)] text-[#0088ff] active:opacity-60"

  return (
    // Bottom padding clears the pinned search bar.
    <div className="pb-[110px]">
      {canSwitch && (
        <div className="flex pb-3">
          <GlassChip onClick={(e) => setMenu(e.currentTarget)}>
            <span className="flex items-center gap-2">
              {scope === "all" ? "All locations" : locName(loc)}
              {/* SF Symbol line.3.horizontal.decrease: three lines, each shorter, centered. */}
              <span aria-hidden className="block h-4 w-5 bg-[#141414]" style={{ maskImage: "url(/phone/sf-filter.svg)", WebkitMaskImage: "url(/phone/sf-filter.svg)", maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }} />
            </span>
          </GlassChip>
          <ContextMenu
            anchor={menu}
            items={[
              { id: "all", label: "All locations" },
              { id: "here", label: locName(loc) },
            ]}
            selectedId={scope}
            align="left"
            onSelect={(id) => setScope(id as "all" | "here")}
            onClose={() => setMenu(null)}
          />
        </div>
      )}
      {wire ? <WireList rows={8} trailing /> : <Card className="overflow-hidden">
        {people.length === 0 && <p className="p-4 text-[17px] leading-[22px] tracking-[-0.43px] text-[#999]">No one matches</p>}
        {people.map((m, i) => (
          <div key={m.key} className="flex items-center gap-3 pl-4 pr-4">
            <span className="relative shrink-0">
              <Initials name={m.name} size={44} />
              {m.status === "on" && (
                <span aria-label="Clocked in" className="absolute -bottom-[2px] -right-[2px] flex size-[16px] items-center justify-center rounded-[5px] bg-[#34c759] ring-2 ring-white">
                  <IconClockFilled size={10} className="text-white" />
                </span>
              )}
            </span>
            <div className={cn("flex min-h-[68px] min-w-0 flex-1 items-center gap-3 py-3 tracking-[-0.43px]", i > 0 && "border-t border-[#ebebeb]")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] leading-[22px] text-black">{m.name}</p>
                <p className="truncate text-[15px] leading-5 text-[#7f7f7f]">{`${m.role} • ${m.seen}`}</p>
              </div>
              {m.phone && (
                <button aria-label={`Call ${m.name}`} className={circle}>
                  <IconPhoneFilled size={18} />
                </button>
              )}
              <button aria-label={`Message ${m.name}`} className={circle}>
                <IconMessageCircleFilled size={18} />
              </button>
            </div>
          </div>
        ))}
      </Card>}
    </div>
  )
}

function Tasks({ loc }: PageProps) {
  // Local, per-location toggles seeded from the data.
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(loc.tasks.map((t) => [t.id, t.done])),
  )
  const count = Object.values(done).filter(Boolean).length
  if (useStructure()) return <WireList rows={4} avatar={false} trailing />
  return (
    <div>
      <GroupLabel>{`${count} of ${loc.tasks.length} done`}</GroupLabel>
      <Card className="overflow-hidden">
        {loc.tasks.map((t, i) => (
          <ListRow
            key={t.id}
            first={i === 0}
            onClick={() => setDone((d) => ({ ...d, [t.id]: !d[t.id] }))}
            leading={
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150",
                  done[t.id] ? "border-[#8f55e5] bg-[#8f55e5]" : "border-[#c7c7cc]",
                )}
              >
                {done[t.id] && <IconCheck size={14} stroke={3} className="text-white" />}
              </span>
            }
            title={t.title}
            titleClassName={done[t.id] ? "text-[#928fa0] line-through" : undefined}
            trailing={<span className="text-[15px]">{t.due}</span>}
          />
        ))}
      </Card>
    </div>
  )
}

function Payroll({ loc }: PageProps) {
  const p = loc.payroll
  if (useStructure()) {
    return (
      <div className="flex flex-col gap-4">
        <WireCard title="Next payday" h={110} />
        <div className="flex gap-4">
          <WireCard title="Hours" h={80} className="flex-1" />
          <WireCard title="Gross pay" h={80} className="flex-1" />
        </div>
        <div>
          <GroupLabel>Recent pay stubs</GroupLabel>
          <WireList rows={3} avatar={false} trailing />
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 tracking-[-0.43px]">
        <p className="text-[14px] leading-5 text-[#2c2935]">Next payday</p>
        <p className="text-[34px] font-bold leading-[41px] text-[#2c2935]" style={{ fontFamily: ROUNDED }}>{p.nextPayday}</p>
        <p className="text-[14px] leading-5 text-[#747182]">{`Pay period ${p.period}`}</p>
      </Card>
      <div className="flex gap-4 tracking-[-0.43px]">
        {[
          { label: "Hours", value: p.hours },
          { label: "Gross pay", value: p.gross },
        ].map((c) => (
          <Card key={c.label} className="flex-1 p-3">
            <p className="text-[14px] leading-5 text-[#2c2935]">{c.label}</p>
            <p className="text-[22px] font-bold text-[#2c2935]" style={{ fontFamily: ROUNDED }}>{c.value}</p>
          </Card>
        ))}
      </div>
      <div>
        <GroupLabel>Recent pay stubs</GroupLabel>
        <Card className="overflow-hidden">
          {p.stubs.map((s, i) => (
            <ListRow key={s.period} first={i === 0} chevron onClick={() => undefined} title={s.period} trailing={s.net} />
          ))}
        </Card>
      </div>
    </div>
  )
}

/**
 * Every location the user works at, on one page — not tied to the business selected on Home. Each is its own
 * card: the name and PIN, then that location's own clock-in settings.
 */
function Locations() {
  const locName = useLocName()
  const wire = useStructure()
  const multi = useUserTypeStore((s) => canSwitchLocation(s.type))
  const [on, setOn] = useState<Record<string, { mobile: boolean; geofence: boolean }>>({})
  // Which location's settings are being edited. The switches only respond while their card is.
  const [editing, setEditing] = useState<string | null>(null)
  const get = (id: string) => on[id] ?? { mobile: true, geofence: false }
  const set = (id: string, patch: Partial<{ mobile: boolean; geofence: boolean }>) => setOn((o) => ({ ...o, [id]: { ...get(id), ...patch } }))
  return (
    <div className="flex flex-col gap-2">
      {LOCATIONS.filter((_, i) => multi || i === 0).map((l) => {
        const isEditing = editing === l.id
        return (
          <section key={l.id}>
            <SectionHeader action={isEditing ? "Done" : "Edit"} onAction={() => setEditing(isEditing ? null : l.id)}>
              {locName(l)}
            </SectionHeader>
            <Card className="overflow-hidden">
              <ListRow first title="PIN" trailing={<WireValue w={56}>{l.profile.pin}</WireValue>} />
              <ListRow title="Mobile app clock-in" trailing={<Switch disabled={!isEditing} checked={get(l.id).mobile} onChange={(v) => set(l.id, { mobile: v })} label={`Mobile app clock-in, ${locName(l)}`} />} />
              <ListRow title="Geofence" trailing={<Switch disabled={!isEditing} checked={get(l.id).geofence} onChange={(v) => set(l.id, { geofence: v })} label={`Geofence, ${locName(l)}`} />} />
            </Card>
          </section>
        )
      })}
      {/* A past location: greyed out, no PIN, nothing to set. */}
      {multi && (
        <section>
          <SectionHeader>
            <span className="text-[#b9b8c1]">{wire ? `Location ${LOCATIONS.length + 1}` : "Homebase Admin"}</span>
          </SectionHeader>
          <Card className="overflow-hidden">
            <ListRow first title={<span className="text-[#b9b8c1]">You no longer work here</span>} />
          </Card>
        </section>
      )}
    </div>
  )
}

function Calendar() {
  const [on, setOn] = useState<Record<string, boolean>>({ Apple: false, Google: false, Outlook: false })
  return (
    <div>
      <Card className="overflow-hidden">
        {(["Apple", "Google", "Outlook"] as const).map((n, i) => (
          <ListRow
            key={n}
            first={i === 0}
            title={`${n} Calendar`}
            subtitle={on[n] ? "Connected" : "Not Connected"}
            trailing={<Switch checked={on[n]} onChange={(v) => setOn((s) => ({ ...s, [n]: v }))} label={`${n} Calendar`} />}
          />
        ))}
      </Card>
      <GroupFooter>Your shifts are added to the calendars you connect and kept up to date when your schedule changes.</GroupFooter>
    </div>
  )
}

const NOTIFICATION_GROUPS = [
  { label: "Shifts", items: ["Shift reminders", "Schedule changes", "Swap and cover requests"] },
  { label: "Team", items: ["Chat messages", "Shoutouts"] },
  { label: "Alerts", items: ["Late clock-ins", "Overtime warnings"] },
]

function Notifications() {
  const [off, setOff] = useState<Record<string, boolean>>({ "Overtime warnings": true })
  return (
    <div className="flex flex-col gap-4">
      {NOTIFICATION_GROUPS.map((g) => (
        <div key={g.label}>
          <GroupLabel>{g.label}</GroupLabel>
          <Card className="overflow-hidden">
            {g.items.map((n, i) => (
              <ListRow
                key={n}
                first={i === 0}
                title={n}
                trailing={<Switch checked={!off[n]} onChange={(v) => setOff((s) => ({ ...s, [n]: !v }))} label={n} />}
              />
            ))}
          </Card>
        </div>
      ))}
    </div>
  )
}

function Security() {
  const wire = useStructure()
  const [faceId, setFaceId] = useState(true)
  const [twoFactor, setTwoFactor] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <ListRow first chevron onClick={() => undefined} title="Change Password" />
        <ListRow title="Sign in with Face ID" trailing={<Switch checked={faceId} onChange={setFaceId} label="Face ID" />} />
        <ListRow
          title="Two-Factor Authentication"
          trailing={<Switch checked={twoFactor} onChange={setTwoFactor} label="Two-Factor Authentication" />}
        />
      </Card>
      <div>
        <GroupLabel>Signed in on</GroupLabel>
        <Card className="overflow-hidden">
          {wire ? (
            <WireList rows={2} avatar={false} />
          ) : (
            <>
              <ListRow first title="iPhone 17" subtitle="This device" />
              <ListRow title="Chrome on Mac" subtitle="Last active yesterday" />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

function Support() {
  return (
    <div>
      <Card className="overflow-hidden">
        <ListRow first chevron onClick={() => undefined} title="Help Center" />
        <ListRow chevron onClick={() => undefined} title="Contact Support" />
        <ListRow chevron onClick={() => undefined} title="Report a Problem" />
      </Card>
      <GroupFooter>Support usually replies within a day.</GroupFooter>
    </div>
  )
}

// ---------------------------------------------------------------------------

export const PAGES: Record<PageId, { title: string; Component: ComponentType<PageProps>; action?: "edit" }> = {
  account: { title: "Account Settings", Component: Account },
  personal: { title: "Personal Information", Component: PersonalInformation, action: "edit" },
  resume: { title: "Resume", Component: Resume, action: "edit" },
  team: { title: "Team", Component: Team },
  tasks: { title: "Task Manager", Component: Tasks },
  payroll: { title: "Payroll", Component: Payroll },
  locations: { title: "Locations", Component: Locations },
  calendar: { title: "Calendar Sync", Component: Calendar },
  notifications: { title: "Notifications & Alerts", Component: Notifications },
  security: { title: "Password & Security", Component: Security },
  support: { title: "Support", Component: Support },
  earnings: { title: "Earnings", Component: Earnings },
  timeoff: { title: "Time off", Component: TimeOff },
}

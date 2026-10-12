import { useState, type ComponentType } from "react"
import { IconBan, IconCheck, IconCircleCheckFilled } from "@tabler/icons-react"
import { Card, GroupFooter, GroupLabel, Initials, ListRow, SectionHeader, Switch } from "@/components/ios/list"
import { LOCATIONS, type Availability, type Location } from "@/data/locations"
import { canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { useLocationStore } from "@/store/useLocationStore"
import { usePersonStore, type Person } from "@/store/usePersonStore"
import { cn } from "@/lib/utils"

const ROUNDED = 'ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif'

export type PageId =
  | "account"
  | "personal"
  | "resume"
  | "location"
  | "team"
  | "tasks"
  | "log"
  | "payroll"
  | "locations"
  | "calendar"
  | "notifications"
  | "security"
  | "support"

type PageProps = { loc: Location; editing?: boolean; arg?: string; onOpen?: (p: PageId, arg?: string) => void }

// ---------------------------------------------------------------------------

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const NEXT: Record<Availability["kind"], Availability> = {
  "all-day": { kind: "available" },
  available: { kind: "blocked", range: "3:00 - 6:00 PM" },
  blocked: { kind: "all-day" },
}

function AvailabilityValue({ a }: { a: Availability }) {
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
        <ListRow first chevron onClick={() => onOpen?.("personal")} title="Personal Information" trailing={name} />
        <ListRow chevron onClick={() => undefined} title="Shared Name" trailing={name} />
      </Card>

      <Card className="overflow-hidden">
        <ListRow first chevron onClick={() => undefined} title="Tax & Bank Information" />
        <ListRow chevron onClick={() => onOpen?.("resume")} title="Resume" />
      </Card>

      <div>
        <SectionHeader>Locations</SectionHeader>
        <Card className="overflow-hidden">
          {LOCATIONS.filter((l) => multi || l.id === loc.id).map((l, i) => (
            <ListRow key={l.id} first={i === 0} chevron onClick={() => onOpen?.("location", l.id)} title={l.name} />
          ))}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <ListRow first chevron onClick={() => undefined} title="Terms of service" />
        <ListRow chevron onClick={() => undefined} title="Privacy policy" />
      </Card>

      <div>
        <Card>
          <button className="flex h-[52px] w-full items-center px-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-[#ff2428] active:bg-black/[0.04]">
            Sign Out
          </button>
        </Card>
        <p className="px-4 pb-[6px] pt-2 text-[13px] leading-[18px] tracking-[-0.08px] text-[#5a5666]">Version 5.22 (5271)</p>
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
            {value || "--"}
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

/** One of the user's locations (Account Settings > Locations): per-location clock-in and geofence options. */
function LocationSettings({ arg }: PageProps) {
  const l = LOCATIONS.find((x) => x.id === arg) ?? LOCATIONS[0]
  const [mobile, setMobile] = useState(true)
  const [geofence, setGeofence] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Card className="overflow-hidden">
          <ListRow first title="Mobile app clock-in" trailing={<Switch checked={mobile} onChange={setMobile} label="Mobile app clock-in" />} />
        </Card>
        <GroupFooter>Allow employees to use the time clock from their mobile device.</GroupFooter>
      </div>
      <div>
        <Card className="overflow-hidden">
          <ListRow first title="Geofence" trailing={<Switch checked={geofence} onChange={setGeofence} label="Geofence" />} />
        </Card>
        <GroupFooter>{`Long press on the map to mark the location of ${l.profile.business}.`}</GroupFooter>
      </div>
      <Card>
        <button className="flex h-[52px] w-full items-center px-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-[#ff2428] active:bg-black/[0.04]">
          Don’t work here anymore?
        </button>
      </Card>
    </div>
  )
}

const STATUS = {
  on: { label: "Clocked in", color: "#34c759" },
  scheduled: { label: "Scheduled", color: "#8e8e93" },
  off: { label: "Off", color: "#c7c7cc" },
} as const

function Team({ loc }: PageProps) {
  const on = loc.team.filter((m) => m.status === "on").length
  return (
    <div>
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

function Tasks({ loc }: PageProps) {
  // Local, per-location toggles seeded from the data.
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(loc.tasks.map((t) => [t.id, t.done])),
  )
  const count = Object.values(done).filter(Boolean).length
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

function ManagerLog({ loc }: PageProps) {
  return (
    <div className="flex flex-col gap-3">
      {loc.managerLog.map((e) => (
        <Card key={e.when + e.author} className="p-4 tracking-[-0.43px]">
          <p className="text-[13px] leading-[18px] text-[#747182]">{`${e.author} · ${e.when}`}</p>
          <p className="pt-1 text-[17px] leading-[22px] text-[#2c2935]">{e.note}</p>
        </Card>
      ))}
    </div>
  )
}

function Payroll({ loc }: PageProps) {
  const p = loc.payroll
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

function Locations({ loc }: PageProps) {
  const setLocation = useLocationStore((s) => s.setLocation)
  return (
    <div>
      <Card className="overflow-hidden">
        {LOCATIONS.map((l, i) => (
          <ListRow
            key={l.id}
            first={i === 0}
            onClick={() => setLocation(l.id)}
            leading={<span className="flex w-5 justify-center">{l.id === loc.id && <IconCheck size={20} stroke={2.5} className="text-[#8f55e5]" />}</span>}
            title={l.name}
            subtitle={l.profile.address}
          />
        ))}
      </Card>
      <GroupFooter>The selected location controls what you see on every screen.</GroupFooter>
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
          <ListRow first title="iPhone 17" subtitle="This device" />
          <ListRow title="Chrome on Mac" subtitle="Last active yesterday" />
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
  location: { title: "Location", Component: LocationSettings },
  team: { title: "Team", Component: Team },
  tasks: { title: "Task Manager", Component: Tasks },
  log: { title: "Manager Log", Component: ManagerLog },
  payroll: { title: "Payroll", Component: Payroll },
  locations: { title: "Locations", Component: Locations },
  calendar: { title: "Calendar Sync", Component: Calendar },
  notifications: { title: "Notifications & Alerts", Component: Notifications },
  security: { title: "Password & Security", Component: Security },
  support: { title: "Support", Component: Support },
}

import { Fragment } from "react"
import { IconSpeakerphone, IconUsers, IconUsersGroup } from "@tabler/icons-react"
import type { AssistantTurn } from "@/data/chats"
import type { Message } from "@/data/locations"
import { cn } from "@/lib/utils"

const initialsOf = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("")

/** A conversation's avatar: a symbol for the shared ones (announcements, team, a group), initials for a person. */
export function MsgAvatar({ m, size = 40 }: { m: Message; size?: number }) {
  if (m.kind !== "dm") {
    const Icon = m.kind === "announcement" ? IconSpeakerphone : m.kind === "team" ? IconUsersGroup : IconUsers
    return (
      <span className="bg-m-secondary-container text-m-on-surface flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size }}>
        <Icon size={size * 0.55} stroke={1.5} />
      </span>
    )
  }
  return (
    <span className="bg-m-primary-container text-m-on-primary-container flex shrink-0 items-center justify-center rounded-full font-medium" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initialsOf(m.title)}
    </span>
  )
}

/** One conversation in the Messages list: who, the last line, when, and a dot while it is unread. */
export function MessageRow({ m, selected, onClick }: { m: Message; selected?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} aria-current={selected ? "true" : undefined} className={cn("flex w-full items-center gap-4 px-4 py-3 text-left active:bg-black/10", selected && "bg-m-secondary-container")}>
      <MsgAvatar m={m} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("text-m-on-surface truncate text-[16px] leading-6", m.unread ? "font-semibold" : "font-medium")}>{m.title}</span>
          <span className="text-m-variant shrink-0 text-[12px] leading-4">{m.time}</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="text-m-variant truncate text-[14px] leading-5">{m.preview}</span>
          {m.unread && <span aria-label="Unread" className="size-[10px] shrink-0 rounded-full bg-[#8f55e5]" />}
        </span>
      </span>
    </button>
  )
}

const split = (t: string) => {
  const m = t.match(/^(.*?)\s*(\d{1,2}:\d{2} [ap]m)$/i)
  return m ? { day: m[1] || "Today", clock: m[2] } : { day: "", clock: t }
}

/** A Messages conversation's bubbles: yours on the right, theirs on the left, a day label where the day changes. */
export function ThreadBubbles({ m }: { m: Message }) {
  const thread = m.thread ?? [{ from: m.title, text: m.preview, time: m.time }]
  const group = m.kind !== "dm"
  let day = ""
  return (
    <div className="flex flex-col gap-1">
      {thread.map((t, i) => {
        const { day: d, clock } = split(t.time)
        const showDay = d !== day
        day = d
        const newSender = !thread[i - 1] || thread[i - 1].from !== t.from
        return (
          <Fragment key={i}>
            {showDay && d && <p className="text-m-variant pb-1 pt-3 text-center text-[12px] leading-4">{d}</p>}
            <div className={cn("flex flex-col", t.me ? "items-end" : "items-start", newSender && i > 0 && "pt-2")}>
              {group && !t.me && newSender && <span className="text-m-variant px-3 pb-[2px] text-[12px] leading-4">{t.from}</span>}
              <p className={cn("max-w-[80%] whitespace-pre-line rounded-[20px] px-4 py-2 text-[16px] leading-6", t.me ? "bg-m-primary-container text-m-on-primary-container" : "bg-m-high text-m-on-surface")}>{t.text}</p>
              <span className="text-m-variant px-3 pt-[2px] text-[11px] leading-4">{clock}</span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

/** The assistant's turns in a past chat. */
export function AssistantTurns({ turns }: { turns: AssistantTurn[] }) {
  return (
    <>
      {turns.map((t, i) => (
        <p key={i} className={cn("max-w-[88%] whitespace-pre-line rounded-[20px] px-4 py-3 text-[16px] leading-6", t.role === "user" ? "bg-m-primary-container text-m-on-primary-container self-end" : "bg-m-container text-m-on-surface self-start")}>
          {t.text}
        </p>
      ))}
    </>
  )
}

export function MessageComposer() {
  return (
    <div className="bg-m-high flex h-14 items-center rounded-full pl-5 pr-2">
      <span className="text-m-variant flex-1 text-[16px]">Message</span>
    </div>
  )
}

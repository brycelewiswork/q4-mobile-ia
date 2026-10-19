import { IconBell, IconBoltFilled } from "@tabler/icons-react"
import { HomebaseLogo } from "@/components/icons/HomebaseLogo"
import { Bar } from "@/components/wire/Wire"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import type { Location } from "@/data/locations"
import { Initials, SELF_TINT } from "@/components/ios/list"
import { TABS, type TabId } from "@/components/ios/TabBar"
import { cn } from "@/lib/utils"
import { ANON, useStructure } from "@/store/useViewStore"

/** A tab glyph (a single-color SVG) drawn in a color. */
function TabGlyph({ src, color }: { src: string; color: string }) {
  return (
    <span
      aria-hidden
      className="block size-[22px] shrink-0"
      style={{ backgroundColor: color, maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }}
    />
  )
}

/**
 * The menu that sits underneath the app: the main tabs, then the assistant's past conversations (pinned first, then
 * recents), with a search and a New chat button. Choosing one (or New chat) puts the menu away and opens the assistant there.
 */
export function ConversationsDrawer({ loc, tabs, onTab, pending, onBell, onOpenChat, onNewChat, onProfile }: {
  loc: Location
  /** The main tabs this person has, repeated at the top of the menu. */
  tabs: readonly TabId[]
  onTab: (t: TabId) => void
  /** Requests waiting on a decision: the dot on the bell, top right. */
  pending?: number
  onBell: () => void
  onOpenChat: (title: string) => void
  onNewChat: () => void
  onProfile: () => void
}) {
  const wire = useStructure()
  const matches = loc.conversations
  const pinned = matches.filter((c) => c.pinned)
  const recents = matches.filter((c) => !c.pinned)
  const label = "px-4 pb-1 pt-7 text-[14px] font-[510] leading-5 text-[#a09ead]"
  const row = (c: Location["conversations"][number], i: number) => (
    <button key={c.id} onClick={() => onOpenChat(c.title)} className="flex min-h-10 w-full items-center gap-3 px-4 text-left active:bg-black/[0.04]">
      {wire ? <Bar w={`${[78, 62, 70, 54, 66, 58, 74][i % 7]}%`} h={12} /> : <span className="truncate text-[17px] leading-[22px] text-black">{c.title}</span>}
    </button>
  )
  return (
    <div className="absolute inset-0 flex flex-col tracking-[-0.43px]" style={{ paddingTop: "calc(var(--safe-top) + 4px)" }}>
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 px-4">
        <h2 className="flex h-11 items-center text-black">
          <span className="sr-only">Assistant</span>
          <HomebaseLogo aria-hidden className="h-[18px] w-auto" />
        </h2>
        {/* The notifications (requests) button, moved here from the top right of every page. */}
        <LiquidGlass mode="small" radius={999} className="flex size-11 shrink-0 items-center justify-center">
          <button onClick={onBell} aria-haspopup="dialog" aria-label={pending ? `Notifications, ${pending} unread` : "Notifications"} className="flex size-9 items-center justify-center rounded-full text-[#141414]">
            <span className="relative">
              <IconBell size={24} stroke={1.75} />
              {!!pending && <span className="absolute right-[1px] top-[1px] size-2 rounded-full bg-[#ff3b30] ring-2 ring-white/70" />}
            </span>
          </button>
        </LiquidGlass>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-36 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* The same tabs as the bar on the main page. */}
        {(
          <nav aria-label="Tabs">
            <h3 className={cn(label, "pt-6")}>Tabs</h3>
            <div className="flex flex-col gap-[2px] px-2">
              {tabs.map((id) => {
                const t = TABS.find((x) => x.id === id)!
                return (
                  <button key={id} onClick={() => onTab(id)} className="flex h-9 w-full items-center gap-3 rounded-full px-3 text-left active:opacity-60">
                    <TabGlyph src={t.icon} color="#1a1a1a" />
                    <span className="text-[17px] font-medium leading-[22px] text-black">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}
        {pinned.length > 0 && (
          <>
            <h3 className={label}>Pinned</h3>
            {pinned.map((c, i) => row(c, i))}
          </>
        )}
        {recents.length > 0 && (
          <>
            <h3 className={label}>Recents</h3>
            {recents.map((c, i) => row(c, i))}
          </>
        )}
        {matches.length === 0 && <p className="px-4 pt-6 text-[17px] leading-[22px] text-[#8e8e93]">No conversations</p>}
      </div>
      {/* The foot of the menu, level with the tab bar on the app surface (centered on it, so smaller buttons sit 5px up): the avatar (profile and settings) and New chat. */}
      <div className="absolute inset-x-0 flex items-end justify-between px-[25px]" style={{ bottom: "calc(var(--safe-bottom) + 5px)" }}>
        <LiquidGlass mode="small" radius={999} className="flex size-11 shrink-0 items-center justify-center">
          <button onClick={onProfile} aria-label="Profile and settings" aria-haspopup="dialog" data-anno="profile" className="size-[38px] rounded-full">
            {wire ? <Initials name={ANON.name} size={38} tint={SELF_TINT} /> : <img src="/phone/avatar.jpg" alt="" className="size-full rounded-full object-cover" />}
          </button>
        </LiquidGlass>
        <button
          onClick={onNewChat}
          className="flex h-11 items-center gap-[6px] rounded-full bg-[#8f55e5] px-4 text-[15px] font-[590] text-white shadow-[0_6px_16px_rgba(143,85,229,0.35),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85"
        >
          <IconBoltFilled size={20} />
          New chat
        </button>
      </div>
    </div>
  )
}

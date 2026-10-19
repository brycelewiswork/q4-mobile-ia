import { useState } from "react"
import { IconPin, IconPencilPlus, IconSearch, IconX } from "@tabler/icons-react"
import { HomebaseLogo } from "@/components/icons/HomebaseLogo"
import { Bar } from "@/components/wire/Wire"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import type { Location } from "@/data/locations"
import { Initials } from "@/components/ios/list"
import { TABS, type TabId } from "@/components/ios/TabBar"
import { cn } from "@/lib/utils"
import { ANON, useStructure } from "@/store/useViewStore"

/** A tab glyph (a single-color SVG) drawn in a color. */
function TabGlyph({ src, color }: { src: string; color: string }) {
  return (
    <span
      aria-hidden
      className="block size-6 shrink-0"
      style={{ backgroundColor: color, maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }}
    />
  )
}

/**
 * The menu that sits underneath the app: the main tabs, then the assistant's past conversations (pinned first, then
 * recents), with a search and a New chat button. Choosing one (or New chat) puts the menu away and opens the assistant there.
 */
export function ConversationsDrawer({ loc, tabs, onTab, unread, onOpenChat, onNewChat, onProfile }: {
  loc: Location
  /** The main tabs this person has, repeated at the top of the menu. */
  tabs: readonly TabId[]
  onTab: (t: TabId) => void
  /** Unread messages: the dot on the Messages tab. */
  unread?: boolean
  onOpenChat: (title: string) => void
  onNewChat: () => void
  onProfile: () => void
}) {
  const wire = useStructure()
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const matches = loc.conversations.filter((c) => c.title.toLowerCase().includes(q))
  const pinned = matches.filter((c) => c.pinned)
  const recents = matches.filter((c) => !c.pinned)
  const label = "px-4 pb-0.5 pt-4 text-[15px] font-[590] leading-5 text-[#747182]"
  const row = (c: Location["conversations"][number], i: number, withPin: boolean) => (
    <button key={c.id} onClick={() => onOpenChat(c.title)} className="flex min-h-10 w-full items-center gap-3 px-4 text-left active:bg-black/[0.04]">
      {withPin && <IconPin size={20} stroke={1.75} className="shrink-0 text-[#747182]" />}
      {wire ? <Bar w={`${[78, 62, 70, 54, 66, 58, 74][i % 7]}%`} h={12} /> : <span className="truncate text-[17px] leading-[22px] text-black">{c.title}</span>}
    </button>
  )
  return (
    <div className="absolute inset-0 flex flex-col tracking-[-0.43px]" style={{ paddingTop: "calc(var(--safe-top) + 4px)" }}>
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 px-4">
        {searching ? (
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#767680]/[0.12] px-4">
            <IconSearch size={20} stroke={1.75} className="shrink-0 text-[#8e8e93]" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#8e8e93]" />
          </label>
        ) : (
          <h2 className="flex h-11 items-center text-black">
            <span className="sr-only">Assistant</span>
            <HomebaseLogo aria-hidden className="h-[18px] w-auto" />
          </h2>
        )}
        <LiquidGlass mode="small" radius={999} className="flex size-11 shrink-0 items-center justify-center">
          <button
            onClick={() => { setSearching((s) => !s); setQuery("") }}
            aria-label={searching ? "Close search" : "Search conversations"}
            className="flex size-9 items-center justify-center rounded-full text-[#141414]"
          >
            {searching ? <IconX size={22} stroke={2} /> : <IconSearch size={24} stroke={1.75} />}
          </button>
        </LiquidGlass>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-36 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* The same tabs as the bar on the main page. */}
        {!searching && (
          <nav aria-label="Tabs">
            <h3 className={cn(label, "pt-2")}>Tabs</h3>
            <div className="flex flex-col gap-[2px] px-2">
              {tabs.map((id) => {
                const t = TABS.find((x) => x.id === id)!
                return (
                  <button key={id} onClick={() => onTab(id)} className="flex h-9 w-full items-center gap-3 rounded-full px-3 text-left active:opacity-60">
                    <span className="relative">
                      <TabGlyph src={t.icon} color="#1a1a1a" />
                      {id === "chat" && unread && <span aria-hidden className="absolute -right-[2px] top-0 size-[9px] rounded-full bg-[#ff3b30] ring-[1.5px] ring-white" />}
                    </span>
                    <span className="text-[17px] leading-[22px] text-black">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}
        {pinned.length > 0 && (
          <>
            <h3 className={label}>Pinned</h3>
            {pinned.map((c, i) => row(c, i, true))}
          </>
        )}
        {recents.length > 0 && (
          <>
            <h3 className={label}>Recents</h3>
            {recents.map((c, i) => row(c, i, false))}
          </>
        )}
        {matches.length === 0 && <p className="px-4 pt-6 text-[17px] leading-[22px] text-[#8e8e93]">No conversations</p>}
      </div>
      {/* The foot of the menu, level with the tab bar on the app surface (centered on it, so smaller buttons sit 5px up): the avatar (profile and settings) and New chat. */}
      <div className="absolute inset-x-0 flex items-end justify-between px-[25px]" style={{ bottom: "calc(var(--safe-bottom) + 5px)" }}>
        <LiquidGlass mode="small" radius={999} className="flex size-11 shrink-0 items-center justify-center">
          <button onClick={onProfile} aria-label="Profile and settings" aria-haspopup="dialog" data-anno="profile" className="size-[38px] rounded-full">
            {wire ? <Initials name={ANON.name} size={38} /> : <img src="/phone/avatar.jpg" alt="" className="size-full rounded-full object-cover" />}
          </button>
        </LiquidGlass>
        <button
          onClick={onNewChat}
          className="flex h-11 items-center gap-[6px] rounded-full bg-[#8f55e5] px-4 text-[15px] font-[590] text-white shadow-[0_6px_16px_rgba(143,85,229,0.35),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85"
        >
          <IconPencilPlus size={20} stroke={1.75} />
          New chat
        </button>
      </div>
    </div>
  )
}

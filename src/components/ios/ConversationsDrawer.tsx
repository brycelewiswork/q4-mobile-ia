import { useState } from "react"
import { IconPin, IconPencilPlus, IconSearch, IconX } from "@tabler/icons-react"
import { Bar } from "@/components/wire/Wire"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import type { Location } from "@/data/locations"
import { useStructure } from "@/store/useViewStore"

/**
 * The menu that sits underneath the app: the assistant's past conversations, pinned first, then recents, with a search
 * and a New chat button. Choosing one (or New chat) puts the menu away and opens the assistant there.
 */
export function ConversationsDrawer({ loc, onOpenChat, onNewChat }: { loc: Location; onOpenChat: (title: string) => void; onNewChat: () => void }) {
  const wire = useStructure()
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const matches = loc.conversations.filter((c) => c.title.toLowerCase().includes(q))
  const pinned = matches.filter((c) => c.pinned)
  const recents = matches.filter((c) => !c.pinned)
  const label = "px-4 pb-1 pt-5 text-[17px] font-[590] leading-[22px] text-black"
  const row = (c: Location["conversations"][number], i: number, withPin: boolean) => (
    <button key={c.id} onClick={() => onOpenChat(c.title)} className="flex min-h-[48px] w-full items-center gap-3 px-4 text-left active:bg-black/[0.04]">
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
          <h2 className="text-[28px] font-[590] leading-[34px] text-black">Assistant</h2>
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
      <div className="min-h-0 flex-1 overflow-y-auto pb-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      <button
        onClick={onNewChat}
        className="absolute left-4 flex h-12 items-center gap-2 rounded-full bg-[#8f55e5] px-5 text-[17px] font-[590] text-white shadow-[0_6px_16px_rgba(143,85,229,0.35),0_2px_4px_rgba(0,0,0,0.12)] active:opacity-85"
        style={{ bottom: "calc(var(--safe-bottom) + 16px)" }}
      >
        <IconPencilPlus size={22} stroke={1.75} />
        New chat
      </button>
    </div>
  )
}

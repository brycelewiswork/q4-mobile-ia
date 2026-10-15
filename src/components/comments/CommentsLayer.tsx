import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IconCheck, IconMessageCircle, IconMessageCirclePlus, IconPencil, IconTrash, IconX } from "@tabler/icons-react"
import { ago, threadsOf, type Anchor, type Thread } from "@/lib/comments"
import { describe, selectorFor } from "@/lib/selectorFor"
import { cn } from "@/lib/utils"
import { useCommentsStore } from "@/store/useCommentsStore"
import { useUserTypeStore, type UserType } from "@/store/useUserTypeStore"
import { FULL_ENABLED, useViewStore } from "@/store/useViewStore"

const SCREEN = ".ios-screen, .android-screen"
const PURPLE = "#8f55e5"
const field = "w-full rounded-[10px] bg-[#767680]/[0.12] px-3 text-[14px] outline-none placeholder:text-black/35 dark:bg-white/10 dark:placeholder:text-white/35"

type Pin = { id: string; x: number; y: number }

/** Where this view's pins are, tracked every frame: the commented box or element's corner, if it is on screen right now. */
function usePins(threads: Thread[]): Pin[] {
  const view = useViewStore((s) => s.view)
  const platform = useViewStore((s) => s.platform)
  const [pins, setPins] = useState<Pin[]>([])
  const prev = useRef<Pin[]>([])
  const list = useRef(threads)
  list.current = threads
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const out: Pin[] = []
      const screen = document.querySelector<HTMLElement>(SCREEN)
      const s = screen?.getBoundingClientRect()
      for (const { top } of list.current) {
        const a = top.anchor
        if (!a || a.view !== view) continue
        if (view === "prototype") {
          if (!a.selector || !screen || !s || (a.platform && a.platform !== platform)) continue
          let el: HTMLElement | null = null
          try {
            const found = screen.querySelectorAll<HTMLElement>(a.selector)
            if (found.length === 1) el = found[0]
          } catch {
            /* a selector that no longer parses just never shows */
          }
          if (!el) continue
          const r = el.getBoundingClientRect()
          if (r.width < 4 || r.height < 4 || r.bottom < s.top || r.top > s.bottom || r.right < s.left || r.left > s.right) continue
          // Covered by a sheet or page? Whatever is on top at its centre must be it (or inside it).
          const hit = document.elementsFromPoint(Math.min(Math.max(r.left + r.width / 2, s.left + 1), s.right - 1), Math.min(Math.max(r.top + r.height / 2, s.top + 1), s.bottom - 1)).find((e) => !e.closest("[data-comments-ui],[data-notes-ui]"))
          if (!hit || !(el.contains(hit) || hit.contains(el))) continue
          out.push({ id: top.id, x: Math.min(Math.max(r.right - 4, s.left + 14), s.right - 14), y: Math.min(Math.max(r.top + 4, s.top + 14), s.bottom - 14) })
        } else {
          if (!a.nodeId) continue
          const el = document.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(a.nodeId)}"][data-tree="${a.tree ?? "after"}"]`)
          if (!el) continue
          const r = el.getBoundingClientRect()
          if (r.right < 0 || r.left > window.innerWidth || r.bottom < 0 || r.top > window.innerHeight) continue
          out.push({ id: top.id, x: r.left + 6, y: r.top - 2 })
        }
      }
      const same = out.length === prev.current.length && out.every((p, i) => p.id === prev.current[i].id && Math.abs(p.x - prev.current[i].x) < 0.5 && Math.abs(p.y - prev.current[i].y) < 0.5)
      if (!same) {
        prev.current = out
        setPins(out)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [view, platform])
  return pins
}

/** The context a comment was made in, so it can be found again: which view, and for the prototype, which device and user. */
function currentContext(): Pick<Anchor, "view" | "platform" | "device" | "orientation" | "user" | "detail"> {
  const v = useViewStore.getState()
  return { view: v.view, device: v.device, orientation: v.orientation, user: useUserTypeStore.getState().type, detail: v.detail }
}

const where = (a?: Anchor) => {
  if (!a) return "General"
  if (a.view === "sitemap") return `Sitemap${a.tree ? ` · ${a.tree === "before" ? "Before" : "After"}` : ""}`
  return `Prototype${a.platform ? ` · ${a.platform === "ios" ? "iOS" : "Android"}` : ""}${a.device ? ` ${a.device}` : ""}`
}

/** Take the page to where a comment lives: the right view, device and user, and (for the sitemap) open the branch it is on. */
function goTo(a?: Anchor) {
  if (!a) return
  const v = useViewStore.getState()
  v.setView(a.view)
  if (a.view === "prototype") {
    if (a.platform) v.setPlatform(a.platform)
    if (a.device) v.setDevice(a.device)
    if (a.orientation) v.setOrientation(a.orientation)
    if (a.detail && FULL_ENABLED && (a.platform ?? v.platform) !== "android") v.setDetail(a.detail)
    if (a.user) useUserTypeStore.getState().setType(a.user as UserType)
  } else {
    window.dispatchEvent(new CustomEvent("sitemap:reveal", { detail: { tree: a.tree, nodeId: a.nodeId } }))
  }
}

// ---------------------------------------------------------------------------------------------------------------------

/** A text box that posts. Asks for a name the first time (kept in this browser), then never again. */
function Composer({ placeholder, submit, onDone, autoFocus, compact }: { placeholder: string; submit: (text: string) => Promise<boolean>; onDone?: () => void; autoFocus?: boolean; compact?: boolean }) {
  const name = useCommentsStore((s) => s.name)
  const setName = useCommentsStore((s) => s.setName)
  const error = useCommentsStore((s) => s.error)
  const [text, setText] = useState("")
  const [who, setWho] = useState(name)
  const [busy, setBusy] = useState(false)
  const ready = text.trim().length > 0 && (name || who).trim().length > 0
  const post = async () => {
    if (!ready || busy) return
    if (!name) setName(who.trim())
    setBusy(true)
    const ok = await submit(text.trim())
    setBusy(false)
    if (ok) {
      setText("")
      onDone?.()
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {!name && <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Your name" maxLength={40} className={cn(field, "h-9")} />}
      <textarea
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            post()
          }
        }}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        maxLength={1500}
        className={cn(field, "resize-none py-2 leading-5")}
      />
      {error && <p className="text-[12px] leading-4 text-[#d0161f]">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#7f7f7f]">⌘ Enter to post</span>
        <button onClick={post} disabled={!ready || busy} className="h-8 rounded-full px-4 text-[13px] font-[590] text-white active:opacity-70 disabled:opacity-40" style={{ backgroundColor: PURPLE }}>
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  )
}

const avatar = (name: string, size = 24) => (
  <span aria-hidden className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-[590] text-white" style={{ width: size, height: size, backgroundColor: PURPLE }}>
    {(name.trim()[0] ?? "?").toUpperCase()}
  </span>
)

/** One thread, open: the comment, its replies, a box to reply, and resolve / edit / delete. */
function ThreadCard({ thread, style, onClose }: { thread: Thread; style: React.CSSProperties; onClose: () => void }) {
  const add = useCommentsStore((s) => s.add)
  const resolve = useCommentsStore((s) => s.resolve)
  const remove = useCommentsStore((s) => s.remove)
  const edit = useCommentsStore((s) => s.edit)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const { top, replies } = thread
  const item = (c: typeof top) => (
    <div key={c.id} className="flex gap-2">
      {avatar(c.author)}
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 text-[13px] leading-[18px]">
          <span className="truncate font-[590]">{c.author}</span>
          <span className="shrink-0 text-[11px] text-[#7f7f7f]">{ago(c.at)}{c.edited ? " · edited" : ""}</span>
          {c.mine && (
            <span className="ml-auto flex shrink-0 gap-1">
              <button aria-label="Edit" onClick={() => { setEditing(c.id); setDraft(c.body) }} className="text-[#7f7f7f] hover:text-black dark:hover:text-white"><IconPencil size={14} stroke={2} /></button>
              <button aria-label="Delete" onClick={() => remove(c.id)} className="text-[#7f7f7f] hover:text-[#d0161f]"><IconTrash size={14} stroke={2} /></button>
            </span>
          )}
        </p>
        {editing === c.id ? (
          <div className="mt-1 flex flex-col gap-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className={cn(field, "resize-none py-2 leading-5")} />
            <div className="flex gap-2">
              <button onClick={() => { edit(c.id, draft.trim()); setEditing(null) }} disabled={!draft.trim()} className="h-7 rounded-full px-3 text-[12px] font-[590] text-white disabled:opacity-40" style={{ backgroundColor: PURPLE }}>Save</button>
              <button onClick={() => setEditing(null)} className="h-7 rounded-full bg-[#767680]/[0.14] px-3 text-[12px] font-[590]">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[14px] leading-5">{c.body}</p>
        )}
      </div>
    </div>
  )
  return (
    <div data-comments-ui className="fixed z-[86] w-[320px] rounded-[18px] border border-black/10 bg-white p-4 text-[#2c2935] shadow-[0_12px_32px_rgba(20,20,40,0.16)] dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100" style={style}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-[590]">{top.anchor?.label ?? "General comment"}</p>
          <p className="text-[11px] text-[#7f7f7f]">{where(top.anchor)}{top.resolved ? " · Resolved" : ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => resolve(top.id, !top.resolved)} className={cn("flex h-7 items-center gap-1 rounded-full px-3 text-[12px] font-[590]", top.resolved ? "bg-[#767680]/[0.14]" : "bg-[#1f9d55]/15 text-[#1f7a46]")}>
            <IconCheck size={14} stroke={2.5} />
            {top.resolved ? "Reopen" : "Resolve"}
          </button>
          <button aria-label="Close" onClick={onClose} className="flex size-7 items-center justify-center rounded-full text-[#7f7f7f] hover:bg-black/5 dark:hover:bg-white/10"><IconX size={16} stroke={2} /></button>
        </div>
      </div>
      <div className="flex max-h-[260px] flex-col gap-3 overflow-y-auto pr-1">
        {item(top)}
        {replies.map(item)}
      </div>
      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
        <Composer compact placeholder="Reply" submit={async (t) => !!(await add(t, undefined, top.id))} />
      </div>
    </div>
  )
}

/** Click something in the page to comment on it. */
function Picker({ onPick }: { onPick: (anchor: Anchor, at: { x: number; y: number }) => void }) {
  const setPicking = useCommentsStore((s) => s.setPicking)
  const view = useViewStore((s) => s.view)
  const platform = useViewStore((s) => s.platform)
  const [hover, setHover] = useState<{ rect: DOMRect; label: string } | null>(null)
  const found = useRef<{ el: Element; label: string } | null>(null)

  const find = useCallback((x: number, y: number) => {
    const under = document.elementsFromPoint(x, y).filter((e) => !e.closest("[data-comments-ui]") && !e.closest("[data-notes-ui]"))
    if (view === "sitemap") {
      const el = under.map((e) => e.closest("[data-node-id]")).find(Boolean) as HTMLElement | null
      return el ? { el, label: el.dataset.nodeTitle ?? el.dataset.nodeId ?? "Box" } : null
    }
    const screen = document.querySelector(SCREEN)
    let el = under.find((e) => screen?.contains(e) && e !== screen) ?? null
    if (!el || !screen) return null
    // Climb out of slivers (spans, icons) to something you would point at.
    while (el.parentElement && el.parentElement !== screen) {
      const r = el.getBoundingClientRect()
      if (r.width >= 28 && r.height >= 28) break
      el = el.parentElement
    }
    return { el, label: describe(el) }
  }, [view])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicking(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setPicking])

  return (
    <div
      data-comments-ui
      className="fixed inset-0 z-[88] cursor-crosshair"
      onPointerMove={(e) => {
        const f = find(e.clientX, e.clientY)
        found.current = f
        setHover(f ? { rect: f.el.getBoundingClientRect(), label: f.label } : null)
      }}
      onClick={(e) => {
        const f = find(e.clientX, e.clientY)
        if (!f) return
        const ctx = currentContext()
        if (view === "sitemap") {
          const node = f.el as HTMLElement
          onPick({ ...ctx, label: f.label, nodeId: node.dataset.nodeId, tree: (node.dataset.tree as "before" | "after") ?? "after" }, { x: e.clientX, y: e.clientY })
        } else {
          const screen = document.querySelector(SCREEN)
          if (!screen) return
          const { selector, stable } = selectorFor(f.el, screen)
          onPick({ ...ctx, label: f.label, selector, ...(stable ? {} : { platform }) }, { x: e.clientX, y: e.clientY })
        }
      }}
    >
      <div className="pointer-events-none absolute left-1/2 top-[72px] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
        {hover ? `Comment on “${hover.label}”` : view === "sitemap" ? "Click a box to comment on it" : "Click something in the app to comment on it"} · Esc to cancel
      </div>
      {hover && <div className="pointer-events-none absolute rounded-[4px] border-2 border-dashed bg-[#8f55e5]/10" style={{ left: hover.rect.left, top: hover.rect.top, width: hover.rect.width, height: hover.rect.height, borderColor: PURPLE }} />}
    </div>
  )
}

/** Keeps a floating card on screen. */
const clampTo = (x: number, y: number, w = 320, h = 360): React.CSSProperties => ({
  left: Math.max(12, Math.min(x, window.innerWidth - w - 12)),
  top: Math.max(12, Math.min(y, window.innerHeight - h - 12)),
})

export function CommentsLayer() {
  const comments = useCommentsStore((s) => s.comments)
  const loaded = useCommentsStore((s) => s.loaded)
  const error = useCommentsStore((s) => s.error)
  const refresh = useCommentsStore((s) => s.refresh)
  const panelOpen = useCommentsStore((s) => s.panelOpen)
  const picking = useCommentsStore((s) => s.picking)
  const active = useCommentsStore((s) => s.active)
  const showResolved = useCommentsStore((s) => s.showResolved)
  const setPanelOpen = useCommentsStore((s) => s.setPanelOpen)
  const setPicking = useCommentsStore((s) => s.setPicking)
  const setActive = useCommentsStore((s) => s.setActive)
  const setShowResolved = useCommentsStore((s) => s.setShowResolved)
  const add = useCommentsStore((s) => s.add)
  const name = useCommentsStore((s) => s.name)
  const setName = useCommentsStore((s) => s.setName)
  const view = useViewStore((s) => s.view)
  const [draft, setDraft] = useState<{ anchor: Anchor; x: number; y: number } | null>(null)

  // Everyone's comments, kept fresh: now, every 20 seconds, and when the tab comes back into view.
  useEffect(() => {
    refresh()
    const tick = () => document.visibilityState === "visible" && refresh()
    const t = window.setInterval(tick, 20_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(t)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [refresh])

  const threads = useMemo(() => threadsOf(comments), [comments])
  const open = threads.filter((t) => !t.top.resolved)
  const shown = showResolved ? threads : open
  const pins = usePins(shown)
  const pinById = new Map(pins.map((p) => [p.id, p]))
  const activeThread = threads.find((t) => t.top.id === active) ?? null
  const num = new Map(threads.map((t, i) => [t.top.id, i + 1]))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setDraft(null)
      setActive(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setActive])

  const startGeneral = () => {
    const ctx = currentContext()
    return { ...ctx, label: view === "sitemap" ? "The sitemap" : "The prototype" } satisfies Anchor
  }

  const activePin = activeThread ? pinById.get(activeThread.top.id) : undefined
  const bar = "flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-[590] shadow-[0_4px_16px_rgba(20,20,40,0.14)] active:opacity-80"

  return (
    <>
      {/* Pins on whatever has comments. */}
      <div data-comments-ui className="pointer-events-none fixed inset-0 z-[75]">
        {pins.map((p) => {
          const t = threads.find((x) => x.top.id === p.id)
          if (!t) return null
          return (
            <button
              key={p.id}
              onClick={() => setActive(active === p.id ? null : p.id)}
              aria-label={`Comment ${num.get(p.id)} by ${t.top.author}`}
              className={cn("pointer-events-auto absolute flex size-[24px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[11px] font-[590] text-white shadow-md", active === p.id && "ring-2 ring-[#8f55e5]/50", t.top.resolved && "opacity-60")}
              style={{ left: p.x, top: p.y, backgroundColor: t.top.resolved ? "#8e8e93" : PURPLE }}
            >
              {num.get(p.id)}
            </button>
          )
        })}
      </div>

      {picking && (
        <Picker
          onPick={(anchor, at) => {
            setPicking(false)
            setDraft({ anchor, ...at })
          }}
        />
      )}

      {/* A new comment on something you picked. */}
      {draft && (
        <div data-comments-ui className="fixed z-[86] w-[300px] rounded-[18px] border border-black/10 bg-white p-4 text-[#2c2935] shadow-[0_12px_32px_rgba(20,20,40,0.16)] dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100" style={clampTo(draft.x + 14, draft.y + 14, 300, 260)}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-[590]">On “{draft.anchor.label}”</p>
            <button aria-label="Cancel" onClick={() => setDraft(null)} className="flex size-7 items-center justify-center rounded-full text-[#7f7f7f] hover:bg-black/5 dark:hover:bg-white/10"><IconX size={16} stroke={2} /></button>
          </div>
          <Composer
            autoFocus
            placeholder="What do you think?"
            submit={async (t) => {
              const c = await add(t, draft.anchor)
              if (c) setActive(c.id)
              return !!c
            }}
            onDone={() => setDraft(null)}
          />
        </div>
      )}

      {activeThread && <ThreadCard thread={activeThread} onClose={() => setActive(null)} style={activePin ? clampTo(activePin.x + 20, activePin.y - 20) : { right: 16, bottom: 72 }} />}

      {/* The list of everything. */}
      {panelOpen && (
        <div data-comments-ui className="fixed bottom-[68px] right-4 z-[84] flex max-h-[min(70vh,640px)] w-[360px] max-w-[calc(100vw-32px)] flex-col rounded-[20px] border border-black/10 bg-white text-[#2c2935] shadow-[0_12px_32px_rgba(20,20,40,0.16)] dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100">
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
            <p className="text-[16px] font-[590]">Comments</p>
            <label className="flex items-center gap-2 text-[12px] text-[#5a5666] dark:text-neutral-400">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
              Show resolved
            </label>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-3">
            {!loaded && <p className="py-4 text-[13px] text-[#7f7f7f]">Loading…</p>}
            {loaded && error && threads.length === 0 && <p className="py-4 text-[13px] leading-5 text-[#7f7f7f]">{error}</p>}
            {loaded && !error && shown.length === 0 && <p className="py-4 text-[13px] leading-5 text-[#7f7f7f]">No comments yet. Click <b>Comment</b>, then click something to start one.</p>}
            {shown.map((t) => (
              <button
                key={t.top.id}
                onClick={() => {
                  goTo(t.top.anchor)
                  setActive(t.top.id)
                }}
                className={cn("flex gap-2 rounded-[12px] border border-black/10 p-3 text-left active:bg-black/[0.04] dark:border-white/10", active === t.top.id && "border-[#8f55e5]", t.top.resolved && "opacity-60")}
              >
                <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-[590] text-white" style={{ backgroundColor: t.top.resolved ? "#8e8e93" : PURPLE }}>{num.get(t.top.id)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-[590]">{t.top.author}</span>
                    <span className="shrink-0 text-[11px] text-[#7f7f7f]">{ago(t.top.at)}</span>
                  </span>
                  <span className="block truncate text-[11px] text-[#7440d1]">{t.top.anchor?.label ?? "General"} · {where(t.top.anchor)}</span>
                  <span className="line-clamp-2 text-[13px] leading-[18px]">{t.top.body}</span>
                  {t.replies.length > 0 && <span className="text-[11px] text-[#7f7f7f]">{t.replies.length} repl{t.replies.length === 1 ? "y" : "ies"}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-black/10 px-4 pb-4 pt-3 dark:border-white/10">
            <p className="mb-2 text-[12px] font-[590] text-[#5a5666] dark:text-neutral-400">Comment on the {view === "sitemap" ? "sitemap" : "prototype"} as a whole</p>
            <Composer compact placeholder="Anything on your mind" submit={async (t) => !!(await add(t, startGeneral()))} />
            {name && (
              <p className="mt-2 text-[11px] text-[#7f7f7f]">
                Commenting as {name} ·{" "}
                <button className="underline" onClick={() => { const n = window.prompt("Your name", name); if (n?.trim()) setName(n.trim()) }}>change</button>
              </p>
            )}
          </div>
        </div>
      )}

      {/* The controls: start a comment, and open the list. */}
      <div data-comments-ui className="fixed bottom-4 right-4 z-[80] flex items-center gap-2">
        <button onClick={() => { setPanelOpen(false); setPicking(!picking) }} aria-pressed={picking} className={cn(bar, picking ? "text-white" : "bg-white text-[#2c2935] dark:bg-neutral-800 dark:text-neutral-100")} style={picking ? { backgroundColor: PURPLE } : undefined}>
          <IconMessageCirclePlus size={18} stroke={2} />
          {picking ? "Cancel" : "Comment"}
        </button>
        <button onClick={() => setPanelOpen(!panelOpen)} aria-pressed={panelOpen} aria-label="Show all comments" className={cn(bar, "bg-white text-[#2c2935] dark:bg-neutral-800 dark:text-neutral-100", panelOpen && "ring-2 ring-[#8f55e5]/50")}>
          <IconMessageCircle size={18} stroke={2} />
          {open.length}
        </button>
      </div>
    </>
  )
}


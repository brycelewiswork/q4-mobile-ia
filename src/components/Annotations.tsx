import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { IconArrowsHorizontal, IconChevronDown, IconDeviceMobile, IconDeviceTablet, IconRectangle, IconStack2, IconTrash, IconUser } from "@tabler/icons-react"
import type { Annotation } from "@/annotations"
import { useNotes, useNotesStore } from "@/store/useNotesStore"
import { baseUserType, useUserTypeStore, USER_TYPES } from "@/store/useUserTypeStore"
import { useViewStore } from "@/store/useViewStore"
import { describe, selectorFor } from "@/lib/selectorFor"
import { cn } from "@/lib/utils"
import { NOTES_CARD_W, NOTES_GAP, NOTES_MARGIN } from "@/lib/device"

const CARD_W = NOTES_CARD_W
const GAP = NOTES_GAP // between the phone and a note
const STACK_GAP = 12
const MIN_VISIBLE = 0.6
const SCREEN = ".ios-screen, .android-screen"

type Live = { a: Annotation; side: "left" | "right"; box: { x: number; y: number; w: number; h: number } }

const same = (a: Live[], b: Live[]) =>
  a.length === b.length &&
  a.every((l, i) => {
    const m = b[i]
    return l.a.id === m.a.id && l.a === m.a && l.side === m.side && (["x", "y", "w", "h"] as const).every((k) => Math.abs(l.box[k] - m.box[k]) < 0.5)
  })

/** What's on top at a point, ignoring the notes UI itself. */
const topAt = (x: number, y: number) => document.elementsFromPoint(x, y).find((e) => !e.closest("[data-notes-ui]")) ?? null

/** Every frame: which notes' targets are really visible in the phone, and where. Cheap — a handful of elements. */
function useLive(enabled: boolean, platform: string, user: string, detail: string, device: string, orientation: string, notes: Annotation[]) {
  const [live, setLive] = useState<{ items: Live[]; screen: DOMRect | null }>({ items: [], screen: null })
  const prev = useRef<Live[]>([])
  const screenRef = useRef<DOMRect | null>(null)
  useEffect(() => {
    if (!enabled) {
      prev.current = []
      setLive({ items: [], screen: null })
      return
    }
    let raf = 0
    const tick = () => {
      const screen = document.querySelector<HTMLElement>(SCREEN)
      const items: Live[] = []
      if (screen) {
        const s = screen.getBoundingClientRect()
        for (const a of notes) {
          if ((a.platform && a.platform !== platform) || (a.detail && a.detail !== detail) || (a.device && a.device !== device) || (a.orientation && a.orientation !== orientation) || (a.users && !a.users.includes(user as never))) continue
          // A pin has to name exactly one element. Zero means it isn't on screen; more than one means it's
          // ambiguous here (a path made on the other platform, say), and pointing at the wrong thing is worse.
          let el: HTMLElement | null = null
          try {
            const found = screen.querySelectorAll<HTMLElement>(a.selector)
            if (found.length === 1) el = found[0]
          } catch {
            /* a selector that no longer parses just never shows */
          }
          if (!el) continue
          const r = el.getBoundingClientRect()
          if (r.width < 4 || r.height < 4) continue
          const vw = Math.min(r.right, s.right) - Math.max(r.left, s.left)
          const vh = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top)
          if (vw <= 0 || vh <= 0 || (vw * vh) / (r.width * r.height) < MIN_VISIBLE) continue
          // Covered by a sheet or page? Whatever is on top at its centre must be the target (or inside it).
          const hit = topAt(Math.min(Math.max(r.left + r.width / 2, s.left + 1), s.right - 1), Math.min(Math.max(r.top + r.height / 2, s.top + 1), s.bottom - 1))
          if (!hit || !(el.contains(hit) || hit.contains(el))) continue
          const mid = r.left + r.width / 2 - (s.left + s.width / 2)
          items.push({ a, side: a.side ?? (mid < 0 ? "left" : "right"), box: { x: r.left, y: r.top, w: r.width, h: r.height } })
        }
        items.sort((p, q) => p.box.y - q.box.y)
        const sameScreen = screenRef.current && Math.abs(screenRef.current.left - s.left) < 0.5 && Math.abs(screenRef.current.top - s.top) < 0.5 && Math.abs(screenRef.current.width - s.width) < 0.5
        if (!same(prev.current, items) || !sameScreen) {
          prev.current = items
          screenRef.current = s
          setLive({ items, screen: s })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, platform, user, detail, device, orientation, notes])
  return live
}

/** The path from a note's inner edge to the target's near edge: out, then an S-curve in. */
function linePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = (to.x - from.x) * 0.5
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`
}

const field = "block w-full resize-none bg-transparent outline-none placeholder:text-black/30 dark:placeholder:text-white/30 [field-sizing:content]"

/** A chip that is a dropdown: the label shows the current choice, the native menu lists the rest. */
function ChipSelect({ icon, label, value, onChange, options }: { icon: ReactNode; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const set = value !== "both"
  return (
    <label className={cn("relative flex h-7 items-center gap-1 rounded-full pl-2 pr-1 text-[12px] font-medium", set ? "bg-[#8f55e5]/15 text-[#7440d1]" : "bg-black/5 dark:bg-white/10")}>
      {icon}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium outline-none">
        {options.map(([v, l]) => (
          <option key={v} value={v} className="text-black">{l}</option>
        ))}
      </select>
      <IconChevronDown size={12} stroke={2.5} className="pointer-events-none" />
    </label>
  )
}

function Note({ a, side, left, top, editing, onHeight }: { a: Annotation; side: "left" | "right"; left: number; top: number; editing: boolean; onHeight: (h: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLTextAreaElement>(null)
  const update = useNotesStore((s) => s.update)
  const remove = useNotesStore((s) => s.remove)
  const focusId = useNotesStore((s) => s.focusId)
  const user = useUserTypeStore((s) => baseUserType(s.type))
  const platform = useViewStore((s) => s.platform)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    onHeight(el.offsetHeight)
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (editing && focusId === a.id) title.current?.focus()
  }, [editing, focusId, a.id])
  const forThisUser = !!a.users?.includes(user)
  const chip = "flex h-7 items-center gap-1 rounded-full px-2 text-[12px] font-medium active:opacity-60"
  return (
    <motion.div
      ref={ref}
      data-notes-ui
      initial={{ opacity: 0, x: side === "left" ? 14 : -14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: side === "left" ? 8 : -8 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      className={cn("pointer-events-auto absolute rounded-[16px] border bg-white/90 p-4 shadow-[0_8px_24px_rgba(20,20,40,0.08)] backdrop-blur dark:bg-neutral-800/90", editing ? "border-[#8f55e5]/50" : "border-black/10 dark:border-white/10", side === "left" ? "text-right" : "text-left")}
      style={{ left, top, width: CARD_W }}
    >
      {editing ? (
        <>
          <textarea ref={title} rows={1} value={a.title} onChange={(e) => update(a.id, { title: e.target.value.replace(/\n/g, " ") })} placeholder="Title" className={cn(field, "text-[14px] font-semibold leading-5 text-[#2c2935] dark:text-neutral-100", side === "left" && "text-right")} />
          <textarea value={a.body} onChange={(e) => update(a.id, { body: e.target.value })} placeholder="What's changing, and why" rows={2} className={cn(field, "pt-1 text-[13px] leading-[18px] text-[#5a5666] dark:text-neutral-400", side === "left" && "text-right")} />
          <div className={cn("-mb-1 mt-2 flex flex-wrap gap-1 text-[#5a5666] dark:text-neutral-300", side === "left" ? "justify-end" : "justify-start")}>
            <button onClick={() => update(a.id, { side: side === "left" ? "right" : "left" })} className={cn(chip, "bg-black/5 dark:bg-white/10")} aria-label="Move to the other side">
              <IconArrowsHorizontal size={14} stroke={2} />
              {side === "left" ? "Right" : "Left"}
            </button>
            <button onClick={() => update(a.id, { users: forThisUser ? undefined : [user] })} className={cn(chip, forThisUser ? "bg-[#8f55e5]/15 text-[#7440d1]" : "bg-black/5 dark:bg-white/10")} aria-pressed={forThisUser}>
              <IconUser size={14} stroke={2} />
              {forThisUser ? `Only ${USER_TYPES.find((t) => t.id === user)?.label}` : "All users"}
            </button>
            <ChipSelect
              icon={<IconDeviceMobile size={14} stroke={2} />}
              label="Which platform shows this note"
              value={a.platform ?? "both"}
              onChange={(v) => update(a.id, { platform: v === "both" ? undefined : (v as Annotation["platform"]) })}
              options={[["both", "Both platforms"], ["ios", "iOS only"], ["android", "Android only"]]}
            />
            {platform === "ios" && (
              <ChipSelect
                icon={<IconStack2 size={14} stroke={2} />}
                label="Which version shows this note"
                value={a.detail ?? "both"}
                onChange={(v) => update(a.id, { detail: v === "both" ? undefined : (v as Annotation["detail"]) })}
                options={[["both", "Both versions"], ["full", "Full only"], ["structure", "Structure only"]]}
              />
            )}
            <ChipSelect
              icon={<IconDeviceTablet size={14} stroke={2} />}
              label="Which device shows this note"
              value={a.device ?? "both"}
              onChange={(v) => update(a.id, { device: v === "both" ? undefined : (v as Annotation["device"]) })}
              options={[["both", "Phone and tablet"], ["phone", "Phone only"], ["tablet", "Tablet only"]]}
            />
            <ChipSelect
              icon={<IconRectangle size={14} stroke={2} />}
              label="Which orientation shows this note"
              value={a.orientation ?? "both"}
              onChange={(v) => update(a.id, { orientation: v === "both" ? undefined : (v as Annotation["orientation"]) })}
              options={[["both", "Upright and sideways"], ["portrait", "Portrait only"], ["landscape", "Landscape only"]]}
            />
            <button onClick={() => remove(a.id)} aria-label="Delete note" className={cn(chip, "bg-black/5 text-[#d0161f] dark:bg-white/10")}>
              <IconTrash size={14} stroke={2} />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[14px] font-semibold leading-5 text-[#2c2935] dark:text-neutral-100">{a.title || "Untitled note"}</p>
          <p className="pt-1 text-[13px] leading-[18px] text-[#5a5666] dark:text-neutral-400">{a.body}</p>
        </>
      )}
    </motion.div>
  )
}

/**
 * While pinning: hovering the phone outlines the element under the cursor, a click pins a note to it.
 * Tiny elements climb to their first real container; ↑ / ↓ walk the choice up and down the tree.
 */
function Picker() {
  const add = useNotesStore((s) => s.add)
  const setPicking = useNotesStore((s) => s.setPicking)
  const platform = useViewStore((s) => s.platform)
  const [screen, setScreen] = useState<DOMRect | null>(null)
  const [hover, setHover] = useState<{ el: Element; rect: DOMRect } | null>(null)
  const climb = useRef(0)
  const base = useRef<Element | null>(null)

  useEffect(() => {
    const s = document.querySelector(SCREEN)
    setScreen(s?.getBoundingClientRect() ?? null)
  }, [])

  const pick = (x: number, y: number) => {
    const s = document.querySelector(SCREEN)
    if (!s) return
    let el = topAt(x, y)
    if (!el || !s.contains(el) || el === s) return setHover(null)
    // Climb out of slivers (spans, icons, svg paths) to something you'd point a note at.
    while (el.parentElement && el.parentElement !== s) {
      const r = el.getBoundingClientRect()
      if (r.width >= 28 && r.height >= 28) break
      el = el.parentElement
    }
    base.current = el
    climb.current = 0
    setHover({ el, rect: el.getBoundingClientRect() })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setPicking(false)
      const s = document.querySelector(SCREEN)
      if (!hover || !s) return
      if (e.key === "ArrowUp" && hover.el.parentElement && hover.el.parentElement !== s) {
        e.preventDefault()
        const el = hover.el.parentElement
        setHover({ el, rect: el.getBoundingClientRect() })
      }
      if (e.key === "ArrowDown" && base.current && base.current !== hover.el && hover.el.contains(base.current)) {
        e.preventDefault()
        // Step back toward where the cursor was.
        let el: Element = base.current
        while (el.parentElement && el.parentElement !== hover.el) el = el.parentElement
        setHover({ el, rect: el.getBoundingClientRect() })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [hover, setPicking])

  if (!screen) return null
  const commit = () => {
    const s = document.querySelector(SCREEN)
    if (!hover || !s) return
    const rect = hover.el.getBoundingClientRect()
    const mid = rect.left + rect.width / 2 - (screen.left + screen.width / 2)
    const { selector, stable } = selectorFor(hover.el, s)
    // A labelled element means the same thing on both platforms; a position path only means something on this one.
    add({ id: crypto.randomUUID(), selector, title: "", body: "", side: mid < 0 ? "left" : "right", ...(stable ? {} : { platform }) })
  }
  return (
    <div data-notes-ui className="fixed inset-0 z-[90] cursor-crosshair" onPointerMove={(e) => pick(e.clientX, e.clientY)} onClick={commit}>
      <div className="pointer-events-none absolute left-1/2 top-[76px] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-[13px] text-white">
        {hover ? `Pin to “${describe(hover.el)}”` : "Point at something in the phone"} · ↑ ↓ container · Esc to cancel
      </div>
      {hover && <div className="pointer-events-none absolute rounded-[4px] border-2 border-dashed border-[#8f55e5] bg-[#8f55e5]/10" style={{ left: hover.rect.left, top: hover.rect.top, width: hover.rect.width, height: hover.rect.height }} />}
    </div>
  )
}

/**
 * Notes in the margins either side of the phone, each tied to what it's about by a line. Notes stack on their side
 * in the order of their targets, so they never overlap; the line bends to reach the target wherever the note lands.
 */
export function Annotations() {
  const on = useViewStore((s) => s.notes)
  const platform = useViewStore((s) => s.platform)
  const user = useUserTypeStore((s) => baseUserType(s.type))
  const notes = useNotes()
  const editing = useNotesStore((s) => s.editing)
  const picking = useNotesStore((s) => s.picking)
  // Android only exists as the structure cut.
  const detail = useViewStore((s) => (s.platform === "android" ? "structure" : s.detail))
  const device = useViewStore((s) => s.device)
  const orientation = useViewStore((s) => s.orientation)
  const { items, screen } = useLive(on || editing, platform, user, detail, device, orientation, notes)
  const [heights, setHeights] = useState<Record<string, number>>({})
  // A side whose notes run past the window scrolls on the wheel (editing makes notes taller, so it happens a lot).
  const [scroll, setScroll] = useState({ left: 0, right: 0 })
  const [vw, setVw] = useState(window.innerWidth)
  useEffect(() => {
    const f = () => setVw(window.innerWidth)
    window.addEventListener("resize", f)
    return () => window.removeEventListener("resize", f)
  }, [])
  if (!(on || editing) || !screen || vw < screen.width + NOTES_MARGIN) return null

  // Stack each side top to bottom, each note as close to its target's height as the ones above allow.
  const stacked = (["left", "right"] as const).flatMap((side) => {
    let floor = screen.top
    return items
      .filter((l) => l.side === side)
      .map((l) => {
        const h = heights[l.a.id] ?? 96
        const top = Math.max(floor, Math.min(l.box.y + l.box.h / 2 - 28, screen.bottom - h))
        floor = top + h + STACK_GAP
        const x = side === "left" ? screen.left - GAP - CARD_W : screen.right + GAP
        return { ...l, x, top, h }
      })
  })
  const maxScroll = (side: "left" | "right") => Math.max(0, Math.max(0, ...stacked.filter((p) => p.side === side).map((p) => p.top + p.h)) + 16 - window.innerHeight)
  const offset = (side: "left" | "right") => Math.min(scroll[side], maxScroll(side))
  const placed = stacked.map((p) => ({ ...p, top: p.top - offset(p.side) }))
  const onWheel = (e: React.WheelEvent) => {
    const side = e.clientX < (screen.left + screen.right) / 2 ? "left" : "right"
    const max = maxScroll(side)
    if (!max || (e.clientX > screen.left && e.clientX < screen.right)) return
    setScroll((c) => ({ ...c, [side]: Math.min(max, Math.max(0, c[side] + e.deltaY)) }))
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[70]" onWheel={onWheel}>
        {/* Margin strips that catch the wheel where a side overflows, below the page controls so those stay clickable. */}
        {(["left", "right"] as const).map((side) => maxScroll(side) > 0 && <div key={side} data-notes-ui className="pointer-events-auto fixed bottom-0 top-[72px]" style={side === "left" ? { left: 0, width: screen.left } : { left: screen.right, right: 0 }} />)}
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible">
          <AnimatePresence>
            {placed.map((p) => {
              const start = { x: p.side === "left" ? p.x + CARD_W : p.x, y: p.top + 24 }
              const end = { x: p.side === "left" ? p.box.x : p.box.x + p.box.w, y: p.box.y + p.box.h / 2 }
              return (
                <motion.g key={p.a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                  <motion.path
                    d={linePath(start, end)}
                    fill="none"
                    stroke="#8f55e5"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0, 0, 1] }}
                  />
                  <circle cx={start.x} cy={start.y} r={3} fill="#8f55e5" />
                  <motion.circle cx={end.x} cy={end.y} r={4} fill="#8f55e5" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 500, damping: 25 }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
        <AnimatePresence>
          {placed.map((p) => (
            <Note key={p.a.id} a={p.a} side={p.side} left={p.x} top={p.top} editing={editing} onHeight={(h) => setHeights((s) => (s[p.a.id] === h ? s : { ...s, [p.a.id]: h }))} />
          ))}
        </AnimatePresence>
      </div>
      {picking && <Picker />}
    </>
  )
}

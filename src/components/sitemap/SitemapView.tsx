import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IconArrowBackUp, IconArrowDown, IconArrowsMaximize, IconArrowsMinimize, IconArrowUp, IconCheck, IconChevronRight, IconCopy, IconDeviceFloppy, IconPencil, IconPlus, IconRestore, IconTrash } from "@tabler/icons-react"
import { CanvasStage } from "@/components/canvas/CanvasStage"
import { Switch } from "@/components/ios/list"
import { SegmentedControl } from "@/components/ios/SegmentedControl"
import { NODE_H, NODE_W, childMap, diffAgainst, isDescendant, keyOf, layoutTree, treeStats, type Change, type Layout, type Placed, type TreeStats } from "@/components/sitemap/layout"
import { KINDS, SEED_SITEMAP, useBothSitemaps, useSitemapStore, type Kind, type Side, type SitemapNode } from "@/store/useSitemapStore"
import { cn } from "@/lib/utils"

const CHANGE: Record<Change, { label: string; color: string }> = {
  new: { label: "New", color: "#1f9d55" },
  moved: { label: "Moved", color: "#8f55e5" },
  renamed: { label: "Renamed", color: "#d9822b" },
  removed: { label: "Removed", color: "#d0161f" },
}
const KIND_DOT: Record<Kind, string> = {
  root: "#2c2935",
  tab: "#8f55e5",
  screen: "#5a8fe0",
  section: "#9a98a6",
  card: "#b98ae6",
  sheet: "#2bb3a3",
  action: "#e0872b",
  filter: "#c9a227",
}
/** The type label's text colour: the dot colour, a touch deeper where it would be pale. */
const KIND_INK: Record<Kind, string> = { root: "#2c2935", tab: "#7440d1", screen: "#2f66c4", section: "#6b6978", card: "#8a4fc9", sheet: "#13867a", action: "#b4630f", filter: "#8a6d00" }
const kindLabel = (k: Kind) => (k === "root" ? "App" : (KINDS.find((x) => x.id === k)?.label ?? k))

const chip = "flex h-8 items-center gap-[6px] rounded-full px-3 text-[13px] font-[510] active:opacity-60 disabled:opacity-40"
const idle = "bg-[#767680]/[0.12] text-[#2c2935] dark:bg-white/10 dark:text-neutral-100"

/** First view: the shape of the app. The big branches (Home, Settings) start closed so the whole thing reads at a glance. */
const defaultCollapsed = (nodes: SitemapNode[]) => {
  const kids = childMap(nodes)
  const size = (id: string): number => (kids.get(id) ?? []).reduce((n, c) => n + 1 + size(c.id), 0)
  const parentOf = new Map(nodes.map((n) => [n.id, n.parent]))
  const depth = (id: string): number => {
    const p = parentOf.get(id)
    return p ? 1 + depth(p) : 0
  }
  return new Set(nodes.filter((n) => (kids.get(n.id)?.length ?? 0) > 0 && depth(n.id) >= 1 && size(n.id) > 10).map((n) => n.id))
}

/**
 * One side's numbers, for Compare: how big, how deep, how even, how tidy. `vs` is the other side, for the arrows: green when this
 * side is better on that measure, red when it is worse.
 */
function StatsCard({ title, stats, vs }: { title: string; stats: TreeStats; vs?: TreeStats }) {
  const empty = stats.boxes <= 1
  // lower: a smaller number is the better one.
  const rows: { label: string; value: string; delta?: number; lower: boolean; fmt?: (d: number) => string; hint: string }[] = [
    { label: "Boxes", value: String(stats.boxes), delta: vs ? stats.boxes - vs.boxes : undefined, lower: true, hint: "Everything on the map. Fewer is simpler, but only if nothing was lost." },
    { label: "Taps to a page (avg / max)", value: `${stats.avgDepth.toFixed(1)} / ${stats.maxDepth}`, delta: vs ? stats.avgDepth - vs.avgDepth : undefined, lower: true, fmt: (d) => d.toFixed(1), hint: "How many pages you go through to reach a page, counting a tab as 1. Sections and cards sit on a page, so they add no tap." },
    { label: "Biggest group", value: `${stats.widest.n}`, delta: vs ? stats.widest.n - vs.widest.n : undefined, lower: true, hint: stats.widest.title ? `Most things directly inside one box: “${stats.widest.title}”.` : "" },
    { label: "Like with like", value: `${Math.round(stats.grouped * 100)}%`, delta: vs ? Math.round((stats.grouped - vs.grouped) * 100) : undefined, lower: false, fmt: (d) => `${d}%`, hint: "In groups of two or more, how many sit with others of the same type (all screens, all actions…)." },
    { label: "Needless nesting", value: String(stats.wrappers), delta: vs ? stats.wrappers - vs.wrappers : undefined, lower: true, hint: "Boxes that only wrap one box of their own type, or a tab or screen wrapping a single section. A section that previews and opens its page is fine and isn't counted." },
    { label: "Largest branch", value: `${Math.round(stats.largestBranch * 100)}%`, delta: vs ? Math.round((stats.largestBranch - vs.largestBranch) * 100) : undefined, lower: true, fmt: (d) => `${d}%`, hint: "Share of the map held by the biggest top-level branch. Lower means the weight is spread more evenly." },
  ]
  return (
    <div className="pointer-events-auto min-w-0 rounded-[16px] border border-black/10 bg-white/90 px-4 py-3 shadow-[0_2px_8px_rgba(20,20,40,0.06)] backdrop-blur dark:border-white/10 dark:bg-neutral-800/90">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-[590]">{title}</p>
        {empty ? (
          <p className="text-[12px] text-[#7f7f7f]">Nothing here yet</p>
        ) : (
          <p className="text-[12px] text-[#5a5666] dark:text-neutral-400" title={stats.scoreParts.map((p) => `${p.label}: ${Math.round(p.value * 100)}`).join("\n")}>
            Organization <span className="text-[17px] font-[590] text-[#2c2935] dark:text-neutral-100">{stats.score}</span>
            <span className="opacity-60"> / 100</span>
            {vs && vs.boxes > 1 && stats.score !== vs.score && (
              <span className={cn("ml-1 font-[590]", stats.score > vs.score ? "text-[#1f9d55]" : "text-[#d0161f]")}>{stats.score > vs.score ? "▲" : "▼"} {Math.abs(stats.score - vs.score)}</span>
            )}
          </p>
        )}
      </div>
      {!empty && (
        <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-2">
          {rows.map((r) => {
            const d = r.delta
            const better = d === undefined || d === 0 ? null : r.lower ? d < 0 : d > 0
            return (
              <div key={r.label} title={r.hint} className="min-w-0">
                <p className="truncate text-[11px] leading-4 text-[#7f7f7f]">{r.label}</p>
                <p className="truncate text-[13px] font-[590] leading-[18px]">
                  {r.value}
                  {d !== undefined && vs && vs.boxes > 1 && d !== 0 && (
                    <span className={cn("ml-1 text-[11px]", better ? "text-[#1f9d55]" : "text-[#d0161f]")}>{d > 0 ? "+" : "−"}{(r.fmt ?? String)(Math.abs(d))}</span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const uid = () => `n-${Math.random().toString(36).slice(2, 8)}`

/**
 * The mobile platform's sitemap, before and after, on a zoom-and-pan canvas. Read-only for everyone; on the dev server
 * (or with ?edit in the link) it can be edited in place: select a box to rename it, add children, reorder, or drag it
 * onto another box to move it. Save writes src/sitemap.json.
 */
export function SitemapView() {
  const allowed = import.meta.env.DEV || new URLSearchParams(window.location.search).has("edit")
  const both = useBothSitemaps()
  const edited = useSitemapStore((s) => s.edited)
  const editingFlag = useSitemapStore((s) => s.editing) && allowed
  const selected = useSitemapStore((s) => s.selected)
  const setNodes = useSitemapStore((s) => s.setNodes)
  const setEditing = useSitemapStore((s) => s.setEditing)
  const select = useSitemapStore((s) => s.select)
  const reset = useSitemapStore((s) => s.reset)
  const undo = useSitemapStore((s) => s.undo)
  const hasHistory = useSitemapStore((s) => s.history)

  // Before, After, or both at once: Compare puts the two trees side by side on one canvas with a line from each box to its
  // counterpart, so nobody has to remember one while looking at the other.
  const [view, setView] = useState<"before" | "after" | "compare">("after")
  const compare = view === "compare"
  const side: Side = view === "before" ? "before" : "after"
  const editing = editingFlag && !compare
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [pinnedKey, setPinnedKey] = useState<string | null>(null)
  const activeKey = pinnedKey ?? hoverKey
  const [showChanges, setShowChanges] = useState(true)
  // Compare: fade whatever is the same in both, so what changed is what stands out.
  const [dimSame, setDimSame] = useState(true)
  const [collapsedBy, setCollapsedBy] = useState<Record<Side, Set<string>>>(() => ({ before: defaultCollapsed(both.before), after: defaultCollapsed(both.after) }))
  // Pick a type in the legend to see where all of that kind sit, with everything else dimmed: how you spot what to group.
  const [focusKind, setFocusKind] = useState<Kind | null>(null)
  const [saved, setSaved] = useState<"idle" | "saving" | "done" | "failed">("idle")
  const [copied, setCopied] = useState(false)

  const nodes = both[side]
  const collapsed = collapsedBy[side]
  const layout = useMemo(() => layoutTree(nodes, collapsed), [nodes, collapsed])
  // Until the other version has something in it, everything would read as changed: no badges.
  const other = both[side === "after" ? "before" : "after"]
  const comparing = showChanges && other.length > 1 && nodes.length > 1
  const changes = useMemo(() => (comparing ? diffAgainst(nodes, other, side) : new Map<string, Change>()), [comparing, nodes, other, side])
  const sel = nodes.find((n) => n.id === selected) ?? null

  // Compare: both trees, each with its own open/closed state, and the changes as seen from each side.
  const layoutB = useMemo(() => layoutTree(both.before, collapsedBy.before), [both.before, collapsedBy.before])
  const layoutA = useMemo(() => layoutTree(both.after, collapsedBy.after), [both.after, collapsedBy.after])
  // Room between the trees for the lines, and for the empty red boxes that stand in for what the other side doesn't have.
  const GHOST_GAP = 56
  const RIBBON = NODE_W * 2 + GHOST_GAP * 3
  const afterDx = layoutB.width + RIBBON
  // The empty boxes sit in the gap: ones standing in for After's new things beside the Before tree, ones for Before's removed things beside the After tree.
  const newGhostX = layoutB.width - 40 + GHOST_GAP
  const removedGhostX = afterDx + 40 - GHOST_GAP - NODE_W
  // Until both versions have something in them, everything would read as changed: no badges.
  const haveBoth = showChanges && both.before.length > 1 && both.after.length > 1
  const changesB = useMemo(() => (haveBoth ? diffAgainst(both.before, both.after, "before") : new Map<string, Change>()), [haveBoth, both.before, both.after])
  const changesA = useMemo(() => (haveBoth ? diffAgainst(both.after, both.before, "after") : new Map<string, Change>()), [haveBoth, both.before, both.after])
  // Boxes that changed, plus the boxes above them, so a changed page still shows the way down to it. Everything else is "the same".
  const keepOf = (list: SitemapNode[], ch: Map<string, Change>) => {
    const parentOf = new Map(list.map((n) => [n.id, n.parent]))
    const keep = new Set<string>()
    for (const id of ch.keys()) for (let x: string | null | undefined = id; x && !keep.has(x); x = parentOf.get(x)) keep.add(x)
    return keep
  }
  const keepB = useMemo(() => keepOf(both.before, changesB), [both.before, changesB])
  const keepA = useMemo(() => keepOf(both.after, changesA), [both.after, changesA])
  const statsB = useMemo(() => treeStats(both.before), [both.before])
  const statsA = useMemo(() => treeStats(both.after), [both.after])
  // Is everything open (on the side or sides in view)?
  const allOpen = compare ? collapsedBy.before.size === 0 && collapsedBy.after.size === 0 : collapsedBy[side].size === 0
  const toggleIn = (treeSide: Side, id: string) =>
    setCollapsedBy((c) => {
      const next = new Set(c[treeSide])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...c, [treeSide]: next }
    })

  const setCollapsed = (next: Set<string>) => setCollapsedBy((c) => ({ ...c, [side]: next }))
  const write = (next: SitemapNode[], typing = false) => setNodes(side, next, typing)

  // --- Editing ---------------------------------------------------------------------------------------------------
  const patch = (id: string, p: Partial<SitemapNode>) => write(nodes.map((n) => (n.id === id ? { ...n, ...p } : n)), "title" in p || "note" in p)
  const addChild = (parent: string) => {
    const n: SitemapNode = { id: uid(), title: "New screen", parent, kind: "screen" }
    write([...nodes, n])
    const next = new Set(collapsed)
    next.delete(parent)
    setCollapsed(next)
    select(n.id)
  }
  const addSibling = (id: string) => {
    const me = nodes.find((n) => n.id === id)
    if (!me?.parent) return
    const n: SitemapNode = { id: uid(), title: "New screen", parent: me.parent, kind: "screen" }
    const at = nodes.findIndex((x) => x.id === id)
    // Right after this node and its whole subtree, so the new one sits next to it in the column.
    let end = at + 1
    while (end < nodes.length && isDescendant(nodes, id, nodes[end].id)) end++
    write([...nodes.slice(0, end), n, ...nodes.slice(end)])
    select(n.id)
  }
  const remove = (id: string) => {
    const gone = new Set([id, ...nodes.filter((n) => isDescendant(nodes, id, n.id)).map((n) => n.id)])
    write(nodes.filter((n) => !gone.has(n.id)))
    select(null)
  }
  const reorder = (id: string, dir: -1 | 1) => {
    const me = nodes.find((n) => n.id === id)
    if (!me) return
    const sibs = nodes.filter((n) => n.parent === me.parent)
    const i = sibs.findIndex((n) => n.id === id)
    const other = sibs[i + dir]
    if (!other) return
    // Swap the two subtrees: lift both blocks out and put them back the other way round.
    const block = (n: SitemapNode) => nodes.filter((x) => x.id === n.id || isDescendant(nodes, n.id, x.id))
    const a = dir === -1 ? other : me
    const b = dir === -1 ? me : other
    const ba = block(a)
    const bb = block(b)
    const first = nodes.findIndex((n) => n.id === a.id)
    const rest = nodes.filter((n) => !ba.includes(n) && !bb.includes(n))
    const idx = rest.findIndex((_, k) => k >= first) === -1 ? rest.length : first
    write([...rest.slice(0, idx), ...bb, ...ba, ...rest.slice(idx)])
  }
  const moveTo = (id: string, parent: string) => {
    const me = nodes.find((n) => n.id === id)
    if (!me || me.parent === parent || id === parent || isDescendant(nodes, id, parent)) return
    const block = nodes.filter((x) => x.id === id || isDescendant(nodes, id, x.id)).map((x) => (x.id === id ? { ...x, parent } : x))
    const rest = nodes.filter((x) => !(x.id === id || isDescendant(nodes, id, x.id)))
    // Last child of the new parent: after the parent's existing subtree.
    const at = rest.findIndex((x) => x.id === parent)
    let end = at + 1
    while (end < rest.length && isDescendant(rest, parent, rest[end].id)) end++
    write([...rest.slice(0, end), ...block, ...rest.slice(end)])
    const next = new Set(collapsed)
    next.delete(parent)
    setCollapsed(next)
  }
  // Pulls in every After box that Before doesn't have yet, and leaves everything already in Before exactly as it is.
  const addMissingFromAfter = () => {
    const have = new Set(nodes.map((n) => keyOf(n, "before")))
    const byKey = new Map(nodes.map((n) => [keyOf(n, "before"), n.id]))
    const added: SitemapNode[] = []
    for (const a of both.after) {
      if (have.has(a.id) || a.parent === null) continue
      // Its parent in Before: the box linked to the same After parent (else the root).
      const parent = byKey.get(a.parent) ?? nodes.find((n) => n.parent === null)?.id ?? null
      added.push({ id: a.id, title: a.title, parent, kind: a.kind, ...(a.note ? { note: a.note } : {}) })
      byKey.set(a.id, a.id)
      have.add(a.id)
    }
    if (added.length) write([...nodes, ...added])
  }

  // --- Keeping the two maps matched ---------------------------------------------------------------------------------
  // Boxes are compared by identity, not by name. A Before box is linked to the After box it is (or "no counterpart"), and the
  // quickest way to get that right is to add it FROM the After map, which carries the identity over.
  const afterById = new Map(both.after.map((n) => [n.id, n]))
  const linkedAfter = (n: SitemapNode) => {
    const k = keyOf(n, "before")
    return afterById.has(k) ? k : ""
  }
  const taken = new Set(both.before.map((n) => keyOf(n, "before")))
  const free = both.after.filter((n) => n.parent !== null && !taken.has(n.id))
  const norm = (t: string) => t.trim().toLowerCase()
  // After a Before box is linked to an After box, its children usually line up with that box's children too (Profile and Account
  // hold much the same things). Offer to link the ones whose names already match, in one go.
  const childPairs = (() => {
    if (side !== "before" || !sel || !linkedAfter(sel)) return [] as { before: SitemapNode; after: SitemapNode }[]
    const afterKids = both.after.filter((a) => a.parent === linkedAfter(sel))
    const taken2 = new Set(nodes.map((n) => keyOf(n, "before")))
    return nodes
      .filter((n) => n.parent === sel.id && n.match === undefined && !afterById.has(n.id))
      .flatMap((n) => {
        const a = afterKids.find((k) => !taken2.has(k.id) && k.title.trim().toLowerCase() === n.title.trim().toLowerCase())
        return a ? [{ before: n, after: a }] : []
      })
  })()
  const linkChildren = () => {
    const by = new Map(childPairs.map((p) => [p.before.id, p.after.id]))
    write(nodes.map((n) => (by.has(n.id) ? { ...n, match: by.get(n.id) } : n)))
  }
  // How the other version names this box, so a rename reads as a rename.
  const counterpart = (() => {
    if (!sel || sel.parent === null) return undefined
    if (side === "before") return afterById.get(linkedAfter(sel))
    return both.before.find((b) => keyOf(b, "before") === sel.id)
  })()

  // A Before box with no link whose name matches a free After box: offer the link.
  const suggestion = side === "before" && sel && sel.parent !== null && !linkedAfter(sel) && sel.match !== "" ? free.find((a) => norm(a.title) === norm(sel.title)) : undefined
  const addFromAfter = (parent: string, afterId: string) => {
    const a = afterById.get(afterId)
    if (!a) return
    // The same id, so the maps match with nothing more to do. (If that id is already in Before, it is already here.)
    write([...nodes, { id: a.id, title: a.title, parent, kind: a.kind, ...(a.note ? { note: a.note } : {}) }])
    const next = new Set(collapsed)
    next.delete(parent)
    setCollapsed(next)
    select(a.id)
  }

  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault()
        undo(side)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [editing, side, undo])

  // Selecting a box puts you straight into its title, ready to rename.
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!editing || !selected) return
    const t = window.setTimeout(() => {
      titleRef.current?.focus()
      titleRef.current?.select()
    }, 0)
    return () => window.clearTimeout(t)
  }, [editing, selected])

  // A comment elsewhere asks to be shown: switch to its tree and open the branches above its box.
  useEffect(() => {
    const onReveal = (e: Event) => {
      const { tree, nodeId } = (e as CustomEvent<{ tree?: Side; nodeId?: string }>).detail ?? {}
      if (!tree || !nodeId) return
      setView((v) => (v === "compare" ? v : tree))
      setCollapsedBy((c) => {
        const list = both[tree]
        const parentOf = new Map(list.map((n) => [n.id, n.parent]))
        const next = new Set(c[tree])
        for (let x = parentOf.get(nodeId); x; x = parentOf.get(x)) next.delete(x)
        return { ...c, [tree]: next }
      })
    }
    window.addEventListener("sitemap:reveal", onReveal)
    return () => window.removeEventListener("sitemap:reveal", onReveal)
  }, [both])

  const [drag, setDrag] = useState<{ id: string; x: number; y: number; over: string | null } | null>(null)
  const dragRef = useRef<{ id: string; sx: number; sy: number; live: boolean } | null>(null)
  const overAt = useCallback((x: number, y: number, id: string) => {
    const el = document.elementsFromPoint(x, y).map((e) => (e as HTMLElement).closest?.("[data-node-id]") as HTMLElement | null).find(Boolean)
    const over = el?.dataset.nodeId ?? null
    return over && over !== id ? over : null
  }, [])
  const onNodeDown = (e: React.PointerEvent, p: Placed) => {
    if (!editing || e.button !== 0 || p.node.parent === null) return
    // No pointer capture yet: capturing here would steal the click from the box's button, and selecting would never happen.
    dragRef.current = { id: p.node.id, sx: e.clientX, sy: e.clientY, live: false }
  }
  const onNodeMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (!d.live && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
    // It's a drag now: keep hold of the pointer so it can leave the box.
    if (!d.live) (e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    d.live = true
    setDrag({ id: d.id, x: e.clientX, y: e.clientY, over: overAt(e.clientX, e.clientY, d.id) })
  }
  const onNodeUp = (e: React.PointerEvent) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d?.live) return
    const over = overAt(e.clientX, e.clientY, d.id)
    setDrag(null)
    if (over) moveTo(d.id, over)
  }

  // --- Saving ----------------------------------------------------------------------------------------------------
  const payload = () => JSON.stringify({ before: edited?.before ?? SEED_SITEMAP.before, after: edited?.after ?? SEED_SITEMAP.after }, null, 2)
  const save = async () => {
    setSaved("saving")
    try {
      const r = await fetch("/__sitemap/save", { method: "POST", body: payload() })
      if (!r.ok) throw new Error(await r.text())
      setSaved("done")
      setTimeout(reset, 900)
    } catch {
      setSaved("failed")
    }
    setTimeout(() => setSaved("idle"), 2200)
  }
  const copy = async () => {
    await navigator.clipboard.writeText(payload())
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const dropTarget = drag?.over && drag.over !== nodes.find((n) => n.id === drag.id)?.parent && !isDescendant(nodes, drag.id, drag.over) ? drag.over : null

  // One tree: its connectors, then its boxes. `dx` shifts it right (the After tree in Compare).
  const renderTree = (lay: Layout, treeSide: Side, dx: number, ch: Map<string, Change>) => (
    <>
      <svg aria-hidden className="pointer-events-none absolute overflow-visible" style={{ left: dx, top: 0 }} width={lay.width} height={lay.height}>
        {lay.placed.map((p) => {
          const parent = p.node.parent ? lay.byId.get(p.node.parent) : null
          if (!parent) return null
          const x1 = parent.x + NODE_W
          const y1 = parent.y + NODE_H / 2
          const x2 = p.x
          const y2 = p.y + NODE_H / 2
          const ddx = (x2 - x1) / 2
          const c = ch.get(p.node.id)
          const sameEdge = compare && dimSame && haveBoth && !(treeSide === "before" ? keepB : keepA).has(p.node.id)
          return <path key={p.node.id} d={`M ${x1} ${y1} C ${x1 + ddx} ${y1}, ${x2 - ddx} ${y2}, ${x2} ${y2}`} fill="none" stroke={c ? CHANGE[c].color : "rgba(120,120,128,0.55)"} strokeWidth={c ? 2 : 1.5} strokeLinecap="round" strokeDasharray={c === "removed" ? "5 5" : undefined} opacity={sameEdge ? 0.3 : 1} />
        })}
      </svg>
      {lay.placed.map((p) => {
        const c = ch.get(p.node.id)
        const kids = lay.childrenOf.get(p.node.id) ?? []
        const key = keyOf(p.node, treeSide)
        const isSel = !compare && selected === p.node.id
        const isDrop = !compare && dropTarget === p.node.id
        const lit = compare && activeKey === key
        const faded = compare && activeKey !== null && !lit
        const same = compare && dimSame && haveBoth && !(treeSide === "before" ? keepB : keepA).has(p.node.id)
        const counterpartTitle = (treeSide === "after" ? both.before.find((b) => keyOf(b, "before") === p.node.id) : afterById.get(keyOf(p.node, "before")))?.title
        return (
          <div
            key={`${treeSide}:${p.node.id}`}
            data-node-id={p.node.id}
            data-tree={treeSide}
            data-node-title={p.node.title}
            data-canvas-nopan
            onPointerDown={(e) => onNodeDown(e, p)}
            onPointerMove={onNodeMove}
            onPointerUp={onNodeUp}
            onPointerEnter={() => compare && setHoverKey(key)}
            onPointerLeave={() => compare && setHoverKey((h) => (h === key ? null : h))}
            style={{ left: dx + p.x, top: p.y, width: NODE_W, height: NODE_H, opacity: drag?.id === p.node.id ? 0.4 : faded ? 0.25 : same && !lit ? 0.3 : focusKind && p.node.kind !== focusKind && p.node.kind !== "root" ? 0.22 : 1 }}
            className="absolute"
          >
            <button
              onClick={() => (compare ? setPinnedKey((k) => (k === key ? null : key)) : select(isSel ? null : p.node.id))}
              title={[p.node.note, c === "renamed" ? `${treeSide === "after" ? "Was" : "Now"} “${counterpartTitle ?? ""}”` : ""].filter(Boolean).join("\n")}
              className={cn(
                "flex size-full cursor-pointer items-center gap-[10px] rounded-[14px] border bg-white pl-3 pr-8 text-left shadow-[0_1px_2px_rgba(20,20,40,0.06)] transition-shadow dark:bg-neutral-800",
                isSel || lit ? "border-[#8f55e5] ring-2 ring-[#8f55e5]/40" : isDrop ? "border-[#1f9d55] ring-2 ring-[#1f9d55]/50" : "border-black/10 dark:border-white/10",
                c === "removed" && "border-dashed",
              )}
              style={c && !isSel && !lit ? { borderColor: CHANGE[c].color } : undefined}
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-[590] leading-[18px]">{p.node.title}</span>
                {/* The type, colour-coded: the same colour for the same kind of thing wherever it sits. */}
                <span className="mt-[3px] inline-flex items-center gap-[5px] rounded-full px-[7px] text-[11px] font-[590] leading-4" style={{ backgroundColor: `${KIND_DOT[p.node.kind]}26`, color: KIND_INK[p.node.kind] }}>
                  <span aria-hidden className="size-[6px] rounded-full" style={{ backgroundColor: KIND_DOT[p.node.kind] }} />
                  {kindLabel(p.node.kind)}
                </span>
              </span>
            </button>
            {c && (
              <span className="pointer-events-none absolute -top-[9px] right-3 rounded-full px-[7px] py-px text-[11px] font-[590] leading-4 text-white" style={{ backgroundColor: CHANGE[c].color }}>
                {CHANGE[c].label}
              </span>
            )}
            {/* Renamed: say what it was called, right on the box, so it doesn't need a hover. */}
            {compare && c === "renamed" && counterpartTitle && (
              <span className="pointer-events-none absolute -bottom-[9px] left-3 max-w-[180px] truncate rounded-full bg-[#d9822b]/15 px-[7px] py-px text-[11px] font-[510] leading-4 text-[#b4630f]">
                {treeSide === "after" ? "was" : "now"} {counterpartTitle}
              </span>
            )}
            {kids.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleIn(treeSide, p.node.id)
                }}
                aria-label={p.hidden ? `Show ${p.hidden} inside ${p.node.title}` : `Hide what is inside ${p.node.title}`}
                className={cn("absolute right-[6px] top-1/2 flex h-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#767680]/[0.14] text-[11px] font-[590] text-[#5a5666] hover:bg-[#767680]/25 dark:text-neutral-300", p.hidden ? "min-w-6 px-[6px]" : "w-6")}
              >
                {p.hidden ? `+${p.hidden}` : <IconChevronRight size={14} stroke={2.5} />}
              </button>
            )}
          </div>
        )
      })}
    </>
  )

  return (
    <div className="relative h-svh w-full overflow-hidden bg-[#f7f6f9] text-[#2c2935] dark:bg-neutral-900 dark:text-neutral-100">
      <CanvasStage className="h-svh w-full bg-transparent" fit fitTop={compare ? 90 : 0} fitKey={view} grid gridColor="rgba(120,120,128,0.13)" shortcuts>
        {compare ? (
          <div className="relative" style={{ width: afterDx + layoutA.width, height: Math.max(layoutA.height, layoutB.height) }}>
            <p className="absolute left-10 top-2 text-[18px] font-[590]">Before</p>
            <p className="absolute top-2 text-[18px] font-[590]" style={{ left: afterDx + 40 }}>After</p>
            {/* Only for the box you hover or click: a line to where it is on the other side, or, if it has no counterpart, to an empty red box. */}
            <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={afterDx + layoutA.width} height={Math.max(layoutA.height, layoutB.height)}>
              {layoutA.placed.map((pa) => {
                if (activeKey !== pa.node.id) return null
                const pb = layoutB.placed.find((q) => keyOf(q.node, "before") === pa.node.id)
                if (!pb) return null
                const c = changesA.get(pa.node.id)
                const x1 = pb.x + NODE_W
                const y1 = pb.y + NODE_H / 2
                const x2 = afterDx + pa.x
                const y2 = pa.y + NODE_H / 2
                const dx = (x2 - x1) / 2
                return (
                  <path
                    key={pa.node.id}
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={c ? CHANGE[c].color : "#8f55e5"}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                )
              })}
              {/* Something on one side only: a dashed red line to an empty red box on the other side. */}
              {layoutA.placed.filter((pa) => changesA.get(pa.node.id) === "new" && activeKey === pa.node.id).map((pa) => {
                const x1 = newGhostX + NODE_W
                const x2 = afterDx + pa.x
                const y = pa.y + NODE_H / 2
                return <line key={`gn:${pa.node.id}`} x1={x1} y1={y} x2={x2} y2={y} stroke="#d0161f" strokeWidth={3} strokeDasharray="6 5" />
              })}
              {layoutB.placed.filter((pb) => changesB.get(pb.node.id) === "removed" && activeKey === keyOf(pb.node, "before")).map((pb) => {
                const x1 = pb.x + NODE_W
                const y = pb.y + NODE_H / 2
                return <line key={`gr:${pb.node.id}`} x1={x1} y1={y} x2={removedGhostX} y2={y} stroke="#d0161f" strokeWidth={3} strokeDasharray="6 5" />
              })}
            </svg>
            {renderTree(layoutB, "before", 0, changesB)}
            {renderTree(layoutA, "after", afterDx, changesA)}
            {layoutA.placed.filter((pa) => changesA.get(pa.node.id) === "new" && activeKey === pa.node.id).map((pa) => (
              <div
                key={`gnb:${pa.node.id}`}
                data-ghost="before"
                data-canvas-nopan
                aria-label={`${pa.node.title} isn’t in Before`}
                title={`“${pa.node.title}” isn’t in Before`}
                onPointerEnter={() => setHoverKey(pa.node.id)}
                onPointerLeave={() => setHoverKey((h) => (h === pa.node.id ? null : h))}
                className="absolute rounded-[14px] border-2 border-dashed border-[#d0161f] bg-[#d0161f]/10"
                style={{ left: newGhostX, top: pa.y, width: NODE_W, height: NODE_H }}
              />
            ))}
            {layoutB.placed.filter((pb) => changesB.get(pb.node.id) === "removed" && activeKey === keyOf(pb.node, "before")).map((pb) => (
              <div
                key={`gra:${pb.node.id}`}
                data-ghost="after"
                data-canvas-nopan
                aria-label={`${pb.node.title} isn’t in After`}
                title={`“${pb.node.title}” isn’t in After`}
                onPointerEnter={() => setHoverKey(keyOf(pb.node, "before"))}
                onPointerLeave={() => setHoverKey((h) => (h === keyOf(pb.node, "before") ? null : h))}
                className="absolute rounded-[14px] border-2 border-dashed border-[#d0161f] bg-[#d0161f]/10"
                style={{ left: removedGhostX, top: pb.y, width: NODE_W, height: NODE_H }}
              />
            ))}
          </div>
        ) : (
          <div className="relative" style={{ width: layout.width, height: layout.height }}>{renderTree(layout, side, 0, changes)}</div>
        )}
      </CanvasStage>

      {/* Top bar: which version, and what to show. The page-level Prototype / Sitemap switch sits to its left. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pb-2 pt-14 lg:pl-[260px] lg:pt-3">
        <div className="pointer-events-auto flex items-center gap-4">
          <SegmentedControl className="w-[270px]" value={view} onChange={setView} options={[{ id: "before", label: "Before" }, { id: "after", label: "After" }, { id: "compare", label: "Compare" }]} />
          <label className="flex items-center gap-2 text-[13px] font-[510]">
            Changes
            <Switch checked={showChanges} onChange={setShowChanges} label="Highlight what changed" />
          </label>
          {compare && (
            <label className="flex items-center gap-2 text-[13px] font-[510]">
              Dim unchanged
              <Switch checked={dimSame} onChange={setDimSame} label="Dim what is the same in both" />
            </label>
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {/* One button: open everything, or, once it's all open, put it back to the shape of the app. */}
          <button
            onClick={() => {
              if (allOpen) setCollapsedBy({ before: defaultCollapsed(both.before), after: defaultCollapsed(both.after) })
              else setCollapsedBy({ before: new Set(), after: new Set() })
            }}
            className={cn(chip, idle)}
          >
            {allOpen ? <IconArrowsMinimize size={16} stroke={2} /> : <IconArrowsMaximize size={16} stroke={2} />}
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
          {allowed && !compare && (
            <>
              <button onClick={() => setEditing(!editing)} aria-pressed={editing} className={cn(chip, editing ? "bg-[#8f55e5] text-white" : idle)}>
                {editing ? <IconCheck size={16} stroke={2.25} /> : <IconPencil size={16} stroke={2} />}
                {editing ? "Done" : "Edit"}
              </button>
              {editing && (
                <>
                  {import.meta.env.DEV ? (
                    <button onClick={save} disabled={!edited || saved === "saving"} className={cn(chip, saved === "failed" ? "bg-[#ff3b30] text-white" : "bg-[#34c759] text-white")}>
                      {saved === "done" ? <IconCheck size={16} stroke={2} /> : <IconDeviceFloppy size={16} stroke={2} />}
                      {saved === "done" ? "Saved" : saved === "failed" ? "Couldn’t save" : "Save"}
                    </button>
                  ) : (
                    <button onClick={copy} className={cn(chip, idle)}>
                      {copied ? <IconCheck size={16} stroke={2} /> : <IconCopy size={16} stroke={2} />}
                      {copied ? "Copied" : "Copy JSON"}
                    </button>
                  )}
                  <button onClick={() => undo(side)} disabled={!hasHistory[side].length} className={cn(chip, idle)} title="Undo the last change (⌘Z)">
                    <IconArrowBackUp size={16} stroke={2} />
                    Undo
                  </button>
                  <button onClick={() => { if (window.confirm("Discard every edit in this browser and go back to the saved sitemap? This can’t be undone.")) reset() }} disabled={!edited} className={cn(chip, idle)} title="Discard edits and go back to the saved sitemap">
                    <IconRestore size={16} stroke={2} />
                    Reset
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compare: how each side is built, so the cleanup can be seen as well as the boxes. */}
      {compare && (
        <div className="pointer-events-none absolute inset-x-0 top-[104px] z-10 flex justify-center px-4 lg:top-[60px] lg:pl-[260px]">
          <div className="grid w-full max-w-[980px] grid-cols-2 gap-3">
            <StatsCard title="Before" stats={statsB} />
            <StatsCard title="After" stats={statsA} vs={statsB} />
          </div>
        </div>
      )}

      {/* Legend and the controls, bottom left. */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-2 text-[12px] text-[#5a5666] dark:text-neutral-400">
        {/* The types, with how many of each; pick one to light them up. */}
        <div data-canvas-nopan className="pointer-events-auto flex max-w-[calc(100vw-32px)] flex-wrap gap-[6px]">
          {KINDS.filter((k) => nodes.some((n) => n.kind === k.id)).map((k) => {
            const on = focusKind === k.id
            return (
              <button
                key={k.id}
                onClick={() => setFocusKind(on ? null : k.id)}
                aria-pressed={on}
                className="flex h-7 items-center gap-[6px] rounded-full px-[10px] text-[12px] font-[590] active:opacity-70"
                style={{ backgroundColor: on ? KIND_DOT[k.id] : `${KIND_DOT[k.id]}26`, color: on ? "#fff" : KIND_INK[k.id] }}
              >
                {k.label}
                <span className="opacity-70">{nodes.filter((n) => n.kind === k.id).length}</span>
              </button>
            )
          })}
        </div>
        {(compare ? haveBoth : comparing) && (
          <div className="flex gap-3 rounded-full bg-white/80 px-3 py-[6px] backdrop-blur dark:bg-neutral-800/80">
            {(Object.keys(CHANGE) as Change[]).map((k) => (
              <span key={k} className="flex items-center gap-[5px]">
                <span className="size-2 rounded-full" style={{ backgroundColor: CHANGE[k].color }} />
                {CHANGE[k].label}
                <span className="opacity-60">{[...(compare ? changesA : changes).values()].filter((v) => v === k).length}</span>
              </span>
            ))}
          </div>
        )}
        <p className="hidden pl-1 sm:block">Scroll to pan · ⌘ scroll or pinch to zoom · drag to move around · shift 1 to fit</p>
      </div>

      {/* The editor: one box at a time. */}
      {editing && (
        <div data-canvas-nopan className="absolute right-4 top-[72px] z-20 w-[300px] rounded-[18px] border border-black/10 bg-white/95 p-4 shadow-[0_8px_24px_rgba(20,20,40,0.1)] backdrop-blur dark:border-white/10 dark:bg-neutral-800/95">
          {sel ? (
            <div className="flex flex-col gap-3">
              <input
                ref={titleRef}
                key={sel.id}
                value={sel.title}
                onChange={(e) => patch(sel.id, { title: e.target.value })}
                placeholder="Title"
                className="h-10 rounded-[10px] bg-[#767680]/[0.12] px-3 text-[15px] font-[590] outline-none dark:bg-white/10"
              />
              {sel.parent !== null && (
                <select value={sel.kind} onChange={(e) => patch(sel.id, { kind: e.target.value as Kind })} className="h-10 rounded-[10px] bg-[#767680]/[0.12] px-3 text-[14px] outline-none dark:bg-white/10">
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id} className="text-black">{k.label}</option>
                  ))}
                </select>
              )}
              <textarea value={sel.note ?? ""} onChange={(e) => patch(sel.id, { note: e.target.value || undefined })} placeholder="What's here, or what changed" rows={3} className="resize-none rounded-[10px] bg-[#767680]/[0.12] px-3 py-2 text-[13px] leading-[18px] outline-none dark:bg-white/10" />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => addChild(sel.id)} className={cn(chip, "bg-[#8f55e5] text-white")}>
                  <IconPlus size={16} stroke={2} />
                  Child
                </button>
                {sel.parent !== null && (
                  <>
                    <button onClick={() => addSibling(sel.id)} className={cn(chip, idle)}>
                      <IconPlus size={16} stroke={2} />
                      Sibling
                    </button>
                    <button onClick={() => reorder(sel.id, -1)} aria-label="Move up" className={cn(chip, idle, "px-2")}><IconArrowUp size={16} stroke={2} /></button>
                    <button onClick={() => reorder(sel.id, 1)} aria-label="Move down" className={cn(chip, idle, "px-2")}><IconArrowDown size={16} stroke={2} /></button>
                    <button onClick={() => remove(sel.id)} aria-label="Delete" className={cn(chip, idle, "px-2 text-[#d0161f]")}><IconTrash size={16} stroke={2} /></button>
                  </>
                )}
              </div>
              {counterpart && counterpart.title.trim() !== sel.title.trim() && (
                <p className="text-[12px] leading-4 text-[#7440d1]">{side === "before" ? "Called" : "Was"} “{counterpart.title}” in {side === "before" ? "After" : "Before"}.</p>
              )}
              {side === "before" && sel.parent !== null && (
                <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                  <label className="text-[12px] font-[590] text-[#5a5666] dark:text-neutral-400">Same as, in After</label>
                  <select
                    value={linkedAfter(sel)}
                    onChange={(e) => patch(sel.id, { match: e.target.value === "" ? "" : e.target.value })}
                    className="h-10 rounded-[10px] bg-[#767680]/[0.12] px-3 text-[14px] outline-none dark:bg-white/10"
                  >
                    <option value="" className="text-black">Nothing: it isn’t in After</option>
                    {both.after.filter((a) => a.parent !== null).map((a) => (
                      <option key={a.id} value={a.id} className="text-black">{a.title} · {kindLabel(a.kind)}</option>
                    ))}
                  </select>
                  {childPairs.length > 0 && (
                    <button onClick={linkChildren} className={cn(chip, "h-auto self-start bg-[#8f55e5]/15 py-[6px] text-left text-[#7440d1]")}>
                      Also link {childPairs.length} inside it with the same names
                    </button>
                  )}
                  {suggestion && (
                    <button onClick={() => patch(sel.id, { match: suggestion.id })} className={cn(chip, "h-auto self-start bg-[#8f55e5]/15 py-[6px] text-left text-[#7440d1]")}>
                      Looks like “{suggestion.title}” in After. Link them
                    </button>
                  )}
                </div>
              )}
              {side === "before" && free.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
                  <label className="text-[12px] font-[590] text-[#5a5666] dark:text-neutral-400">Add inside this box, from After</label>
                  <select value="" onChange={(e) => e.target.value && addFromAfter(sel.id, e.target.value)} className="h-10 rounded-[10px] bg-[#767680]/[0.12] px-3 text-[14px] outline-none dark:bg-white/10">
                    <option value="" className="text-black">Pick a box…</option>
                    {free.map((a) => (
                      <option key={a.id} value={a.id} className="text-black">{a.title} · {kindLabel(a.kind)}</option>
                    ))}
                  </select>
                  <p className="text-[12px] leading-4 text-[#7f7f7f]">{free.length} After boxes aren’t in Before yet.</p>
                </div>
              )}
              <p className="text-[12px] leading-4 text-[#7f7f7f]">Drag a box onto another to move it there.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-[13px] leading-[18px] text-[#5a5666] dark:text-neutral-400">
              <p>Select a box to rename it, add to it or reorder it. Drag a box onto another to move it.</p>
              {side === "before" && (
                <button onClick={addMissingFromAfter} disabled={free.length === 0} className={cn(chip, idle, "self-start")} title="Adds the After boxes Before doesn’t have yet. What you’ve already built stays as it is.">
                  <IconCopy size={16} stroke={2} />
                  Add all missing from After
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {drag && (
        <div className="pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8f55e5] px-3 py-1 text-[13px] font-[590] text-white shadow-lg" style={{ left: drag.x, top: drag.y }}>
          {nodes.find((n) => n.id === drag.id)?.title}
        </div>
      )}
    </div>
  )
}

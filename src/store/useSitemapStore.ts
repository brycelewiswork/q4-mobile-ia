import { create } from "zustand"
import { persist } from "zustand/middleware"
import seed from "@/sitemap.json"

/**
 * The sitemap: a tree of screens for the mobile platform, in two versions, before and after. A node names its parent, and
 * siblings run in the order they appear in the list.
 */
export type Kind = "root" | "tab" | "screen" | "section" | "card" | "sheet" | "action" | "filter"
export const KINDS: { id: Kind; label: string }[] = [
  { id: "tab", label: "Tab" },
  { id: "screen", label: "Screen" },
  { id: "section", label: "Section" },
  { id: "card", label: "Card" },
  { id: "sheet", label: "Sheet" },
  { id: "action", label: "Action" },
  { id: "filter", label: "Filter" },
]
export type SitemapNode = {
  id: string
  title: string
  parent: string | null
  kind: Kind
  note?: string
  /**
   * Before only: which After box this one is. Left unset, a Before box is the After box with the same id. "" means it has
   * no counterpart (it was removed). This is what lets the two maps be compared: the changes are found by matching.
   */
  match?: string
}
export type Side = "before" | "after"

export const SEED_SITEMAP = seed as Record<Side, SitemapNode[]>

type State = {
  /** The versions you've edited in this browser. null = untouched: show the saved set. */
  edited: Partial<Record<Side, SitemapNode[]>> | null
  /** Earlier versions of each map, newest last, so any edit (including a big one) can be undone. Kept in the browser with the edits. */
  history: Record<Side, SitemapNode[][]>
  editing: boolean
  selected: string | null
  /** `typing` edits that come close together (a title being typed) share one undo step; everything else is its own step. */
  setNodes: (side: Side, nodes: SitemapNode[], typing?: boolean) => void
  undo: (side: Side) => void
  setEditing: (e: boolean) => void
  select: (id: string | null) => void
  reset: () => void
}

const HISTORY_MAX = 40
/** Keystrokes in one field, close together, are one step in the history. */
let lastPush = { side: "" as string, at: 0 }

export const useSitemapStore = create<State>()(
  persist(
    (set, get) => ({
      edited: null,
      history: { before: [], after: [] },
      editing: false,
      selected: null,
      setNodes: (side, nodes, typing = false) => {
        const cur = get().edited?.[side] ?? SEED_SITEMAP[side]
        if (cur === nodes) return
        const now = Date.now()
        const same = typing && lastPush.side === `${side}:typing` && now - lastPush.at < 900
        lastPush = { side: typing ? `${side}:typing` : "", at: now }
        const past = get().history[side]
        const history = { ...get().history, [side]: same ? past : [...past, cur].slice(-HISTORY_MAX) }
        set({ edited: { ...(get().edited ?? {}), [side]: nodes }, history })
      },
      undo: (side) => {
        const past = get().history[side]
        const prev = past[past.length - 1]
        if (!prev) return
        lastPush = { side: "", at: 0 }
        set({ edited: { ...(get().edited ?? {}), [side]: prev }, history: { ...get().history, [side]: past.slice(0, -1) } })
      },
      setEditing: (editing) => set({ editing, ...(editing ? {} : { selected: null }) }),
      select: (selected) => set({ selected }),
      reset: () => set({ edited: null, selected: null, history: { before: [], after: [] } }),
    }),
    { name: "q4-sitemap", partialize: (s) => ({ edited: s.edited, history: s.history }) },
  ),
)

/** The nodes in force for a version: yours if you've edited it, else the saved set. */
export const useSitemapNodes = (side: Side) => useSitemapStore((s) => s.edited?.[side] ?? SEED_SITEMAP[side])

/** Both versions as they stand, edits included. */
export const useBothSitemaps = (): Record<Side, SitemapNode[]> => {
  const edited = useSitemapStore((s) => s.edited)
  return { before: edited?.before ?? SEED_SITEMAP.before, after: edited?.after ?? SEED_SITEMAP.after }
}

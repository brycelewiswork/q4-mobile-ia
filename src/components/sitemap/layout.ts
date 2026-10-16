import type { Kind, SitemapNode } from "@/store/useSitemapStore"

export const NODE_W = 208
export const NODE_H = 56
const GAP_X = 84
const GAP_Y = 14
const PAD = 40

export type Placed = { node: SitemapNode; x: number; y: number; depth: number; hidden: number }
export type Layout = { placed: Placed[]; byId: Map<string, Placed>; width: number; height: number; childrenOf: Map<string, SitemapNode[]> }

/** Children of each node, in list order. */
export function childMap(nodes: SitemapNode[]) {
  const m = new Map<string, SitemapNode[]>()
  for (const n of nodes) {
    if (n.parent === null) continue
    const list = m.get(n.parent) ?? []
    list.push(n)
    m.set(n.parent, list)
  }
  return m
}

/**
 * A tidy tree, left to right: depth sets the column, and each parent sits centred on its children. A collapsed node
 * hides its subtree (`hidden` counts what's tucked away).
 */
export function layoutTree(nodes: SitemapNode[], collapsed: Set<string>): Layout {
  const childrenOf = childMap(nodes)
  const roots = nodes.filter((n) => n.parent === null || !nodes.some((m) => m.id === n.parent))
  const placed: Placed[] = []
  const byId = new Map<string, Placed>()
  const count = (id: string): number => (childrenOf.get(id) ?? []).reduce((n, c) => n + 1 + count(c.id), 0)

  let cursor = PAD
  const place = (n: SitemapNode, depth: number): number => {
    const kids = collapsed.has(n.id) ? [] : (childrenOf.get(n.id) ?? [])
    let y: number
    if (kids.length === 0) {
      y = cursor
      cursor += NODE_H + GAP_Y
    } else {
      const ys = kids.map((k) => place(k, depth + 1))
      y = (ys[0] + ys[ys.length - 1]) / 2
    }
    const p: Placed = { node: n, x: PAD + depth * (NODE_W + GAP_X), y, depth, hidden: collapsed.has(n.id) ? count(n.id) : 0 }
    placed.push(p)
    byId.set(n.id, p)
    return y
  }
  for (const r of roots) place(r, 0)
  const width = placed.reduce((w, p) => Math.max(w, p.x + NODE_W), 0) + PAD
  const height = placed.reduce((h, p) => Math.max(h, p.y + NODE_H), 0) + PAD
  return { placed, byId, width, height, childrenOf }
}

/** Is `maybe` somewhere under `id`? (A node can't be dropped into its own subtree.) */
export function isDescendant(nodes: SitemapNode[], id: string, maybe: string) {
  const kids = childMap(nodes)
  const walk = (x: string): boolean => (kids.get(x) ?? []).some((c) => c.id === maybe || walk(c.id))
  return walk(id)
}

export type Change = "new" | "moved" | "renamed" | "removed"

/** The key a box is compared under: After boxes by id; Before boxes by the After box they are linked to (else their own id). */
export const keyOf = (n: SitemapNode, side: "before" | "after") =>
  side === "after" || n.match === undefined ? n.id : n.match === "" ? `none:${n.id}` : n.match

/** How each node differs from the other version, matched by key (see keyOf). */
export function diffAgainst(mine: SitemapNode[], other: SitemapNode[], side: "before" | "after"): Map<string, Change> {
  const otherSide = side === "after" ? "before" : "after"
  const keyIn = (list: SitemapNode[], s: "before" | "after") => {
    const byId = new Map(list.map((n) => [n.id, n]))
    return (id: string | null) => {
      const n = id ? byId.get(id) : undefined
      return n ? keyOf(n, s) : null
    }
  }
  const myKey = keyIn(mine, side)
  const theirKey = keyIn(other, otherSide)
  const theirs = new Map(other.map((n) => [keyOf(n, otherSide), n]))
  const out = new Map<string, Change>()
  for (const n of mine) {
    const t = theirs.get(keyOf(n, side))
    if (!t) out.set(n.id, side === "after" ? "new" : "removed")
    else if (myKey(n.parent) !== theirKey(t.parent)) out.set(n.id, "moved")
    else if (t.title.trim() !== n.title.trim()) out.set(n.id, "renamed")
  }
  return out
}

/** What it takes to get to Home's content and around it. */
export type HomeStats = {
  /** Tabs inside Home: each is a choice before you see anything. */
  tabs: number
  /** Controls to work through before Home's content: its tabs, plus the actions inside them (a sort, a switcher). */
  controls: number
  /** Taps to reach a page inside Home, on average (a tab counts as 1, from the app's root). */
  avgTaps: number
  pages: number
}

export type TreeStats = {
  boxes: number
  maxDepth: number
  avgDepth: number
  /** The most boxes sitting directly inside one box, and which. */
  widest: { n: number; title: string }
  /** Share of boxes, across groups of two or more, that are the group's most common type. Higher means like sits with like. */
  grouped: number
  /** Boxes that only wrap one box of their own kind (or a tab / screen wrapping a lone section): a level with no choice in it. A section that previews and launches its page is not counted. */
  wrappers: number
  /** Share of all boxes held by the biggest top-level branch. */
  largestBranch: number
  /** The Home tab on its own, since a whole-map average hides changes to one tab: null when there is no Home. */
  home: HomeStats | null
  /** 0 to 100, from the five above (see `scoreParts`). */
  score: number
  scoreParts: { label: string; value: number }[]
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * How nested and how organized a tree is. Shallow, even, tidy groups of one kind of thing read as well organized; deep
 * chains, one enormous branch, a box holding dozens of things, or a group mixing unlike things read as not.
 */
export function treeStats(nodes: SitemapNode[]): TreeStats {
  const kids = childMap(nodes)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const root = nodes.find((n) => n.parent === null || !byId.has(n.parent))
  const depthOf = new Map<string, number>()
  const walk = (id: string, d: number) => {
    depthOf.set(id, d)
    for (const c of kids.get(id) ?? []) walk(c.id, d + 1)
  }
  if (root) walk(root.id, 0)
  const rest = nodes.filter((n) => n.id !== root?.id)
  // Depth is counted in taps: how many pages (a tab, a screen, a sheet) you pass through to reach a page. A section or a card is
  // content on the page you are already on, so it adds no tap, and an action is the button that opens the page after it.
  const PAGE: Kind[] = ["tab", "screen", "sheet"]
  const tapsTo = new Map<string, number>()
  const tapWalk = (id: string, taps: number) => {
    const n = byId.get(id)
    const here = taps + (n && PAGE.includes(n.kind) ? 1 : 0)
    tapsTo.set(id, here)
    for (const c of kids.get(id) ?? []) tapWalk(c.id, here)
  }
  if (root) tapWalk(root.id, 0)
  const pages = rest.filter((n) => PAGE.includes(n.kind)).map((n) => tapsTo.get(n.id) ?? 1)
  const maxDepth = pages.length ? Math.max(...pages) : 0
  const avgDepth = pages.length ? pages.reduce((a, b) => a + b, 0) / pages.length : 0

  let widest = { n: 0, title: "" }
  let dominant = 0
  let grouped = 0
  let wrappers = 0
  for (const n of nodes) {
    const list = kids.get(n.id) ?? []
    if (list.length > widest.n) widest = { n: list.length, title: n.title }
    // A box holding just one box is fine when it previews and launches ("Task Manager" section -> its page). It is needless when
    // it only wraps something of its own kind, or a tab / screen wraps a single section: a level with no choice in it.
    if (list.length === 1 && n.id !== root?.id) {
      const c = list[0]
      if (c.kind === n.kind || ((n.kind === "tab" || n.kind === "screen") && (c.kind === "section" || c.kind === "card"))) wrappers++
    }
    if (list.length >= 2) {
      const counts = new Map<string, number>()
      for (const c of list) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1)
      dominant += Math.max(...counts.values())
      grouped += list.length
    }
  }
  const groupedShare = grouped ? dominant / grouped : 1

  const size = (id: string): number => 1 + (kids.get(id) ?? []).reduce((n, c) => n + size(c.id), 0)
  const top = root ? (kids.get(root.id) ?? []) : []
  const largestBranch = rest.length && top.length ? Math.max(...top.map((t) => size(t.id))) / rest.length : 0

  const scoreParts = [
    { label: "Taps to a page (average)", value: clamp01(1 - (avgDepth - 2) / 3) },
    { label: "Biggest group", value: clamp01(1 - (widest.n - 7) / 20) },
    { label: "Like with like", value: groupedShare },
    { label: "Balance across top-level branches", value: clamp01(1 - (largestBranch - 0.25) / 0.5) },
    { label: "Needless nesting", value: clamp01(1 - wrappers / Math.max(1, rest.length * 0.1)) },
  ]
  const score = rest.length ? Math.round((scoreParts.reduce((a, p) => a + p.value, 0) / scoreParts.length) * 100) : 0
  // Home on its own.
  const homeNode = nodes.find((n) => n.id === "home") ?? nodes.find((n) => n.parent === root?.id && n.kind === "tab" && n.title.toLowerCase() === "home")
  let home: HomeStats | null = null
  if (homeNode) {
    const tabs = (kids.get(homeNode.id) ?? []).filter((c) => c.kind === "tab")
    const controls = tabs.length + tabs.reduce((n, t) => n + (kids.get(t.id) ?? []).filter((c) => c.kind === "action").length, 0)
    const inside: SitemapNode[] = []
    const collect = (id: string) => {
      for (const c of kids.get(id) ?? []) {
        inside.push(c)
        collect(c.id)
      }
    }
    collect(homeNode.id)
    const homePages = inside.filter((n) => PAGE.includes(n.kind)).map((n) => tapsTo.get(n.id) ?? 1)
    home = { tabs: tabs.length, controls, avgTaps: homePages.length ? homePages.reduce((a, b) => a + b, 0) / homePages.length : 0, pages: homePages.length }
  }
  return { boxes: nodes.length, maxDepth, avgDepth, widest, grouped: groupedShare, wrappers, largestBranch, home, score, scoreParts }
}

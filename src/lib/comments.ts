/** The comment types and the calls to /api/comments. The server (api/comments.ts) is the source of truth for the shapes. */
export type Anchor = {
  view: "prototype" | "sitemap"
  label?: string
  selector?: string
  platform?: "ios" | "android"
  device?: "phone" | "tablet"
  orientation?: "portrait" | "landscape"
  user?: "employee" | "oam" | "oamna" | "multi"
  detail?: "full" | "structure"
  nodeId?: string
  tree?: "before" | "after"
}

export type Comment = {
  id: string
  parent: string | null
  author: string
  body: string
  at: number
  resolved?: boolean
  edited?: boolean
  anchor?: Anchor
  mine: boolean
}

export type Thread = { top: Comment; replies: Comment[] }

const URL = "/api/comments"

async function call<T>(init: RequestInit, clientId: string): Promise<T> {
  const r = await fetch(URL, { ...init, headers: { "content-type": "application/json", "x-client-id": clientId, ...(init.headers ?? {}) } })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { error?: string }).error ?? `Couldn't reach comments (${r.status})`)
  return data as T
}

export const fetchComments = (clientId: string) => call<{ comments: Comment[] }>({ method: "GET" }, clientId).then((d) => d.comments)
export const postComment = (clientId: string, body: Record<string, unknown>) => call<{ comment?: Comment }>({ method: "POST", body: JSON.stringify(body) }, clientId)

/** Top-level comments with their replies, oldest thread first. */
export function threadsOf(comments: Comment[]): Thread[] {
  const replies = new Map<string, Comment[]>()
  for (const c of comments) if (c.parent) replies.set(c.parent, [...(replies.get(c.parent) ?? []), c])
  return comments.filter((c) => !c.parent).map((top) => ({ top, replies: replies.get(top.id) ?? [] }))
}

export function ago(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 45) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  return d < 7 ? `${d} day${d === 1 ? "" : "s"} ago` : new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

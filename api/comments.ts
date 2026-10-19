import type { IncomingMessage, ServerResponse } from "node:http"

/**
 * Comments for the prototype and the sitemap, shared by everyone who opens the link.
 *
 * One endpoint, `/api/comments`:
 *   GET                                  → { comments }
 *   POST { action: "add", body, author, parent?, anchor? }
 *   POST { action: "resolve", id, resolved }
 *   POST { action: "edit", id, body }
 *   POST { action: "delete", id }
 * A person is a random id the browser makes (sent as `x-client-id`), not an account: it only lets someone edit or delete their
 * own comments. The link is open, so writes are limited in size and rate.
 *
 * `createHandler(store)` is the whole thing; the Vercel function at the bottom backs it with Redis, and the dev server
 * (vite-plugins/comments-dev.ts) backs the same code with a JSON file.
 */

export type Anchor = {
  view: "prototype" | "sitemap"
  /** What the comment is about, in words. */
  label?: string
  /** Prototype: the element, and the platform it was picked on when the selector only means something there. */
  selector?: string
  platform?: "ios" | "android"
  device?: "phone" | "tablet"
  orientation?: "portrait" | "landscape"
  user?: "employee" | "oam" | "multi"
  detail?: "full" | "structure"
  /** Sitemap: the box, and which tree it was in. */
  nodeId?: string
  tree?: "before" | "after"
}

export type Stored = {
  id: string
  parent: string | null
  author: string
  body: string
  at: number
  owner: string
  resolved?: boolean
  edited?: boolean
  anchor?: Anchor
}
export type Comment = Omit<Stored, "owner"> & { mine: boolean }

export interface Store {
  all(): Promise<Stored[]>
  get(id: string): Promise<Stored | null>
  put(c: Stored): Promise<void>
  del(ids: string[]): Promise<void>
  /** Count a write against `key`; returns how many there have been in the window. */
  hit(key: string, windowSeconds: number): Promise<number>
}

const MAX_BODY = 1500
const MAX_AUTHOR = 40
const MAX_COMMENTS = 3000
const WRITES_PER_MINUTE = 20

// Control characters (other than tab and line breaks) are dropped, and the text is capped.
const clean = (v: string) => Array.from(v).filter((c) => { const k = c.charCodeAt(0); return k >= 32 || k === 9 || k === 10 || k === 13 }).join("")
const str = (v: unknown, max: number) => (typeof v === "string" ? clean(v).slice(0, max) : undefined)
const oneOf = <T extends string>(v: unknown, ok: readonly T[]) => (ok.includes(v as T) ? (v as T) : undefined)

/** Only the fields an anchor is allowed to have, each capped. Anything else a client sends is dropped. */
export function cleanAnchor(a: unknown): Anchor | undefined {
  if (!a || typeof a !== "object") return undefined
  const o = a as Record<string, unknown>
  const view = oneOf(o.view, ["prototype", "sitemap"] as const)
  if (!view) return undefined
  const out: Anchor = { view }
  const put = <K extends keyof Anchor>(k: K, v: Anchor[K] | undefined) => {
    if (v !== undefined) out[k] = v
  }
  put("label", str(o.label, 120))
  put("selector", str(o.selector, 400))
  put("platform", oneOf(o.platform, ["ios", "android"] as const))
  put("device", oneOf(o.device, ["phone", "tablet"] as const))
  put("orientation", oneOf(o.orientation, ["portrait", "landscape"] as const))
  put("user", oneOf(o.user, ["employee", "oam", "multi"] as const))
  put("detail", oneOf(o.detail, ["full", "structure"] as const))
  put("nodeId", str(o.nodeId, 80))
  put("tree", oneOf(o.tree, ["before", "after"] as const))
  return out
}

const isoId = () => `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status
  res.setHeader("content-type", "application/json")
  res.setHeader("cache-control", "no-store")
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  // Vercel hands the body over already parsed; the dev server gives a raw stream.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") return JSON.parse(req.body)
    return req.body as Record<string, unknown>
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > 20_000) throw new Error("too big")
    chunks.push(c as Buffer)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}
}

const header = (req: IncomingMessage, name: string) => {
  const v = req.headers[name]
  return Array.isArray(v) ? v[0] : v
}

export function createHandler(store: Store) {
  const publicOf = (c: Stored, client: string): Comment => {
    const { owner, ...rest } = c
    return { ...rest, mine: owner === client }
  }

  return async function handler(req: IncomingMessage, res: ServerResponse) {
    try {
      const client = (header(req, "x-client-id") ?? "").slice(0, 64)
      if (req.method === "GET") {
        const all = await store.all()
        all.sort((a, b) => a.at - b.at)
        return send(res, 200, { comments: all.map((c) => publicOf(c, client)) })
      }
      if (req.method !== "POST") return send(res, 405, { error: "method not allowed" })
      if (client.length < 8) return send(res, 400, { error: "missing client id" })

      const ip = (header(req, "x-forwarded-for") ?? req.socket.remoteAddress ?? "unknown").split(",")[0].trim()
      if ((await store.hit(`rl:${ip}:${Math.floor(Date.now() / 60_000)}`, 90)) > WRITES_PER_MINUTE) return send(res, 429, { error: "slow down a little" })

      const data = await readJson(req)
      const action = data.action

      if (action === "add") {
        const body = str(data.body, MAX_BODY)?.trim()
        const author = str(data.author, MAX_AUTHOR)?.trim()
        if (!body) return send(res, 400, { error: "say something first" })
        if (!author) return send(res, 400, { error: "add your name" })
        const all = await store.all()
        if (all.length >= MAX_COMMENTS) return send(res, 507, { error: "that is plenty of comments" })
        let parent: string | null = null
        if (typeof data.parent === "string") {
          const p = all.find((c) => c.id === data.parent)
          // Replies hang off a top-level comment, never off another reply.
          if (!p || p.parent) return send(res, 400, { error: "no such comment" })
          parent = p.id
        }
        const c: Stored = { id: isoId(), parent, author, body, at: Date.now(), owner: client }
        if (!parent) {
          const anchor = cleanAnchor(data.anchor)
          if (anchor) c.anchor = anchor
        }
        await store.put(c)
        return send(res, 200, { comment: publicOf(c, client) })
      }

      const id = typeof data.id === "string" ? data.id : ""
      const c = id ? await store.get(id) : null
      if (!c) return send(res, 404, { error: "no such comment" })

      if (action === "resolve") {
        if (c.parent) return send(res, 400, { error: "resolve the thread, not a reply" })
        await store.put({ ...c, resolved: data.resolved === true })
        return send(res, 200, { ok: true })
      }
      // Editing and deleting are for whoever wrote it.
      if (c.owner !== client) return send(res, 403, { error: "that one isn't yours" })
      if (action === "edit") {
        const body = str(data.body, MAX_BODY)?.trim()
        if (!body) return send(res, 400, { error: "say something first" })
        await store.put({ ...c, body, edited: true })
        return send(res, 200, { ok: true })
      }
      if (action === "delete") {
        const all = await store.all()
        // A thread goes with its replies.
        const ids = [c.id, ...(c.parent ? [] : all.filter((x) => x.parent === c.id).map((x) => x.id))]
        await store.del(ids)
        return send(res, 200, { ok: true })
      }
      return send(res, 400, { error: "unknown action" })
    } catch (e) {
      return send(res, 400, { error: e instanceof Error ? e.message : "bad request" })
    }
  }
}

// --- Redis, for the deployed site ------------------------------------------------------------------------------------

// Each deployment can keep its own comments in the same store by setting COMMENTS_KEY; without it they share this one.
const KEY = process.env.COMMENTS_KEY || "q4:comments"

async function redisStore(): Promise<Store | null> {
  // Vercel names the variables after the prefix you give the store (KV_REST_API_URL by default, or Upstash's own
  // UPSTASH_REDIS_REST_URL), so look for the pair whatever the prefix is.
  const env = process.env
  const urlKey = Object.keys(env).find((k) => /_REST(_API)?_URL$/.test(k) && env[k])
  const prefix = urlKey?.replace(/_REST(_API)?_URL$/, "")
  const tokenKey = prefix ? Object.keys(env).find((k) => k.startsWith(`${prefix}_REST`) && k.endsWith("_TOKEN") && !k.includes("READ_ONLY") && env[k]) : undefined
  const url = urlKey ? env[urlKey] : undefined
  const token = tokenKey ? env[tokenKey] : undefined
  if (!url || !token) return null
  const { Redis } = await import("@upstash/redis")
  const r = new Redis({ url, token })
  return {
    async all() {
      const h = (await r.hgetall<Record<string, Stored | string>>(KEY)) ?? {}
      return Object.values(h).map((v) => (typeof v === "string" ? (JSON.parse(v) as Stored) : v))
    },
    async get(id) {
      const v = await r.hget<Stored | string>(KEY, id)
      return v ? (typeof v === "string" ? (JSON.parse(v) as Stored) : v) : null
    },
    async put(c) {
      await r.hset(KEY, { [c.id]: JSON.stringify(c) })
    },
    async del(ids) {
      if (ids.length) await r.hdel(KEY, ...ids)
    },
    async hit(key, windowSeconds) {
      const n = await r.incr(key)
      if (n === 1) await r.expire(key, windowSeconds)
      return n
    },
  }
}

export default async function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  const store = await redisStore()
  if (!store) return send(res, 503, { error: "comments aren't set up on this site yet" })
  return createHandler(store)(req, res)
}

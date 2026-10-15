import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Plugin } from "vite"
import { createHandler, type Store, type Stored } from "../api/comments"

/**
 * Serves /api/comments on the dev server from a JSON file (.comments-dev.json, not committed), running the same handler the
 * deployed site runs against Redis. Comments made while developing stay local.
 */
export function commentsDevPlugin(): Plugin {
  return {
    name: "comments-dev",
    apply: "serve",
    configureServer(server) {
      const file = path.resolve(server.config.root, ".comments-dev.json")
      const hits = new Map<string, number>()
      const read = async (): Promise<Stored[]> => {
        try {
          return JSON.parse(await readFile(file, "utf8")) as Stored[]
        } catch {
          return []
        }
      }
      const store: Store = {
        all: read,
        get: async (id) => (await read()).find((c) => c.id === id) ?? null,
        put: async (c) => {
          const all = await read()
          const i = all.findIndex((x) => x.id === c.id)
          if (i >= 0) all[i] = c
          else all.push(c)
          await writeFile(file, JSON.stringify(all, null, 2))
        },
        del: async (ids) => writeFile(file, JSON.stringify((await read()).filter((c) => !ids.includes(c.id)), null, 2)),
        hit: async (key) => {
          const n = (hits.get(key) ?? 0) + 1
          hits.set(key, n)
          return n
        },
      }
      server.middlewares.use("/api/comments", createHandler(store))
    },
  }
}

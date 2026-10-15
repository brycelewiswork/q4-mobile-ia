import { writeFile } from "node:fs/promises"
import path from "node:path"
import type { Plugin } from "vite"

/**
 * Dev-only endpoint behind the notes editor's Save button: writes the notes straight into
 * `src/annotations.json`, the saved set everyone sees once it's deployed. Nothing is written
 * unless the body is an array of notes with the expected fields.
 */
const TARGET = "src/annotations.json"

const isNote = (n: unknown) => {
  if (!n || typeof n !== "object") return false
  const o = n as Record<string, unknown>
  return typeof o.id === "string" && typeof o.selector === "string" && typeof o.title === "string" && typeof o.body === "string"
}

export function notesSavePlugin(): Plugin {
  return {
    name: "notes-save",
    apply: "serve",
    configureServer(server) {
      // The sitemap editor's Save: the same idea, writing src/sitemap.json ({ before, after }, each a list of nodes).
      server.middlewares.use("/__sitemap/save", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405
          return res.end()
        }
        let body = ""
        req.on("data", (c) => (body += c))
        req.on("end", async () => {
          try {
            const data = JSON.parse(body)
            const ok = (list: unknown) =>
              Array.isArray(list) &&
              list.every((n) => n && typeof n === "object" && typeof (n as Record<string, unknown>).id === "string" && typeof (n as Record<string, unknown>).title === "string" && "parent" in (n as object))
            if (!ok(data?.before) || !ok(data?.after)) throw new Error("not a sitemap")
            await writeFile(path.resolve(server.config.root, "src/sitemap.json"), JSON.stringify(data, null, 2) + "\n")
            res.statusCode = 200
            res.end("ok")
          } catch (e) {
            res.statusCode = 400
            res.end(String(e))
          }
        })
      })
      server.middlewares.use("/__notes/save", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405
          return res.end()
        }
        let body = ""
        req.on("data", (c) => (body += c))
        req.on("end", async () => {
          try {
            const notes = JSON.parse(body)
            if (!Array.isArray(notes) || !notes.every(isNote)) throw new Error("not a list of notes")
            await writeFile(path.resolve(server.config.root, TARGET), JSON.stringify(notes, null, 2) + "\n")
            res.statusCode = 200
            res.end("ok")
          } catch (e) {
            res.statusCode = 400
            res.end(String(e))
          }
        })
      })
    },
  }
}

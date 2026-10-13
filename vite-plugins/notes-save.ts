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

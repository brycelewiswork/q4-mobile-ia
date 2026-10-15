import { create } from "zustand"
import { persist } from "zustand/middleware"
import { fetchComments, postComment, type Anchor, type Comment } from "@/lib/comments"

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

type State = {
  /** Who you are to the comments: a name you chose, and a random id that only lets you edit your own. Kept in this browser. */
  name: string
  clientId: string
  setName: (n: string) => void

  comments: Comment[]
  loaded: boolean
  /** Why comments aren't working, if they aren't. */
  error: string | null
  panelOpen: boolean
  picking: boolean
  /** The thread whose card is open. */
  active: string | null
  showResolved: boolean
  /** Pins on the page. Off by default: other people's numbers would crowd the thing being looked at. */
  showPins: boolean

  setPanelOpen: (o: boolean) => void
  setPicking: (p: boolean) => void
  setActive: (id: string | null) => void
  setShowResolved: (v: boolean) => void
  setShowPins: (v: boolean) => void

  refresh: () => Promise<void>
  add: (body: string, anchor: Anchor | undefined, parent?: string) => Promise<Comment | null>
  resolve: (id: string, resolved: boolean) => Promise<void>
  edit: (id: string, body: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useCommentsStore = create<State>()(
  persist(
    (set, get) => {
      // Do the thing, show it straight away, then take the server's word for it.
      const act = async (body: Record<string, unknown>, optimistic?: (c: Comment[]) => Comment[]) => {
        const before = get().comments
        if (optimistic) set({ comments: optimistic(before) })
        try {
          await postComment(get().clientId, body)
          set({ error: null })
        } catch (e) {
          set({ comments: before, error: e instanceof Error ? e.message : "Couldn't save that" })
          throw e
        }
        await get().refresh()
      }
      return {
        name: "",
        clientId: newId(),
        setName: (name) => set({ name: name.slice(0, 40) }),
        comments: [],
        loaded: false,
        error: null,
        panelOpen: false,
        picking: false,
        active: null,
        showResolved: false,
        showPins: false,
        setPanelOpen: (panelOpen) => set({ panelOpen }),
        setPicking: (picking) => set({ picking, ...(picking ? { active: null } : {}) }),
        setActive: (active) => set({ active }),
        setShowResolved: (showResolved) => set({ showResolved }),
        setShowPins: (showPins) => set({ showPins }),
        refresh: async () => {
          try {
            const comments = await fetchComments(get().clientId)
            set({ comments, loaded: true, error: null })
          } catch (e) {
            set({ loaded: true, error: e instanceof Error ? e.message : "Couldn't load comments" })
          }
        },
        add: async (body, anchor, parent) => {
          const { name, clientId } = get()
          try {
            const r = await postComment(clientId, { action: "add", body, author: name, parent, anchor })
            set({ error: null })
            await get().refresh()
            return r.comment ?? null
          } catch (e) {
            set({ error: e instanceof Error ? e.message : "Couldn't post that" })
            return null
          }
        },
        resolve: (id, resolved) => act({ action: "resolve", id, resolved }, (cs) => cs.map((c) => (c.id === id ? { ...c, resolved } : c))).catch(() => undefined),
        edit: (id, body) => act({ action: "edit", id, body }, (cs) => cs.map((c) => (c.id === id ? { ...c, body, edited: true } : c))).catch(() => undefined),
        remove: (id) => act({ action: "delete", id }, (cs) => cs.filter((c) => c.id !== id && c.parent !== id)).catch(() => undefined),
      }
    },
    { name: "q4-comments", partialize: (s) => ({ name: s.name, clientId: s.clientId, showResolved: s.showResolved, showPins: s.showPins }) },
  ),
)

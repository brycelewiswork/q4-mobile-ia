import { create } from "zustand"
import { persist } from "zustand/middleware"
import { SEED_ANNOTATIONS, type Annotation } from "@/annotations"

type State = {
  /** The notes you've edited in this browser. null = nobody has touched them: show the saved set. */
  edited: Annotation[] | null
  editing: boolean
  /** Waiting for a click on the phone to pin a new note. */
  picking: boolean
  /** A just-created note: its title field takes focus. */
  focusId: string | null
  setEditing: (e: boolean) => void
  setPicking: (p: boolean) => void
  add: (a: Annotation) => void
  update: (id: string, patch: Partial<Annotation>) => void
  remove: (id: string) => void
  reset: () => void
}

export const useNotesStore = create<State>()(
  persist(
    (set, get) => {
      const list = () => get().edited ?? SEED_ANNOTATIONS
      return {
        edited: null,
        editing: false,
        picking: false,
        focusId: null,
        setEditing: (editing) => set({ editing, picking: false }),
        setPicking: (picking) => set({ picking }),
        add: (a) => set({ edited: [...list(), a], focusId: a.id, picking: false }),
        update: (id, patch) => set({ edited: list().map((n) => (n.id === id ? { ...n, ...patch } : n)) }),
        remove: (id) => set({ edited: list().filter((n) => n.id !== id) }),
        reset: () => set({ edited: null }),
      }
    },
    { name: "q4-notes", partialize: (s) => ({ edited: s.edited }) },
  ),
)

/** The notes in force: yours if you've edited, else the saved set. */
export const useNotes = () => useNotesStore((s) => s.edited ?? SEED_ANNOTATIONS)

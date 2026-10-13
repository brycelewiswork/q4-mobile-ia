import { create } from "zustand"
import { persist } from "zustand/middleware"
import { LOCATIONS } from "@/data/locations"

/**
 * How the prototype is shown. Two independent switches on the bar above the phone:
 *
 *   detail   → "full" is the finished-looking design; "structure" is the leadership cut: titles, card
 *              titles and navigation stay, everything else becomes empty boxes and list skeletons.
 *   platform → "ios" or "android". Android is only built as the structure cut, so picking it
 *              implies structure.
 */
export type Detail = "full" | "structure"
export type Platform = "ios" | "android"

type State = {
  detail: Detail
  platform: Platform
  /** Show the notes beside the phone. */
  notes: boolean
  setNotes: (n: boolean) => void
  setDetail: (d: Detail) => void
  setPlatform: (p: Platform) => void
}

const fromUrl = (): Partial<Pick<State, "detail" | "platform">> => {
  const q = new URLSearchParams(window.location.search)
  const out: Partial<Pick<State, "detail" | "platform">> = {}
  const d = q.get("detail")
  const p = q.get("platform")
  if (d === "full" || d === "structure") out.detail = d
  if (p === "ios" || p === "android") out.platform = p
  return out
}

export const useViewStore = create<State>()(
  persist(
    (set) => ({
      detail: "full",
      platform: "ios",
      notes: true,
      setNotes: (notes) => set({ notes }),
      setDetail: (detail) => set({ detail }),
      setPlatform: (platform) => set({ platform, ...(platform === "android" ? { detail: "structure" as const } : {}) }),
    }),
    {
      name: "q4-view",
      // A link (?detail=structure&platform=android) beats whatever was saved.
      merge: (saved, current) => ({ ...current, ...(saved as object), ...fromUrl() }),
    },
  ),
)

/** True when screens should render the pared-down structure cut. */
export const useStructure = () => useViewStore((s) => s.detail === "structure" || s.platform === "android")

/**
 * How to print a location's name. The structure cut drops the real business names for "Location 1",
 * "Location 2"… so nobody reads the sample data instead of the IA.
 */
export function useLocName() {
  const wire = useStructure()
  return (l: { id: string; name: string }) => (wire ? `Location ${LOCATIONS.findIndex((x) => x.id === l.id) + 1}` : l.name)
}

/** The user, anonymized for the structure cut. */
export const ANON = { name: "First Last", email: "name@email.com" }

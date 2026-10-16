import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useActiveGroup, useLocationStore } from "@/store/useLocationStore"
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

/** The Full design is only switched on locally: the deployed site shows the Structure cut alone. */
export const FULL_ENABLED = import.meta.env.DEV
export type Platform = "ios" | "android"
/** The screen it's shown on: a phone or a tablet, held upright or on its side. */
export type Device = "phone" | "tablet"
export type Orientation = "portrait" | "landscape"
/** The page shows the interactive prototype, or the sitemap of it (before and after). */
export type View = "prototype" | "sitemap"

type State = {
  detail: Detail
  platform: Platform
  device: Device
  orientation: Orientation
  view: View
  setView: (v: View) => void
  /** Show the notes beside the phone. */
  notes: boolean
  setNotes: (n: boolean) => void
  setDetail: (d: Detail) => void
  setPlatform: (p: Platform) => void
  setDevice: (d: Device) => void
  setOrientation: (o: Orientation) => void
}

const fromUrl = (): Partial<Pick<State, "detail" | "platform" | "device" | "orientation" | "view">> => {
  const q = new URLSearchParams(window.location.search)
  const out: Partial<Pick<State, "detail" | "platform" | "device" | "orientation" | "view">> = {}
  const d = q.get("detail")
  const p = q.get("platform")
  const v = q.get("device")
  const o = q.get("orientation")
  const w = q.get("view")
  if (d === "full" || d === "structure") out.detail = d
  if (p === "ios" || p === "android") out.platform = p
  if (v === "phone" || v === "tablet") out.device = v
  if (o === "portrait" || o === "landscape") out.orientation = o
  if (w === "prototype" || w === "sitemap") out.view = w
  return out
}

export const useViewStore = create<State>()(
  persist(
    (set) => ({
      detail: "structure",
      platform: "ios",
      device: "phone",
      orientation: "portrait",
      view: "prototype",
      setView: (view) => set({ view }),
      notes: true,
      setNotes: (notes) => set({ notes }),
      setDetail: (detail) => set({ detail: FULL_ENABLED ? detail : "structure" }),
      setDevice: (device) => set({ device }),
      setOrientation: (orientation) => set({ orientation }),
      setPlatform: (platform) => set({ platform, ...(platform === "android" ? { detail: "structure" as const } : {}) }),
    }),
    {
      name: "q4-view",
      // A link (?detail=structure&platform=android&device=tablet&orientation=landscape) beats whatever was saved.
      merge: (saved, current) => {
        const merged = { ...current, ...(saved as object), ...fromUrl() }
        // A saved choice or a ?detail=full link can't turn Full on where it's disabled.
        return FULL_ENABLED ? merged : { ...merged, detail: "structure" as const }
      },
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

/** The title in the toolbar: the selected location's name, or the number of locations in "all locations". */
export function useLocTitle(loc: { id: string; name: string }) {
  const name = useLocName()
  const all = useLocationStore((s) => s.all)
  const group = useActiveGroup()
  return group ? group.name : all ? "All Locations" : name(loc)
}

/** The user, anonymized for the structure cut. */
export const ANON = { name: "First Last", email: "name@email.com" }

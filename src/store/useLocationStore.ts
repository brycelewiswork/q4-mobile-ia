import { createContext, useContext, type ReactNode } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { LOCATIONS, type Location } from "@/data/locations"
import { locationsOf, useGroupsStore } from "@/store/useGroupsStore"

type LocationState = {
  locationId: string
  /** Everything at once: every page shows all of the user's locations, grouped under a header for each. */
  all: boolean
  /** A saved group of locations is what is showing (see useGroupsStore). */
  groupId: string | null
  /** Picking one location always leaves "all locations". */
  setLocation: (id: string) => void
  setAll: (all: boolean) => void
  setGroup: (id: string) => void
}

/** The one location switcher. Every screen reads its content through this. */
export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      locationId: LOCATIONS[0].id,
      all: false,
      groupId: null,
      setLocation: (locationId) => set({ locationId, all: false, groupId: null }),
      setAll: (all) => set({ all, groupId: null }),
      setGroup: (groupId) => set({ groupId, all: false }),
    }),
    { name: "q4-location" },
  ),
)

export function useLocation(): Location {
  const id = useLocationStore((s) => s.locationId)
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0]
}

/**
 * Overrides which locations are on screen for everything below it. Home is a fixed overview (all of a person's
 * locations, whatever the switcher says), and a location opened from it shows just that one.
 */
export const ScopeContext = createContext<Location[] | null>(null)

/** The locations whose data is on screen: the override if there is one, else the selected location, or all of them in "all locations". */
export function useScope(): Location[] {
  const override = useContext(ScopeContext)
  const all = useLocationStore((s) => s.all)
  const group = useActiveGroup()
  const loc = useLocation()
  return override ?? (group ? locationsOf(group) : all ? LOCATIONS : [loc])
}

/** Opens one location's own view, growing out of the thing tapped. Provided on the Home overview, where a location's header and the breakdown rows are ways in. */
/** `row` is the element tapped and `clone` its look, for the view to grow out of. */
export const OpenLocationContext = createContext<((l: Location, row?: HTMLElement, clone?: ReactNode) => void) | null>(null)

/** True in "all locations": lists and widgets group what they show under a header for each location. */
export const useAllLocations = () => useLocationStore((s) => s.all)

/** The saved group that is showing, if any (a group that was deleted counts as none). */
export function useActiveGroup() {
  const id = useLocationStore((s) => s.groupId)
  return useGroupsStore((s) => s.groups.find((g) => g.id === id)) ?? null
}

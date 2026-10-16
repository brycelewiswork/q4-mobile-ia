import { create } from "zustand"
import { persist } from "zustand/middleware"
import { LOCATIONS, type Location } from "@/data/locations"

/** A set of locations the person has combined and named, e.g. "East coast". It shows in the switcher like a location. */
export type LocationGroup = { id: string; name: string; locationIds: string[] }

type State = {
  groups: LocationGroup[]
  add: (name: string, locationIds: string[]) => string
  remove: (id: string) => void
}

export const useGroupsStore = create<State>()(
  persist(
    (set) => ({
      groups: [],
      add: (name, locationIds) => {
        const id = `g_${Date.now().toString(36)}`
        set((s) => ({ groups: [...s.groups, { id, name: name.trim(), locationIds }] }))
        return id
      },
      remove: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
    }),
    { name: "q4-groups" },
  ),
)

/** The locations in a group, in the order the app lists them. */
export const locationsOf = (g: LocationGroup): Location[] => LOCATIONS.filter((l) => g.locationIds.includes(l.id))

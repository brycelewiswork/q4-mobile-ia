import { create } from "zustand"
import { persist } from "zustand/middleware"
import { LOCATIONS, type Location } from "@/data/locations"

type LocationState = {
  locationId: string
  setLocation: (id: string) => void
}

/** The one location switcher. Every screen reads its content through this. */
export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      locationId: LOCATIONS[0].id,
      setLocation: (locationId) => set({ locationId }),
    }),
    { name: "q4-location" },
  ),
)

export function useLocation(): Location {
  const id = useLocationStore((s) => s.locationId)
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0]
}

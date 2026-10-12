import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Who is looking at the app. It decides the home page, the bottom navigation and whether the
 * location switcher exists — toggled from the bar above the phone, not from inside it.
 *
 *   employee  → employee home · Home / Money / Shifts / Chat · can work at several locations (switcher)
 *   oam       → owner/manager dashboard · Home / Shifts / Time / Chat · one location, no switcher
 *   multi     → owner/manager dashboard · Home / Shifts / Time / Chat · location switcher
 */
export type UserType = "employee" | "oam" | "multi"

export const USER_TYPES: { id: UserType; label: string }[] = [
  { id: "employee", label: "Employee" },
  { id: "oam", label: "Owner / Manager" },
  { id: "multi", label: "Multiple locations" },
]

/** Whether this kind of user can switch location. Only a single-location owner/manager can't. */
export const canSwitchLocation = (t: UserType) => t !== "oam"

type State = { type: UserType; setType: (t: UserType) => void }

const fromUrl = (): UserType | null => {
  const q = new URLSearchParams(window.location.search)
  const u = q.get("user")
  if (u === "employee" || u === "oam" || u === "multi") return u
  return q.get("view") === "manager" ? "oam" : null // the old ?view=manager link
}

export const useUserTypeStore = create<State>()(
  persist(
    (set) => ({ type: "employee", setType: (type) => set({ type }) }),
    {
      name: "q4-user-type",
      // A link (?user=oam) beats whatever was saved.
      merge: (saved, current) => ({ ...current, ...(saved as object), ...(fromUrl() ? { type: fromUrl()! } : {}) }),
    },
  ),
)

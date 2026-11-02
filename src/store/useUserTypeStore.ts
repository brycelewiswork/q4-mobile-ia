import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Who is looking at the app. It decides the home page, the bottom navigation and whether the
 * location switcher exists — toggled from the bar above the phone, not from inside it.
 *
 *   employee  → employee home · Home / Money / Shifts / Chat · can work at several locations (switcher)
 *   oam       → owner/manager dashboard · Home / Shifts / Time / Chat · one location, no switcher
 *   oamna     → as oam, without the assistant: Time takes the extra slot in the bar · Home / Shifts / Time / Chat
 *   multi     → owner/manager dashboard · Home / Shifts / Time / Chat · location switcher
 */
export type UserType = "employee" | "oam" | "oamna" | "multi"

export const USER_TYPES: { id: UserType; label: string }[] = [
  { id: "employee", label: "Employee" },
  { id: "oam", label: "OAM" },
  { id: "oamna", label: "OAM no assistant" },
  { id: "multi", label: "Multi-location" },
]

/** Whether this kind of user can switch location. Only a single-location owner/manager can't. */
export const canSwitchLocation = (t: UserType) => t !== "oam" && t !== "oamna"

/** The OAM without the assistant is an OAM in every other way (notes, comments and the like treat them alike). */
export const baseUserType = (t: UserType): UserType => (t === "oamna" ? "oam" : t)

/** No assistant: the button is gone and Time takes the slot in the main navigation. */
export const hasAssistant = (t: UserType) => t === "oam" || t === "multi"

type State = { type: UserType; setType: (t: UserType) => void }

const fromUrl = (): UserType | null => {
  const q = new URLSearchParams(window.location.search)
  const u = q.get("user")
  if (u === "employee" || u === "oam" || u === "oamna" || u === "multi") return u
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

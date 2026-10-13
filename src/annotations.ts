import seed from "@/annotations.json"
import type { UserType } from "@/store/useUserTypeStore"
import type { Platform } from "@/store/useViewStore"

/**
 * A note that sits beside the phone and points at something on screen. It shows while its target (a CSS
 * selector inside the phone) is visible, and goes away when the target scrolls out or gets covered.
 *
 * Notes are written in the app (footer → Edit notes). To ship them, Copy JSON there and paste it over
 * `src/annotations.json`; that file is the saved set everyone sees. Edits you make in the browser
 * live in localStorage on top of it until you reset.
 */
export type Annotation = {
  id: string
  /** CSS selector, resolved inside the phone screen. */
  selector: string
  title: string
  body: string
  /** Which margin it sits in. Left unset, it follows the target: left half of the screen → left. */
  side?: "left" | "right"
  /** Only for this platform / these user types / this version. Unset = all. */
  platform?: Platform
  users?: UserType[]
  /** Only in this version of the design (Android is always Structure). Unset = both. */
  detail?: "full" | "structure"
}

export const SEED_ANNOTATIONS = seed as Annotation[]

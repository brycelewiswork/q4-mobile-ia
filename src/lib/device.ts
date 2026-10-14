import { useEffect, useState } from "react"
import { useViewStore, type Device, type Orientation } from "@/store/useViewStore"
import { useNotesStore } from "@/store/useNotesStore"

export type { Device, Orientation }

export type Size = { w: number; h: number }

/** Width the notes need either side of the screen (card + gap + breathing room). Keep in step with Annotations. */
export const NOTES_CARD_W = 236
export const NOTES_GAP = 44
export const NOTES_MARGIN = 2 * (NOTES_CARD_W + NOTES_GAP + 12)

/** Room above / below the frame for the page-level controls. */
export const HEADER_H = 64
export const FOOTER_H = 56

/** Logical size of a screen, turned on its side when held in landscape. */
export const oriented = (s: Size, o: Orientation): Size => (o === "landscape" ? { w: s.h, h: s.w } : s)

/**
 * Logical screen sizes, in points (iOS) / dp (Android).
 *  - iPhone 17: 402 × 874.  iPad Air 11" (M3): 820 × 1180.
 *  - Pixel 10 Pro: 410 × 914.  Galaxy Tab S12+ (12.6", 2800 × 1752 px): taken as 800 × 1280 dp, the size Samsung's
 *    tablets report. A guess until someone reads it off a real device.
 */
export const SCREENS = {
  ios: { phone: { w: 402, h: 874, radius: 62 }, tablet: { w: 820, h: 1180, radius: 18 } },
  android: { phone: { w: 410, h: 914, radius: 53 }, tablet: { w: 800, h: 1280, radius: 14 } },
} as const

/** A page-level media query that stays in step with the window. */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [query])
  return match
}

/**
 * Scale that fits a device into the window: by height (minus the page controls), by width, and, when notes are
 * showing, by the margins they need. The notes cap only applies if it doesn't shrink the device past half size;
 * below that the notes hide instead (see Annotations).
 */
export function useFit(box: Size, screenW: number, reserved: number) {
  const notes = useViewStore((s) => s.notes)
  const editing = useNotesStore((s) => s.editing)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => {
      const byH = (window.innerHeight - reserved - 48) / box.h
      const byW = (window.innerWidth - 24) / box.w
      let s = Math.min(1, byH, byW)
      if (notes || editing) {
        const byNotes = (window.innerWidth - NOTES_MARGIN) / screenW
        if (byNotes >= 0.5) s = Math.min(s, byNotes)
      }
      setScale(Math.max(0.2, s))
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [box.w, box.h, screenW, reserved, notes, editing])
  return scale
}

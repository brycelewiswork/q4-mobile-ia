const q = (v: string) => v.replace(/["\\]/g, "\\$&")

/** Does this selector pick out exactly this element inside the screen? */
const unique = (screen: Element, sel: string, el: Element) => {
  try {
    const all = screen.querySelectorAll(sel)
    return all.length === 1 && all[0] === el
  } catch {
    return false
  }
}

const own = (e: Element) => {
  const a = e.getAttribute("data-anno")
  if (a) return `[data-anno="${q(a)}"]`
  const l = e.getAttribute("aria-label")
  if (l) return `[aria-label="${q(l)}"]`
  return null
}

/**
 * A selector for an element, and whether it is *stable*. Stable means it names the element by its own
 * data-anno or aria-label, so it finds the same thing on iOS and Android. Anything else is a path of
 * child positions (from the nearest labelled ancestor, or from the screen itself), which only means
 * anything on the platform it was made on.
 */
export function selectorFor(el: Element, screen: Element): { selector: string; stable: boolean } {
  const direct = own(el)
  if (direct && unique(screen, direct, el)) return { selector: direct, stable: true }
  const parts: string[] = []
  let anchor: string | null = null
  let cur: Element | null = el
  while (cur && cur !== screen) {
    const o = cur !== el ? own(cur) : null
    if (o && unique(screen, o, cur)) {
      anchor = o
      break
    }
    const idx = cur.parentElement ? Array.from(cur.parentElement.children).indexOf(cur) + 1 : 1
    parts.unshift(`${cur.tagName.toLowerCase()}:nth-child(${idx})`)
    cur = cur.parentElement
  }
  return { selector: `${anchor ?? ":scope"} > ${parts.join(" > ")}`, stable: false }
}

/** A human name for the picked element, for the editor. */
export const describe = (el: Element) => el.getAttribute("aria-label") || el.getAttribute("data-anno") || (el as HTMLElement).innerText?.trim().slice(0, 28) || el.tagName.toLowerCase()

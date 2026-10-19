import type { HTMLAttributes } from "react"
import { IconBoltFilled } from "@tabler/icons-react"

/**
 * The menu icon: two left-aligned lines, the second shorter, with the assistant's own lightning bolt (the same
 * `IconBoltFilled` used for New chat and the suggestions) shrunk into the space beside it, so the button says the
 * assistant is in there. All in the current color.
 */
export function MenuTwoLine({ size = 24, stroke = 1.75, ...props }: { size?: number; stroke?: number } & Omit<HTMLAttributes<HTMLSpanElement>, "children">) {
  const bolt = Math.round(size * 0.58)
  return (
    <span aria-hidden className="relative inline-flex shrink-0" style={{ width: size, height: size }} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8h16" />
        <path d="M4 16h6" />
      </svg>
      <IconBoltFilled size={bolt} className="absolute" style={{ right: -size * 0.04, bottom: -size * 0.02 }} />
    </span>
  )
}

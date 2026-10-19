import type { SVGProps } from "react"

/**
 * The menu icon: two left-aligned lines, the second shorter, with a small lightning bolt (the assistant's) in the space
 * beside it, so the button says the assistant is in there. Tabler's 24px grid, all in the current color.
 */
export function MenuTwoLine({ size = 24, stroke = 1.75, ...props }: { size?: number; stroke?: number } & Omit<SVGProps<SVGSVGElement>, "stroke" | "width" | "height">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M4 8h16" />
      <path d="M4 16h7" />
      <path d="M19.8 10.4 14.6 16.9h2.7l-1 4.9 5.6-6.9h-2.8z" fill="currentColor" stroke="none" />
    </svg>
  )
}

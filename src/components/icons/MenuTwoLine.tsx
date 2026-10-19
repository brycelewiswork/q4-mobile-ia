import type { SVGProps } from "react"

/** The menu icon: two left-aligned lines, the second shorter. On Tabler's 24px grid, drawn in the current color. */
export function MenuTwoLine({ size = 24, stroke = 1.75, ...props }: { size?: number; stroke?: number } & Omit<SVGProps<SVGSVGElement>, "stroke" | "width" | "height">) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M4 9h16" />
      <path d="M4 15h10" />
    </svg>
  )
}

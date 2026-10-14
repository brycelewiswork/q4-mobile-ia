import type { CSSProperties, ReactNode } from "react"
import { FOOTER_H, HEADER_H, useFit, type Size } from "@/lib/device"

export type ScreenRect = { x: number; y: number; w: number; h: number; radius: number }

/**
 * The stage a device sits on: page controls above and below, the device scaled to fit, centred.
 *
 * `box` is the device's outer size at 1:1 (screen plus bezel). `screen` is where the live screen sits inside it.
 * `art` paints the bezel / body (and any shadow) inside the box; `overlay` paints on top of the screen
 * (bezel art that must cover the corners, camera, home bar). Children are the app.
 */
export function DeviceShell({
  box,
  screen,
  screenClass,
  screenStyle,
  art,
  chrome,
  overlay,
  header,
  footer,
  children,
}: {
  box: Size
  screen: ScreenRect
  screenClass: string
  screenStyle: CSSProperties
  art: ReactNode
  /** Drawn inside the screen, over the app: status bar, camera cutout. */
  chrome?: ReactNode
  overlay?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  const scale = useFit(box, screen.w, (header ? HEADER_H : 0) + (footer ? FOOTER_H : 0))
  return (
    <div
      className="relative flex h-svh w-full items-center justify-center overflow-hidden bg-[#e4e3e8] dark:bg-neutral-900"
      style={{ paddingTop: header ? HEADER_H : 0, paddingBottom: footer ? FOOTER_H : 0 }}
    >
      {footer && (
        <div className="absolute inset-x-0 bottom-0 z-[60] flex items-center justify-center" style={{ height: FOOTER_H }}>
          {footer}
        </div>
      )}
      {header && (
        <div className="absolute inset-x-0 top-0 z-[60] flex items-center justify-center" style={{ height: HEADER_H }}>
          {header}
        </div>
      )}
      <div className="relative shrink-0" style={{ width: box.w * scale, height: box.h * scale }}>
        <div className="relative origin-top-left" style={{ width: box.w, height: box.h, transform: `scale(${scale})` }}>
          {art}
          <div
            className={`${screenClass} absolute overflow-hidden`}
            style={{ left: screen.x, top: screen.y, width: screen.w, height: screen.h, borderRadius: screen.radius, ...screenStyle }}
          >
            {children}
            {chrome}
          </div>
          {overlay}
        </div>
      </div>
    </div>
  )
}

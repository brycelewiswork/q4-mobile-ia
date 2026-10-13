import { useEffect, useState, type CSSProperties, type ReactNode } from "react"

/**
 * Pixel 10 Pro at 1:1 dp, from the android-nav sketch (Figma "Bezels / Android Standard"): a 410 × 914
 * screen, the bezel art placed at (-18, -19) and sized 450.839 × 949.
 */
export const A_SCREEN = { w: 410, h: 914, radius: 53 } as const
const BEZEL = { x: -18, y: -19, w: 450.839, h: 949 } as const
const OUTER_RADIUS = 72
const HEADER_H = 64
const FOOTER_H = 56

function useBare() {
  const [match, setMatch] = useState(() => window.matchMedia("(max-width: 500px)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 500px)")
    const on = () => setMatch(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return match
}

function useFit(reserved: number) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - reserved - 48) / BEZEL.h))
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [reserved])
  return scale
}

const mask = (src: string): CSSProperties => ({ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" })

/** Figma "Status Bar / Android": 52 tall, 24/10 padding, Roboto Medium 14/20, the camera cutout centred. */
function StatusBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex h-[52px] items-end justify-between px-6 py-[10px] text-m-on-surface">
      <p className="text-[14px] font-medium leading-5 tracking-[0.14px]">9:41</p>
      <div className="relative h-[17px] w-[46px]">
        <span className="absolute left-0 top-0 block h-[17px] w-[17px] bg-current" style={mask("/android/wifi.svg")} />
        <span className="absolute left-[16px] top-0 block h-[17px] w-[17px] bg-current" style={mask("/android/signal.svg")} />
        <span className="absolute left-[38px] top-px block h-[15px] w-2 bg-current" style={mask("/android/battery.svg")} />
      </div>
      <img src="/android/camera-cutout.svg" alt="" className="absolute left-1/2 top-[18px] size-6 -translate-x-1/2" />
    </div>
  )
}

export function AndroidFrame({ children, header, footer }: { children: ReactNode; header?: ReactNode; footer?: ReactNode }) {
  const bare = useBare()
  const scale = useFit((header ? HEADER_H : 0) + (footer ? FOOTER_H : 0))
  const screenStyle = { fontFamily: "Roboto, system-ui, sans-serif", "--safe-top": "52px", "--safe-bottom": "0px" } as CSSProperties

  if (bare) {
    return (
      <div className="android-screen bg-m-surface relative h-svh w-full overflow-hidden" style={screenStyle}>
        {children}
      </div>
    )
  }
  return (
    <div className="relative flex h-svh w-full items-center justify-center overflow-hidden bg-[#e4e3e8] dark:bg-neutral-900" style={{ paddingTop: header ? HEADER_H : 0, paddingBottom: footer ? FOOTER_H : 0 }}>
      {footer && <div className="absolute inset-x-0 bottom-0 z-[60] flex items-center justify-center" style={{ height: FOOTER_H }}>{footer}</div>}
      {header && <div className="absolute inset-x-0 top-0 z-[60] flex items-center justify-center" style={{ height: HEADER_H }}>{header}</div>}
      <div className="relative shrink-0" style={{ width: BEZEL.w * scale, height: BEZEL.h * scale }}>
        <div className="relative origin-top-left" style={{ width: BEZEL.w, height: BEZEL.h, transform: `scale(${scale})` }}>
          {/* A soft shadow shaped like the phone's outer silhouette, hidden under the phone. */}
          <div aria-hidden className="absolute inset-0 shadow-[0_44px_90px_-24px_rgb(0_0_0/0.16),0_12px_28px_-12px_rgb(0_0_0/0.08)] dark:shadow-[0_44px_90px_-24px_rgb(0_0_0/0.6),0_12px_28px_-12px_rgb(0_0_0/0.4)]" style={{ borderRadius: OUTER_RADIUS }} />
          <div className="android-screen bg-m-surface absolute overflow-hidden" style={{ left: -BEZEL.x, top: -BEZEL.y, width: A_SCREEN.w, height: A_SCREEN.h, borderRadius: A_SCREEN.radius, ...screenStyle }}>
            {children}
            <StatusBar />
          </div>
          <img src="/android/pixel-10-pro.png" alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full max-w-none select-none" />
        </div>
      </div>
    </div>
  )
}

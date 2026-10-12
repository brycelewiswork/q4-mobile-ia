import { useEffect, useState, type CSSProperties, type ReactNode } from "react"

/** iPhone 17 logical screen, from the Figma "Base Screen" (node 41:19738). */
export const SCREEN = { w: 402, h: 874, radius: 62 } as const
/** The bezel art bleeds past the screen: 450×920 total (aspect 1350/2760). */
const BEZEL = { w: 450, h: 920 } as const

/** SF Pro on Apple platforms (Mac + the phone this is previewed on). */
export const IOS_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "SF Pro Text", system-ui, sans-serif'

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [query])
  return match
}

/** Room above the phone for the page-level controls (the user-type toggle). */
const HEADER_H = 64

function useFitScale(pad = 24, header = 0) {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - header - pad * 2) / BEZEL.h))
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [pad, header])
  return scale
}

function DynamicIsland() {
  return <div className="absolute left-1/2 top-[13px] z-50 h-[37px] w-[125px] -translate-x-1/2 rounded-full bg-black" />
}

function StatusBar() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-40 flex h-[62px] items-center px-[9px] pt-[2.333px] text-[#2c2935]"
      style={{ fontFamily: IOS_FONT }}
    >
      <div className="flex flex-1 items-center justify-center pr-[6px]">
        <span className="text-[17px] font-[590] leading-[22px]">9:41</span>
      </div>
      <div className="w-[125px] shrink-0" />
      <div className="flex flex-1 items-center justify-center pr-px">
        <img src="/phone/status-levels.svg" alt="" width={85.33} height={13} />
      </div>
    </div>
  )
}

/**
 * The iPhone. On a desktop it renders the bezel at 402×874 logical points,
 * scaled to fit the window. On an actual phone (≤500px wide) the frame drops
 * away and the screen goes edge to edge, so the real device chrome is used.
 *
 * Children get two CSS vars to lay out against: `--safe-top` (below the status
 * bar) and `--safe-bottom` (above the home indicator).
 */
export function IPhoneFrame({ children, header }: { children: ReactNode; /** Page controls shown on the web page above the phone (desktop only). */ header?: ReactNode }) {
  const bare = useMediaQuery("(max-width: 500px)")
  const scale = useFitScale(24, header ? HEADER_H : 0)

  if (bare) {
    return (
      <div
        className="relative h-svh w-full overflow-hidden bg-[#f3f2f6]"
        style={
          {
            fontFamily: IOS_FONT,
            "--safe-top": "max(env(safe-area-inset-top), 20px)",
            "--safe-bottom": "max(env(safe-area-inset-bottom), 12px)",
          } as CSSProperties
        }
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className="relative flex h-svh w-full items-center justify-center overflow-hidden bg-[#e4e3e8] dark:bg-neutral-900"
      style={{ paddingTop: header ? HEADER_H : 0 }}
    >
      {header && (
        <div className="absolute inset-x-0 top-0 z-[60] flex items-center justify-center" style={{ height: HEADER_H }}>
          {header}
        </div>
      )}
      <div
        className="relative shrink-0"
        style={{ width: BEZEL.w, height: BEZEL.h, transform: `scale(${scale})` }}
      >
        <div
          className="absolute overflow-hidden bg-[#f3f2f6]"
          style={
            {
              left: (BEZEL.w - SCREEN.w) / 2,
              top: (BEZEL.h - SCREEN.h) / 2,
              width: SCREEN.w,
              height: SCREEN.h,
              borderRadius: SCREEN.radius,
              fontFamily: IOS_FONT,
              "--safe-top": "62px",
              "--safe-bottom": "25px",
            } as CSSProperties
          }
        >
          {children}
          <StatusBar />
          <DynamicIsland />
        </div>
        <img
          src="/phone/bezel.png"
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 z-50 size-full select-none"
        />
      </div>
    </div>
  )
}

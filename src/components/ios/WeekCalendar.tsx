import { useEffect, useLayoutEffect, useRef } from "react"
import { BASE_MONDAY, WEEKDAYS_SHORT, addDays, sameDay, weekdayIndex, weeksFromBase } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useDateStore } from "@/store/useDateStore"

/** Weeks you can scroll through, either side of the demo week. */
const SPAN = 26

/**
 * The scrolling calendar: a row of seven days you can swipe sideways a week at a time, with the
 * chosen date written out underneath, centered. It reads and writes the shared date, so Shifts and
 * Time always agree. Swiping to another week keeps the same weekday selected.
 */
export function WeekCalendar({ label }: { label: string }) {
  const date = useDateStore((s) => s.date)
  const setDate = useDateStore((s) => s.setDate)
  const scroller = useRef<HTMLDivElement>(null)
  const settle = useRef<number | undefined>(undefined)
  const first = useRef(true)
  const week = weeksFromBase(date)
  const day = weekdayIndex(date)

  // Keep the strip on the week that holds the date (also when it was changed somewhere else).
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const left = (week + SPAN) * el.clientWidth
    if (Math.abs(el.scrollLeft - left) > 1) el.scrollTo({ left, behavior: first.current ? "auto" : "smooth" })
    first.current = false
  }, [week])

  // A finger scrolls the strip natively. A mouse can't, so drag it by hand and snap to a week on release.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let down = false
    let moved = false
    let startX = 0
    let startLeft = 0
    let samples: { t: number; x: number }[] = []
    const scale = () => el.getBoundingClientRect().width / el.offsetWidth || 1

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return
      down = true
      moved = false
      startX = e.clientX
      startLeft = el.scrollLeft
      samples = [{ t: performance.now(), x: e.clientX }]
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) < 5) return
      if (!moved) {
        moved = true
        el.style.scrollSnapType = "none" // snapping would fight the drag
        el.style.cursor = "grabbing"
      }
      el.scrollLeft = startLeft - dx / scale()
      samples.push({ t: performance.now(), x: e.clientX })
      if (samples.length > 6) samples.shift()
    }
    const onUp = () => {
      if (!down) return
      down = false
      if (!moved) return
      const a = samples[0]
      const b = samples[samples.length - 1]
      const v = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 / scale() : 0 // px/s, + = dragged right
      const w = el.clientWidth
      const idx = Math.max(0, Math.min(SPAN * 2, Math.round((el.scrollLeft - v * 0.2) / w)))
      el.scrollTo({ left: idx * w, behavior: "smooth" })
      window.setTimeout(() => {
        el.style.scrollSnapType = ""
        el.style.cursor = ""
      }, 450)
    }
    // A drag that moved shouldn't also tap the day it ended on.
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation()
        e.preventDefault()
        moved = false
      }
    }
    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    el.addEventListener("click", onClick, true)
    return () => {
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
      el.removeEventListener("click", onClick, true)
    }
  }, [])

  const onScroll = () => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = scroller.current
      if (!el) return
      const idx = Math.round(el.scrollLeft / el.clientWidth) - SPAN
      if (idx !== week) setDate(addDays(addDays(BASE_MONDAY, idx * 7), day))
    }, 120)
  }

  return (
    <div className="pb-3 pt-2">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="-mx-4 flex cursor-grab select-none snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {Array.from({ length: SPAN * 2 + 1 }, (_, w) => w - SPAN).map((wk) => (
          <div key={wk} className="flex w-full shrink-0 snap-center justify-between px-4">
            {WEEKDAYS_SHORT.map((n, i) => {
              const d = addDays(BASE_MONDAY, wk * 7 + i)
              const on = sameDay(d, date)
              return (
                <button key={n} onClick={() => setDate(d)} aria-pressed={on} className="flex flex-col items-center gap-2 tracking-[-0.43px]">
                  <span className="text-[13px] leading-4 text-[#7f7f7f]">{n[0]}</span>
                  <span className={cn("flex size-10 items-center justify-center rounded-full text-[15px] leading-5 transition-colors duration-200", on ? "bg-[#8f55e5] font-[590] text-white" : "font-[510] text-black")}>
                    {d.getDate()}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <p className="pt-3 text-center text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#747182]">{label}</p>
    </div>
  )
}

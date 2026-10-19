import { Bar } from "@/components/wire/Wire"
import { useStructure } from "@/store/useViewStore"
import { useLocName } from "@/store/useViewStore"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { IconArrowLeft, IconArrowUp, IconBoltFilled, IconDots, IconMessages, IconPlus, IconSearch, IconX } from "@tabler/icons-react"
import { Keyboard, KEYBOARD_H } from "@/components/ios/Keyboard"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { cn } from "@/lib/utils"
import type { Location } from "@/data/locations"
import { usePersonStore } from "@/store/usePersonStore"

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const SPRING = { type: "spring" as const, stiffness: 420, damping: 42 }
/** Where the medium detent's top edge sits, from the top of the screen (from the design). */
const MEDIUM_TOP = 176

type Msg = { role: "user" | "assistant"; text: string }

/**
 * The AI assistant: a bottom sheet with two detents. Drag it up far enough and it becomes a full page;
 * drag it down past the medium detent and it dismisses. Focusing the composer raises the iOS keyboard.
 *
 * Geometry is one value, `h` (the sheet's height); `q` (0 = medium, 1 = full) derives inset, radii and
 * header padding from it. `y` is only the slide in/out and dismiss offset, so glass never sees opacity.
 */
export function AssistantSheet({ loc, onClose, startWith, showHistory = true }: { loc: Location; onClose: () => void; /** Open on this past conversation. */ startWith?: string; /** Show the Conversations button in the header (off where the app's menu holds them). */ showHistory?: boolean }) {
  const locName = useLocName()
  const root = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [H, setH] = useState(874)
  const wire = useStructure()
  const first = usePersonStore((p) => p.firstName || p.name.split(" ")[0])
  const [kb, setKb] = useState(false)
  const [text, setText] = useState("")
  const [thread, setThread] = useState<Msg[]>(() =>
    startWith
      ? [
          { role: "user", text: startWith },
          { role: "assistant", text: `Here's where we left off on “${startWith}” for ${locName(loc)}.` },
        ]
      : [],
  )
  const [view, setView] = useState<"chat" | "history">("chat")
  const [query, setQuery] = useState("")

  const MED = H - MEDIUM_TOP
  const h = useMotionValue(MED)
  const y = useMotionValue(MED + 12)
  const kbPad = useMotionValue(0)
  const kbY = useMotionValue(KEYBOARD_H)
  const closing = useRef(false)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const next = el.offsetHeight
    setH(next)
    h.set(next - MEDIUM_TOP)
    y.set(next - MEDIUM_TOP + 12)
  }, [h, y])

  useEffect(() => {
    const c = animate(y, 0, SPRING)
    return () => c.stop()
  }, [y])

  useEffect(() => {
    const a = animate(kbPad, kb ? KEYBOARD_H : 0, SPRING)
    const b = animate(kbY, kb ? 0 : KEYBOARD_H, SPRING)
    return () => {
      a.stop()
      b.stop()
    }
  }, [kb, kbPad, kbY])

  // Opens with the keyboard up and the composer focused.
  useEffect(() => {
    setKb(true)
    input.current?.focus({ preventScroll: true })
  }, [])

  const backRef = useRef<() => void>(() => undefined)

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    setKb(false)
    const c = animate(y, h.get() + 24, { ...SPRING, onComplete: onClose })
    return () => c.stop()
  }, [y, h, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (view === "history") backRef.current()
      else if (kb) setKb(false)
      else close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [kb, view, close])

  // Drag: up grows the sheet toward the full page, down shrinks it, then dismisses.
  useEffect(() => {
    const el = surface.current
    const rootEl = root.current
    if (!el || !rootEl) return
    let active = false
    let dragging = false
    let startY = 0
    let h0 = 0
    let samples: { t: number; y: number }[] = []
    const scale = () => rootEl.getBoundingClientRect().width / rootEl.offsetWidth || 1

    const onDown = (e: PointerEvent) => {
      if (closing.current || (e.pointerType === "mouse" && e.button !== 0)) return
      const t = e.target as HTMLElement
      if (t.closest("button, input")) return
      // A thread long enough to scroll keeps its own scrolling; otherwise the content drags the sheet too.
      const sc = t.closest<HTMLElement>("[data-scroll]")
      if (sc && sc.scrollHeight > sc.clientHeight + 1) return
      active = true
      dragging = false
      startY = e.clientY
      h0 = h.get() - y.get() // visible height
      samples = [{ t: performance.now(), y: e.clientY }]
    }
    const onMove = (e: PointerEvent) => {
      if (!active) return
      const dy = (e.clientY - startY) / scale()
      if (!dragging) {
        if (Math.abs(dy) < 6) return
        dragging = true
      }
      e.preventDefault()
      const want = h0 - dy // desired visible height
      if (want >= MED) {
        const over = Math.max(0, want - H)
        h.set(Math.min(want, H) + over * 0.15) // rubber band past the full page
        y.set(0)
      } else {
        h.set(MED)
        y.set(MED - want)
      }
      samples.push({ t: performance.now(), y: e.clientY })
      if (samples.length > 6) samples.shift()
    }
    const onUp = () => {
      if (!active) return
      active = false
      if (!dragging) return
      dragging = false
      const a = samples[0]
      const b = samples[samples.length - 1]
      const v = b.t > a.t ? (((b.y - a.y) / (b.t - a.t)) * 1000) / scale() : 0 // px/s, + = down
      const pos = h.get() - y.get() - v * 0.2 // visible height, projected a little ahead
      const mid = (MED + H) / 2
      if (pos < MED * 0.6) return close()
      animate(y, 0, SPRING)
      animate(h, pos > mid ? H : MED, SPRING)
    }
    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove, { passive: false })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [H, MED, h, y, close])

  const q = useTransform(h, (v) => clamp01((v - MED) / (H - MED)))
  const inset = useTransform(q, (v) => lerp(6, 0, v))
  const radiusTop = useTransform(q, (v) => lerp(34, 0, v))
  const radiusBottom = useTransform(q, (v) => lerp(58, 0, v))
  const headerTop = useTransform(q, (v) => `calc(var(--safe-top) * ${v} + 16px)`)
  // The grabber goes away as the sheet heads for the full page.
  const grabber = useTransform(q, (v) => 1 - clamp01(v / 0.2))
  const scrim = useTransform([y, h], ([yy, hh]: number[]) => 0.2 * clamp01(1 - yy / hh))

  // Conversations opens the sheet to full height, and it stays there when you go back.
  const openHistory = () => {
    setKb(false)
    input.current?.blur()
    animate(h, H, SPRING)
    setView("history")
  }
  const backToChat = () => setView("chat")
  backRef.current = backToChat
  const history = loc.conversations.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase()))
  const openConversation = (title: string) => {
    setThread([
      { role: "user", text: title },
      { role: "assistant", text: `Here's where we left off on “${title}” for ${locName(loc)}.` },
    ])
    backToChat()
  }
  const send = (value: string) => {
    const t = value.trim()
    if (!t) return
    setText("")
    setKb(false)
    input.current?.blur()
    setThread((m) => [...m, { role: "user", text: t }])
    window.setTimeout(
      () => setThread((m) => [...m, { role: "assistant", text: `On it. I'm pulling this together from ${locName(loc)}'s schedule and timecard data.` }]),
      900,
    )
  }
  const words = text.split(/\s+/)
  const last = text.endsWith(" ") ? "" : (words[words.length - 1] ?? "")
  const suggestions = last ? [`“${last}”`, `${last}s`, `${last}ed`] : []
  const replaceLast = (s: string) => setText(text.slice(0, text.length - last.length) + s.replace(/[“”]/g, "") + " ")
  const onKeyboard = (k: string) => {
    if (k === "⌫") setText((t) => t.slice(0, -1))
    else if (k === "\n") send(text)
    else setText((t) => t + k)
  }

  return (
    <div ref={root} className="absolute inset-0 z-[38]">
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: scrim }} onClick={close} />
      <motion.div
        ref={surface}
        role="dialog"
        aria-modal="true"
        aria-label="Assistant"
        onPointerDown={(e) => {
          // Tapping the sheet (not the composer) puts the keyboard away.
          if (!(e.target as HTMLElement).closest("input, [data-keyboard]")) setKb(false)
        }}
        style={{
          left: inset,
          right: inset,
          bottom: inset,
          height: h,
          y,
          borderTopLeftRadius: radiusTop,
          borderTopRightRadius: radiusTop,
          borderBottomLeftRadius: radiusBottom,
          borderBottomRightRadius: radiusBottom,
          touchAction: "none",
          backgroundColor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          boxShadow: "1.25px 0 0 -0.75px #dbdbdb, -1.25px 0 0 -0.75px #dbdbdb, 0 0 0 0.5px #dbdbdb, 0 8px 48px rgba(0,0,0,0.25)",
        }}
        className="absolute flex select-none flex-col overflow-hidden"
      >
        <motion.div style={{ opacity: grabber }} className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-[6px]">
          <div className="h-1 w-[60px] rounded-full bg-[#c3c3c6]" />
        </motion.div>

        <motion.div
          animate={{ x: view === "history" ? "28%" : 0 }}
          transition={SPRING}
          inert={view === "history"}
          className="absolute inset-0 flex flex-col"
        >
        <motion.div style={{ paddingTop: headerTop }} className="relative flex h-auto shrink-0 items-start justify-between px-4">
          {showHistory ? (
            <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
              <button aria-label="Conversations" onClick={openHistory} className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconMessages size={24} stroke={1.75} />
              </button>
            </LiquidGlass>
          ) : (
            <span aria-hidden className="size-11" />
          )}
          <h2 className="pointer-events-none flex h-11 items-center gap-[6px] text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#1a1a1a]">
            <IconBoltFilled size={22} className="text-[#8f55e5]" />
            Assistant
          </h2>
          <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
            <button onClick={close} aria-label="Close" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
              <IconX size={24} stroke={2} />
            </button>
          </LiquidGlass>
        </motion.div>

        <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {thread.length === 0 ? (
            <>
              {wire ? (
                <div aria-hidden className="flex flex-col gap-3 pt-2">
                  <Bar w="100%" h={22} />
                  <Bar w="70%" h={22} />
                </div>
              ) : (
                <h1 className="text-[28px] font-[590] leading-[34px] tracking-[-0.43px] text-black text-balance">
                  {`Hi ${first}, let’s tackle today. What’s on your mind?`}
                </h1>
              )}
              <div className="flex flex-col gap-2 pt-5">
                {loc.assistant.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="flex items-center gap-3 rounded-[20px] bg-[#ebe8ef] p-4 text-left text-[17px] leading-[22px] tracking-[-0.43px] text-black active:opacity-70"
                  >
                    <IconBoltFilled size={24} className="shrink-0 text-[#8f55e5]" />
                    {wire ? <Bar w="75%" h={12} /> : s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 pb-3">
              {thread.map((m, i) => (
                <p
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-[20px] px-4 py-[10px] text-[17px] leading-[22px] tracking-[-0.43px]",
                    m.role === "user" ? "self-end bg-[#8f55e5] text-white" : "self-start bg-[#ebe8ef] text-black",
                  )}
                >
                  {m.text}
                </p>
              ))}
            </div>
          )}
        </div>

        <motion.div style={{ paddingBottom: useTransform(kbPad, (v) => v + 20) }} className="shrink-0 px-4 pt-3">
          <div className="flex h-12 items-center gap-2 rounded-full bg-white pl-5 pr-2 shadow-[0_2px_10px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.05)]">
            <input
              ref={input}
              value={text}
              inputMode="none"
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setKb(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(text)
                e.stopPropagation()
              }}
              placeholder="Ask anything…"
              aria-label="Ask anything"
              className="min-w-0 flex-1 bg-transparent text-[17px] leading-[22px] tracking-[-0.43px] text-black outline-none placeholder:text-[#9a97a6]"
            />
            {text ? (
              <button onClick={() => send(text)} aria-label="Send" className="flex size-8 items-center justify-center rounded-full bg-[#8f55e5] text-white active:opacity-70">
                <IconArrowUp size={20} stroke={2.5} />
              </button>
            ) : (
              <svg aria-hidden width="26" height="22" viewBox="0 0 26 22" className="mr-2 text-[#7a7790]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9v4M8 5v12M13 2v18M18 6v10M23 9v4" />
              </svg>
            )}
          </div>
        </motion.div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ x: view === "history" ? 0 : "-100%" }}
          transition={SPRING}
          inert={view !== "history"}
          className="absolute inset-0 flex flex-col bg-[#fbfbfc]"
        >
          <motion.div style={{ paddingTop: headerTop }} className="relative flex shrink-0 items-start justify-between px-4">
            <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
              <button onClick={backToChat} aria-label="Back" className="flex size-9 items-center justify-center rounded-full text-[#141414]">
                <IconArrowLeft size={24} stroke={1.75} />
              </button>
            </LiquidGlass>
            <h2 className="pointer-events-none flex h-11 items-center text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#1a1a1a]">Conversations</h2>
            <LiquidGlass mode="small" radius={999} className="flex size-11 items-center justify-center">
              <button
                onClick={() => {
                  setThread([])
                  backToChat()
                }}
                aria-label="New conversation"
                className="flex size-9 items-center justify-center rounded-full text-[#141414]"
              >
                <IconPlus size={24} stroke={1.75} />
              </button>
            </LiquidGlass>
          </motion.div>
          <div className="shrink-0 px-4 pt-4">
            <LiquidGlass mode="small" radius={999} className="flex h-11 items-center">
              <label className="flex h-full w-full items-center gap-2 pl-4 pr-4">
                <IconSearch size={22} stroke={1.75} className="shrink-0 text-[#5a5666]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Search"
                  aria-label="Search conversations"
                  className="min-w-0 flex-1 bg-transparent text-[17px] leading-[22px] tracking-[-0.43px] text-black outline-none placeholder:text-[#7f7f7f]"
                />
              </label>
            </LiquidGlass>
          </div>
          <div data-scroll className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { label: "Pinned", rows: history.filter((c) => c.pinned) },
              { label: "Previous", rows: history.filter((c) => !c.pinned) },
            ].map((g) =>
              g.rows.length === 0 ? null : (
                <div key={g.label}>
                  <h3 className="px-0 pb-1 pt-5 text-[17px] font-[590] leading-[22px] tracking-[-0.43px] text-[#747182]">{g.label}</h3>
                  {g.rows.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 tracking-[-0.43px]">
                      <button
                        onClick={() => openConversation(c.title)}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-3 py-3 text-left active:opacity-60"
                      >
                        {wire ? (
                          <>
                            <Bar w="60%" h={12} />
                            <Bar w={36} h={10} />
                          </>
                        ) : (
                          <>
                            <span className="truncate text-[17px] leading-[22px] text-black">{c.title}</span>
                            <span className="shrink-0 text-[15px] leading-5 text-[#7f7f7f]">{c.time}</span>
                          </>
                        )}
                      </button>
                      <button aria-label="More" className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#2c2935] active:opacity-60">
                        <IconDots size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              ),
            )}
          </div>
        </motion.div>
      </motion.div>

      <motion.div data-keyboard className="absolute inset-x-0 bottom-0 z-10" style={{ y: kbY }}>
        <Keyboard onKey={onKeyboard} capitalize={text === "" || /[.!?]\s$/.test(text)} suggestions={suggestions} onSuggestion={replaceLast} />
      </motion.div>
    </div>
  )
}

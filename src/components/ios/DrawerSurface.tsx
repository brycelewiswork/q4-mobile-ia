import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { animate, motion, useDragControls, useMotionValue, useTransform } from "motion/react"
import { SPRING_FAST } from "@/lib/motion"

const SPRING = { type: "spring" as const, ...SPRING_FAST.snappy }
/** The strip of the main surface that stays visible beside the open menu. */
const PEEK = 86
/** How far in from the left edge a swipe can start. */
const EDGE = 18

/**
 * The menu pattern from ChatGPT, Claude and Muse: the whole app is one surface that slides to the right, and a menu
 * sits underneath it. Open it from the menu button, by swiping in from the left edge, or close it by tapping or
 * swiping the app surface. It moves by transform only, so glass inside it keeps refracting.
 *
 * `drawer` gets a function that closes the menu (to run before opening something).
 */
export function DrawerSurface({
  enabled = true,
  open,
  onOpenChange,
  drawer,
  children,
}: {
  enabled?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  drawer: (close: () => void) => ReactNode
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(300)
  const x = useMotionValue(0)
  const controls = useDragControls()
  const radius = useTransform(x, [0, W], [0, 52])
  const shadow = useTransform(x, [0, W], ["-8px 0 0px rgba(20,20,40,0)", "-10px 0 36px rgba(20,20,40,0.16)"])

  useLayoutEffect(() => {
    if (root.current) setW(root.current.offsetWidth - PEEK)
  }, [])
  useEffect(() => {
    const c = animate(x, enabled && open ? W : 0, SPRING)
    return () => c.stop()
  }, [open, W, enabled, x])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!enabled) return <>{children}</>
  const close = () => onOpenChange(false)
  return (
    <div ref={root} className="absolute inset-0 overflow-hidden bg-white">
      <div aria-hidden={!open} inert={!open} className="absolute inset-y-0 left-0 bg-white" style={{ width: W }}>
        {drawer(close)}
      </div>
      <motion.div
        drag="x"
        dragControls={controls}
        dragListener={open}
        dragConstraints={{ left: 0, right: W }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const far = x.get() > W / 2
          onOpenChange(info.velocity.x > 350 ? true : info.velocity.x < -350 ? false : far)
        }}
        style={{ x, borderTopLeftRadius: radius, borderBottomLeftRadius: radius, borderTopRightRadius: radius, borderBottomRightRadius: radius, boxShadow: shadow, touchAction: "pan-y" }}
        className="absolute inset-0 overflow-hidden bg-[#f3f2f6]"
      >
        {children}
        {/* While the menu is open the app is a single target: tap it to put the menu away. */}
        {open && <button aria-label="Close menu" onClick={close} className="absolute inset-0 z-[60] cursor-default" />}
      </motion.div>
      {!open && <div aria-hidden onPointerDown={(e) => controls.start(e)} className="absolute inset-y-0 left-0 z-[45]" style={{ width: EDGE, touchAction: "none" }} />}
    </div>
  )
}

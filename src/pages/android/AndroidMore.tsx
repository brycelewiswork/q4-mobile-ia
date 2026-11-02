import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Reorder, motion, useDragControls } from "motion/react"
import { IconChevronDown, IconGripVertical, IconSettings } from "@tabler/icons-react"
import { AIconButton } from "@/pages/android/m3"
import { MORPH_EASE, morphLine, morphRow } from "@/lib/morph"
import { isTabItem, useMoreMenuStore } from "@/store/useMoreMenuStore"
import { cn } from "@/lib/utils"

/** One row of the More menu (the same list as iOS: the tabs, then the rest of the app). */
export type MoreItem = {
  id: string
  label: string
  icon: ReactNode
  /** The icon More wears in the bar while this item's page is showing. */
  activeIcon?: ReactNode
  /** Its page is the one showing: More itself is selected. */
  active?: boolean
  /** The page showing right now (tinted in the menu). */
  current?: boolean
  /** A count of what is waiting, in a quiet pill at the end of the row. */
  badge?: number
}

/** The top row: the profile avatar and name on the left (opens Account), the Settings gear on the right. */
export type MoreHeader = { avatar: ReactNode; name: string; onProfile: () => void; onSettings: () => void }

const ROW = 40
const HEAD = 52
const PAD = 4
const MAX_H = 660

/**
 * The navigation bar's More menu. It opens in the space just above the pill, which stays as it is: a frosted card that grows from the
 * More button's corner, its rows coming in from the top down.
 */
export function MoreMenu({ open, onClose, items, header, onSelect }: { open: boolean; onClose: () => void; items: MoreItem[]; header: MoreHeader; onSelect: (id: string) => void }) {
  const lastTab = items.reduce((n, m, i) => (isTabItem(m.id) ? i : n), -1)
  const rowCount = items.length + 2 + (lastTab >= 0 ? 1 : 0)
  const sizer = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  // The pill's own size (the menu grows from it) and the list's natural height (where it grows to).
  const [size, setSize] = useState({ ph: 56, mh: 320 })
  useLayoutEffect(() => {
    if (!sizer.current || !list.current) return
    setSize({ ph: sizer.current.offsetHeight, mh: list.current.offsetHeight })
  }, [open, items.length])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  const row = "flex w-full items-center gap-3 rounded-full px-4 text-left text-[14px] font-medium leading-6 text-m-on-surface active:bg-black/10"
  const t = { duration: open ? 0.38 : 0.28, ease: MORPH_EASE }
  return (
    <>
      {open && <button aria-label="Close menu" tabIndex={-1} onClick={onClose} className="fixed inset-0 -z-10 cursor-default" />}
      <div ref={sizer} aria-hidden className="pointer-events-none invisible absolute inset-0" />
      {/* The pill's background grows upward, anchored to the bottom, into the menu. Its fill never fades (backdrop blur would refract nothing until the end): it swaps with the pill's own glass by visibility. */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ height: open ? size.mh : size.ph }}
        transition={t}
        className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden rounded-[28px] backdrop-blur-[22px] backdrop-saturate-[1.6]"
        style={{ backgroundColor: "var(--m-tab-glass)", boxShadow: "inset 0 0 0 1px var(--m-tab-edge-in), 0 0 0 0.5px var(--m-tab-edge-out), 0 4px 20px var(--m-tab-lift)", visibility: open ? "visible" : "hidden", transition: `visibility 0s linear ${open ? 0 : 0.28}s` }}
      >
        {/* The menu needs more body than the bar: a wash over the glass, fading in as it grows. */}
        <motion.div initial={false} animate={{ opacity: open ? 1 : 0 }} transition={t} className="absolute inset-0" style={{ backgroundColor: "color-mix(in srgb, var(--m-high) 55%, transparent)" }} />
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 z-20 overflow-hidden rounded-[28px]" style={{ pointerEvents: open ? "auto" : "none", visibility: open ? "visible" : "hidden", transition: `visibility 0s linear ${open ? 0 : 0.2}s` }}>
        <ul
          ref={list}
          role="menu"
          aria-label="More"
          className="relative flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ maxHeight: MAX_H, padding: PAD }}
        >
          <motion.li initial={false} {...morphRow(open, 0, rowCount)} role="none" className="flex shrink-0 items-center" style={{ height: HEAD }}>
            <button
              onClick={() => {
                onClose()
                header.onProfile()
              }}
              aria-haspopup="dialog"
              aria-label="Profile"
              tabIndex={open ? 0 : -1}
              className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-full pl-2 text-left active:bg-black/10"
            >
              {header.avatar}
              <span className="text-m-on-surface truncate text-[14px] font-medium leading-6">{header.name}</span>
            </button>
            <button
              aria-label="Settings"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                onClose()
                header.onSettings()
              }}
              className="text-m-on-surface flex size-10 shrink-0 items-center justify-center rounded-full active:bg-black/10"
            >
              <IconSettings size={20} stroke={1.75} />
            </button>
          </motion.li>
          <motion.li initial={false} {...morphLine(open, 0, rowCount)} role="separator" className="mb-1 h-px shrink-0" style={{ backgroundColor: "var(--m-outline-variant)" }} />
          {items.map((m, i) => {
            const at = i + 1 + (i > lastTab && lastTab >= 0 ? 1 : 0)
            return (
            <Fragment key={m.id}>
            <motion.li initial={false} {...morphRow(open, at, rowCount)} role="none" className="shrink-0">
              <button
                role="menuitem"
                tabIndex={open ? 0 : -1}
                aria-current={m.current ? "page" : undefined}
                onClick={() => {
                  onClose()
                  onSelect(m.id)
                }}
                className={cn(row, (m.current || m.active) && "bg-[#74748014]")}
                style={{ height: ROW }}
              >
                <span className="relative flex size-5 shrink-0 items-center justify-center">{m.icon}</span>
                {m.label}
                {!!m.badge && <span aria-label={`${m.badge} unread`} className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#8f55e5] px-1.5 text-[12px] font-[590] leading-none tabular-nums text-white">{m.badge}</span>}
              </button>
            </motion.li>
            {i === lastTab && <motion.li initial={false} {...morphLine(open, at + 1, rowCount)} role="separator" className="mx-4 my-[6px] h-px shrink-0" style={{ backgroundColor: "var(--m-outline-variant)" }} />}
            </Fragment>
            )
          })}
          {/* The PIN panel: the clock-in PIN and the benefits link, in its own container at the foot of the menu. */}
          <motion.li initial={false} {...morphRow(open, rowCount - 1, rowCount)} role="none" className="mt-3 shrink-0">
            <div className="flex flex-col overflow-hidden rounded-[20px]" style={{ backgroundColor: "var(--m-container)" }}>
              <div className="flex h-10 items-center justify-between px-4 text-[14px] font-medium leading-6 text-m-on-surface">
                <span>PIN</span>
                <span className="font-bold tabular-nums">3205</span>
              </div>
              <div aria-hidden className="mx-4 h-px" style={{ backgroundColor: "var(--m-outline-variant)" }} />
              <button tabIndex={open ? 0 : -1} className="flex h-10 items-center px-4 text-left text-[14px] font-medium leading-6 active:bg-black/10" style={{ color: "#8f55e5" }}>
                Health insurance
              </button>
            </div>
          </motion.li>
        </ul>
      </div>
    </>
  )
}

function CustomizeRow({ item }: { item: MoreItem }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={item.id} dragListener={false} dragControls={controls} className="bg-m-container relative flex h-14 select-none items-center gap-4 px-4" whileDrag={{ scale: 1.02, borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 5 }} transition={{ type: "spring", stiffness: 500, damping: 40 }}>
      <span className="text-m-on-surface flex size-6 shrink-0 items-center justify-center">{item.icon}</span>
      <span className="text-m-on-surface flex-1 truncate text-[16px]">{item.label}</span>
      <button aria-label={`Reorder ${item.label}`} onPointerDown={(e) => controls.start(e)} className="text-m-variant -mr-2 flex size-12 shrink-0 cursor-grab touch-none items-center justify-center rounded-full active:cursor-grabbing">
        <IconGripVertical size={22} stroke={1.75} />
      </button>
    </Reorder.Item>
  )
}

/** Where the More menu's list is customized: a full-height bottom sheet, rows dragged by their handles into the menu's order. */
export function CustomizeSheet({ items, onClose }: { items: MoreItem[]; onClose: () => void }) {
  const setOrder = useMoreMenuStore((s) => s.setOrder)
  const reset = useMoreMenuStore((s) => s.reset)
  const tabs = items.filter((i) => isTabItem(i.id))
  const rest = items.filter((i) => !isTabItem(i.id))
  const home = tabs.find((i) => i.id === "tab:home")
  const movable = tabs.filter((i) => i.id !== "tab:home")
  return (
    <div className="absolute inset-0 z-[45]">
      <motion.button type="button" aria-label="Close" tabIndex={-1} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} onClick={onClose} className="absolute inset-0 bg-black/32" />
      <motion.div role="dialog" aria-label="Customize" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }} className="bg-m-surface absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px]" style={{ top: "calc(var(--safe-top) + 12px)" }}>
        <div className="flex h-16 shrink-0 items-center px-2">
          <AIconButton label="Close" onClick={onClose}>
            <IconChevronDown size={24} stroke={1.75} />
          </AIconButton>
          <h2 className="text-m-on-surface ml-2 text-[20px] font-medium leading-7">Customize</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-m-variant px-2 pb-3 text-[14px] leading-5">Everything but Home can be dragged: the tabs set the order of the navigation bar, the rest the order of the menu.</p>
          <div className="bg-m-container flex flex-col overflow-hidden rounded-[16px]">
            {/* The tabs, in the order the main navigation shows them: Home stays first, the others are dragged. */}
            {home && (
              <div className="flex h-14 items-center gap-4 px-4">
                <span className="text-m-on-surface flex size-6 shrink-0 items-center justify-center">{home.icon}</span>
                <span className="text-m-on-surface flex-1 truncate text-[16px]">{home.label}</span>
              </div>
            )}
            <Reorder.Group axis="y" values={movable.map((i) => i.id)} onReorder={(ids) => setOrder([...ids, ...rest.map((i) => i.id)])} className="flex flex-col">
              {movable.map((i) => (
                <CustomizeRow key={i.id} item={i} />
              ))}
            </Reorder.Group>
            <div aria-hidden className="bg-m-divider mx-4 h-px" />
            <Reorder.Group axis="y" values={rest.map((i) => i.id)} onReorder={(ids) => setOrder([...movable.map((i) => i.id), ...ids])} className="flex flex-col">
              {rest.map((i) => (
                <CustomizeRow key={i.id} item={i} />
              ))}
            </Reorder.Group>
          </div>
          <button onClick={reset} className="text-m-primary mx-auto mt-5 block h-10 rounded-full px-4 text-[14px] font-medium tracking-[0.1px] active:bg-black/10">
            Reset order
          </button>
        </div>
      </motion.div>
    </div>
  )
}


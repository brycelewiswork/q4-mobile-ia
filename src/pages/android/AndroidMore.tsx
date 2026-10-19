import { useEffect, useState, type ReactNode } from "react"
import { Reorder, motion, useDragControls } from "motion/react"
import { IconCheck, IconChevronDown, IconGripVertical, IconSelector } from "@tabler/icons-react"
import { CustomizeIcon } from "@/components/icons/CustomizeIcon"
import { AIconButton } from "@/pages/android/m3"
import { useMoreMenuStore } from "@/store/useMoreMenuStore"
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
  dot?: boolean
}

/** The top row: the business account on the left (not the location), Customize on the right. */
export type MoreHeader = { account: string; accounts: string[]; onAccount: (name: string) => void; onCustomize: () => void }

const ROW = 44
const HEAD = 56
const RULE = 9
const PAD = 8
export const MORE_W = 296
/** The navigation pill's height: 48 of tab plus 4 of air each side. */
export const PILL_H = 56
const MAX_H = 600

export const moreMenuHeight = (items: number) => Math.min(MAX_H, items * ROW + HEAD + RULE + PAD * 2)

/**
 * The navigation bar's More menu. At rest it is the tab cluster's own footprint, invisible; opened, it grows from
 * there into a menu card (the surface morphs, the tab icons fade out, the rows fade in).
 */
export function MoreMenu({ open, onClose, clusterW, clusterH = PILL_H, items, header, onSelect }: { open: boolean; onClose: () => void; /** The bar pill's size, where the morph starts. */ clusterW: number; clusterH?: number; items: MoreItem[]; header: MoreHeader; onSelect: (id: string) => void }) {
  const [picking, setPicking] = useState(false)
  const h = moreMenuHeight(items.length)
  useEffect(() => {
    if (!open) setPicking(false)
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  const row = "flex w-full items-center gap-3 rounded-full px-3 text-left text-[15px] font-medium tracking-[0.1px] text-m-on-surface active:bg-black/10"
  return (
    <>
      {open && <button aria-label="Close menu" tabIndex={-1} onClick={onClose} className="fixed inset-0 -z-10 cursor-default" />}
      <motion.div
        initial={false}
        animate={{ width: open ? MORE_W : clusterW, height: open ? h : clusterH }}
        transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
        // The bar's pill, and what it grows into: frosted, with a hairline edge and a soft lift.
        className="absolute bottom-0 left-0 overflow-hidden rounded-[28px] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.14),0_4px_18px_rgba(0,0,0,0.14)] backdrop-blur-[22px] backdrop-saturate-[1.6]"
        style={{ backgroundColor: "color-mix(in srgb, var(--m-high) 62%, transparent)", pointerEvents: open ? "auto" : "none" }}
      >
        {/* Open, the menu needs more body than the bar: a wash that comes in with the morph. */}
        <motion.div aria-hidden initial={false} animate={{ opacity: open ? 1 : 0 }} transition={{ duration: 0.25 }} className="pointer-events-none absolute inset-0" style={{ backgroundColor: "color-mix(in srgb, var(--m-high) 55%, transparent)" }} />
        <motion.ul
          role="menu"
          aria-label="More"
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={open ? { duration: 0.2, delay: 0.12 } : { duration: 0.1 }}
          className="absolute bottom-0 left-0 flex flex-col overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ width: MORE_W, height: h, padding: PAD }}
        >
          <li role="none" className="flex shrink-0 items-center justify-between" style={{ height: HEAD }}>
            <button onClick={() => setPicking((p) => !p)} aria-haspopup="listbox" aria-expanded={picking} tabIndex={open ? 0 : -1} className="flex h-12 min-w-0 items-center gap-2 rounded-full pl-2 pr-2 active:bg-black/10">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#8f55e5] text-[14px] font-semibold text-white">
                {header.account.charAt(0)}
              </span>
              <span className="text-m-on-surface truncate text-[16px] font-medium">{header.account}</span>
              <IconSelector size={18} stroke={1.75} className="text-m-variant shrink-0" />
            </button>
            <AIconButton
              label="Customize"
              onClick={() => {
                onClose()
                header.onCustomize()
              }}
            >
              <CustomizeIcon size={24} />
            </AIconButton>
          </li>
          <li role="separator" className="bg-m-divider mx-3 my-1 h-px shrink-0" />
          {picking
            ? header.accounts.map((a) => (
                <li key={a} role="none" className="shrink-0">
                  <button
                    role="option"
                    aria-selected={a === header.account}
                    onClick={() => {
                      header.onAccount(a)
                      setPicking(false)
                    }}
                    className={row}
                    style={{ height: ROW }}
                  >
                    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#8f55e5]/15 text-[12px] font-semibold text-[#8f55e5]">
                      {a.charAt(0)}
                    </span>
                    <span className="flex-1 truncate">{a}</span>
                    {a === header.account && <IconCheck size={20} stroke={2} />}
                  </button>
                </li>
              ))
            : items.map((m) => (
                <li key={m.id} role="none" className="shrink-0">
                  <button
                    role="menuitem"
                    tabIndex={open ? 0 : -1}
                    aria-current={m.current ? "page" : undefined}
                    onClick={() => {
                      onClose()
                      onSelect(m.id)
                    }}
                    className={cn(row, (m.current || m.active) && "bg-black/[0.08]")}
                    style={{ height: ROW }}
                  >
                    <span className="relative flex size-6 shrink-0 items-center justify-center">
                      {m.icon}
                      {m.dot && <span aria-hidden className="bg-[var(--m-badge)] absolute -right-[2px] -top-[1px] size-[9px] rounded-full" />}
                    </span>
                    {m.label}
                  </button>
                </li>
              ))}
        </motion.ul>
      </motion.div>
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
  const byId = new Map(items.map((i) => [i.id, i]))
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
          <p className="text-m-variant px-2 pb-3 text-[14px] leading-5">Drag to change the order of the menu.</p>
          <Reorder.Group axis="y" values={items.map((i) => i.id)} onReorder={setOrder} className="bg-m-container flex flex-col overflow-hidden rounded-[16px]">
            {items.map((i) => (
              <CustomizeRow key={i.id} item={byId.get(i.id)!} />
            ))}
          </Reorder.Group>
          <button onClick={reset} className="text-m-primary mx-auto mt-5 block h-10 rounded-full px-4 text-[14px] font-medium tracking-[0.1px] active:bg-black/10">
            Reset order
          </button>
        </div>
      </motion.div>
    </div>
  )
}


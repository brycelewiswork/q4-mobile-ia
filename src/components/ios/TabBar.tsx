import type { ReactNode } from "react"
import { motion } from "motion/react"
import { IconHomeFilled } from "@tabler/icons-react"
import { LiquidGlass } from "@/components/ui/liquid-glass"
import { SPRING_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"

const BRAND = "#8f55e5"
const LABEL_VIBRANT = "#141414"

const TABS = [
  { id: "home", label: "Home", icon: "/phone/tab-home-mask.svg", withLabel: true },
  { id: "money", label: "Money", icon: "/phone/tab-money.svg", fill: "/phone/tab-money-fill.svg" },
  { id: "shifts", label: "Shifts", icon: "/phone/tab-shifts.svg", fill: "/phone/tab-shifts-fill.svg" },
  { id: "time", label: "Time", icon: "/phone/tab-time.svg", fill: "/phone/tab-time-fill.svg" },
  { id: "chat", label: "Chat", icon: "/phone/tab-chat.svg", fill: "/phone/tab-chat-fill.svg" },
] as const
export type TabId = (typeof TABS)[number]["id"]

function Mask({ src, color, w, h }: { src: string; color: string; w: number; h: number }) {
  return (
    <span
      aria-hidden
      className="block shrink-0 transition-colors duration-200"
      style={{
        width: w,
        height: h,
        backgroundColor: color,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  )
}

/** Figma tab-bar `BG`: the glass sits 4px OUTSIDE the content box on every side. */
const GlassBacking = () => <LiquidGlass mode="small" radius={999} className="absolute -inset-1" />

/**
 * Mirrors SwiftUI's `tabViewBottomAccessoryPlacement`: `expanded` floats above
 * the tab bar, `inline` sits inside the minimized tab bar.
 */
type AccessoryPlacement = "expanded" | "inline"

/** The accessory's inner row — shared by the glass bar and the half sheet's collapsed state. */
export function AccessoryContent({
  title,
  subtitle,
  inline,
  active,
  onOpen,
}: {
  title: string
  subtitle: string
  inline?: boolean
  /** Clocked in: shows the green active dot on the icon. */
  active?: boolean
  onOpen?: () => void
}) {
  return (
    <>
      {/* Icon + text open the half sheet; the trailing actions stay their own buttons. */}
      <button
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`${title}. ${subtitle}`}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="relative size-5 shrink-0">
          <img src="/phone/clock-stroke.svg" alt="" className="size-5" />
          {active && (
            <span
              aria-hidden
              data-active-dot
              className="absolute -right-[3px] -top-[3px] size-[9px] rounded-full bg-[#34c759] ring-[1.5px] ring-white"
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col tracking-[-0.43px]">
          <span className="truncate text-[15px] font-[590] leading-[17px] text-black">{title}</span>
          {!inline && <span className="truncate text-[13px] leading-[15px] text-[#7f7f7f]">{subtitle}</span>}
        </span>
      </button>
      {!inline && (
        <div className="flex items-center gap-4">
          <button aria-label="Clock out" className="active:opacity-60">
            <img src="/phone/clock-solid.svg" alt="" className="size-5" />
          </button>
          <button aria-label="Start meal break" className="active:opacity-60">
            <img src="/phone/meal.svg" alt="" className="size-6 p-[2px]" />
          </button>
        </div>
      )}
    </>
  )
}

export function BottomAccessory({
  placement,
  title,
  subtitle,
  active,
  onOpen,
  className,
}: {
  placement: AccessoryPlacement
  title: string
  subtitle: string
  active?: boolean
  onOpen?: () => void
  className?: string
}) {
  const inline = placement === "inline"
  return (
    <LiquidGlass
      mode="small"
      radius={999}
      className={cn(
        "flex h-12 items-center gap-2 pl-3 pr-4",
        inline && "h-[54px] min-w-0 flex-1",
        className,
      )}
    >
      <AccessoryContent title={title} subtitle={subtitle} inline={inline} active={active} onOpen={onOpen} />
    </LiquidGlass>
  )
}

export function TabBar({
  tabs,
  tab,
  onTab,
  minimized,
  onExpand,
  inlineAccessory,
  onAssistant,
}: {
  /** Which tabs this kind of user gets, in order. */
  tabs: readonly TabId[]
  tab: TabId
  onTab: (t: TabId) => void
  minimized: boolean
  onExpand: () => void
  inlineAccessory: ReactNode
  onAssistant?: () => void
}) {
  const shown = tabs.map((id) => TABS.find((t) => t.id === id)!)
  const current = TABS.find((t) => t.id === tab)!
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-center gap-4 px-[25px] pt-4"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      {minimized ? (
        <>
          <div className="relative size-[54px] shrink-0">
            <GlassBacking />
            <button
              onClick={onExpand}
              aria-label={`${current.label} tab, expand tab bar`}
              className="relative flex size-full items-center justify-center"
            >
              {"withLabel" in current ? (
                <IconHomeFilled size={28} color={BRAND} />
              ) : (
                <Mask src={current.fill} color={BRAND} w={28} h={28} />
              )}
            </button>
          </div>
          {inlineAccessory}
        </>
      ) : (
        <div className="relative flex items-center px-[2px]">
          <GlassBacking />
          {shown.map((t, i) => {
            const active = tab === t.id
            const color = active ? BRAND : LABEL_VIBRANT
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                aria-label={t.label}
                aria-current={active}
                className={cn("relative flex h-[54px] w-[72px] flex-col items-center justify-center pb-[7px] pt-[6px]", i < shown.length - 1 && "-mr-2")}
              >
                {active && (
                  <motion.span
                    layoutId="tab-selection"
                    transition={SPRING_FAST.snappy}
                    className="absolute -inset-x-[2px] inset-y-0 rounded-full bg-[#787880]/20"
                  />
                )}
                <span className="relative flex flex-col items-center">
                  {"withLabel" in t ? (
                    <Mask src={t.icon} color={color} w={72} h={41} />
                  ) : (
                    <>
                      <Mask src={active ? t.fill : t.icon} color={color} w={28} h={28} />
                      <span
                        className="text-[10px] font-semibold leading-[normal] tracking-[0.1px] transition-colors duration-200"
                        style={{ color }}
                      >
                        {t.label}
                      </span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="relative flex size-[54px] shrink-0 items-center justify-center">
        <GlassBacking />
        <button onClick={onAssistant} aria-haspopup="dialog" className="relative flex size-full items-center justify-center" aria-label="Assistant">
          <img src="/phone/tab-assistant.svg" alt="" className="size-7" />
        </button>
      </div>
    </div>
  )
}


import { IconDeviceMobile, IconSitemap } from "@tabler/icons-react"
import { SegmentedControl } from "@/components/ios/SegmentedControl"
import { useViewStore } from "@/store/useViewStore"

/** Top-left of the page, in both views: the interactive prototype, or the sitemap of it. */
export function ViewSwitch() {
  const view = useViewStore((s) => s.view)
  const setView = useViewStore((s) => s.setView)
  return (
    <div className="fixed left-4 top-3 z-[80]">
      <SegmentedControl
        className="w-[212px] shadow-[0_2px_10px_rgba(20,20,40,0.08)]"
        value={view}
        onChange={setView}
        options={[
          { id: "prototype", label: <span className="flex items-center gap-[6px]"><IconDeviceMobile size={16} stroke={1.75} />Prototype</span> },
          { id: "sitemap", label: <span className="flex items-center gap-[6px]"><IconSitemap size={16} stroke={1.75} />Sitemap</span> },
        ]}
      />
    </div>
  )
}

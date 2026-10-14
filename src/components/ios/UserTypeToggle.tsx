import { SegmentedControl } from "@/components/ios/SegmentedControl"
import { LOCATIONS } from "@/data/locations"
import { useLocationStore } from "@/store/useLocationStore"
import { USER_TYPES, canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { FULL_ENABLED, useViewStore } from "@/store/useViewStore"

/** The prototype's page controls above the device: who is looking and which cut of the design. (Device options sit just above the frame: see DeviceControls. The notes switch is under it: see PrototypeFooter.) */
export function UserTypeToggle() {
  const detail = useViewStore((s) => s.detail)
  const setDetail = useViewStore((s) => s.setDetail)
  const platform = useViewStore((s) => s.platform)
  const setPlatform = useViewStore((s) => s.setPlatform)
  const type = useUserTypeStore((s) => s.type)
  const setType = useUserTypeStore((s) => s.setType)
  const setLocation = useLocationStore((s) => s.setLocation)
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 text-[13px] text-[#5a5666] dark:text-neutral-400">
      <div className="flex items-center gap-3">
      <SegmentedControl
        className="w-[330px] max-w-full"
        value={type}
        onChange={(t) => {
          setType(t)
          // A single-location owner/manager is pinned to their location.
          if (!canSwitchLocation(t)) setLocation(LOCATIONS[0].id)
        }}
        options={USER_TYPES}
      />
      </div>
      {/* Android only exists as the structure cut, so its detail switch is locked to Structure. */}
      {FULL_ENABLED && (
      <div className="flex items-center gap-3">
        <SegmentedControl
          className="w-[190px] max-w-full"
          value={platform === "android" ? "structure" : detail}
          onChange={(d) => {
            setDetail(d)
            if (platform === "android") setPlatform("ios")
          }}
          options={[
            { id: "structure", label: "Structure" },
            { id: "full", label: "Full" },
          ]}
        />
      </div>
      )}
    </div>
  )
}

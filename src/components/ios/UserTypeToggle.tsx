import { SegmentedControl } from "@/components/ios/SegmentedControl"
import { LOCATIONS } from "@/data/locations"
import { useLocationStore } from "@/store/useLocationStore"
import { USER_TYPES, canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"

/** The prototype's user-type switch. It lives on the web page above the phone, not in the app. */
export function UserTypeToggle() {
  const type = useUserTypeStore((s) => s.type)
  const setType = useUserTypeStore((s) => s.setType)
  const setLocation = useLocationStore((s) => s.setLocation)
  return (
    <div className="flex items-center gap-3 text-[13px] text-[#5a5666]">
      <span className="font-[510]">Viewing as</span>
      <SegmentedControl
        className="w-[420px]"
        value={type}
        onChange={(t) => {
          setType(t)
          // A single-location owner/manager is pinned to their location.
          if (!canSwitchLocation(t)) setLocation(LOCATIONS[0].id)
        }}
        options={USER_TYPES}
      />
    </div>
  )
}

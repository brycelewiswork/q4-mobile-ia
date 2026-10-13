import { Switch } from "@/components/ios/list"
import { SegmentedControl } from "@/components/ios/SegmentedControl"
import { LOCATIONS } from "@/data/locations"
import { useLocationStore } from "@/store/useLocationStore"
import { USER_TYPES, canSwitchLocation, useUserTypeStore } from "@/store/useUserTypeStore"
import { useViewStore } from "@/store/useViewStore"

/** The prototype's user-type switch. It lives on the web page above the phone, not in the app. */
export function UserTypeToggle() {
  const detail = useViewStore((s) => s.detail)
  const platform = useViewStore((s) => s.platform)
  const setDetail = useViewStore((s) => s.setDetail)
  const setPlatform = useViewStore((s) => s.setPlatform)
  const notes = useViewStore((s) => s.notes)
  const setNotes = useViewStore((s) => s.setNotes)
  const type = useUserTypeStore((s) => s.type)
  const setType = useUserTypeStore((s) => s.setType)
  const setLocation = useLocationStore((s) => s.setLocation)
  return (
    <div className="flex items-center gap-6 text-[13px] text-[#5a5666] dark:text-neutral-400">
      <div className="flex items-center gap-3">
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
      {/* Android only exists as the structure cut, so its detail switch is locked to Structure. */}
      <div className="flex items-center gap-3">
        <SegmentedControl
          className="w-[190px]"
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
      <div className="flex items-center gap-3">
        <SegmentedControl
          className="w-[150px]"
          value={platform}
          onChange={setPlatform}
          options={[
            { id: "ios", label: "iOS" },
            { id: "android", label: "Android" },
          ]}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="font-[510]">Notes</span>
        <Switch checked={notes} onChange={setNotes} label="Notes" />
      </div>
    </div>
  )
}

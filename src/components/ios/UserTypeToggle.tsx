import { IconDeviceMobile, IconDeviceTablet, IconRectangle, IconRectangleVertical } from "@tabler/icons-react"
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
  const device = useViewStore((s) => s.device)
  const setDevice = useViewStore((s) => s.setDevice)
  const orientation = useViewStore((s) => s.orientation)
  const setOrientation = useViewStore((s) => s.setOrientation)
  const notes = useViewStore((s) => s.notes)
  const setNotes = useViewStore((s) => s.setNotes)
  const type = useUserTypeStore((s) => s.type)
  const setType = useUserTypeStore((s) => s.setType)
  const setLocation = useLocationStore((s) => s.setLocation)
  return (
    <div className="flex items-center gap-5 text-[13px] text-[#5a5666] dark:text-neutral-400">
      <div className="flex items-center gap-3">
      <SegmentedControl
        className="w-[400px]"
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
        <SegmentedControl
          className="w-[84px]"
          value={device}
          onChange={setDevice}
          options={[
            { id: "phone", label: <IconDeviceMobile size={18} stroke={1.75} />, ariaLabel: "Phone" },
            { id: "tablet", label: <IconDeviceTablet size={18} stroke={1.75} />, ariaLabel: "Tablet" },
          ]}
        />
        <SegmentedControl
          className="w-[84px]"
          value={orientation}
          onChange={setOrientation}
          options={[
            { id: "portrait", label: <IconRectangleVertical size={18} stroke={1.75} />, ariaLabel: "Portrait" },
            { id: "landscape", label: <IconRectangle size={18} stroke={1.75} />, ariaLabel: "Landscape" },
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

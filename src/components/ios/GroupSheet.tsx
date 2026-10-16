import { useState } from "react"
import { IconCheck } from "@tabler/icons-react"
import { Card, ListRow } from "@/components/ios/list"
import { Sheet } from "@/components/ios/Sheet"
import { COMPANIES, shortLocationName } from "@/data/locations"
import { useGroupsStore } from "@/store/useGroupsStore"
import { useLocationStore } from "@/store/useLocationStore"
import { useLocName, useStructure } from "@/store/useViewStore"

/**
 * Plus Group: a short two-step flow. Pick the locations to combine (two or more), then name the group. The new group
 * shows in the location switcher and is selected straight away.
 */
export function GroupSheet({ onClose }: { onClose: () => void }) {
  const wire = useStructure()
  const locName = useLocName()
  const add = useGroupsStore((s) => s.add)
  const setGroup = useLocationStore((s) => s.setGroup)
  const [step, setStep] = useState<"pick" | "name">("pick")
  const [picked, setPicked] = useState<string[]>([])
  const [name, setName] = useState("")
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const primary = "h-12 w-full rounded-full bg-[#8f55e5] text-[17px] font-[590] tracking-[-0.43px] text-white active:opacity-80 disabled:opacity-40"
  return (
    <Sheet
      title={step === "pick" ? "Combine Locations" : "Name Group"}
      onClose={onClose}
      onBack={step === "name" ? () => setStep("pick") : undefined}
      resetKey={step}
      footer={(dismiss) => (
        <div className="px-4 pt-3" style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)" }}>
          {step === "pick" ? (
            <button disabled={picked.length < 2} onClick={() => setStep("name")} className={primary}>
              {picked.length < 2 ? "Choose two or more" : `Next · ${picked.length} locations`}
            </button>
          ) : (
            <button
              disabled={!name.trim()}
              onClick={() => { setGroup(add(name, picked)); dismiss() }}
              className={`${primary} flex items-center justify-center gap-2`}
            >
              <IconCheck size={20} stroke={2.5} />
              Create group
            </button>
          )}
        </div>
      )}
    >
      <div className="flex flex-col gap-3 px-4 pb-28 pt-2 tracking-[-0.43px]">
        {step === "pick" ? (
          COMPANIES.map((c, ci) => (
            <section key={c.name}>
              <h2 className="px-4 pb-1 pt-2 text-[13px] font-[590] leading-[18px] text-[#7f7f7f]">{wire ? `Company ${ci + 1}` : c.name}</h2>
              <Card className="overflow-hidden">
                {c.locations.map((l, i) => {
                  const on = picked.includes(l.id)
                  return (
                    <ListRow
                      key={l.id}
                      first={i === 0}
                      onClick={() => toggle(l.id)}
                      title={wire ? locName(l) : shortLocationName(l)}
                      trailing={
                        <span className={`flex size-[22px] items-center justify-center rounded-full border-[1.5px] ${on ? "border-[#8f55e5] bg-[#8f55e5]" : "border-[#c7c7cc]"}`}>
                          {on && <IconCheck size={14} stroke={3} className="text-white" />}
                        </span>
                      }
                    />
                  )
                })}
              </Card>
            </section>
          ))
        ) : (
          <>
            <label className="flex h-12 items-center rounded-[14px] bg-white px-4">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { setGroup(add(name, picked)); onClose() } }}
                maxLength={40}
                placeholder="Group name"
                aria-label="Group name"
                className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[#8e8e93]"
              />
            </label>
            <p className="px-4 text-[13px] leading-[18px] text-[#7f7f7f]">
              {picked.map((id) => COMPANIES.flatMap((c) => c.locations).find((l) => l.id === id)).map((l) => (l ? (wire ? locName(l) : shortLocationName(l)) : "")).join(", ")}
            </p>
          </>
        )}
      </div>
    </Sheet>
  )
}

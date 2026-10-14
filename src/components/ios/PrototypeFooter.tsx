import { NotesEditBar } from "@/components/NotesEditBar"
import { Switch } from "@/components/ios/list"
import { ThemeToggle } from "@/components/ios/ThemeToggle"
import { useViewStore } from "@/store/useViewStore"

/** Page controls under the phone: the notes switch, light/dark, and the notes editor. */
export function PrototypeFooter() {
  const notes = useViewStore((s) => s.notes)
  const setNotes = useViewStore((s) => s.setNotes)
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3 text-[13px] text-[#5a5666] dark:text-neutral-400">
        <span className="font-[510]">Notes</span>
        <Switch checked={notes} onChange={setNotes} label="Notes" />
      </div>
      <ThemeToggle />
      <NotesEditBar />
    </div>
  )
}

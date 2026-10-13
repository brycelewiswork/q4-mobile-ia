import { NotesEditBar } from "@/components/NotesEditBar"
import { ThemeToggle } from "@/components/ios/ThemeToggle"

/** Page controls under the phone: light/dark, and the notes editor. */
export function PrototypeFooter() {
  return (
    <div className="flex items-center gap-6">
      <ThemeToggle />
      <NotesEditBar />
    </div>
  )
}

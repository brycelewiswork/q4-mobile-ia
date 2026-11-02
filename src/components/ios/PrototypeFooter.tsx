import { ThemeToggle } from "@/components/ios/ThemeToggle"

/** Page controls under the phone: light/dark. (The notes switch and editor are off in this version.) */
export function PrototypeFooter() {
  return (
    <div className="flex items-center gap-6">
      <ThemeToggle />
    </div>
  )
}

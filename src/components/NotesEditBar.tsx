import { useState } from "react"
import { IconCheck, IconCopy, IconDeviceFloppy, IconPencil, IconPlus, IconRestore } from "@tabler/icons-react"
import { useNotesStore } from "@/store/useNotesStore"
import { useViewStore } from "@/store/useViewStore"
import { SEED_ANNOTATIONS } from "@/annotations"
import { cn } from "@/lib/utils"

const btn = "flex h-8 items-center gap-[6px] rounded-full px-3 text-[13px] font-[510] active:opacity-60 disabled:opacity-40"

/** The notes' authoring controls, beside the light/dark toggle under the phone. */
export function NotesEditBar() {
  // The shared link is for reading: the editor only shows on the dev server, or with ?edit in the address.
  const allowed = import.meta.env.DEV || new URLSearchParams(window.location.search).has("edit")
  const editing = useNotesStore((s) => s.editing)
  const picking = useNotesStore((s) => s.picking)
  const edited = useNotesStore((s) => s.edited)
  const setEditing = useNotesStore((s) => s.setEditing)
  const setPicking = useNotesStore((s) => s.setPicking)
  const reset = useNotesStore((s) => s.reset)
  const setNotes = useViewStore((s) => s.setNotes)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState<"idle" | "saving" | "done" | "failed">("idle")
  // Writing to the file only works against the dev server; a deployed site falls back to Copy JSON.
  const canSave = import.meta.env.DEV

  const save = async () => {
    setSaved("saving")
    try {
      const r = await fetch("/__notes/save", { method: "POST", body: JSON.stringify(edited ?? SEED_ANNOTATIONS) })
      if (!r.ok) throw new Error(await r.text())
      setSaved("done")
      // The file now holds your notes; drop the browser's copy once the app has reloaded it.
      setTimeout(reset, 900)
    } catch {
      setSaved("failed")
    }
    setTimeout(() => setSaved("idle"), 2200)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(edited ?? SEED_ANNOTATIONS, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  if (!allowed) return null
  return (
    <div className="flex items-center gap-2 text-[#2c2935] dark:text-neutral-100">
      <button
        onClick={() => {
          setNotes(true)
          setEditing(!editing)
        }}
        aria-pressed={editing}
        className={cn(btn, editing ? "bg-[#8f55e5] text-white" : "bg-[#767680]/[0.12] dark:bg-white/10")}
      >
        {editing ? <IconCheck size={16} stroke={2.25} /> : <IconPencil size={16} stroke={2} />}
        {editing ? "Done" : "Edit notes"}
      </button>
      {editing && (
        <>
          <button onClick={() => setPicking(!picking)} aria-pressed={picking} className={cn(btn, picking ? "bg-[#8f55e5] text-white" : "bg-[#767680]/[0.12] dark:bg-white/10")}>
            <IconPlus size={16} stroke={2} />
            {picking ? "Click the phone…" : "Add note"}
          </button>
          {canSave ? (
            <button onClick={save} disabled={!edited || saved === "saving"} className={cn(btn, saved === "failed" ? "bg-[#ff3b30] text-white" : "bg-[#34c759] text-white")}>
              {saved === "done" ? <IconCheck size={16} stroke={2} /> : <IconDeviceFloppy size={16} stroke={2} />}
              {saved === "done" ? "Saved" : saved === "failed" ? "Couldn’t save" : "Save"}
            </button>
          ) : (
            <button onClick={copy} className={cn(btn, "bg-[#767680]/[0.12] dark:bg-white/10")}>
              {copied ? <IconCheck size={16} stroke={2} /> : <IconCopy size={16} stroke={2} />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
          )}
          <button onClick={reset} disabled={!edited} className={cn(btn, "bg-[#767680]/[0.12] dark:bg-white/10")} title="Discard edits and go back to the saved notes">
            <IconRestore size={16} stroke={2} />
            Reset
          </button>
        </>
      )}
    </div>
  )
}

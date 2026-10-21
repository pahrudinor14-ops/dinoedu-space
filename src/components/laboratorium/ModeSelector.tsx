import { BookOpen, Shapes } from "lucide-react"

export type LearningMode = "learn" | "lab"

export default function ModeSelector({ mode, onChange }: { mode: LearningMode; onChange: (mode: LearningMode) => void }) {
  return (
    <div role="group" aria-label="Pilih mode belajar" className="inline-flex shrink-0 rounded-full border border-border/70 bg-muted/70 p-1">
      <button type="button" onClick={() => onChange("learn")} aria-pressed={mode === "learn"} className={"inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm " + (mode === "learn" ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : "text-muted-foreground hover:bg-background/80 hover:text-foreground")}>
        <BookOpen className="h-4 w-4" />Mode Belajar
      </button>
      <button type="button" onClick={() => onChange("lab")} aria-pressed={mode === "lab"} className={"inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm " + (mode === "lab" ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700" : "text-muted-foreground hover:bg-background/80 hover:text-foreground")}>
        <Shapes className="h-4 w-4" />Laboratorium
      </button>
    </div>
  )
}

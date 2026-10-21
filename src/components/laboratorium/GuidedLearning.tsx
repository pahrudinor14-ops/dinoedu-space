import { BookOpen } from "lucide-react"

export type GuidedStep = { title: string; description: string }

export default function GuidedLearning({ steps, step, onStepChange }: { steps: GuidedStep[]; step: number; onStepChange: (step: number) => void }) {
  const current = steps[step]

  return (
    <section aria-label="Pembelajaran terpandu" className="rounded-2xl bg-emerald-500/5 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><BookOpen className="h-5 w-5" /></div>
        <div><h3 className="font-bold">Pembelajaran terpandu</h3><p className="text-xs text-muted-foreground">Langkah {step + 1} dari {steps.length}</p></div>
      </div>
      <div className="mb-5 space-y-2"><h4 className="font-semibold">{current.title}</h4><p className="text-sm leading-6 text-muted-foreground">{current.description}</p></div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: String(((step + 1) / steps.length) * 100) + "%" }} /></div>
      <div className="flex justify-between gap-3">
        <button type="button" disabled={step === 0} onClick={() => onStepChange(step - 1)} className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
        <button type="button" disabled={step === steps.length - 1} onClick={() => onStepChange(step + 1)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
      </div>
    </section>
  )
}

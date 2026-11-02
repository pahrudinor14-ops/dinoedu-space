import { ArrowLeft, ArrowRight, BookOpen, Check } from "lucide-react"

export type GuidedStep = { title: string; description: string }

const learningPhases = [
  "Mulai dari masalah",
  "Bangun secara konkret",
  "Gambar dan jelaskan",
  "Hubungkan ke konsep",
  "Terapkan dan periksa",
]

export default function GuidedLearning({ steps, step, onStepChange }: { steps: GuidedStep[]; step: number; onStepChange: (step: number) => void }) {
  const currentStep = Math.max(0, Math.min(step, steps.length - 1))
  const current = steps[currentStep]
  const phase = learningPhases[Math.min(currentStep, learningPhases.length - 1)]
  if (!current) return null

  return (
    <section aria-label="Panduan belajar bertahap" className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-6">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Panduan Mode Belajar
          </p>
          <h3 className="mt-1 font-bold">{phase}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Langkah {currentStep + 1} dari {steps.length} · Masalah → konkret → visual → konsep → penerapan
          </p>
        </div>
      </header>
      <nav aria-label="Tahapan belajar" className="my-5 grid grid-cols-5 gap-2">
        {steps.map((item, index) => {
          const isCurrent = index === currentStep
          const isComplete = index < currentStep
          return (
            <button
              key={`${index}-${item.title}`}
              type="button"
              onClick={() => onStepChange(index)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Langkah ${index + 1}: ${item.title}`}
              className="group flex min-w-0 flex-col items-center gap-1.5 text-center"
            >
              <span className={"flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition " + (isCurrent ? "bg-emerald-600 text-white ring-4 ring-emerald-500/15" : isComplete ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground group-hover:bg-emerald-500/10")}>
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className={"line-clamp-2 text-[10px] leading-4 sm:text-xs " + (isCurrent ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {learningPhases[Math.min(index, learningPhases.length - 1)]}
              </span>
            </button>
          )
        })}
      </nav>
      <div className="rounded-2xl border border-border/60 bg-background/80 p-4 sm:p-5">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          LANGKAH {currentStep + 1}
        </p>
        <h4 className="mt-1 font-bold">{current.title}</h4>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.description}</p>
        <p className="mt-3 rounded-xl bg-emerald-500/5 px-3 py-2 text-xs leading-5 text-emerald-800 dark:text-emerald-200">
          Coba kerjakan idemu di canvas kosong di bawah. Saat siap, minta AI memberi petunjuk.
        </p>
      </div>
      <div className="mt-4 flex justify-between gap-3">
        <button
          type="button"
          disabled={currentStep === 0}
          onClick={() => onStepChange(currentStep - 1)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={currentStep === steps.length - 1}
          onClick={() => onStepChange(currentStep + 1)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Berikutnya
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}

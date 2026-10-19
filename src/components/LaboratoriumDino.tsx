import { ArrowLeft, Box } from "lucide-react"

interface LaboratoriumDinoProps {
  onBack: () => void
}

/** A deliberately empty canvas reserved for future Laboratorium Dino content. */
export default function LaboratoriumDino({ onBack }: LaboratoriumDinoProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={onBack} className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-muted" aria-label="Kembali ke dashboard">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <h1 className="flex min-w-0 items-center justify-end gap-2 text-right text-sm font-semibold"><Box className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />Laboratorium Dino</h1>
        </div>
      </header>
      <main
        aria-label="Ruang konten Laboratorium Dino"
        className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-to-br from-emerald-50/70 via-background to-cyan-50/70 dark:from-emerald-950/10 dark:to-cyan-950/10"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <svg aria-hidden="true" viewBox="0 0 220 180" className="pointer-events-none absolute right-8 top-8 h-36 w-44 text-emerald-500/[0.08] sm:right-16 sm:top-12 sm:h-48 sm:w-56">
          <circle cx="160" cy="44" r="25" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="102" y="91" width="42" height="42" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M58 45 82 80H34z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </main>
    </div>
  )
}

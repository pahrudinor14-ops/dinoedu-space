import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Cuboid,
  Layers3,
  Shapes,
  Sparkles,
  Target,
} from "lucide-react"
import type { AdventureIslandId, IslandProgressStatus } from "./adventureProgress"

const statusLabel: Record<IslandProgressStatus, string> = {
  unexplored: "Belum dijelajahi",
  learning: "Sedang dipelajari",
  completed: "Selesai",
}

export default function DinoLabIslandHub({
  island,
  status,
  playerName,
  onStartAdventure,
  onOpenLaboratorium,
  onBackToMap,
}: {
  island: Extract<AdventureIslandId, "bangun-ruang" | "tantangan">
  status: IslandProgressStatus
  playerName: string
  onStartAdventure: () => void
  onOpenLaboratorium: () => void
  onBackToMap: () => void
}) {
  const challengeIsland = island === "tantangan"
  const title = challengeIsland ? "Pulau Tantangan" : "Pulau Bangun Ruang"

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-emerald-200/60 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-9">
        <div aria-hidden="true" className="absolute -right-12 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border-[32px] border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-24 right-[22%] h-56 w-56 rounded-full bg-cyan-200/10 blur-3xl" />
        <div className="relative z-10 grid items-center gap-7 md:grid-cols-[minmax(0,1fr)_250px]">
          <div className="max-w-2xl">
            <button type="button" onClick={onBackToMap} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />Kembali ke Peta
            </button>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><Sparkles className="h-4 w-4" aria-hidden="true" />DinoLab Adventure</span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">{statusLabel[status]}</span>
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-emerald-50/95 sm:text-base">
              {challengeIsland
                ? "Gabungkan pengamatan dan strategi untuk memecahkan misi matematika. Tantangan pertamamu dimulai dari bentuk 3D."
                : "Jelajahi bentuk tiga dimensi. Putar model, temukan bagian-bagiannya, lalu uji pemahamanmu lewat tantangan."}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-emerald-50"><BookOpenCheck className="h-4 w-4" aria-hidden="true" />Selamat datang, {playerName}.</p>
          </div>

          <div className="relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-[2.5rem] border border-white/20 bg-white/[0.08] shadow-inner backdrop-blur-sm" aria-hidden="true">
            <div className="absolute inset-4 rounded-[2rem] border border-dashed border-white/25" />
            <svg viewBox="0 0 220 220" className="relative h-[82%] w-[82%] drop-shadow-[0_18px_22px_rgba(4,36,37,.28)]">
              <path d="M110 28 177 66v83l-67 39-67-39V66z" fill="#f8fbf4" stroke="#c8f1df" strokeWidth="5" strokeLinejoin="round" />
              <path d="M110 28v78l67-40M110 106l-67-40M110 106v82" fill="none" stroke="#91d7bf" strokeWidth="5" strokeLinejoin="round" />
              <path d="m110 28 67 38-67 40-67-40z" fill="#dcf6e9" opacity=".84" />
              <path d="m43 66 67 40v82l-67-39z" fill="#bcebd9" opacity=".86" />
              <path d="m110 106 67-40v83l-67 41z" fill="#8bd1bd" opacity=".86" />
              <circle cx="110" cy="106" r="6" fill="#f1bd5e" />
            </svg>
            <span className="absolute bottom-3 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black tracking-[.16em] text-white">RUANG EKSPERIMEN</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="activity-path-heading" className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,.8fr)]">
        <div className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Target className="h-5 w-5" aria-hidden="true" /></span>
            <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Aktivitas pertama</p><h3 id="activity-path-heading" className="mt-1 text-xl font-black">Bangun &amp; Temukan</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Kenali kubus melalui eksplorasi langsung, bukan hanya membaca.</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Amati", description: "Putar model 3D", Icon: Cuboid },
              { label: "Eksplorasi", description: "Cari sisi dan rusuk", Icon: Shapes },
              { label: "Tantangan", description: "Pecahkan misi", Icon: Target },
              { label: "Evaluasi", description: "Buktikan pemahaman", Icon: BadgeCheck },
            ].map(({ label, description, Icon }, index) => (
              <div key={label} className="relative rounded-2xl bg-muted/45 p-4 sm:min-h-[132px]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-emerald-700 shadow-sm dark:text-emerald-300"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <p className="mt-3 text-sm font-black">{index + 1}. {label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={onStartAdventure} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-base font-black text-white shadow-md shadow-emerald-950/10 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto sm:min-w-[230px]">
            {challengeIsland ? "Mulai Petualangan Interaktif" : "Mulai Bangun & Temukan"}<ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <aside className="rounded-3xl border border-cyan-700/15 bg-gradient-to-br from-cyan-500/[0.08] to-emerald-500/[0.06] p-5 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600/10 text-cyan-800 dark:text-cyan-200">{challengeIsland ? <Target className="h-5 w-5" aria-hidden="true" /> : <Layers3 className="h-5 w-5" aria-hidden="true" />}</span>
          <h3 className="mt-4 text-lg font-black">{challengeIsland ? "Jalur Misi Interaktif" : "Laboratorium 3D"}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{challengeIsland ? "Gerakkan penjelajah dengan tombol atau sentuhan. Temui pemandu, dengarkan dialog, jelajahi model, dan jawab kuis di terminal." : "Buka studio eksplorasi untuk memilih kubus, balok, prisma, limas, dan bentuk ruang lainnya."}</p>
          {!challengeIsland && <button type="button" onClick={onOpenLaboratorium} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm font-bold transition hover:border-emerald-500/40 hover:bg-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            Buka Laboratorium 3D<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>}
        </aside>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm leading-6 text-muted-foreground">
        <Cuboid className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />Bangun ruang memiliki sisi, rusuk, dan titik sudut. Putar model untuk melihat bagaimana bagian-bagian itu bertemu.
      </div>
    </div>
  )
}

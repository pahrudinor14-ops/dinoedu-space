import { useState, type FormEvent } from "react"
import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  CircleDot,
  Cuboid,
  Flag,
  Medal,
  PieChart,
  Shapes,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type {
  AdventureIslandId,
  AdventureLeaderboardEntry,
  AdventureProgress,
  IslandProgressStatus,
} from "./adventureProgress"

type IslandMapItem = {
  id: AdventureIslandId
  title: string
  shortTitle: string
  description: string
  Icon: LucideIcon
  left: string
  top: string
  landmark: string
}

const islands: IslandMapItem[] = [
  { id: "bilangan", title: "Pulau Bilangan", shortTitle: "Bilangan", description: "Jalur angka, nilai tempat, dan operasi hitung.", Icon: Calculator, left: "15%", top: "31%", landmark: "12 + 8" },
  { id: "pecahan", title: "Pulau Pecahan & Pengukuran", shortTitle: "Pecahan", description: "Bagian, perbandingan, dan alat ukur.", Icon: PieChart, left: "40%", top: "18%", landmark: "½ + ¼" },
  { id: "geometri", title: "Pulau Geometri", shortTitle: "Geometri", description: "Bangun datar, luas, dan keliling.", Icon: Shapes, left: "67%", top: "30%", landmark: "△  □  ○" },
  { id: "bangun-ruang", title: "Pulau Bangun Ruang", shortTitle: "Bangun Ruang", description: "Putar dan jelajahi model matematika 3D.", Icon: Cuboid, left: "84%", top: "57%", landmark: "3D LAB" },
  { id: "data", title: "Pulau Data & Pola", shortTitle: "Data & Pola", description: "Baca diagram, temukan pola, pecahkan masalah.", Icon: BarChart3, left: "52%", top: "75%", landmark: "▂ ▅ ▇" },
  { id: "tantangan", title: "Pulau Tantangan", shortTitle: "Tantangan", description: "Gabungkan konsep dalam misi matematika.", Icon: Target, left: "19%", top: "72%", landmark: "MISI 01" },
]

const statusLabel: Record<IslandProgressStatus, string> = {
  unexplored: "Belum dijelajahi",
  learning: "Sedang dipelajari",
  completed: "Selesai",
}

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date)
}

function WorldMap({
  progress,
  onSelectIsland,
}: {
  progress: AdventureProgress
  onSelectIsland: (island: AdventureIslandId) => void
}) {
  return (
    <div className="overflow-x-auto rounded-[2rem] border border-cyan-950/10 bg-[#c5edf0] shadow-inner touch-pan-x" tabIndex={0} aria-label="Peta petualangan DinoLab, geser ke samping untuk melihat semua pulau">
      <div className="relative isolate aspect-[1000/620] min-w-[760px] overflow-hidden rounded-[2rem]">
        <svg viewBox="0 0 1000 620" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label="Peta berisi enam pulau belajar yang terhubung jalur eksplorasi">
          <defs>
            <linearGradient id="adventure-water" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#a9e1e7" />
              <stop offset="0.52" stopColor="#d3f2ed" />
              <stop offset="1" stopColor="#9ed9e5" />
            </linearGradient>
            <linearGradient id="island-green" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#b8dd9a" /><stop offset="1" stopColor="#74bd9c" /></linearGradient>
            <linearGradient id="island-teal" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#c2e6a4" /><stop offset="1" stopColor="#72c8b3" /></linearGradient>
            <linearGradient id="island-gold" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f3e2a8" /><stop offset="1" stopColor="#9bc99b" /></linearGradient>
            <filter id="island-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#285b61" floodOpacity="0.20" /></filter>
          </defs>
          <rect width="1000" height="620" fill="url(#adventure-water)" />
          <path d="M-20 120 C130 75 180 155 300 120 S510 52 650 117 S865 192 1025 116 M-20 310 C120 260 230 333 354 290 S575 235 702 300 S895 357 1020 290 M-20 525 C130 467 230 548 390 500 S645 450 780 515 S914 556 1020 505" fill="none" stroke="#ffffff" strokeOpacity=".38" strokeWidth="4" />
          <path d="M-10 145 C142 100 204 183 318 145 M681 143 C802 100 895 208 1013 156 M-20 350 C100 313 210 378 304 344 M743 375 C845 330 915 417 1015 379 M335 555 C456 512 555 570 670 532" fill="none" stroke="#6fb9c6" strokeOpacity=".25" strokeWidth="2" />
          <path d="M150 190 C210 132 318 112 405 113 S555 142 670 187 S805 250 842 353 S700 450 520 463 S290 447 190 446" fill="none" stroke="#fffff1" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity=".78" />
          <path d="M150 190 C210 132 318 112 405 113 S555 142 670 187 S805 250 842 353 S700 450 520 463 S290 447 190 446" fill="none" stroke="#d4a46f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 17" />
          <g filter="url(#island-shadow)" stroke="#f5f0d6" strokeWidth="7" strokeLinejoin="round">
            <path d="M48 167 C57 130 88 119 119 126 C141 99 181 111 191 135 C224 126 254 149 251 177 C278 198 261 229 233 240 C218 266 183 266 160 250 C132 269 98 251 93 228 C60 224 38 197 48 167Z" fill="url(#island-green)" />
            <path d="M298 100 C306 72 338 61 366 70 C389 44 430 58 438 83 C469 79 496 100 489 128 C508 153 483 179 453 179 C434 204 397 199 380 181 C351 194 321 176 321 153 C295 143 286 120 298 100Z" fill="url(#island-teal)" />
            <path d="M578 176 C585 143 617 129 645 139 C667 111 706 125 715 151 C746 145 777 166 769 195 C795 220 770 249 742 249 C723 273 686 270 668 251 C638 264 608 246 609 224 C581 216 567 195 578 176Z" fill="url(#island-gold)" />
            <path d="M746 340 C753 308 785 293 814 304 C836 277 875 291 883 319 C914 313 944 334 936 363 C961 387 937 416 908 417 C888 442 851 437 834 419 C804 432 774 414 775 392 C747 384 735 361 746 340Z" fill="url(#island-green)" />
            <path d="M419 442 C426 412 458 397 487 408 C509 382 548 395 556 423 C587 416 618 438 610 467 C635 491 611 520 582 521 C562 546 525 541 508 523 C478 536 448 518 449 496 C421 488 408 464 419 442Z" fill="url(#island-teal)" />
            <path d="M90 423 C98 392 128 379 158 390 C181 363 220 377 228 404 C260 397 289 419 281 448 C306 472 282 501 253 502 C234 527 197 522 179 504 C149 517 119 499 120 477 C92 469 79 446 90 423Z" fill="url(#island-gold)" />
          </g>
          <g fill="#4a9c82" opacity=".6">
            <path d="M78 157 q12-25 24 0 q-12-5-24 0 M219 204 q10-23 21 0 q-10-5-21 0 M342 99 q12-25 24 0 q-12-5-24 0 M467 143 q10-22 20 0 q-10-4-20 0 M621 170 q12-24 24 0 q-12-5-24 0 M738 221 q10-23 21 0 q-10-5-21 0 M799 343 q12-24 24 0 q-12-5-24 0 M912 393 q10-23 20 0 q-10-5-20 0 M462 462 q12-24 24 0 q-12-5-24 0 M575 494 q10-22 20 0 q-10-4-20 0 M124 437 q12-24 24 0 q-12-5-24 0 M254 474 q10-22 20 0 q-10-4-20 0" />
          </g>
          <g fill="#fff8d6" opacity=".9"><circle cx="285" cy="268" r="4"/><circle cx="540" cy="91" r="3"/><circle cx="718" cy="503" r="4"/><circle cx="365" cy="359" r="3"/><circle cx="944" cy="192" r="4"/><circle cx="55" cy="327" r="3"/></g>
        </svg>

        {islands.map(({ id, title, shortTitle, description, Icon, left, top, landmark }) => {
          const status = progress[id]
          const completed = status === "completed"
          const learning = status === "learning"
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectIsland(id)}
              title={`${title} — ${description}`}
              aria-label={`${title}. ${description} Status: ${statusLabel[status]}. Buka pulau.`}
              className="group absolute z-10 flex min-h-[8.5rem] w-[clamp(8.5rem,15.5%,10.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[38%_42%_35%_45%/42%_34%_46%_38%] border-2 border-white/70 bg-white/25 px-2 py-2 text-center shadow-sm backdrop-blur-[1px] transition duration-200 hover:scale-[1.04] hover:bg-white/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-800/50 active:scale-[.98]"
              style={{ left, top }}
            >
              <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 shadow-md transition group-hover:-translate-y-0.5 sm:h-14 sm:w-14 ${completed ? "bg-emerald-700 text-white" : learning ? "bg-amber-400 text-amber-950" : "bg-[#fffaf0] text-emerald-800"}`}>
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
                {completed && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-emerald-700 shadow"><Check className="h-3 w-3" aria-hidden="true" /></span>}
              </span>
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-emerald-950/75 drop-shadow-sm sm:text-xs">{landmark}</span>
              <span className="mt-0.5 max-w-full rounded-full bg-white/85 px-2 py-0.5 text-xs font-black leading-4 text-slate-800 shadow-sm sm:text-sm">{shortTitle}</span>
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold leading-3 sm:text-[11px] ${completed ? "bg-emerald-800 text-white" : learning ? "bg-amber-100 text-amber-950" : "bg-white/90 text-slate-600"}`}>
                {completed ? <Check className="h-3 w-3" aria-hidden="true" /> : learning ? <CircleDot className="h-3 w-3" aria-hidden="true" /> : <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
                {statusLabel[status]}
              </span>
            </button>
          )
        })}

        <span className="pointer-events-none absolute left-[3%] top-[4%] z-10 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur sm:left-[4%] sm:top-[5%] sm:px-4 sm:text-sm">
          <Flag className="h-4 w-4 text-emerald-700" aria-hidden="true" />Mulai di sini: Pulau Bilangan
        </span>
        <span className="pointer-events-none absolute bottom-[3%] right-[3%] z-10 rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-slate-600 sm:right-[4%] sm:text-xs">Geser peta untuk menjelajah</span>
      </div>
    </div>
  )
}

function Leaderboard({ entries }: { entries: AdventureLeaderboardEntry[] }) {
  const leaders = entries.slice(0, 5)
  return (
    <section aria-labelledby="leaderboard-heading" className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200"><Trophy className="h-4 w-4" aria-hidden="true" />Papan peringkat lokal</div>
          <h3 id="leaderboard-heading" className="mt-3 text-lg font-black">Penjelajah terbaik</h3>
        </div>
        <Medal className="mt-1 h-6 w-6 text-amber-600" aria-hidden="true" />
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Peringkat berdasarkan jawaban tepat pertama pada Bangun &amp; Temukan. Tersimpan di perangkat ini.</p>
      {leaders.length ? (
        <ol className="mt-4 space-y-2">
          {leaders.map((entry, index) => (
            <li key={entry.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${index === 0 ? "border-amber-400/40 bg-amber-500/[0.07]" : "border-border/60 bg-muted/25"}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black tabular-nums ${index === 0 ? "bg-amber-400 text-amber-950" : "bg-background text-muted-foreground"}`}>{index === 0 ? <Trophy className="h-4 w-4" aria-label="Peringkat pertama" /> : index + 1}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{entry.playerName}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{entry.correctFirstTry}/6 tepat · {dateLabel(entry.completedAt)}</span></span>
              <strong className="shrink-0 text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-300">{entry.points} <span className="text-[10px]">poin</span></strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-5 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-amber-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold">Peringkat masih kosong</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Selesaikan Bangun &amp; Temukan untuk mencatat skor pertamamu.</p>
        </div>
      )}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/45 p-3 text-xs leading-5 text-muted-foreground"><Target className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />Setiap jawaban tepat pada percobaan pertama bernilai 100 poin.</div>
    </section>
  )
}

export default function DinoLabAdventureMap({
  progress,
  leaderboard,
  playerName,
  creditSummary,
  creditCost,
  onPlayerNameSave,
  onSelectIsland,
}: {
  progress: AdventureProgress
  leaderboard: AdventureLeaderboardEntry[]
  playerName: string
  creditSummary: string
  creditCost: string
  onPlayerNameSave: (name: string) => void
  onSelectIsland: (island: AdventureIslandId) => void
}) {
  const [draftName, setDraftName] = useState(playerName)

  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = draftName.trim().slice(0, 24)
    if (!name) return
    setDraftName(name)
    onPlayerNameSave(name)
  }

  const exploredCount = Object.values(progress).filter((status) => status !== "unexplored").length
  const completedCount = Object.values(progress).filter((status) => status === "completed").length

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/60 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 px-6 py-7 text-white shadow-xl shadow-emerald-950/10 sm:px-9 sm:py-9">
        <div aria-hidden="true" className="absolute -right-12 -top-20 h-72 w-72 rounded-full border-[28px] border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-20 right-[25%] h-48 w-48 rounded-full bg-cyan-200/10 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-50"><Sparkles className="h-4 w-4" aria-hidden="true" />DinoLab Adventure</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Jelajahi. Eksplorasi. Pecahkan Tantangan.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/95 sm:text-base sm:leading-7">Pilih jalur belajarmu di peta. Amati matematika, coba simulasi, dan kumpulkan pemahaman baru di setiap pulau.</p>
          </div>
          <div className="flex gap-2 text-xs sm:text-sm">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-emerald-100">Pulau dijelajahi</p><p className="mt-1 text-xl font-black tabular-nums">{exploredCount}/6</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-emerald-100">Pulau selesai</p><p className="mt-1 text-xl font-black tabular-nums">{completedCount}/6</p></div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
        <section aria-labelledby="adventure-map-heading" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Peta petualangan</p><h3 id="adventure-map-heading" className="mt-1 text-xl font-black sm:text-2xl">Pilih pulau untuk mulai</h3></div>
            <span className="rounded-full bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground">5 pulau belajar · 1 pulau tantangan</span>
          </div>
          <WorldMap progress={progress} onSelectIsland={onSelectIsland} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground" aria-label="Keterangan status pulau">
            <span className="inline-flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5" />Belum dijelajahi</span>
            <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5 text-amber-600" />Sedang dipelajari</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-700" />Selesai</span>
          </div>
        </section>

        <aside className="space-y-5">
          <section aria-labelledby="player-name-heading" className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-800 dark:text-cyan-200">Profil pemain lokal</p>
            <h3 id="player-name-heading" className="mt-2 text-lg font-black">Nama di papan peringkat</h3>
            <form onSubmit={saveName} className="mt-4 space-y-3">
              <label htmlFor="adventure-player-name" className="sr-only">Nama pemain, maksimal 24 karakter</label>
              <input id="adventure-player-name" value={draftName} maxLength={24} onChange={(event) => setDraftName(event.target.value)} placeholder="Tulis nama panggilan" className="min-h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
              <button type="submit" disabled={!draftName.trim()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-4 w-4" aria-hidden="true" />Simpan nama</button>
            </form>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Nama dan skor hanya disimpan di browser perangkat ini.</p>
          </section>
          <Leaderboard entries={leaderboard} />
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <Sparkles className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />Analisis coretan DinoAI memakai {creditCost} per analisis. {creditSummary}
      </div>
      <footer className="pb-2 text-center text-xs text-muted-foreground">Peta belajar matematika DinoLab · Pilih pulau dengan klik atau sentuhan.</footer>
    </div>
  )
}

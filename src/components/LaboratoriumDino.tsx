import { useState, type CSSProperties } from "react"
import Dino3DScene, { type DinoShape, type SelectedPart } from "./Dino3DScene"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleHelp,
  Cuboid,
  Gamepad2,
  LockKeyhole,
  PieChart,
  RotateCcw,
  Ruler,
  Shapes,
  Sparkles,
  Target,
} from "lucide-react"

interface LaboratoriumDinoProps {
  onBack: () => void
}

type ShapeType = DinoShape
type Mode = "lab" | "learn"

const topics: { id: ShapeType; title: string; description: string; level: string }[] = [
  { id: "cube", title: "Kubus", description: "Sisi, rusuk, titik sudut, luas permukaan, dan volume.", level: "SD/SMP" },
  { id: "cuboid", title: "Balok", description: "Panjang, lebar, tinggi, luas permukaan, dan volume.", level: "SD/SMP" },
  { id: "cylinder", title: "Tabung", description: "Alas lingkaran, jari-jari, tinggi, dan volume.", level: "SD/SMP" },
  { id: "cone", title: "Kerucut", description: "Alas, jari-jari, tinggi, garis pelukis, dan volume.", level: "SD/SMP" },
  { id: "sphere", title: "Bola", description: "Permukaan lengkung, jari-jari, dan volume bola.", level: "SD/SMP" },
  { id: "triangularPrism", title: "Prisma segitiga", description: "Dua alas segitiga dan tiga sisi tegak.", level: "SD/SMP" },
  { id: "squarePyramid", title: "Limas segi empat", description: "Alas persegi, sisi tegak, tinggi, dan volume.", level: "SD/SMP" },
  { id: "triangularPyramid", title: "Limas segitiga", description: "Alas segitiga dan tiga sisi tegak.", level: "SMP" },
]

const learningCategories = [
  {
    id: "bilangan",
    title: "Bilangan dan operasi hitung",
    description: "Jelajahi bilangan, pola berhitung, serta penjumlahan, pengurangan, perkalian, dan pembagian.",
    Icon: Calculator,
    available: false,
  },
  {
    id: "pecahan",
    title: "Pecahan, rasio, dan pengukuran",
    description: "Bandingkan pecahan dan rasio, lalu kenali satuan serta cara mengukur.",
    Icon: PieChart,
    available: false,
  },
  {
    id: "geometri",
    title: "Geometri dan bangun datar",
    description: "Pelajari bentuk, sudut, keliling, dan luas pada bangun datar.",
    Icon: Shapes,
    available: false,
  },
  {
    id: "bangun-ruang",
    title: "Bangun ruang",
    description: "Putar model 3D, ubah ukurannya, lalu pahami volume dan luas permukaan.",
    Icon: Cuboid,
    available: true,
  },
  {
    id: "data",
    title: "Data, pola, dan pemecahan masalah",
    description: "Baca informasi, temukan pola, dan gunakan strategi untuk menyelesaikan tantangan.",
    Icon: BarChart3,
    available: false,
  },
  {
    id: "simulasi",
    title: "Simulasi, game, dan evaluasi",
    description: "Latih pemahaman melalui kegiatan interaktif, permainan, dan evaluasi.",
    Icon: Gamepad2,
    available: false,
  },
] as const

const lessons = [
  { title: "Kenali bentuknya", description: "Amati sisi, rusuk, titik sudut, dan ukuran bangun ruang. Putar objek 3D untuk melihat bentuknya dari berbagai arah." },
  { title: "Pahami rumusnya", description: "Volume menunjukkan ruang yang ditempati benda. Luas permukaan menunjukkan total luas seluruh bagian luar benda." },
  { title: "Lakukan eksperimen", description: "Ubah satu ukuran pada satu waktu. Bandingkan hasil perhitungan sebelum dan sesudah perubahan untuk menemukan polanya." },
]

const PI = 3.14
const MAX_DIMENSION = 20

function fmt(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value)
}

function getMetrics(shape: ShapeType, length: number, width: number, height: number, radius: number) {
  const slant = Math.hypot(radius, height)
  const pyramidSlant = Math.hypot(width / 2, height)
  const triangularPyramidSlant = Math.hypot(height, width / (2 * Math.sqrt(3)))

  switch (shape) {
    case "cube":
      return { volume: length ** 3, area: 6 * length ** 2, volumeFormula: "V = s^3", areaFormula: "L = 6s^2", calculation: String(length) + "^3 = " + fmt(length ** 3) }
    case "cuboid":
      return { volume: length * width * height, area: 2 * (length * width + length * height + width * height), volumeFormula: "V = p x l x t", areaFormula: "L = 2(pl + pt + lt)", calculation: length + " x " + width + " x " + height + " = " + fmt(length * width * height) }
    case "cylinder":
      return { volume: PI * radius ** 2 * height, area: 2 * PI * radius * (radius + height), volumeFormula: "V = pi r^2 t", areaFormula: "L = 2 pi r(r + t)", calculation: "3,14 x " + radius + "^2 x " + height + " = " + fmt(PI * radius ** 2 * height) }
    case "cone":
      return { volume: PI * radius ** 2 * height / 3, area: PI * radius * (radius + slant), volumeFormula: "V = 1/3 pi r^2 t", areaFormula: "L = pi r(r + g)", calculation: "1/3 x 3,14 x " + radius + "^2 x " + height + " = " + fmt(PI * radius ** 2 * height / 3) }
    case "sphere":
      return { volume: 4 / 3 * PI * radius ** 3, area: 4 * PI * radius ** 2, volumeFormula: "V = 4/3 pi r^3", areaFormula: "L = 4 pi r^2", calculation: "4/3 x 3,14 x " + radius + "^3 = " + fmt(4 / 3 * PI * radius ** 3) }
    case "triangularPrism":
      return { volume: length * height * width / 2, area: length * height + width * (length + 2 * Math.hypot(length / 2, height)), volumeFormula: "V = 1/2 x alas x tinggi segitiga x panjang prisma", areaFormula: "L = 2 x luas alas + keliling alas x panjang prisma", calculation: "1/2 x " + length + " x " + height + " x " + width + " = " + fmt(length * height * width / 2) }
    case "squarePyramid":
      return { volume: width ** 2 * height / 3, area: width ** 2 + 2 * width * pyramidSlant, volumeFormula: "V = 1/3 x sisi alas^2 x tinggi", areaFormula: "L = sisi alas^2 + 2 x sisi alas x tinggi sisi", calculation: "1/3 x " + width + "^2 x " + height + " = " + fmt(width ** 2 * height / 3) }
    case "triangularPyramid": {
      const baseArea = Math.sqrt(3) / 4 * width ** 2
      return { volume: baseArea * height / 3, area: baseArea + 1.5 * width * triangularPyramidSlant, volumeFormula: "V = 1/3 x luas alas segitiga x tinggi", areaFormula: "L = luas alas + 3 x luas sisi tegak", calculation: "1/3 x luas alas (" + fmt(baseArea) + ") x " + height + " = " + fmt(baseArea * height / 3) }
    }
  }
}

function NumberControl({
  label,
  value,
  min = 1,
  max = MAX_DIMENSION,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums">{value} satuan</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="h-2 w-full cursor-pointer accent-emerald-600"
      />
      <div className="flex justify-between text-xs text-muted-foreground"><span>{min}</span><span>{max}</span></div>
    </div>
  )
}

function getQuestion(shape: ShapeType, length: number, width: number, height: number, radius: number) {
  switch (shape) {
    case "cube": return "Kubus dengan sisi " + length + " satuan memiliki volume berapa?"
    case "cuboid": return "Balok berukuran " + length + " x " + width + " x " + height + " satuan memiliki volume berapa?"
    case "cylinder": return "Tabung berjari-jari " + radius + " dan tinggi " + height + " satuan memiliki volume berapa? Gunakan pi = 3,14."
    case "cone": return "Kerucut berjari-jari " + radius + " dan tinggi " + height + " satuan memiliki volume berapa? Gunakan pi = 3,14."
    case "sphere": return "Bola berjari-jari " + radius + " satuan memiliki volume berapa? Gunakan pi = 3,14."
    case "triangularPrism": return "Prisma dengan alas segitiga beralas " + length + ", tinggi segitiga " + height + ", dan panjang " + width + " satuan memiliki volume berapa?"
    case "squarePyramid": return "Limas beralas persegi dengan sisi " + width + " dan tinggi " + height + " satuan memiliki volume berapa?"
    case "triangularPyramid": return "Limas beralas segitiga sama sisi dengan sisi " + width + " dan tinggi " + height + " satuan memiliki volume berapa?"
  }
}

export default function LaboratoriumDino({ onBack }: LaboratoriumDinoProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [shape, setShape] = useState<ShapeType>("cube")
  const [mode, setMode] = useState<Mode>("lab")
  const [length, setLength] = useState(4)
  const [width, setWidth] = useState(3)
  const [height, setHeight] = useState(5)
  const [radius, setRadius] = useState(3)
  const [lessonStep, setLessonStep] = useState(0)
  const [answer, setAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null)

  const metrics = getMetrics(shape, length, width, height, radius)
  const currentTopic = topics.find((topic) => topic.id === shape)!
  const correctAnswer = Number(metrics.volume.toFixed(2))
  const answers = [...new Set([
    Number((correctAnswer * 0.5).toFixed(2)),
    Number((correctAnswer * 0.75).toFixed(2)),
    correctAnswer,
    Number((correctAnswer * 1.5).toFixed(2)),
  ])].sort((a, b) => a - b)

  const clearAnswer = () => {
    setAnswer(null)
    setChecked(false)
  }

  const reset = () => {
    setShape("cube")
    setMode("lab")
    setLength(4)
    setWidth(3)
    setHeight(5)
    setRadius(3)
    setLessonStep(0)
    setSelectedPart(null)
    clearAnswer()
  }

  const updateShape = (nextShape: ShapeType) => {
    setShape(nextShape)
    setLessonStep(0)
    setSelectedPart(null)
    clearAnswer()
  }

  const updateDimension = (setter: (value: number) => void, value: number) => {
    setter(value)
    clearAnswer()
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" onClick={activeCategory ? () => setActiveCategory(null) : onBack} className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-muted" aria-label={activeCategory ? "Kembali ke pilihan materi" : "Kembali ke dashboard"}>
            <ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">{activeCategory ? "Semua materi" : "Kembali"}</span>
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><Cuboid className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold sm:text-base">Laboratorium Dino</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Laboratorium visual matematika</p>
            </div>
          </div>
          {activeCategory === "bangun-ruang" && (
            <button type="button" onClick={reset} aria-label="Reset laboratorium" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted sm:text-sm">
              <RotateCcw className="h-4 w-4" /><span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      <main className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-gradient-to-br from-emerald-50/70 via-background to-cyan-50/70 dark:from-emerald-950/10 dark:to-cyan-950/10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
        {activeCategory === null ? (
          <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 sm:py-10">
            <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-8 text-white shadow-xl shadow-emerald-950/10 sm:px-10 sm:py-11">
              <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[28px] border-white/10" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-cyan-200/15 blur-3xl" />
              <div className="relative max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />Ruang eksplorasi matematika
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Pilih petualangan belajarmu</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/95 sm:text-base sm:leading-7">
                  Temukan berbagai topik matematika, lalu masuk ke materi untuk belajar dan bereksperimen. Saat ini, materi Bangun ruang sudah siap dijelajahi.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-xs font-semibold text-white sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-cyan-100" />1 dari {learningCategories.length} kategori tersedia
                </div>
              </div>
            </section>

            <section aria-labelledby="kategori-laboratorium" className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 id="kategori-laboratorium" className="text-xl font-bold tracking-tight sm:text-2xl">Jelajahi kategori</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Pilih kategori untuk melihat materi yang tersedia.</p>
                </div>
                <span className="rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">{learningCategories.length} kategori</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {learningCategories.map(({ id, title, description, Icon, available }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={!available}
                    onClick={() => setActiveCategory(id)}
                    className={"group relative flex min-h-52 flex-col items-start rounded-2xl border bg-background/80 p-5 text-left shadow-sm transition sm:p-6 " + (available
                      ? "border-emerald-300/80 shadow-emerald-950/5 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      : "cursor-not-allowed border-border/70 opacity-75")}
                    aria-label={title + (available ? ", buka materi" : ", segera hadir")}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className={"flex h-12 w-12 items-center justify-center rounded-2xl " + (available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold " + (available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                        {available ? <><CheckCircle2 className="h-3.5 w-3.5" />Tersedia</> : <><LockKeyhole className="h-3 w-3" />Segera hadir</>}
                      </span>
                    </div>
                    <h4 className="mt-5 text-base font-bold leading-6">{title}</h4>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
                    {available && <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">Buka materi<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>}
                  </button>
                ))}
              </div>
            </section>

            <footer className="pt-2 text-center text-xs text-muted-foreground">Laboratorium Dino - Pilih kategori untuk mulai menjelajahi matematika.</footer>
          </div>
        ) : (
        <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <section className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" />Belajar matematika dengan cara baru</div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Jangan hanya <span className="text-emerald-600 dark:text-emerald-400">membayangkan.</span> Jelajahi!
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Eksplorasi bangun ruang, ubah ukurannya, pahami rumusnya, dan temukan bagaimana matematika bekerja melalui eksperimen.
            </p>
          </section>

          <section aria-label="Pilih mode belajar" className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("lab")} aria-pressed={mode === "lab"} className={"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition " + (mode === "lab" ? "bg-emerald-600 text-white shadow-sm" : "bg-background/80 hover:bg-muted")}>
              <Shapes className="h-4 w-4" />Laboratorium
            </button>
            <button type="button" onClick={() => setMode("learn")} aria-pressed={mode === "learn"} className={"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition " + (mode === "learn" ? "bg-emerald-600 text-white shadow-sm" : "bg-background/80 hover:bg-muted")}>
              <BookOpen className="h-4 w-4" />Mode Belajar
            </button>
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
            <section className="min-w-0 space-y-5">
              <div className="overflow-hidden rounded-3xl bg-background/55 shadow-xl shadow-emerald-950/5 dark:bg-background/35 dark:shadow-black/10">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
                  <div>
                    <h3 className="text-lg font-bold">{currentTopic.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{currentTopic.level} - Bangun ruang</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Eksperimen aktif</span>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-100/65 via-emerald-50/45 to-cyan-100/60 dark:from-emerald-950/20 dark:via-[#0d1917] dark:to-cyan-950/20">
                  <Dino3DScene shape={shape} length={length} width={width} height={height} radius={radius} onSelectPart={setSelectedPart} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:px-6">
                  <span><Ruler className="mr-1 inline h-3.5 w-3.5" />Dimensi dalam satuan</span>
                  <span>Seret untuk memutar - Scroll/cubit untuk zoom - Klik bagian bangun</span>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-500/5 p-4 sm:p-5" aria-live="polite">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><Target className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold">Eksplorasi bagian bangun</h3>
                    {selectedPart ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{selectedPart.type}: {selectedPart.name}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{selectedPart.detail}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Klik sisi, rusuk, atau titik sudut pada objek 3D untuk mempelajari bagian tersebut.</p>
                    )}
                  </div>
                  {selectedPart && <button type="button" onClick={() => setSelectedPart(null)} className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted">Hapus pilihan</button>}
                </div>
              </div>

              <div className="rounded-2xl bg-background/70 p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div><h3 className="font-bold">Eksperimen dimensi</h3><p className="mt-1 text-sm text-muted-foreground">Geser nilai dan amati perubahan hasilnya.</p></div>
                  <Ruler className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {shape === "cube" && <NumberControl label="Panjang sisi (s)" value={length} onChange={(value) => updateDimension(setLength, value)} />}
                  {(shape === "cuboid" || shape === "triangularPrism") && <NumberControl label={shape === "cuboid" ? "Panjang (p)" : "Alas segitiga"} value={length} onChange={(value) => updateDimension(setLength, value)} />}
                  {(shape === "cuboid" || shape === "triangularPrism") && <NumberControl label={shape === "cuboid" ? "Lebar (l)" : "Panjang prisma"} value={width} onChange={(value) => updateDimension(setWidth, value)} />}
                  {(shape === "cuboid" || shape === "triangularPrism") && <NumberControl label={shape === "cuboid" ? "Tinggi (t)" : "Tinggi segitiga"} value={height} onChange={(value) => updateDimension(setHeight, value)} />}
                  {(shape === "cylinder" || shape === "cone" || shape === "sphere") && <NumberControl label="Jari-jari (r)" value={radius} max={MAX_DIMENSION} onChange={(value) => updateDimension(setRadius, value)} />}
                  {(shape === "cylinder" || shape === "cone") && <NumberControl label="Tinggi (t)" value={height} onChange={(value) => updateDimension(setHeight, value)} />}
                  {(shape === "squarePyramid" || shape === "triangularPyramid") && <NumberControl label={shape === "squarePyramid" ? "Sisi alas persegi" : "Sisi alas segitiga"} value={width} onChange={(value) => updateDimension(setWidth, value)} />}
                  {(shape === "squarePyramid" || shape === "triangularPyramid") && <NumberControl label="Tinggi limas" value={height} onChange={(value) => updateDimension(setHeight, value)} />}
                </div>
              </div>

              {mode === "learn" && (
                <div className="rounded-2xl bg-emerald-500/5 p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><BookOpen className="h-5 w-5" /></div>
                    <div><h3 className="font-bold">Pembelajaran terpandu</h3><p className="text-xs text-muted-foreground">Langkah {lessonStep + 1} dari {lessons.length}</p></div>
                  </div>
                  <div className="mb-5 space-y-2"><h4 className="font-semibold">{lessons[lessonStep].title}</h4><p className="text-sm leading-6 text-muted-foreground">{lessons[lessonStep].description}</p></div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: String(((lessonStep + 1) / lessons.length) * 100) + "%" }} /></div>
                  <div className="flex justify-between gap-3">
                    <button type="button" disabled={lessonStep === 0} onClick={() => setLessonStep((current) => current - 1)} className="rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
                    <button type="button" disabled={lessonStep === lessons.length - 1} onClick={() => setLessonStep((current) => current + 1)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
                  </div>
                </div>
              )}
            </section>

            <aside className="min-w-0 space-y-5 lg:sticky lg:top-20 lg:self-start">
              <section className="rounded-2xl bg-background/70 p-4 shadow-sm sm:p-5">
                <h3 className="mb-4 font-bold">Pilih objek</h3>
                <div
                  className="max-h-[min(55dvh,30rem)] space-y-2 overflow-y-auto overscroll-y-contain pr-1 touch-pan-y [scrollbar-gutter:stable]"
                  style={{
                    "--scrollbar-thumb": "rgba(16, 185, 129, 0.48)",
                    "--scrollbar-thumb-hover": "rgba(16, 185, 129, 0.78)",
                  } as CSSProperties}
                >
                  {topics.map((topic) => {
                    const active = topic.id === shape
                    return (
                      <button type="button" key={topic.id} onClick={() => updateShape(topic.id)} aria-pressed={active} className={"flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition " + (active ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "hover:bg-muted/60")}>
                        <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " + (active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                          {topic.id === "cylinder" || topic.id === "cone" || topic.id === "sphere" ? <CircleHelp className="h-5 w-5" /> : <Cuboid className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{topic.title}</span>{active && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}</div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{topic.description}</p>
                          <p className="mt-2 text-[11px] font-medium text-muted-foreground">{topic.level}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-2xl bg-background/70 p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /><h3 className="font-bold">Hasil eksperimen</h3></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-3"><p className="text-xs text-muted-foreground">Volume</p><p className="mt-1 break-words text-xl font-black tabular-nums">{fmt(metrics.volume)}</p><p className="mt-1 text-[11px] text-muted-foreground">satuan^3</p></div>
                  <div className="rounded-xl bg-cyan-500/10 p-3"><p className="text-xs text-muted-foreground">Luas permukaan</p><p className="mt-1 break-words text-xl font-black tabular-nums">{fmt(metrics.area)}</p><p className="mt-1 text-[11px] text-muted-foreground">satuan^2</p></div>
                </div>
                <div className="mt-4 space-y-3 rounded-xl bg-muted/40 p-3">
                  <div><p className="text-xs text-muted-foreground">Rumus volume</p><p className="mt-1 font-mono text-sm font-semibold">{metrics.volumeFormula}</p><p className="mt-1 break-words text-xs text-muted-foreground">{metrics.calculation}</p></div>
                  <div className="pt-3"><p className="text-xs text-muted-foreground">Rumus luas permukaan</p><p className="mt-1 break-words font-mono text-sm font-semibold">{metrics.areaFormula}</p><p className="mt-1 text-xs text-muted-foreground">Hasil: {fmt(metrics.area)} satuan^2</p></div>
                  {(shape === "cylinder" || shape === "cone" || shape === "sphere") && <p className="text-[11px] leading-5 text-muted-foreground">Perhitungan memakai pi = 3,14.</p>}
                </div>
              </section>

              <section className="rounded-2xl bg-background/70 p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /><h3 className="font-bold">Uji pemahaman</h3></div>
                <p className="text-sm leading-6 text-muted-foreground">{getQuestion(shape, length, width, height, radius)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {answers.map((option) => (
                    <button type="button" key={option} aria-pressed={answer === option} onClick={() => { setAnswer(option); setChecked(false) }} className={"rounded-xl px-3 py-3 text-sm font-semibold transition " + (answer === option ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/40 dark:text-emerald-300" : "bg-muted/50 hover:bg-muted")}>
                      {fmt(option)}
                    </button>
                  ))}
                </div>
                <button type="button" disabled={answer === null} onClick={() => setChecked(true)} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Periksa jawaban</button>
                {checked && <div role="status" className={"mt-3 rounded-xl p-3 text-sm " + (answer === correctAnswer ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-300")}>
                  {answer === correctAnswer ? "Benar! Kamu memahami perhitungan volume." : "Belum tepat. Coba hitung kembali menggunakan rumus " + metrics.volumeFormula + "."}
                </div>}
              </section>

              <div className="rounded-2xl bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><BookOpen className="h-4 w-4" /></div>
                  <div><h3 className="text-sm font-bold">Tips belajar</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Ubah satu dimensi pada satu waktu. Amati bagaimana perubahan ukuran memengaruhi volume dan luas permukaan.</p></div>
                </div>
              </div>
            </aside>
          </div>

          <footer className="py-5 text-center text-xs text-muted-foreground">Laboratorium Dino - Jelajahi, eksperimen, dan pahami matematika.</footer>
        </div>
        )}
      </main>
    </div>
  )
}

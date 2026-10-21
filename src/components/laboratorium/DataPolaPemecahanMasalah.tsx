import { useEffect, useState, type ReactNode } from "react"
import {
  BarChart3,
  BookOpen,
  CircleHelp,
  Hash,
  Lightbulb,
  ListChecks,
  Puzzle,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import RujukanPenyusunan from "./RujukanPenyusunan"
import GuidedLearning, { type GuidedStep } from "./GuidedLearning"
import ModeSelector, { type LearningMode } from "./ModeSelector"

type LessonId = "data" | "pola" | "statistik" | "pemecahan"
type PatternRule = "tambah" | "kali"

const format = (value: number, digits = 1) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value)

const lessons: { id: LessonId; title: string; summary: string; Icon: LucideIcon }[] = [
  { id: "data", title: "Baca data", summary: "Tabel dan diagram batang", Icon: BarChart3 },
  { id: "pola", title: "Temukan pola", summary: "Aturan dan urutan bilangan", Icon: TrendingUp },
  { id: "statistik", title: "Ringkas data", summary: "Rata-rata, median, modus", Icon: Hash },
  { id: "pemecahan", title: "Pecahkan masalah", summary: "Pahami, rencanakan, periksa", Icon: Puzzle },
]

const guidedSteps: Record<LessonId, GuidedStep[]> = {
  data: [
    { title: "Kenali pertanyaan dan data", description: "Lihat apa yang dicatat, siapa atau apa yang dihitung, dan informasi mana yang ditanyakan." },
    { title: "Baca skala diagram", description: "Cocokkan setiap kategori dengan sumbu dan skala yang sama. Tinggi batang menunjukkan banyak data." },
    { title: "Jelaskan kesimpulan", description: "Bandingkan nilai yang terlihat dan dukung jawaban dengan angka pada tabel atau diagram." },
  ],
  pola: [
    { title: "Amati suku yang berurutan", description: "Catat apa yang berubah dari satu suku ke suku berikutnya sebelum menebak kelanjutannya." },
    { title: "Nyatakan aturannya", description: "Uji apakah perubahan tetap berupa penambahan atau perkalian dengan bilangan yang sama." },
    { title: "Uji semua langkah", description: "Gunakan satu aturan untuk menjelaskan setiap pasangan suku, lalu teruskan aturan itu." },
  ],
  statistik: [
    { title: "Periksa dan urutkan data", description: "Pastikan nilai yang dianalisis lengkap, lalu urutkan untuk membantu menemukan median." },
    { title: "Hitung ukuran yang diminta", description: "Mean membagi jumlah nilai dengan banyak data; median nilai tengah; modus paling sering muncul." },
    { title: "Pilih ringkasan yang sesuai", description: "Bandingkan ukuran dan konteks. Mean dapat tertarik nilai ekstrem; jangkauan hanya memakai nilai terbesar dan terkecil." },
  ],
  pemecahan: [
    { title: "Pahami apa yang diketahui", description: "Baca soal, tandai informasi penting, dan rumuskan dengan kata-kata apa yang perlu dicari." },
    { title: "Pilih representasi dan rencana", description: "Buat gambar, tabel, pola, atau model operasi yang sesuai dengan hubungan dalam soal." },
    { title: "Selesaikan lalu periksa", description: "Hitung dengan teliti, sertakan satuan bila ada, dan cek apakah jawaban masuk akal terhadap cerita." },
  ],
}

function LessonTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p>
      <h3 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  )
}

function ConceptNote({ title, children, tone = "emerald" }: { title: string; children: ReactNode; tone?: "emerald" | "amber" }) {
  const toneClass = tone === "amber" ? "border-amber-300/50 bg-amber-500/5" : "border-emerald-300/40 bg-emerald-500/5"
  const iconClass = tone === "amber" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
  const Icon = tone === "amber" ? Lightbulb : CircleHelp
  return (
    <aside className={"flex gap-3 rounded-2xl border p-4 sm:p-5 " + toneClass}>
      <Icon className={"mt-0.5 h-5 w-5 shrink-0 " + iconClass} />
      <div><h4 className="text-sm font-bold">{title}</h4><div className="mt-1 text-sm leading-6 text-muted-foreground">{children}</div></div>
    </aside>
  )
}

const initialCategories = [
  { name: "Membaca", value: 8 },
  { name: "Olahraga", value: 5 },
  { name: "Musik", value: 7 },
  { name: "Menggambar", value: 4 },
]

function DataLesson() {
  const [categories, setCategories] = useState(initialCategories)
  const [question, setQuestion] = useState("terbanyak")
  const total = categories.reduce((sum, item) => sum + item.value, 0)
  const largest = Math.max(...categories.map((item) => item.value))
  const leaders = categories.filter((item) => item.value === largest).map((item) => item.name)
  const result = question === "total"
    ? "Jumlah seluruh pilihan adalah " + total + "."
    : question === "selisih"
      ? "Selisih pilihan membaca dan olahraga adalah " + Math.abs(categories[0].value - categories[1].value) + "."
      : largest === 0 ? "Belum ada pilihan yang tercatat." : "Pilihan terbanyak: " + leaders.join(" dan ") + " (" + largest + ")."

  const updateValue = (index: number, value: number) => setCategories((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value } : item))

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SD · kumpulkan dan baca informasi" title="Diagram batang mengubah catatan menjadi mudah dibandingkan">
        Contoh ini mencatat pilihan kegiatan dalam satu kelas. Ubah jumlah tiap kegiatan, lalu gunakan diagram dan pertanyaan untuk membandingkan data. Data pada contoh ini dapat diubah untuk berlatih.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="font-bold">Pilihan kegiatan kelas</h4><p className="mt-1 text-xs text-muted-foreground">Jumlah siswa untuk setiap kegiatan · skala batang dimulai dari 0</p></div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">Total saat ini: {total} siswa</span>
        </div>

        <div className="mt-5 rounded-2xl bg-muted/30 p-3 sm:p-5">
          <svg role="img" aria-label={"Diagram batang pilihan kegiatan: " + categories.map((item) => item.name + " " + item.value).join(", ") + ". Sumbu tegak menunjukkan jumlah siswa dari 0 sampai 20."} viewBox="0 0 420 250" className="h-auto w-full overflow-visible">
            {[20, 15, 10, 5, 0].map((tick) => {
              const y = 200 - tick / 20 * 176
              return <g key={tick}><line x1="48" y1={y} x2="410" y2={y} className="stroke-border" strokeDasharray={tick === 0 ? undefined : "4 5"} /><text x="38" y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="11">{tick}</text></g>
            })}
            {categories.map((item, index) => {
              const center = 95 + index * 90
              const height = item.value / 20 * 176
              const top = 200 - height
              return <g key={item.name}>
                {item.value > 0 && <rect x={center - 23} y={top} width="46" height={height} rx="7" className="fill-emerald-500 transition-all duration-300" />}
                <text x={center} y={Math.max(17, top - 8)} textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="700">{item.value}</text>
                <text x={center} y="225" textAnchor="middle" className="fill-muted-foreground" fontSize="11">{item.name}</text>
              </g>
            })}
          </svg>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">{categories.map((item, index) => <label key={item.name} className="space-y-1 text-[11px] font-semibold">{item.name}: {item.value}
            <input type="range" min="0" max="20" step="1" value={item.value} onChange={(event) => updateValue(index, Number(event.target.value))} aria-label={"Jumlah pilihan " + item.name} className="h-2 w-full cursor-pointer accent-emerald-600" />
          </label>)}</div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.8fr)]">
          <div>
            <p className="text-sm font-bold">Pilih pertanyaan</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Pilih pertanyaan tentang diagram">
              {[{ id: "terbanyak", label: "Paling banyak" }, { id: "selisih", label: "Selisih dua pertama" }, { id: "total", label: "Jumlah semuanya" }].map((item) => <button key={item.id} type="button" aria-pressed={question === item.id} onClick={() => setQuestion(item.id)} className={"rounded-xl px-3 py-2 text-xs font-bold transition " + (question === item.id ? "bg-emerald-600 text-white" : "bg-muted/60 hover:bg-muted")}>{item.label}</button>)}
            </div>
          </div>
          <div role="status" className="rounded-2xl border border-emerald-300/40 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Cara membaca data</p><p className="mt-1 text-sm font-bold">{result}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Baca angka pada sumbu tegak lalu cocokkan dengan nama kegiatan pada sumbu mendatar.</p>
          </div>
        </div>
      </section>
      <ConceptNote title="Agar diagram tidak menyesatkan" tone="amber">Setiap batang menunjukkan banyaknya siswa, bukan persentase. Semua batang memakai skala yang sama dan dimulai dari nol, sehingga panjang batang sebanding dengan jumlahnya. Jika dua kategori sama tinggi, keduanya berbagi nilai terbanyak.</ConceptNote>
    </div>
  )
}

function PatternLesson() {
  const [rule, setRule] = useState<PatternRule>("tambah")
  const [first, setFirst] = useState(3)
  const [step, setStep] = useState(2)
  const sequence = Array.from({ length: 6 }, (_, index) => rule === "tambah" ? first + index * step : first * step ** index)
  const maxValue = Math.max(...sequence)

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SD · SMP · pola dan keteraturan" title="Pola adalah aturan yang menjelaskan perubahan berulang">
        Ubah bilangan awal dan aturan. Amati setiap langkah, lalu gunakan aturan yang sama untuk mendapatkan suku berikutnya. Di sini aturan dinyatakan terbuka supaya pola yang diamati tidak ditebak secara sembarang.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm font-semibold">Bilangan pertama: {first}
            <input type="range" min="1" max="12" step="1" value={first} onChange={(event) => setFirst(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-emerald-600" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">Jenis aturan
            <select value={rule} onChange={(event) => { const nextRule = event.target.value as PatternRule; setRule(nextRule); if (nextRule === "kali") setStep((current) => Math.max(2, Math.min(4, current))) }} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"><option value="tambah">Tambah bilangan yang sama</option><option value="kali">Kali dengan bilangan yang sama</option></select>
          </label>
          <label className="space-y-2 text-sm font-semibold">{rule === "tambah" ? "Ditambah setiap langkah" : "Dikali setiap langkah"}: {step}
            <input type="range" min={rule === "tambah" ? 1 : 2} max={rule === "tambah" ? 8 : 4} step="1" value={step} onChange={(event) => setStep(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-cyan-600" />
          </label>
        </div>
        <div className="mt-5 rounded-2xl bg-muted/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">Urutan yang dihasilkan</h4><span className="rounded-full bg-background px-3 py-1.5 text-xs font-bold">Aturan: {rule === "tambah" ? "tambah " + step : "kali " + step}</span></div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3" aria-label={"Urutan bilangan " + sequence.join(", ")}>
            {sequence.map((value, index) => (
              <div key={index} className={"rounded-xl border p-2 text-center sm:p-3 " + (index === sequence.length - 1 ? "border-emerald-400 bg-emerald-500/10" : "border-border/70 bg-background")}>
                <span className="text-[10px] font-semibold text-muted-foreground">Suku ke-{index + 1}</span>
                <span className="mt-1 block break-all text-lg font-black tabular-nums sm:text-xl">{value}</span>
                <div className="mx-auto mt-2 flex h-14 w-full max-w-10 items-end overflow-hidden rounded-t-md bg-muted/70"><span className="w-full rounded-t-md bg-gradient-to-t from-cyan-600 to-emerald-400 transition-[height] duration-300" style={{ height: Math.max(5, value / maxValue * 100) + "%" }} /></div>
                {index < sequence.length - 1 && <span className="mt-1 block text-[9px] font-bold text-emerald-700 dark:text-emerald-300">{rule === "tambah" ? "+" + step : "×" + step}</span>}
                {index === sequence.length - 1 && <span className="mt-1 block text-[9px] font-bold text-emerald-700 dark:text-emerald-300">berikutnya</span>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Angka di atas batang adalah nilai sebenarnya. Tinggi batang dibandingkan terhadap suku terbesar yang sedang tampil.</p>
        </div>
      </section>
      <ConceptNote title="Aturan harus cocok dengan semua langkah" tone="amber">Pada pola tambah, selisih antar-suku tetap. Pada pola kali, hasil bagi antar-suku berurutan tetap (bila suku sebelumnya bukan nol). Sekumpulan suku awal bisa cocok dengan lebih dari satu aturan; gunakan keterangan atau konteks soal sebelum menyimpulkan polanya.</ConceptNote>
    </div>
  )
}

const initialValues = [4, 7, 5, 7, 9, 6, 7]

function StatisticsLesson() {
  const [values, setValues] = useState(initialValues)
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((total, value) => total + value, 0)
  const mean = sum / values.length
  const median = sorted.length % 2 === 1
    ? sorted[Math.floor(sorted.length / 2)]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
  const frequencies = new Map<number, number>()
  values.forEach((value) => frequencies.set(value, (frequencies.get(value) ?? 0) + 1))
  const highestFrequency = Math.max(...frequencies.values())
  const modes = highestFrequency < 2 ? [] : [...frequencies.entries()].filter(([, frequency]) => frequency === highestFrequency).map(([value]) => value).sort((a, b) => a - b)
  const counts = Array.from({ length: 11 }, (_, value) => values.filter((item) => item === value).length)
  const updateValue = (index: number, value: number) => setValues((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SMP · meringkas sekumpulan data" title="Satu ukuran tidak selalu menceritakan seluruh data">
        Ubah tujuh nilai contoh untuk melihat bagaimana rata-rata, median, modus, dan jangkauan memberi ringkasan yang berbeda. Semua ukuran dihitung ulang dari data yang tampak.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-bold">Nilai latihan (0–10)</h4><p className="mt-1 text-xs text-muted-foreground">Ubah nilai satu per satu; data terurut ditampilkan untuk membantu membaca median.</p></div><span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold">{values.length} data</span></div>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">{values.map((value, index) => <label key={index} className="space-y-1 text-center text-[10px] font-semibold text-muted-foreground">Data {index + 1}<input type="number" min="0" max="10" step="1" value={value} aria-label={"Nilai data " + (index + 1)} onChange={(event) => updateValue(index, Math.max(0, Math.min(10, Math.trunc(Number(event.target.value) || 0))))} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-center text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-emerald-500" /></label>)}</div>
        <div role="img" aria-label="Diagram titik frekuensi nilai dari 0 hingga 10" className="mt-5 rounded-2xl bg-muted/30 p-4">
          <p className="text-xs font-bold text-muted-foreground">Diagram frekuensi · setiap kotak mewakili satu nilai</p>
          <div className="mt-3 grid grid-cols-11 gap-1 sm:gap-2">{counts.map((count, value) => <div key={value} className="flex min-w-0 flex-col items-center justify-end"><span className="mb-1 text-[10px] tabular-nums text-muted-foreground">{count}</span><div className="flex h-20 w-full flex-col-reverse items-center justify-start gap-0.5">{Array.from({ length: count }, (_, index) => <span key={index} className="h-2.5 w-2.5 rounded-sm bg-emerald-500 sm:h-3 sm:w-3" />)}</div><span className="mt-1 text-[10px] font-bold tabular-nums">{value}</span></div>)}</div>
          <div className="mt-3 rounded-xl bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">Urutkan dari kecil ke besar: <strong className="text-foreground">{sorted.join(", ")}</strong></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Rata-rata (mean)", value: format(mean, 2), detail: format(sum) + " ÷ " + values.length + " ≈ " + format(mean, 2) },
            { label: "Median", value: format(median), detail: sorted.length % 2 ? "Nilai yang berada di tengah" : "Rata-rata dua nilai tengah" },
            { label: "Modus", value: modes.length ? modes.join(", ") : "Tidak ada", detail: modes.length ? "Nilai yang paling sering muncul" : "Tidak ada nilai yang berulang" },
            { label: "Jangkauan", value: String(Math.max(...values) - Math.min(...values)), detail: "Nilai terbesar − nilai terkecil" },
          ].map((item) => <div key={item.label} className="rounded-2xl border border-border/70 bg-background p-3"><p className="text-xs font-semibold text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-black tabular-nums">{item.value}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.detail}</p></div>)}
        </div>
      </section>
      <ConceptNote title="Pilih ringkasan sesuai pertanyaannya" tone="amber">Mean memakai semua nilai dan mudah berubah bila ada nilai yang sangat jauh. Median adalah nilai tengah setelah data diurutkan. Modus adalah nilai yang paling sering muncul (bisa lebih dari satu atau tidak ada). Jangkauan menunjukkan selisih nilai terbesar dan terkecil, bukan sebaran lengkap data.</ConceptNote>
    </div>
  )
}

const challenges = [
  {
    id: "jumlah",
    title: "Jumlahkan data",
    story: "Perpustakaan mencatat buku yang dibaca empat kelompok: 12, 15, 9, dan 14 buku. Berapa jumlah seluruh buku?",
    choices: ["Menjumlahkan keempat kelompok", "Mencari selisih kelompok terbesar dan terkecil", "Meneruskan pola bilangan"],
    correctPlan: "Menjumlahkan keempat kelompok",
    answer: 50,
    steps: ["Pahami: yang ditanya jumlah seluruh buku.", "Rencanakan: gabungkan banyak buku dari keempat kelompok dengan penjumlahan.", "Hitung: 12 + 15 + 9 + 14 = 50 buku.", "Periksa: 12 + 14 = 26 dan 15 + 9 = 24; 26 + 24 = 50. Besarnya masuk akal."]
  },
  {
    id: "selisih",
    title: "Bandingkan dua kelompok",
    story: "Kelompok A membaca 18 buku dan kelompok B membaca 11 buku. Berapa buku lebih banyak yang dibaca kelompok A?",
    choices: ["Menjumlahkan kedua kelompok", "Mengurangi jumlah yang lebih kecil dari yang lebih besar", "Membagi jumlah kelompok A dengan B"],
    correctPlan: "Mengurangi jumlah yang lebih kecil dari yang lebih besar",
    answer: 7,
    steps: ["Pahami: yang ditanya selisih atau ‘berapa lebih banyak’.", "Rencanakan: bandingkan dengan pengurangan, 18 − 11.", "Hitung: 18 − 11 = 7 buku.", "Periksa: 11 + 7 = 18, jadi selisih 7 cocok."]
  },
  {
    id: "pola",
    title: "Lanjutkan pola",
    story: "Urutan jumlah halaman yang dibaca: 4, 7, 10, 13, ... Berapa angka berikutnya jika aturannya tetap?",
    choices: ["Tambah 3 setiap langkah", "Kali 3 setiap langkah", "Kurangi 3 setiap langkah"],
    correctPlan: "Tambah 3 setiap langkah",
    answer: 16,
    steps: ["Pahami: kita mencari suku berikutnya.", "Rencanakan: periksa selisih antar-suku: 7 − 4 = 3, 10 − 7 = 3, dan 13 − 10 = 3.", "Hitung: lanjutkan aturan tambah 3, jadi 13 + 3 = 16.", "Periksa: aturan tambah 3 mempertahankan seluruh urutan yang diberikan."]
  },
]

function ProblemSolvingLesson() {
  const [challengeId, setChallengeId] = useState(challenges[0].id)
  const [plan, setPlan] = useState<string | null>(null)
  const [answer, setAnswer] = useState("")
  const [checked, setChecked] = useState(false)
  const challenge = challenges.find((item) => item.id === challengeId) ?? challenges[0]
  const isCorrect = plan === challenge.correctPlan && Number(answer) === challenge.answer

  const chooseChallenge = (id: string) => {
    setChallengeId(id)
    setPlan(null)
    setAnswer("")
    setChecked(false)
  }

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SD · SMP · strategi yang bisa dijelaskan" title="Jawaban kuat menunjukkan cara berpikirnya, bukan hanya hasilnya">
        Baca pertanyaan, pilih strategi, hitung, lalu uji apakah jawaban cocok dengan cerita. Pilih tantangan, tentukan rencana, dan tulis jawabanmu untuk melihat langkah penyelesaiannya.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih tantangan">
          {challenges.map((item) => <button key={item.id} type="button" aria-pressed={challenge.id === item.id} onClick={() => chooseChallenge(item.id)} className={"rounded-xl px-3 py-2 text-xs font-bold transition " + (challenge.id === item.id ? "bg-emerald-600 text-white" : "bg-muted/60 hover:bg-muted")}>{item.title}</button>)}
        </div>
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-4 sm:p-5"><p className="text-xs font-semibold text-muted-foreground">Tantangan</p><p className="mt-1 text-base font-bold leading-7">{challenge.story}</p></div>
        <fieldset className="mt-5"><legend className="text-sm font-bold">1. Pilih rencana yang sesuai</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{challenge.choices.map((choice) => <button key={choice} type="button" aria-pressed={plan === choice} onClick={() => { setPlan(choice); setChecked(false) }} className={"rounded-xl border px-3 py-3 text-left text-xs font-semibold leading-5 transition " + (plan === choice ? "border-emerald-500 bg-emerald-500/10" : "border-border/70 bg-background hover:bg-muted/50")}>{choice}</button>)}</div></fieldset>
        <label className="mt-4 block max-w-xs space-y-2 text-sm font-bold">2. Masukkan jawaban
          <input type="number" step="1" value={answer} onChange={(event) => { setAnswer(event.target.value); setChecked(false) }} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ketik angka" />
        </label>
        <button type="button" disabled={plan === null || answer.trim() === ""} onClick={() => setChecked(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><Target className="h-4 w-4" />Periksa rencana dan jawaban</button>
        {checked && <div role="status" className={"mt-4 rounded-2xl p-4 " + (isCorrect ? "bg-emerald-500/10" : "bg-amber-500/10")}><p className="text-sm font-bold">{isCorrect ? "Tepat. Rencana dan jawabanmu sesuai." : "Belum tepat. Gunakan petunjuk langkah di bawah untuk memeriksa kembali."}</p><ol className="mt-2 list-inside list-decimal space-y-1 text-sm leading-6 text-muted-foreground">{challenge.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>}
      </section>
      <ConceptNote title="Empat langkah untuk soal cerita">Pahami apa yang diketahui dan ditanya → pilih gambar, tabel, pola atau operasi yang cocok → selesaikan dengan teliti → periksa kembali satuan dan kewajaran hasil. Strategi dapat berbeda, selama langkahnya masuk akal dan menjawab pertanyaan.</ConceptNote>
    </div>
  )
}

function LearningPath() {
  const steps = [
    "SD: kumpulkan dan kelompokkan data, baca tabel atau piktogram, lalu bandingkan diagram batang.",
    "SD: jelaskan aturan pola sederhana dengan kata-kata, gambar, atau penjumlahan berulang.",
    "SMP: sajikan dan tafsirkan data, gunakan mean, median, modus, dan jangkauan, lalu pilih strategi untuk menyelesaikan masalah.",
  ]
  return <section className="rounded-3xl border border-border/70 bg-background/75 p-5 sm:p-6"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Urutan belajar SD sampai SMP</h3></div><div className="mt-4 grid gap-3 md:grid-cols-3">{steps.map((step, index) => <div key={step} className="rounded-2xl bg-muted/40 p-4"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-black text-emerald-800 dark:text-emerald-200">{index + 1}</span><p className="mt-2 text-sm leading-6 text-muted-foreground">{step}</p></div>)}</div></section>
}

export default function DataPolaPemecahanMasalah({ resetSignal }: { resetSignal: number }) {
  const [activeLesson, setActiveLesson] = useState<LessonId>("data")
  const [resetKey, setResetKey] = useState(0)
  const [mode, setMode] = useState<LearningMode>("learn")
  const [guidedStep, setGuidedStep] = useState(0)

  useEffect(() => {
    if (resetSignal === 0) return
    setActiveLesson("data")
    setMode("learn")
    setGuidedStep(0)
    setResetKey((current) => current + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [resetSignal])

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" />Laboratorium konsep | SD dan SMP</div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Data, pola, dan pemecahan masalah</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Kumpulkan dan baca data, nyatakan aturan pola, lalu pilih strategi untuk memecahkan masalah. Visual dan angka berubah bersama agar setiap langkah dapat diperiksa.</p>
        </div>
        <ModeSelector mode={mode} onChange={setMode} />
      </section>

      <section aria-labelledby="pilih-topik-data" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 id="pilih-topik-data" className="font-bold">Pilih jalur belajar</h3><p className="text-xs text-muted-foreground">4 laboratorium interaktif | SD dan SMP</p></div>
        <nav aria-label="Pilih topik data, pola, dan pemecahan masalah" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {lessons.map(({ id, title, summary, Icon }) => <button key={id} type="button" onClick={() => { setActiveLesson(id); setGuidedStep(0) }} aria-current={activeLesson === id ? "page" : undefined} className={"flex min-h-[4.25rem] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 " + (activeLesson === id ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 shadow-sm dark:text-emerald-200" : "border-border/70 bg-background/75 hover:border-emerald-400/50 hover:bg-emerald-500/5")}><span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + (activeLesson === id ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block text-xs leading-4 sm:text-sm">{title}</strong><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{summary}</span></span></button>)}
        </nav>
      </section>

      {mode === "learn" && <GuidedLearning steps={guidedSteps[activeLesson]} step={guidedStep} onStepChange={setGuidedStep} />}

      <main key={activeLesson + "-" + resetKey}>
        {activeLesson === "data" && <DataLesson />}
        {activeLesson === "pola" && <PatternLesson />}
        {activeLesson === "statistik" && <StatisticsLesson />}
        {activeLesson === "pemecahan" && <ProblemSolvingLesson />}
      </main>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Pegangan konsep</h3></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Data perlu dibaca dengan skala yang jelas. Pola perlu aturan yang cocok pada setiap langkah. Strategi soal dipilih dari apa yang diketahui dan ditanyakan, lalu hasilnya diperiksa kembali.</p></div>
        <aside className="rounded-3xl bg-emerald-500/5 p-5 sm:p-6"><div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /><h3 className="font-bold">Supaya tidak tertukar</h3></div><ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground"><li>Diagram batang menyatakan banyak data pada sumbu yang ditandai, bukan otomatis persentase.</li><li>Median baru dicari sesudah data diurutkan; modus adalah nilai paling sering muncul.</li><li>Contoh pola memuat aturan tertentu; jangan mengira suku berikutnya pasti tanpa melihat aturan atau konteks.</li></ul></aside>
      </section>

      <LearningPath />
      <RujukanPenyusunan material="data" />
    </div>
  )
}

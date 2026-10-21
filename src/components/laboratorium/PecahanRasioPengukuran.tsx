import { useEffect, useState, type ReactNode } from "react"
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Droplets,
  Lightbulb,
  PieChart,
  Ruler,
  Scale,
  Sparkles,
  Target,
} from "lucide-react"
import RujukanPenyusunan from "./RujukanPenyusunan"
import GuidedLearning, { type GuidedStep } from "./GuidedLearning"
import ModeSelector, { type LearningMode } from "./ModeSelector"

type Topic = "pecahan" | "rasio" | "pengukuran"
type MeasurementKind = "panjang" | "massa" | "kapasitas" | "waktu" | "luas" | "volume" | "suhu" | "kecepatan" | "sudut"
type MeasurementUnit = { id: string; label: string; symbol: string; factor: number; offset?: number; minimum?: number }

const topics: { id: Topic; title: string; summary: string; Icon: typeof PieChart }[] = [
  { id: "pecahan", title: "Pecahan", summary: "Bagian yang sama dan besar nilainya", Icon: PieChart },
  { id: "rasio", title: "Rasio", summary: "Hubungan antara dua banyak", Icon: Scale },
  { id: "pengukuran", title: "Pengukuran", summary: "Besaran, alat, dan satuannya", Icon: Ruler },
]

const guidedSteps: Record<Topic, GuidedStep[]> = {
  pecahan: [
    { title: "Tentukan satu utuh", description: "Sebutkan benda atau panjang yang dianggap satu utuh. Pecahan hanya bermakna jika ukuran utuhnya jelas." },
    { title: "Baca pembilang dan penyebut", description: "Penyebut membagi satu utuh menjadi bagian sama besar; pembilang menyatakan banyak bagian yang diambil atau diperhatikan." },
    { title: "Hubungkan gambar dengan nilai", description: "Bandingkan pecahan dengan ukuran satu utuh yang sama. Bagian lebih banyak belum tentu berarti nilai lebih besar jika penyebutnya berbeda." },
  ],
  rasio: [
    { title: "Tentukan dua hal yang dibandingkan", description: "Sebutkan urutannya, misalnya 2 bagian jus untuk setiap 3 bagian air. Membalik urutan mengubah makna rasio." },
    { title: "Samakan faktor pengali", description: "Rasio senilai diperoleh dengan mengalikan atau membagi kedua bagian dengan faktor yang sama." },
    { title: "Periksa konteks dan satuan", description: "Pastikan rasio membandingkan jenis banyak yang tepat dan jawaban tetap mengikuti urutan pada soal." },
  ],
  pengukuran: [
    { title: "Kenali besar yang diukur", description: "Tentukan apakah yang diukur panjang, massa, kapasitas, waktu, luas, volume, suhu, kecepatan, atau sudut." },
    { title: "Pilih alat dan satuan", description: "Gunakan alat yang sesuai dan tuliskan satuan. Jangan mencampur satuan berbeda saat menghitung." },
    { title: "Konversi dengan hubungan yang benar", description: "Ubah nilai melalui kesetaraan satuan. Luas dan volume memakai faktor konversi yang dikuadratkan atau dipangkatkan tiga." },
  ],
}

const format = (value: number, digits = 3) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value)

const unitGroups: Record<MeasurementKind, MeasurementUnit[]> = {
  panjang: [
    { id: "um", label: "mikrometer", symbol: "\u00B5m", factor: 0.000001 },
    { id: "mm", label: "milimeter", symbol: "mm", factor: 0.001 },
    { id: "cm", label: "sentimeter", symbol: "cm", factor: 0.01 },
    { id: "dm", label: "desimeter", symbol: "dm", factor: 0.1 },
    { id: "m", label: "meter", symbol: "m", factor: 1 },
    { id: "dam", label: "dekameter", symbol: "dam", factor: 10 },
    { id: "hm", label: "hektometer", symbol: "hm", factor: 100 },
    { id: "km", label: "kilometer", symbol: "km", factor: 1000 },
    { id: "in", label: "inci", symbol: "in", factor: 0.0254 },
    { id: "ft", label: "kaki", symbol: "ft", factor: 0.3048 },
    { id: "yd", label: "yard", symbol: "yd", factor: 0.9144 },
    { id: "mi", label: "mil internasional", symbol: "mi", factor: 1609.344 },
  ],
  massa: [
    { id: "ug", label: "mikrogram", symbol: "\u00B5g", factor: 0.000000001 },
    { id: "mg", label: "miligram", symbol: "mg", factor: 0.000001 },
    { id: "cg", label: "sentigram", symbol: "cg", factor: 0.00001 },
    { id: "dg", label: "desigram", symbol: "dg", factor: 0.0001 },
    { id: "g", label: "gram", symbol: "g", factor: 0.001 },
    { id: "dag", label: "dekagram", symbol: "dag", factor: 0.01 },
    { id: "hg", label: "hektogram", symbol: "hg", factor: 0.1 },
    { id: "kg", label: "kilogram", symbol: "kg", factor: 1 },
    { id: "ons-id", label: "ons Indonesia (100 g)", symbol: "ons", factor: 0.1 },
    { id: "kuintal", label: "kuintal metrik", symbol: "kuintal", factor: 100 },
    { id: "tonne", label: "ton metrik", symbol: "t", factor: 1000 },
    { id: "oz", label: "ounce avoirdupois", symbol: "oz", factor: 0.028349523125 },
    { id: "lb", label: "pound avoirdupois", symbol: "lb", factor: 0.45359237 },
  ],
  kapasitas: [
    { id: "ul", label: "mikroliter", symbol: "\u00B5L", factor: 0.000001 },
    { id: "ml", label: "mililiter", symbol: "mL", factor: 0.001 },
    { id: "cl", label: "sentiliter", symbol: "cL", factor: 0.01 },
    { id: "dl", label: "desiliter", symbol: "dL", factor: 0.1 },
    { id: "l", label: "liter", symbol: "L", factor: 1 },
    { id: "dal", label: "dekaliter", symbol: "daL", factor: 10 },
    { id: "hl", label: "hektoliter", symbol: "hL", factor: 100 },
    { id: "kl", label: "kiloliter", symbol: "kL", factor: 1000 },
    { id: "gal-us", label: "galon AS", symbol: "gal (AS)", factor: 3.785411784 },
    { id: "gal-imp", label: "galon imperial", symbol: "gal (Imp)", factor: 4.54609 },
  ],
  waktu: [
    { id: "us", label: "mikrodetik", symbol: "\u00B5s", factor: 0.000001 },
    { id: "ms", label: "milidetik", symbol: "ms", factor: 0.001 },
    { id: "s", label: "detik", symbol: "detik", factor: 1 },
    { id: "min", label: "menit", symbol: "menit", factor: 60 },
    { id: "jam", label: "jam", symbol: "jam", factor: 3600 },
    { id: "hari", label: "hari", symbol: "hari", factor: 86400 },
    { id: "minggu", label: "minggu (7 hari)", symbol: "minggu", factor: 604800 },
  ],
  luas: [
    { id: "mm2", label: "milimeter persegi", symbol: "mm\u00B2", factor: 0.000001 },
    { id: "cm2", label: "sentimeter persegi", symbol: "cm\u00B2", factor: 0.0001 },
    { id: "dm2", label: "desimeter persegi", symbol: "dm\u00B2", factor: 0.01 },
    { id: "m2", label: "meter persegi", symbol: "m²", factor: 1 },
    { id: "dam2", label: "dekameter persegi", symbol: "dam\u00B2", factor: 100 },
    { id: "hm2", label: "hektometer persegi", symbol: "hm\u00B2", factor: 10000 },
    { id: "km2", label: "kilometer persegi", symbol: "km\u00B2", factor: 1000000 },
    { id: "are", label: "are", symbol: "a", factor: 100 },
    { id: "hectare", label: "hektare", symbol: "ha", factor: 10000 },
    { id: "in2", label: "inci persegi", symbol: "in\u00B2", factor: 0.00064516 },
    { id: "ft2", label: "kaki persegi", symbol: "ft\u00B2", factor: 0.09290304 },
    { id: "yd2", label: "yard persegi", symbol: "yd\u00B2", factor: 0.83612736 },
    { id: "acre", label: "acre", symbol: "ac", factor: 4046.8564224 },
    { id: "mi2", label: "mil persegi", symbol: "mi\u00B2", factor: 2589988.110336 },
  ],
  volume: [
    { id: "mm3", label: "milimeter kubik", symbol: "mm\u00B3", factor: 0.000000001 },
    { id: "cm3", label: "sentimeter kubik", symbol: "cm\u00B3", factor: 0.000001 },
    { id: "ml-volume", label: "mililiter (sama dengan 1 cm³)", symbol: "mL", factor: 0.000001 },
    { id: "dm3", label: "desimeter kubik", symbol: "dm\u00B3", factor: 0.001 },
    { id: "liter-volume", label: "liter (sama dengan 1 dm³)", symbol: "L", factor: 0.001 },
    { id: "m3", label: "meter kubik", symbol: "m\u00B3", factor: 1 },
    { id: "kl-volume", label: "kiloliter", symbol: "kL", factor: 1 },
    { id: "dam3", label: "dekameter kubik", symbol: "dam\u00B3", factor: 1000 },
    { id: "hm3", label: "hektometer kubik", symbol: "hm\u00B3", factor: 1000000 },
    { id: "km3", label: "kilometer kubik", symbol: "km\u00B3", factor: 1000000000 },
    { id: "in3", label: "inci kubik", symbol: "in\u00B3", factor: 0.000016387064 },
    { id: "ft3", label: "kaki kubik", symbol: "ft\u00B3", factor: 0.028316846592 },
    { id: "yd3", label: "yard kubik", symbol: "yd\u00B3", factor: 0.764554857984 },
    { id: "gal-us-volume", label: "galon AS", symbol: "gal (AS)", factor: 0.003785411784 },
    { id: "gal-imp-volume", label: "galon imperial", symbol: "gal (Imp)", factor: 0.00454609 },
  ],
  suhu: [
    { id: "c", label: "derajat Celsius", symbol: "°C", factor: 1, offset: 273.15, minimum: -273.15 },
    { id: "f", label: "derajat Fahrenheit", symbol: "°F", factor: 5 / 9, offset: 255.3722222222222, minimum: -459.67 },
    { id: "k", label: "kelvin", symbol: "K", factor: 1, offset: 0, minimum: 0 },
  ],
  kecepatan: [
    { id: "mps", label: "meter per detik", symbol: "m/s", factor: 1 },
    { id: "kmh", label: "kilometer per jam", symbol: "km/jam", factor: 1 / 3.6 },
    { id: "cmps", label: "sentimeter per detik", symbol: "cm/s", factor: 0.01 },
    { id: "kmps", label: "kilometer per detik", symbol: "km/s", factor: 1000 },
    { id: "mph", label: "mil per jam", symbol: "mph", factor: 0.44704 },
    { id: "knot", label: "knot", symbol: "kn", factor: 1852 / 3600 },
  ],
  sudut: [
    { id: "deg", label: "derajat", symbol: "°", factor: Math.PI / 180 },
    { id: "rad", label: "radian", symbol: "rad", factor: 1 },
    { id: "grad", label: "gradian", symbol: "gon", factor: Math.PI / 200 },
    { id: "arcmin", label: "menit busur", symbol: "′", factor: Math.PI / 10800 },
    { id: "arcsec", label: "detik busur", symbol: "″", factor: Math.PI / 648000 },
    { id: "turn", label: "putaran penuh", symbol: "putaran", factor: 2 * Math.PI },
  ],
}

const measurementNames: Record<MeasurementKind, string> = {
  panjang: "Panjang",
  massa: "Massa",
  kapasitas: "Kapasitas",
  waktu: "Waktu",
  luas: "Luas",
  volume: "Volume",
  suhu: "Suhu",
  kecepatan: "Kecepatan",
  sudut: "Sudut",
}

const defaultAmount: Record<MeasurementKind, number> = { panjang: 2.5, massa: 1, kapasitas: 1, waktu: 90, luas: 1, volume: 1, suhu: 20, kecepatan: 60, sudut: 180 }
const defaultUnits: Record<MeasurementKind, [string, string]> = {
  panjang: ["m", "cm"], massa: ["kg", "g"], kapasitas: ["l", "ml"], waktu: ["jam", "min"],
  luas: ["m2", "cm2"], volume: ["m3", "liter-volume"], suhu: ["c", "f"], kecepatan: ["kmh", "mps"], sudut: ["deg", "rad"],
}

const conversionNotes: Record<MeasurementKind, string> = {
  panjang: "Awali dengan satuan SI (mm hingga km): setiap langkah antarprefix metrik bernilai faktor 10. Inci, kaki, yard, dan mil internasional memakai faktor tepat; 1 in = 2,54 cm dan 1 mi = 1.609,344 m.",
  massa: "Tangga metrik memakai faktor 10. Di Indonesia, 1 ons = 100 g; ini berbeda dari ounce internasional (oz) yang tepatnya 28,349523125 g. Kuintal metrik = 100 kg dan ton metrik = 1.000 kg.",
  kapasitas: "1 L = 1 dm³ = 1.000 mL. Galon tidak tunggal: galon AS = 3,785411784 L, sedangkan galon imperial = 4,54609 L. Pilih jenis galon sebelum membandingkan angka.",
  waktu: "1 menit = 60 detik, 1 jam = 60 menit, 1 hari = 24 jam, dan 1 minggu = 7 hari. Bulan dan tahun tidak diberi faktor tetap karena panjangnya bergantung kalender.",
  luas: "Luas mengukur dua arah, sehingga faktor panjang dikuadratkan: 1 m² = 10.000 cm². Are = 100 m² dan hektare = 10.000 m²; 1 km² = 100 ha. Satuan internasional seperti ft² dan acre juga tersedia.",
  volume: "Volume mengukur tiga arah, sehingga faktor panjang dipangkatkan tiga: 1 m³ = 1.000.000 cm³. Hubungan tepat: 1 cm³ = 1 mL dan 1 dm³ = 1 L. Galon AS dan imperial berbeda; ukuran kubik imperial juga tersedia.",
  suhu: "Suhu tidak dapat dikonversi hanya dengan mengalikan faktor karena titik nol skalanya berbeda. Rumus: °F = (°C × 9/5) + 32; K = °C + 273,15. Suhu tidak lebih rendah dari 0 K (−273,15 °C).",
  kecepatan: "Kecepatan membandingkan jarak dengan waktu. 1 m/s = 3,6 km/jam; 1 mil/jam = 0,44704 m/s dan 1 knot = 1.852 m per jam.",
  sudut: "Satu putaran penuh = 360° = 2π rad; sudut siku-siku = 90° = π/2 rad. Radian menghubungkan sudut dengan panjang busur dibagi jari-jari.",
}

const measurementScenarios: Record<MeasurementKind, { question: string; choices: string[]; answer: string; explanation: string }> = {
  panjang: { question: "Satuan paling masuk akal untuk mengukur tinggi pintu kelas?", choices: ["mm", "cm", "m", "km"], answer: "m", explanation: "Tinggi pintu biasanya sekitar 2 meter. Kilometer terlalu besar; milimeter dan sentimeter kurang praktis untuk menyebut tinggi pintu." },
  massa: { question: "Satuan yang cocok untuk massa satu karung beras?", choices: ["mg", "g", "kg"], answer: "kg", explanation: "Karung beras berisi banyak kilogram. Miligram dan gram terlalu kecil untuk menyatakan massanya dengan praktis." },
  kapasitas: { question: "Satuan yang cocok untuk kapasitas satu botol minum?", choices: ["mL", "L"], answer: "mL", explanation: "Botol minum biasanya berkapasitas ratusan mililiter, misalnya 600 mL." },
  waktu: { question: "Satuan yang cocok untuk lama istirahat sekolah?", choices: ["detik", "menit", "jam", "hari"], answer: "menit", explanation: "Waktu istirahat biasanya dinyatakan dalam puluhan menit, bukan detik atau hari." },
  luas: { question: "Satuan yang cocok untuk luas lantai ruang kelas?", choices: ["cm²", "m²"], answer: "m²", explanation: "Luas lantai kelas cukup besar, jadi meter persegi lebih praktis daripada sentimeter persegi." },
  volume: { question: "Satuan yang cocok untuk volume air di kolam renang?", choices: ["cm³", "dm³", "m³"], answer: "m³", explanation: "Kolam berukuran besar; meter kubik lebih praktis untuk menyatakan volumenya." },
  suhu: { question: "Suhu ruang kelas 25 °C. Skala mana yang menunjukkan nilai setara?", choices: ["25 K", "77 °F", "45 °F"], answer: "77 °F", explanation: "°F = (°C × 9/5) + 32, jadi (25 × 1,8) + 32 = 77 °F. Angka suhu berubah karena titik nol skala berbeda." },
  kecepatan: { question: "Kecepatan 36 km/jam setara dengan berapa m/s?", choices: ["10 m/s", "36 m/s", "100 m/s"], answer: "10 m/s", explanation: "Untuk mengubah km/jam ke m/s, bagi 3,6. Jadi 36 ÷ 3,6 = 10 m/s." },
  sudut: { question: "Sudut siku-siku setara dengan berapa radian?", choices: ["π/4 rad", "π/2 rad", "2π rad"], answer: "π/2 rad", explanation: "Sudut siku-siku = 90°. Karena 180° = π rad, maka 90° = π/2 rad." },
}

const practiceByTopic: Record<Topic, { question: string; options: string[]; answer: string; explanation: string }> = {
  pecahan: {
    question: "Kue yang sama dibagi rata. Mana yang nilainya lebih besar?",
    options: ["3/4", "2/3", "Sama besar"],
    answer: "3/4",
    explanation: "Samakan penyebut: 3/4 = 9/12 dan 2/3 = 8/12. Jadi 3/4 lebih besar.",
  },
  rasio: {
    question: "Perbandingan sirup dan air adalah 2 : 3. Ada berapa bagian seluruhnya?",
    options: ["2 bagian", "3 bagian", "5 bagian"],
    answer: "5 bagian",
    explanation: "Dua bagian sirup ditambah tiga bagian air menjadi lima bagian campuran.",
  },
  pengukuran: {
    question: "Pita sepanjang 2,5 meter sama dengan berapa sentimeter?",
    options: ["25 cm", "250 cm", "2.500 cm"],
    answer: "250 cm",
    explanation: "1 meter = 100 sentimeter, jadi 2,5 × 100 = 250 sentimeter.",
  },
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">{eyebrow}</p><h3 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p></div>
}

function FractionLesson() {
  const [denominator, setDenominator] = useState(4)
  const [numerator, setNumerator] = useState(3)
  const [showReasoning, setShowReasoning] = useState(false)

  const changeDenominator = (value: number) => {
    setDenominator(value)
    setNumerator((current) => Math.min(current, value))
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="SD Fase B–C · SMP Fase D" title="Pecahan menyatakan banyaknya bagian sama besar dari satu utuh">
        Pecahan bukan sekadar “potongan kue”. Pecahan juga sebuah bilangan yang menunjukkan letak atau besar nilai; a/b juga berarti a dibagi b. Untuk membandingkan bagian, pastikan satu utuhnya sama dan dibagi menjadi bagian yang sama besar.
      </SectionTitle>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7 md:col-span-2" aria-labelledby="model-pecahan">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold text-muted-foreground">Model bagian dari satu utuh</p><h4 id="model-pecahan" className="mt-1 text-lg font-bold">Berapa bagian yang dipilih?</h4></div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-200">{numerator}/{denominator}</span>
          </div>
          <div className="mt-6 rounded-2xl bg-muted/40 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>0 · tidak ada bagian</span><span>1 · satu utuh</span></div>
            <div className="mt-3 grid h-14 overflow-hidden rounded-xl border-2 border-emerald-800/70 bg-background dark:border-emerald-300/70" style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }} role="img" aria-label={`${numerator} dari ${denominator} bagian sama besar diwarnai`}>
              {Array.from({ length: denominator }, (_, index) => <div key={index} className={(index > 0 ? "border-l-2 border-background/90 " : "") + (index < numerator ? "bg-emerald-500" : "bg-transparent")} />)}
            </div>
            <div className="mt-4" role="img" aria-label={`Garis bilangan dari nol ke satu, titik berada di ${numerator}/${denominator}`}>
              <div className="relative mx-2 h-10">
                <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-muted-foreground/30" />
                {Array.from({ length: denominator + 1 }, (_, index) => <span key={index} className="absolute top-2.5 h-4 w-px bg-muted-foreground/60" style={{ left: `${(index / denominator) * 100}%` }} />)}
                <span className="absolute top-2 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-background bg-orange-500 shadow" style={{ left: `${(numerator / denominator) * 100}%` }} />
              </div>
              <div className="flex justify-between text-xs font-semibold text-muted-foreground"><span>0</span><span>{numerator}/{denominator}</span><span>1</span></div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">Pembilang <span className="font-normal text-muted-foreground">(bagian yang dipilih)</span>
              <input aria-label="Pembilang" type="range" min="0" max={denominator} step="1" value={numerator} onChange={(event) => setNumerator(Number(event.target.value))} className="block h-2 w-full cursor-pointer accent-emerald-600" />
              <span className="block text-xs tabular-nums text-muted-foreground">{numerator} bagian dipilih</span>
            </label>
            <label className="space-y-2 text-sm font-semibold">Penyebut <span className="font-normal text-muted-foreground">(semua bagian sama besar)</span>
              <input aria-label="Penyebut" type="range" min="2" max="12" step="1" value={denominator} onChange={(event) => changeDenominator(Number(event.target.value))} className="block h-2 w-full cursor-pointer accent-emerald-600" />
              <span className="block text-xs tabular-nums text-muted-foreground">Satu utuh dibagi menjadi {denominator} bagian sama besar</span>
            </label>
          </div>
          <div className="mt-5 rounded-2xl bg-emerald-500/8 p-4 text-sm leading-6">
            <strong className="text-emerald-800 dark:text-emerald-200">Cara membacanya:</strong> {numerator}/{denominator} berarti {numerator} bagian dari {denominator} bagian sama besar dalam satu utuh.
            <button type="button" onClick={() => setShowReasoning((current) => !current)} aria-expanded={showReasoning} className="ml-2 font-semibold text-emerald-800 underline decoration-emerald-500/50 underline-offset-4 dark:text-emerald-200">{showReasoning ? "Tutup penjelasan" : "Mengapa harus sama besar?"}</button>
            {showReasoning && <p className="mt-2 text-muted-foreground">Kalau ukuran potongannya berbeda, menghitung “berapa potong” saja tidak cukup untuk menentukan besar bagian. Penyebut menghitung banyak bagian yang sama besar dari satu utuh.</p>}
          </div>
        </section>

        <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
          <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-emerald-600" /><h4 className="font-bold">Pecahan senilai: posisi sama, nama berbeda</h4></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Dua bilah ini menunjukkan nilai yang sama. Setiap bagian pada bilah kedua lebih kecil, tetapi bagian yang diwarnai juga bertambah dengan faktor yang sama.</p>
            <div className="mt-4 space-y-3">
              {[{ n: 1, d: 2 }, { n: 2, d: 4 }, { n: 4, d: 8 }].map(({ n, d }) => <div key={d} className="flex items-center gap-3"><span className="w-10 shrink-0 text-sm font-bold tabular-nums">{n}/{d}</span><div className="grid h-7 flex-1 overflow-hidden rounded-lg border border-emerald-900/30" style={{ gridTemplateColumns: `repeat(${d}, minmax(0, 1fr))` }} role="img" aria-label={`${n} dari ${d} bagian menunjukkan setengah`}>
                {Array.from({ length: d }, (_, index) => <div key={index} className={(index > 0 ? "border-l border-background " : "") + (index < n ? "bg-emerald-500" : "bg-muted/50")} />)}
              </div></div>)}
            </div>
            <p className="mt-4 rounded-xl bg-muted/50 p-3 text-sm leading-5"><strong>Aturannya:</strong> kalikan atau bagi pembilang dan penyebut dengan bilangan yang sama, selain nol. Nilai pecahan tetap sama.</p>
          </section>
          <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /><h4 className="font-bold">Dari gambar ke operasi</h4></div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              <p><strong className="text-foreground">Penjumlahan:</strong> 1/4 + 2/4 = 3/4. Ukuran bagiannya sama, jadi jumlahkan bagian yang dipilih.</p>
              <p><strong className="text-foreground">Penyebut berbeda:</strong> ubah dulu ke bagian yang ukurannya sama. Contoh: 1/2 + 1/3 = 3/6 + 2/6 = 5/6.</p>
              <p><strong className="text-foreground">Membandingkan:</strong> jika penyebut sama, bagian dengan pembilang lebih besar bernilai lebih besar. Jika penyebut berbeda, samakan penyebut atau bandingkan lewat garis bilangan.</p>
              <p><strong className="text-foreground">Perkalian atau pembagian:</strong> di SD akhir/SMP, hubungkan aturan hitung dengan makna “bagian dari” atau “berapa kelompok”. Contoh: 1/2 × 6 = 3 karena setengah dari 6 benda adalah 3 benda.</p>
            </div>
          </section>
          <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <h4 className="font-bold">Tiga cara menulis nilai yang sama</h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Bagian yang diwarnai tetap sama meski bentuk bilangannya berubah.</p>
            <div className="mt-4 flex items-center gap-3"><span className="text-sm font-black">3/4</span><span aria-hidden="true" className="text-muted-foreground">=</span><span className="text-sm font-black">0,75</span><span aria-hidden="true" className="text-muted-foreground">=</span><span className="text-sm font-black">75%</span></div>
            <div className="mt-3 h-5 overflow-hidden rounded-full bg-muted" role="img" aria-label="Tiga perempat, nol koma tujuh lima, dan tujuh puluh lima persen menunjukkan bagian yang sama"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: "75%" }} /></div>
          </section>
          <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <h4 className="font-bold">Pecahan bisa lebih dari satu utuh</h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Lima potong berukuran seperempat membentuk satu utuh dan seperempat lagi.</p>
            <div className="mt-4 space-y-2" role="img" aria-label="Lima perempat terdiri dari satu utuh dan satu perempat tambahan">
              {[{ label: "1 utuh", filled: 4 }, { label: "sisa 1/4", filled: 1 }].map(({ label, filled }) => <div key={label} className="flex items-center gap-3"><span className="w-14 shrink-0 text-xs font-semibold">{label}</span><div className="grid h-6 flex-1 overflow-hidden rounded-lg border border-emerald-900/30" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>{Array.from({ length: 4 }, (_, index) => <div key={index} className={(index ? "border-l border-background " : "") + (index < filled ? "bg-emerald-500" : "bg-muted/50")} />)}</div></div>)}
            </div>
            <p className="mt-3 text-center text-sm font-black">5/4 = 1 1/4</p>
          </section>
        </div>
      </div>

      <FractionComparator />
      <Misconception text="Penyebut lebih besar tidak otomatis berarti pecahan lebih besar. Jika satu utuh sama, 1/8 lebih kecil daripada 1/4 karena utuhnya dibagi menjadi lebih banyak bagian." />
      <LearningPath items={["SD: berbagi sama rata, membaca pecahan, dan mengenali pecahan senilai.", "SD kelas tinggi: membandingkan, mengurutkan, serta menjumlah dan mengurang pecahan.", "SMP: menghubungkan pecahan, desimal, persen, dan operasi pecahan dalam masalah sehari-hari."]} />
    </div>
  )
}

function FractionComparator() {
  const [leftNumerator, setLeftNumerator] = useState(2)
  const [leftDenominator, setLeftDenominator] = useState(3)
  const [rightNumerator, setRightNumerator] = useState(3)
  const [rightDenominator, setRightDenominator] = useState(4)
  const [answer, setAnswer] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const leftValue = leftNumerator / leftDenominator
  const rightValue = rightNumerator / rightDenominator
  const correctAnswer = leftValue > rightValue ? ">" : leftValue < rightValue ? "<" : "="
  const leftCommonNumerator = leftNumerator * rightDenominator
  const rightCommonNumerator = rightNumerator * leftDenominator
  const commonDenominator = leftDenominator * rightDenominator

  const updateFraction = (side: "kiri" | "kanan", numerator?: number, denominator?: number) => {
    if (side === "kiri") {
      if (denominator !== undefined) {
        setLeftDenominator(denominator)
        setLeftNumerator((current) => Math.min(current, denominator))
      }
      if (numerator !== undefined) setLeftNumerator(numerator)
    } else {
      if (denominator !== undefined) {
        setRightDenominator(denominator)
        setRightNumerator((current) => Math.min(current, denominator))
      }
      if (numerator !== undefined) setRightNumerator(numerator)
    }
    setAnswer(null)
    setChecked(false)
  }

  const fractionControl = (side: "kiri" | "kanan", numerator: number, denominator: number, color: string) => (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex items-center justify-between gap-2"><strong className="text-sm">Pecahan {side}</strong><span className="text-lg font-black tabular-nums">{numerator}/{denominator}</span></div>
      <div className="mt-3 grid h-7 overflow-hidden rounded-lg border border-border" style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }} role="img" aria-label={`${numerator} dari ${denominator} bagian diwarnai`}>
        {Array.from({ length: denominator }, (_, index) => <div key={index} className={(index ? "border-l border-background " : "") + (index < numerator ? color : "bg-muted/50")} />)}
      </div>
      <label className="mt-4 block space-y-1.5 text-xs font-semibold text-muted-foreground">Pembilang: {numerator}
        <input aria-label={`Pembilang pecahan ${side}`} type="range" min="0" max={denominator} value={numerator} onChange={(event) => updateFraction(side, Number(event.target.value))} className="block h-2 w-full cursor-pointer accent-emerald-600" />
      </label>
      <label className="mt-3 block space-y-1.5 text-xs font-semibold text-muted-foreground">Penyebut: {denominator}
        <input aria-label={`Penyebut pecahan ${side}`} type="range" min="2" max="12" value={denominator} onChange={(event) => updateFraction(side, undefined, Number(event.target.value))} className="block h-2 w-full cursor-pointer accent-cyan-600" />
      </label>
    </div>
  )

  return (
    <section className="rounded-3xl border border-emerald-300/40 bg-emerald-500/5 p-5 shadow-sm sm:p-7" aria-labelledby="tantangan-pecahan">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Coba sendiri</p><h4 id="tantangan-pecahan" className="mt-1 text-xl font-black">Adu pecahan di garis bilangan</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">Atur pembilang dan penyebut. Perhatikan posisi kedua titik pada garis bilangan 0 sampai 1, lalu pilih tanda yang tepat.</p></div><Target className="h-6 w-6 text-emerald-600" /></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {fractionControl("kiri", leftNumerator, leftDenominator, "bg-emerald-500")}
        {fractionControl("kanan", rightNumerator, rightDenominator, "bg-cyan-500")}
      </div>
      <div className="mt-4 rounded-2xl bg-background/80 p-4">
        <p className="text-xs font-semibold text-muted-foreground">Garis bilangan yang sama</p>
        <div className="relative mx-2 mt-2 h-9" role="img" aria-label={`Pada garis dari nol ke satu, ${leftNumerator}/${leftDenominator} berada di ${format(leftValue * 100, 1)} persen dan ${rightNumerator}/${rightDenominator} berada di ${format(rightValue * 100, 1)} persen`}>
          <div className="absolute inset-x-0 top-4 h-1 rounded-full bg-muted-foreground/30" />
          <span className="absolute left-0 top-2.5 h-4 w-px bg-muted-foreground/60" /><span className="absolute right-0 top-2.5 h-4 w-px bg-muted-foreground/60" />
          <span className="absolute top-2 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-background bg-emerald-600 shadow" style={{ left: `${leftValue * 100}%` }} />
          <span className="absolute top-2 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-background bg-cyan-600 shadow" style={{ left: `${rightValue * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs font-semibold text-muted-foreground"><span>0</span><span>1</span></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Pilih hubungan antara pecahan">
        {["<", "=", ">"].map((symbol) => <button key={symbol} type="button" aria-pressed={answer === symbol} onClick={() => { setAnswer(symbol); setChecked(false) }} className={"min-w-14 rounded-xl px-4 py-2.5 text-lg font-black transition " + (answer === symbol ? "bg-emerald-600 text-white" : "bg-background hover:bg-muted")}>{symbol}</button>)}
        <span className="ml-1 text-sm font-bold tabular-nums">{leftNumerator}/{leftDenominator} {answer ?? "___"} {rightNumerator}/{rightDenominator}</span>
        <button type="button" disabled={!answer} onClick={() => setChecked(true)} className="ml-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Periksa</button>
      </div>
      {checked && <p role="status" className={"mt-3 rounded-xl p-3 text-sm leading-6 " + (answer === correctAnswer ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-800 dark:text-amber-200")}>{answer === correctAnswer ? "Tepat. " : "Coba amati lagi. "}Dengan penyebut sama {commonDenominator}, pecahan kiri menjadi {leftCommonNumerator}/{commonDenominator} dan pecahan kanan menjadi {rightCommonNumerator}/{commonDenominator}. Titik yang lebih ke kanan menunjukkan nilai yang lebih besar.</p>}
    </section>
  )
}

function RatioLesson() {
  const [syrupParts, setSyrupParts] = useState(2)
  const [waterParts, setWaterParts] = useState(3)
  const [scale, setScale] = useState(2)
  const [waterGuess, setWaterGuess] = useState("")
  const [waterGuessChecked, setWaterGuessChecked] = useState(false)
  const totalParts = syrupParts + waterParts
  const waterNeededForEightCupsOfSyrup = 8 * waterParts / syrupParts

  const changeSyrupParts = (value: number) => {
    setSyrupParts(value)
    setWaterGuess("")
    setWaterGuessChecked(false)
  }

  const changeWaterParts = (value: number) => {
    setWaterParts(value)
    setWaterGuess("")
    setWaterGuessChecked(false)
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="SD kelas tinggi · SMP" title="Rasio membandingkan banyak dua hal dengan urutan yang jelas">
        Rasio menjawab “berapa banyak A dibandingkan dengan B?” Urutan dan satuannya penting. Rasio 2 : 3 berarti 2 bagian A untuk setiap 3 bagian B; rasio ini tidak sama dengan selisih 1.
      </SectionTitle>

      <div className="space-y-4">
        <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7" aria-labelledby="model-rasio">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-muted-foreground">Resep minuman · satuan sama-sama cangkir</p><h4 id="model-rasio" className="mt-1 text-lg font-bold">Atur perbandingan sirup dan air</h4></div><Droplets className="h-6 w-6 text-cyan-600" /></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">Bagian sirup: {syrupParts}
              <input aria-label="Bagian sirup dalam rasio" type="range" min="1" max="6" value={syrupParts} onChange={(event) => changeSyrupParts(Number(event.target.value))} className="block h-2 w-full cursor-pointer accent-pink-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold">Bagian air: {waterParts}
              <input aria-label="Bagian air dalam rasio" type="range" min="1" max="6" value={waterParts} onChange={(event) => changeWaterParts(Number(event.target.value))} className="block h-2 w-full cursor-pointer accent-cyan-600" />
            </label>
          </div>
          <div className="mt-5 rounded-2xl bg-muted/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Rasio sirup : air</span><span className="rounded-full bg-background px-3 py-1 text-lg font-black tabular-nums">{syrupParts} : {waterParts}</span></div>
            <div className="mt-4 flex min-h-10 overflow-hidden rounded-xl" role="img" aria-label={`Dari ${totalParts} bagian, ${syrupParts} bagian sirup dan ${waterParts} bagian air`}>
              {Array.from({ length: totalParts }, (_, index) => <div key={index} className={(index ? "border-l-2 border-background " : "") + (index < syrupParts ? "bg-pink-400" : "bg-cyan-400")} style={{ width: `${100 / totalParts}%` }} />)}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>■ Sirup ({syrupParts})</span><span>■ Air ({waterParts})</span></div>
            <p className="mt-4 text-sm leading-6">Sirup dibanding air = <strong>{syrupParts} : {waterParts}</strong>. Sirup dibanding seluruh campuran = <strong>{syrupParts}/{totalParts}</strong>. Pertanyaannya berbeda, jadi pembandingnya juga berbeda.</p>
          </div>
          <div className="mt-5 rounded-2xl border border-border/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h5 className="font-bold">Perbesar resep tanpa mengubah rasa</h5><p className="mt-1 text-xs text-muted-foreground">Kalikan kedua bagian dengan angka yang sama.</p></div><span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-bold">Faktor ×{scale}</span></div>
            <input aria-label="Faktor skala resep" type="range" min="1" max="5" value={scale} onChange={(event) => setScale(Number(event.target.value))} className="mt-4 h-2 w-full cursor-pointer accent-emerald-600" />
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><div className="rounded-xl bg-pink-500/10 p-3"><span className="block text-xs text-muted-foreground">Sirup</span><strong className="text-lg tabular-nums">{syrupParts * scale} cangkir</strong></div><span className="font-bold text-muted-foreground">:</span><div className="rounded-xl bg-cyan-500/10 p-3"><span className="block text-xs text-muted-foreground">Air</span><strong className="text-lg tabular-nums">{waterParts * scale} cangkir</strong></div></div>
            <p className="mt-3 text-center text-sm font-semibold">{syrupParts} : {waterParts} = {syrupParts * scale} : {waterParts * scale}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-300/40 bg-cyan-500/5 p-4" aria-labelledby="tantangan-resep">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Misi resep</p>
            <h5 id="tantangan-resep" className="mt-1 font-bold">Jika memakai 8 cangkir sirup, berapa cangkir air agar rasanya sama?</h5>
            <div className="mt-3 flex flex-wrap items-end gap-2"><label className="space-y-1 text-xs font-semibold text-muted-foreground">Tebakanmu
              <input aria-label="Tebakan jumlah cangkir air" type="number" min="0" step="0.1" value={waterGuess} onChange={(event) => { setWaterGuess(event.target.value); setWaterGuessChecked(false) }} className="block w-36 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-cyan-500" />
            </label><span className="mb-2 text-sm font-semibold">cangkir air</span><button type="button" disabled={!waterGuess.trim()} onClick={() => setWaterGuessChecked(true)} className="ml-auto rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-40">Cek takaran</button></div>
            {waterGuessChecked && <p role="status" className={"mt-3 rounded-xl p-3 text-sm leading-6 " + (Math.abs(Number(waterGuess) - waterNeededForEightCupsOfSyrup) < 0.001 ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-800 dark:text-amber-200")}>{Math.abs(Number(waterGuess) - waterNeededForEightCupsOfSyrup) < 0.001 ? "Benar. " : "Belum tepat. "}Rasio {syrupParts} : {waterParts} berarti setiap {syrupParts} cangkir sirup memerlukan {waterParts} cangkir air. Untuk 8 cangkir sirup, kalikan kedua bagian dengan {format(8 / syrupParts, 2)}; air yang diperlukan {format(waterNeededForEightCupsOfSyrup, 2)} cangkir.</p>}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <h4 className="font-bold">Rasio, pecahan, dan laju</h4>
            <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              <p><strong className="text-foreground">Rasio bagian ke bagian:</strong> sirup : air = 2 : 3. Pecahan 2/3 bisa menyatakan hasil membagi banyak sirup dengan banyak air, tetapi konteks dan urutannya tetap harus disebut.</p>
              <p><strong className="text-foreground">Rasio bagian ke keseluruhan:</strong> sirup adalah 2 dari 5 bagian campuran, jadi bagiannya 2/5.</p>
              <p><strong className="text-foreground">Laju satuan:</strong> jika 120 km ditempuh dalam 2 jam, laju rata-ratanya 60 km per jam. Satuannya berbeda dan ditulis bersama: km/jam.</p>
            </div>
          </section>
          <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><CircleHelp className="h-5 w-5 text-amber-500" /><h4 className="font-bold">Bagaimana tahu dua rasio senilai?</h4></div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Rasio 2 : 3 dan 4 : 6 senilai karena kedua bilangannya sama-sama dikali 2. Pada tabel rasio atau garis bilangan ganda, perubahan pada satu jumlah diikuti faktor yang sama pada jumlah pasangannya.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm"><div className="rounded-xl bg-muted/50 p-3"><span className="block text-xs text-muted-foreground">sirup (cangkir)</span><strong>2 → 4</strong></div><div className="rounded-xl bg-muted/50 p-3"><span className="block text-xs text-muted-foreground">air (cangkir)</span><strong>3 → 6</strong></div></div>
          </section>
          <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-6">
            <h4 className="font-bold">Senilai atau berbalik nilai?</h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Senilai:</strong> jumlah cangkir resep dikali 2, maka setiap bahan juga dikali 2.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Berbalik nilai:</strong> untuk pekerjaan yang sama dengan laju kerja tetap, jika pekerja menjadi 2 kali lipat, waktu pengerjaan menjadi setengah. Periksa konteks sebelum memakai aturan ini.</p>
          </section>
        </div>
      </div>
      <Misconception text="Rasio 2 : 3 bukan berarti selisih kedua jumlah selalu satu. Itu menyatakan perbandingan; jika diperbesar menjadi 4 : 6, selisihnya berubah tetapi perbandingannya tetap." />
      <LearningPath items={["SD kelas tinggi: membaca rasio dalam konteks dan menyelesaikan masalah rasio satuan sederhana.", "SMP: membuat tabel rasio, mencari rasio senilai, memahami laju satuan, skala, dan hubungan proporsional."]} />
    </div>
  )
}

function MeasurementLesson() {
  const [kind, setKind] = useState<MeasurementKind>("panjang")
  const [measuredLength, setMeasuredLength] = useState(7.3)
  const [amount, setAmount] = useState(2.5)
  const [fromId, setFromId] = useState("m")
  const [toId, setToId] = useState("cm")
  const units = unitGroups[kind]
  const fromUnit = units.find((unit) => unit.id === fromId) ?? units[0]
  const toUnit = units.find((unit) => unit.id === toId) ?? units[1] ?? units[0]
  const converted = (amount * fromUnit.factor + (fromUnit.offset ?? 0) - (toUnit.offset ?? 0)) / toUnit.factor
  const kinds = Object.keys(unitGroups) as MeasurementKind[]

  const chooseKind = (next: MeasurementKind) => {
    setKind(next)
    setAmount(defaultAmount[next])
    setFromId(defaultUnits[next][0])
    setToId(defaultUnits[next][1])
  }

  const chooseFromUnit = (nextId: string) => {
    const nextUnit = units.find((unit) => unit.id === nextId)
    if (kind === "suhu" && nextUnit) {
      const kelvin = amount * fromUnit.factor + (fromUnit.offset ?? 0)
      const nextAmount = (kelvin - (nextUnit.offset ?? 0)) / nextUnit.factor
      setAmount(Math.max(nextUnit.minimum ?? 0, nextAmount))
    }
    setFromId(nextId)
  }
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="SD · SMP" title="Mengukur berarti membandingkan besaran dengan satuan yang disepakati">
        Hasil ukur selalu memuat angka dan satuan, misalnya 7,3 cm. Pilih alat yang cocok, sejajarkan titik awal dengan nol, lalu baca titik akhirnya. Angka tanpa satuan belum cukup menjelaskan panjang, massa, kapasitas, luas, atau volume.
      </SectionTitle>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7" aria-labelledby="penggaris">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-muted-foreground">Simulasi membaca penggaris</p><h4 id="penggaris" className="mt-1 text-lg font-bold">Geser panjang bendanya</h4></div><Ruler className="h-6 w-6 text-emerald-600" /></div>
          <div className="mt-5 rounded-2xl bg-muted/40 p-4 sm:p-5">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground"><span>Benda dimulai tepat di 0</span><span>Panjang: {format(measuredLength, 1)} cm</span></div>
            <div className="relative mt-5 h-16 rounded-t-xl border-x border-t border-amber-700/30 bg-amber-200/70 dark:bg-amber-900/30" role="img" aria-label={`Benda dimulai pada nol dan berakhir di ${format(measuredLength, 1)} sentimeter`}>
              <div className="absolute inset-x-0 top-0 flex h-8 justify-between">
                {Array.from({ length: 31 }, (_, index) => <span key={index} className={(index % 2 === 0 ? "h-6 border-l border-amber-900/70 " : "h-3 border-l border-amber-900/40 ") + "relative block w-px shrink-0"}>{index % 2 === 0 && <span className="absolute -left-1.5 top-7 text-[9px] text-foreground/70">{index / 2}</span>}</span>)}
              </div>
              <div className="absolute bottom-1 left-0 h-5 rounded-r-md bg-emerald-500/80" style={{ width: `${(measuredLength / 15) * 100}%` }} />
              <span className="absolute bottom-0 h-full border-l-2 border-orange-600" style={{ left: `${(measuredLength / 15) * 100}%` }} />
            </div>
            <input aria-label="Panjang benda dalam sentimeter" type="range" min="1" max="15" step="0.1" value={measuredLength} onChange={(event) => setMeasuredLength(Number(event.target.value))} className="mt-5 h-2 w-full cursor-pointer accent-emerald-600" />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Setiap jarak antarangka besar adalah 1 cm; garis kecil di antaranya menunjukkan setengah sentimeter. Baca posisi ujung benda, bukan menghitung garisnya.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-500/8 p-4"><strong className="text-sm">Titik awal harus benar</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Letakkan ujung benda di angka 0. Jika mulai di angka 2 dan berakhir di 8 cm, panjangnya 8 − 2 = 6 cm.</p></div>
            <div className="rounded-2xl bg-cyan-500/8 p-4"><strong className="text-sm">Pilih satuan yang pas</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Milimeter untuk benda kecil, sentimeter untuk benda sehari-hari, meter untuk ruangan, dan kilometer untuk jarak jauh.</p></div>
          </div>
        </section>

        <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7" aria-labelledby="konversi-satuan">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-muted-foreground">Konversi satuan</p><h4 id="konversi-satuan" className="mt-1 text-lg font-bold">Pilih besaran dan satuannya</h4></div><ArrowLeftRight className="h-6 w-6 text-cyan-600" /></div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Pilih besaran yang diukur">
            {kinds.map((item) => <button key={item} type="button" onClick={() => chooseKind(item)} aria-pressed={kind === item} className={"rounded-full px-3 py-2 text-xs font-semibold transition " + (kind === item ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70")}>{measurementNames[item]}</button>)}
          </div>
          <label className="mt-5 block space-y-2 text-sm font-semibold">Nilai yang akan diubah
            <input aria-label={`Nilai ${measurementNames[kind].toLowerCase()}`} type="number" min={fromUnit.minimum ?? 0} step="any" value={amount} onChange={(event) => setAmount(Math.max(fromUnit.minimum ?? 0, Number(event.target.value)))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
          </label>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="space-y-2 text-xs font-semibold text-muted-foreground">Dari
              <select aria-label="Satuan awal" value={fromUnit.id} onChange={(event) => chooseFromUnit(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-emerald-500">{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol} — {unit.label}</option>)}</select>
            </label>
            <ArrowLeftRight aria-hidden="true" className="mb-3 h-4 w-4 text-muted-foreground" />
            <label className="space-y-2 text-xs font-semibold text-muted-foreground">Ke
              <select aria-label="Satuan tujuan" value={toUnit.id} onChange={(event) => setToId(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-emerald-500">{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.symbol} — {unit.label}</option>)}</select>
            </label>
          </div>
          <div className="mt-4 rounded-2xl bg-emerald-500/10 p-4" aria-live="polite"><p className="text-xs text-muted-foreground">Hasil konversi</p><p className="mt-1 break-words text-2xl font-black tabular-nums">{format(amount, 9)} {fromUnit.symbol} = {format(converted, 9)} {toUnit.symbol}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Nilai besaran tidak berubah; yang berubah hanya satuan penulisannya.</p></div>
          <div className="mt-4 rounded-2xl border border-border/70 p-4 text-sm leading-6">
            <p>{conversionNotes[kind]}</p>
          </div>
        </section>
      </div>
      <UnitChoiceChallenge key={kind} kind={kind} />
      <div className="grid gap-4 md:grid-cols-3">
        <FactCard title="Pilih alat sesuai besaran" text="Penggaris untuk panjang, timbangan untuk massa, jam untuk waktu, dan gelas ukur untuk kapasitas." />
        <FactCard title="Luas bukan panjang" text="Panjang memakai cm atau m; luas memakai cm² atau m². Jangan mengubah luas seperti mengubah panjang." />
        <FactCard title="Volume punya tiga arah" text="Kotak 1 m × 1 m × 1 m memuat 1 m³. Karena itu konversi volume memakai faktor pangkat tiga." />
      </div>
      <LearningPath items={["SD: memperkirakan, memilih alat, mengukur, dan menulis hasil beserta satuannya.", "SD kelas tinggi: mengubah satuan umum panjang, massa, waktu, serta menghitung keliling dan luas.", "SMP: membedakan panjang, luas, volume, kapasitas dan menggunakan satuan yang tepat pada soal kontekstual."]} />
    </div>
  )
}

function UnitChoiceChallenge({ kind }: { kind: MeasurementKind }) {
  const [choice, setChoice] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const scenario = measurementScenarios[kind]
  const isCorrect = choice === scenario.answer

  return (
    <section className="rounded-3xl border border-cyan-300/40 bg-cyan-500/5 p-5 shadow-sm sm:p-6" aria-labelledby="tantangan-satuan">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">Pilih sebelum mengukur</p><h4 id="tantangan-satuan" className="mt-1 text-lg font-black">Satuan mana yang paling masuk akal?</h4><p className="mt-2 text-sm text-muted-foreground">Pilih satuan yang pas untuk situasi ini, bukan sekadar satuan yang bisa dipakai menghitung.</p></div><Target className="h-6 w-6 text-cyan-700" /></div>
      <p className="mt-4 font-semibold">{scenario.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">{scenario.choices.map((option) => <button key={option} type="button" aria-pressed={choice === option} onClick={() => { setChoice(option); setChecked(false) }} className={"rounded-xl px-4 py-2.5 text-sm font-bold transition " + (choice === option ? "bg-cyan-700 text-white" : "bg-background hover:bg-muted")}>{option}</button>)}</div>
      <button type="button" disabled={!choice} onClick={() => setChecked(true)} className="mt-3 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-40">Periksa pilihan</button>
      {checked && <p role="status" className={"mt-3 rounded-xl p-3 text-sm leading-6 " + (isCorrect ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-800 dark:text-amber-200")}>{isCorrect ? "Pilihan yang pas. " : "Coba pikirkan besar-kecil bendanya. "}{scenario.explanation}</p>}
    </section>
  )
}

function Misconception({ text }: { text: string }) {
  return <aside className="flex gap-3 rounded-2xl border border-amber-300/50 bg-amber-500/8 p-4 sm:p-5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300"><Lightbulb className="h-4 w-4" /></div><div><h4 className="text-sm font-bold">Cek agar tidak keliru</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></aside>
}

function LearningPath({ items }: { items: string[] }) {
  return <section className="rounded-3xl border border-border/70 bg-background/75 p-5 sm:p-6"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-600" /><h4 className="font-bold">Urutan belajar SD sampai SMP</h4></div><div className="mt-4 grid gap-3 md:grid-cols-3">{items.map((item, index) => <div key={item} className="rounded-2xl bg-muted/40 p-4"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-black text-emerald-800 dark:text-emerald-200">{index + 1}</span><p className="mt-2 text-sm leading-6 text-muted-foreground">{item}</p></div>)}</div></section>
}

function FactCard({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-border/70 bg-background/75 p-4"><h4 className="text-sm font-bold">{title}</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>
}

export default function PecahanRasioPengukuran({ resetSignal }: { resetSignal: number }) {
  const [activeTopic, setActiveTopic] = useState<Topic>("pecahan")
  const [mode, setMode] = useState<LearningMode>("learn")
  const [guidedStep, setGuidedStep] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const currentPractice = practiceByTopic[activeTopic]
  const isCorrect = selectedAnswer === currentPractice.answer

  const switchTopic = (topic: Topic) => {
    setActiveTopic(topic)
    setGuidedStep(0)
    setSelectedAnswer(null)
    setChecked(false)
  }

  useEffect(() => {
    if (resetSignal === 0) return
    setActiveTopic("pecahan")
    setMode("learn")
    setGuidedStep(0)
    setSelectedAnswer(null)
    setChecked(false)
    setResetKey((current) => current + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [resetSignal])

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Sparkles className="h-3.5 w-3.5" />Laboratorium konsep | SD dan SMP</div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Pecahan, rasio, dan pengukuran</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Geser, amati, lalu jelaskan apa yang berubah. Setiap topik menghubungkan gambar, kata-kata, dan hitungan agar rumus punya makna.</p>
        </div>
        <ModeSelector mode={mode} onChange={setMode} />
      </section>
      <section aria-labelledby="pilih-materi" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="pilih-materi" className="font-bold">Pilih materi</h3>
          <p className="text-xs text-muted-foreground">3 topik interaktif | SD dan SMP</p>
        </div>
        <nav aria-label="Pilih topik belajar" className="grid gap-2 sm:grid-cols-3">
          {topics.map(({ id, title, summary, Icon }) => <button key={id} type="button" onClick={() => switchTopic(id)} aria-current={activeTopic === id ? "page" : undefined} className={"flex min-h-[4.25rem] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 " + (activeTopic === id ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 shadow-sm dark:text-emerald-200" : "border-border/70 bg-background/75 hover:border-emerald-400/50 hover:bg-emerald-500/5")}><span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + (activeTopic === id ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block text-xs leading-4 sm:text-sm">{title}</strong><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{summary}</span></span>{activeTopic === id && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}</button>)}
        </nav>
      </section>
      {mode === "learn" && <GuidedLearning steps={guidedSteps[activeTopic]} step={guidedStep} onStepChange={setGuidedStep} />}
      <main>
        {activeTopic === "pecahan" && <FractionLesson key={`pecahan-${resetKey}`} />}
        {activeTopic === "rasio" && <RatioLesson key={`rasio-${resetKey}`} />}
        {activeTopic === "pengukuran" && <MeasurementLesson key={`pengukuran-${resetKey}`} />}
      </main>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Cek pemahaman</h3></div>
          <p className="mt-3 text-sm leading-6">{currentPractice.question}</p>
          <div className="mt-4 flex flex-wrap gap-2">{currentPractice.options.map((option) => <button key={option} type="button" aria-pressed={selectedAnswer === option} onClick={() => { setSelectedAnswer(option); setChecked(false) }} className={"rounded-xl px-4 py-2.5 text-sm font-semibold transition " + (selectedAnswer === option ? "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/50 dark:text-emerald-200" : "bg-muted/60 hover:bg-muted")}>{option}</button>)}</div>
          <button type="button" disabled={!selectedAnswer} onClick={() => setChecked(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />Periksa jawaban</button>
          {checked && <p role="status" className={"mt-3 rounded-xl p-3 text-sm leading-6 " + (isCorrect ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "bg-amber-500/10 text-amber-800 dark:text-amber-200")}>{isCorrect ? "Tepat! " : "Belum tepat. "}{currentPractice.explanation}</p>}
        </div>
        <aside className="rounded-3xl bg-emerald-500/5 p-5 sm:p-6"><div className="flex items-center gap-2"><CircleHelp className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /><h3 className="font-bold">Pegangan konsep</h3></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Ucapkan satuan dan konteksnya. Pecahan butuh satu utuh yang jelas; rasio butuh urutan yang jelas; hasil ukur butuh besaran dan satuan yang jelas.</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Materi diringkas untuk pembelajaran SD (Fase B–C) dan SMP (Fase D), dengan istilah sederhana serta contoh sehari-hari.</p></aside>
      </section>

      <RujukanPenyusunan material="pecahan" />
    </div>
  )
}

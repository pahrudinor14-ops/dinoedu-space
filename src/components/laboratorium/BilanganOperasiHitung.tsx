import { useEffect, useState, type ReactNode } from "react"
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleHelp,
  Divide,
  Hash,
  Lightbulb,
  Minus,
  MoveRight,
  Plus,
  Scale,
  Sparkles,
  Target,
  X,
  type LucideIcon,
} from "lucide-react"
import RujukanPenyusunan from "./RujukanPenyusunan"
import GuidedLearning, { type GuidedStep } from "./GuidedLearning"
import ModeSelector, { type LearningMode } from "./ModeSelector"

type LessonId = "nilai-tempat" | "operasi" | "bilangan-bulat" | "faktor-kelipatan" | "urutan-operasi"
type Operation = "tambah" | "kurang" | "kali" | "bagi"
type IntegerOperation = "+" | "−" | "×" | "÷"
type DivisionMeaning = "berbagi" | "mengelompokkan"

const format = (value: number, digits = 0) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value)

const lessons: { id: LessonId; title: string; summary: string; Icon: LucideIcon }[] = [
  { id: "nilai-tempat", title: "Nilai tempat", summary: "Makna setiap digit", Icon: Hash },
  { id: "operasi", title: "Empat operasi", summary: "Gabung, ambil, kelompokkan", Icon: Calculator },
  { id: "bilangan-bulat", title: "Bilangan bulat", summary: "Gerak pada garis bilangan", Icon: MoveRight },
  { id: "faktor-kelipatan", title: "Faktor dan kelipatan", summary: "FPB dan KPK", Icon: Scale },
  { id: "urutan-operasi", title: "Urutan operasi", summary: "Langkah hitung yang tepat", Icon: CheckCircle2 },
]

const guidedSteps: Record<LessonId, GuidedStep[]> = {
  "nilai-tempat": [
    { title: "Baca posisi digit", description: "Mulai dari kanan: satuan, puluhan, ratusan, dan seterusnya. Posisi menentukan nilai sebuah digit." },
    { title: "Uraikan bilangannya", description: "Tuliskan setiap digit sebagai hasil kali digit dan nilai tempatnya, lalu jumlahkan kembali." },
    { title: "Periksa susunannya", description: "Pastikan hasil uraian sama dengan bilangan awal. Nol tetap menjadi penanda tempat meskipun nilainya nol." },
  ],
  operasi: [
    { title: "Pahami tindakannya", description: "Tambah menggabungkan, kurang mencari selisih atau sisa, kali membentuk kelompok sama banyak, dan bagi membagi rata atau mengelompokkan." },
    { title: "Pilih model yang cocok", description: "Gunakan garis bilangan, kelompok benda, atau susunan titik untuk menggambarkan operasi sebelum menghitung." },
    { title: "Hubungkan operasi", description: "Cek hasil dengan operasi kebalikannya, misalnya 24 ÷ 6 = 4 dapat diperiksa dengan 4 × 6 = 24." },
  ],
  "bilangan-bulat": [
    { title: "Tempatkan bilangan", description: "Pada garis bilangan, nol menjadi titik acuan; bilangan negatif di kiri dan positif di kanan." },
    { title: "Ikuti arah gerak", description: "Untuk tambah dan kurang, lihat titik awal serta arah dan banyak langkah, bukan hanya menghafal tanda." },
    { title: "Periksa tanda dan hasil", description: "Nol bukan positif atau negatif. Pembagian dengan nol tidak terdefinisi; periksa kembali tanda hasil kali dan bagi." },
  ],
  "faktor-kelipatan": [
    { title: "Bedakan faktor dan kelipatan", description: "Faktor membagi habis suatu bilangan. Kelipatan diperoleh dari bilangan itu dikali 1, 2, 3, dan seterusnya." },
    { title: "Temukan yang sama", description: "Daftar faktor bersama untuk mencari FPB, atau daftar kelipatan bersama untuk mencari KPK." },
    { title: "Pilih sesuai cerita", description: "FPB cocok untuk membagi menjadi kelompok terbesar yang sama. KPK cocok untuk mencari waktu pertemuan berulang paling awal." },
  ],
  "urutan-operasi": [
    { title: "Selesaikan bagian yang terikat", description: "Kerjakan yang berada di dalam tanda kurung lebih dahulu, kemudian pangkat jika ada." },
    { title: "Lanjutkan operasi setingkat", description: "Perkalian dan pembagian setingkat; penjumlahan dan pengurangan juga setingkat. Kerjakan dari kiri ke kanan." },
    { title: "Cek langkahnya", description: "Tulis satu langkah pada satu waktu agar urutan jelas dan hasil dapat diperiksa kembali." },
  ],
}

const placeValues = [
  { name: "Ratus ribu", value: 100000, color: "bg-fuchsia-500" },
  { name: "Puluh ribu", value: 10000, color: "bg-violet-500" },
  { name: "Ribuan", value: 1000, color: "bg-blue-500" },
  { name: "Ratusan", value: 100, color: "bg-cyan-500" },
  { name: "Puluhan", value: 10, color: "bg-emerald-500" },
  { name: "Satuan", value: 1, color: "bg-amber-500" },
]

const operationSymbols: Record<Operation, string> = { tambah: "+", kurang: "−", kali: "×", bagi: "÷" }
const operationDefaults: Record<Operation, [number, number]> = {
  tambah: [17, 8],
  kurang: [23, 9],
  kali: [4, 3],
  bagi: [24, 6],
}

const orderProblems = [
  { id: "kali-dulu", expression: "8 + 4 × 3", answer: 20, options: [20, 36, 24], steps: ["Kerjakan perkalian: 4 × 3 = 12.", "Lalu jumlahkan: 8 + 12 = 20."] },
  { id: "kurung-dulu", expression: "(8 + 4) × 3", answer: 36, options: [36, 20, 48], steps: ["Kerjakan yang di dalam kurung: 8 + 4 = 12.", "Lalu kalikan: 12 × 3 = 36."] },
  { id: "kali-bagi-setara", expression: "18 ÷ 3 × 2", answer: 12, options: [12, 3, 9], steps: ["Perkalian dan pembagian setingkat, jadi kerjakan dari kiri: 18 ÷ 3 = 6.", "Lanjutkan dari kiri: 6 × 2 = 12."] },
  { id: "tambah-kurang-setara", expression: "20 − 8 + 3", answer: 15, options: [15, 9, 11], steps: ["Penjumlahan dan pengurangan setingkat, jadi kerjakan dari kiri: 20 − 8 = 12.", "Lanjutkan: 12 + 3 = 15."] },
  { id: "pangkat", expression: "2 + 3² × 2", answer: 20, options: [20, 14, 25], steps: ["Kerjakan pangkat: 3² = 9.", "Lalu perkalian: 9 × 2 = 18.", "Terakhir penjumlahan: 2 + 18 = 20."] },
]

function gcd(a: number, b: number) {
  let left = a
  let right = b
  while (right !== 0) {
    const remainder = left % right
    left = right
    right = remainder
  }
  return left
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

function ConceptNote({ title, text, tone = "emerald" }: { title: string; text: string; tone?: "emerald" | "amber" }) {
  const toneClass = tone === "amber" ? "border-amber-300/50 bg-amber-500/5" : "border-emerald-300/40 bg-emerald-500/5"
  const iconClass = tone === "amber" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
  const Icon = tone === "amber" ? Lightbulb : CircleHelp
  return (
    <aside className={"flex gap-3 rounded-2xl border p-4 sm:p-5 " + toneClass}>
      <Icon className={"mt-0.5 h-5 w-5 shrink-0 " + iconClass} />
      <div><h4 className="text-sm font-bold">{title}</h4><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>
    </aside>
  )
}

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (next: number) => void }) {
  return (
    <label className="block space-y-2 text-sm font-semibold">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value)
          onChange(Math.max(min, Math.min(max, Number.isFinite(next) ? Math.trunc(next) : min)))
        }}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </label>
  )
}

function PlaceValueLesson() {
  const [number, setNumber] = useState(24306)
  const digits = String(number).padStart(placeValues.length, "0").split("").map(Number)
  const expanded = placeValues
    .map((place, index) => ({ ...place, digit: digits[index], total: digits[index] * place.value }))
    .filter((place) => place.digit > 0)

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SD · nilai bilangan" title="Satu digit berubah makna menurut tempatnya">
        Sistem bilangan kita berbasis 10. Dari kanan ke kiri nilainya satuan, puluhan, ratusan, ribuan, puluh ribuan, lalu ratus ribuan; tiap tempat bernilai 10 kali tempat di sebelah kanannya.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <label className="block max-w-xs space-y-2 text-sm font-semibold">
          Ubah bilangan cacah (0–999.999)
          <input type="number" min="0" max="999999" step="1" value={number} onChange={(event) => setNumber(Math.max(0, Math.min(999999, Math.trunc(Number(event.target.value) || 0))))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-lg font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
        </label>
        <div className="mt-5 rounded-2xl bg-emerald-500/8 p-4 text-center sm:p-5">
          <p className="text-xs font-semibold text-muted-foreground">Bilangan yang tersusun</p>
          <p className="mt-1 text-3xl font-black tracking-tight tabular-nums sm:text-4xl">{format(number)}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {placeValues.map((place, index) => {
            const digit = digits[index]
            return (
              <div key={place.name} className="rounded-2xl border border-border/70 bg-background p-3">
                <p className="text-xs font-bold text-muted-foreground">{place.name}</p>
                <div className="mt-3 flex min-h-12 flex-wrap content-end gap-1" aria-label={digit + " balok nilai " + place.name.toLowerCase()}>
                  {Array.from({ length: digit }, (_, block) => <span key={block} className={"h-5 w-3 rounded-sm " + place.color} />)}
                  {digit === 0 && <span className="self-center text-xs text-muted-foreground">kosong</span>}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{digit} × {format(place.value)}</p>
                <p className="font-black tabular-nums">{format(digit * place.value)}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 rounded-2xl bg-muted/40 p-4">
          <p className="text-xs font-semibold text-muted-foreground">Uraikan sesuai nilai tempat</p>
          <p className="mt-1 break-words text-sm font-bold leading-6 sm:text-base">
            {expanded.length ? expanded.map((part) => format(part.total)).join(" + ") : "0"} = {format(number)}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Balok menggambarkan berapa digit pada tempat itu; angka di bawahnya menunjukkan nilai total digit tersebut.</p>
        </div>
      </section>
      <ConceptNote title="Perhatikan angka nol" text="Nol dapat menjaga posisi digit. Pada 4.026, nol menjaga tempat ratusan tetap kosong; angka 2 berada di tempat puluhan. Nilainya berbeda dari 426. Bandingkan bilangan dari digit paling kiri, lalu lanjutkan ke kanan saat digitnya sama." tone="amber" />
    </div>
  )
}

function IntegerNumberLine({ start, end, label, waypoint }: { start: number; end: number; label: string; waypoint?: number }) {
  const minValue = Math.min(0, start, end, waypoint ?? 0) - 2
  const maxValue = Math.max(0, start, end, waypoint ?? 0) + 2
  const minTick = Math.floor(minValue)
  const maxTick = Math.ceil(maxValue)
  const x = (value: number) => 40 + ((value - minValue) / (maxValue - minValue)) * 520
  const ticks = Array.from({ length: maxTick - minTick + 1 }, (_, index) => minTick + index)
  return (
    <svg viewBox="0 0 600 140" role="img" aria-label={label} className="h-36 w-full overflow-visible">
      <defs>
        <marker id="number-line-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="#059669" /></marker>
        <marker id="number-line-arrow-first" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="#0891b2" /></marker>
      </defs>
      <line x1="40" y1="86" x2="560" y2="86" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} y1={tick % 5 === 0 ? 78 : 82} x2={x(tick)} y2="94" stroke="currentColor" strokeOpacity="0.55" />
          {tick % 5 === 0 && <text x={x(tick)} y="112" textAnchor="middle" fontSize="11" fill="currentColor">{tick}</text>}
        </g>
      ))}
      {waypoint === undefined ? (
        <line x1={x(start)} y1="50" x2={x(end)} y2="50" stroke="#059669" strokeWidth="4" strokeLinecap="round" markerEnd="url(#number-line-arrow)" />
      ) : (
        <>
          <line x1={x(start)} y1="40" x2={x(waypoint)} y2="40" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" markerEnd="url(#number-line-arrow-first)" />
          <line x1={x(waypoint)} y1="60" x2={x(end)} y2="60" stroke="#059669" strokeWidth="4" strokeLinecap="round" markerEnd="url(#number-line-arrow)" />
        </>
      )}
      <circle cx={x(start)} cy="50" r="5" fill="#0f766e" />
      <circle cx={x(end)} cy="50" r="6" fill="#047857" />
      <text x={x(start)} y="31" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">mulai {start}</text>
      <text x={x(end)} y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="#047857">hasil {end}</text>
    </svg>
  )
}

function OperationLesson() {
  const [operation, setOperation] = useState<Operation>("tambah")
  const [left, setLeft] = useState(operationDefaults.tambah[0])
  const [right, setRight] = useState(operationDefaults.tambah[1])
  const [divisionMeaning, setDivisionMeaning] = useState<DivisionMeaning>("berbagi")

  const chooseOperation = (next: Operation) => {
    setOperation(next)
    setLeft(operationDefaults[next][0])
    setRight(operationDefaults[next][1])
  }
  const maxValue = operation === "kali" ? 12 : operation === "bagi" ? 36 : 30
  const maxRight = operation === "kali" ? 12 : operation === "bagi" ? 12 : 30
  const result = operation === "tambah" ? left + right
    : operation === "kurang" ? left - right
      : operation === "kali" ? left * right
        : Math.floor(left / right)
  const remainder = operation === "bagi" ? left % right : 0

  const explanation: Record<Operation, string> = {
    tambah: "Mulai dari 0, maju " + format(left) + ", lalu maju lagi " + format(right) + ". Dua lompatan itu berakhir di " + format(result) + ".",
    kurang: "Mulai dari " + format(left) + ", lalu mundur " + format(right) + ". Hasil " + format(result) + " menunjukkan sisa atau selisih; bila melintasi nol, hasilnya negatif.",
    kali: format(left) + " kelompok, masing-masing berisi " + format(right) + ". Susunan baris dan kolom berisi " + format(result) + " titik seluruhnya.",
    bagi: divisionMeaning === "berbagi"
      ? format(left) + " benda dibagi rata kepada " + format(right) + " kelompok. Tiap kelompok mendapat " + format(result) + "; " + (remainder ? "tersisa " + remainder + "." : "tidak ada sisa.")
      : "Bentuk kelompok yang masing-masing berisi " + format(right) + " dari " + format(left) + " benda. Ada " + format(result) + " kelompok penuh" + (remainder ? " dan tersisa " + remainder + "." : "."),
  }

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SD · makna operasi" title="Pilih modelnya sebelum menghafal caranya">
        Simbol meringkas sebuah tindakan. Penjumlahan menggabungkan, pengurangan mencari sisa atau selisih, perkalian membentuk kelompok sama banyak, dan pembagian dapat berarti berbagi rata atau membentuk kelompok.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["tambah", "Tambah", Plus],
            ["kurang", "Kurang", Minus],
            ["kali", "Kali", X],
            ["bagi", "Bagi", Divide],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => chooseOperation(id)} aria-pressed={operation === id} className={"flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition " + (operation === id ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-border/70 bg-background hover:bg-muted")}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <NumberInput label="Bilangan pertama" value={left} min={0} max={maxValue} onChange={setLeft} />
          <span className="pb-2 text-center text-2xl font-black text-emerald-700 dark:text-emerald-300">{operationSymbols[operation]}</span>
          <NumberInput label={operation === "bagi" ? "Pembagi (tidak boleh 0)" : "Bilangan kedua"} value={right} min={operation === "bagi" ? 1 : 0} max={maxRight} onChange={setRight} />
        </div>

        {operation === "tambah" || operation === "kurang" ? (
          <div className="mt-5 rounded-2xl bg-muted/30 p-3 sm:p-5">
            <IntegerNumberLine start={0} waypoint={left} end={result} label={format(left) + " " + operationSymbols[operation] + " " + format(right) + " = " + format(result) + " pada garis bilangan"} />
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1.5">0 → {format(left)} (+{format(left)})</span>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1.5">{format(left)} → {format(result)} ({operation === "tambah" ? "+" : "−"}{format(right)})</span>
            </div>
          </div>
        ) : operation === "kali" ? (
          <div className="mt-5 rounded-2xl bg-muted/30 p-4 sm:p-5">
            <p className="text-sm font-semibold">{format(left)} baris × {format(right)} titik di setiap baris</p>
            <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: "repeat(" + Math.max(1, right) + ", minmax(0, 1fr))" }} role="img" aria-label={"Susunan " + left + " baris dan " + right + " kolom, total " + result + " titik"}>
              {Array.from({ length: left * right }, (_, index) => <span key={index} className="mx-auto h-4 w-4 rounded-full bg-emerald-500 sm:h-5 sm:w-5" />)}
            </div>
            {left === 0 || right === 0 ? <p className="mt-3 text-xs text-muted-foreground">Jika salah satu faktor 0, tidak ada titik: hasilnya 0.</p> : null}
          </div>
        ) : (
          <div className="mt-5 space-y-4 rounded-2xl bg-muted/30 p-4 sm:p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setDivisionMeaning("berbagi")} aria-pressed={divisionMeaning === "berbagi"} className={"rounded-xl px-3 py-2.5 text-sm font-semibold " + (divisionMeaning === "berbagi" ? "bg-emerald-600 text-white" : "bg-background hover:bg-muted")}>Berbagi rata: {format(right)} kelompok</button>
              <button type="button" onClick={() => setDivisionMeaning("mengelompokkan")} aria-pressed={divisionMeaning === "mengelompokkan"} className={"rounded-xl px-3 py-2.5 text-sm font-semibold " + (divisionMeaning === "mengelompokkan" ? "bg-emerald-600 text-white" : "bg-background hover:bg-muted")}>Mengelompokkan: {format(right)} per kelompok</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: divisionMeaning === "berbagi" ? right : result }, (_, group) => (
                <div key={group} className="flex min-h-12 min-w-12 flex-wrap content-center items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-background p-2" aria-label={"Kelompok " + (group + 1)}>
                  {Array.from({ length: divisionMeaning === "berbagi" ? result : right }, (_, item) => <span key={item} className="h-2.5 w-2.5 rounded-full bg-cyan-600" />)}
                  <span className="sr-only">{divisionMeaning === "berbagi" ? format(result) + " benda" : format(right) + " benda"}</span>
                </div>
              ))}
              {remainder > 0 && <div className="flex min-h-12 min-w-12 flex-wrap content-center items-center justify-center gap-1 rounded-xl border border-dashed border-amber-500/60 bg-amber-500/5 p-2" aria-label={remainder + " benda tersisa"}>{Array.from({ length: remainder }, (_, item) => <span key={item} className="h-2.5 w-2.5 rounded-full bg-amber-500" />)}<span className="sr-only">sisa</span></div>}
            </div>
            <p className="text-xs text-muted-foreground">Titik biru berada di kelompok penuh; titik jingga menunjukkan sisa yang belum dapat dibagi sama rata.</p>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-emerald-500/10 p-4" aria-live="polite">
          <p className="text-xs font-semibold text-muted-foreground">Hasil dan maknanya</p>
          <p className="mt-1 text-2xl font-black tabular-nums sm:text-3xl">{format(left)} {operationSymbols[operation]} {format(right)} = {format(result)}{operation === "bagi" && remainder > 0 ? " sisa " + remainder : ""}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{explanation[operation]}</p>
        </div>
      </section>
      <ConceptNote title="Sifat operasi membantu mengecek" text={operation === "tambah" ? "Urutan penjumlahan boleh ditukar: 17 + 8 sama dengan 8 + 17. Menambahkan 0 tidak mengubah bilangan." : operation === "kurang" ? "Pengurangan tidak selalu boleh ditukar: 17 − 8 tidak sama dengan 8 − 17. Pada garis bilangan, mengurangi berarti bergerak ke kiri." : operation === "kali" ? "Perkalian boleh ditukar urutannya: 4 × 3 dan 3 × 4 sama-sama berjumlah 12, tetapi susunan baris dan kolomnya berbeda." : "Pembagian adalah kebalikan perkalian, tetapi urutannya penting: 24 ÷ 6 tidak sama dengan 6 ÷ 24. Pembagi tidak boleh 0."} tone={operation === "bagi" ? "amber" : "emerald"} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-background/75 p-4"><h4 className="text-sm font-bold">Pertukaran urutan</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Tambah dan kali boleh ditukar: 7 + 5 = 5 + 7; 7 × 5 = 5 × 7. Kurang dan bagi tidak.</p></div>
        <div className="rounded-2xl border border-border/70 bg-background/75 p-4"><h4 className="text-sm font-bold">Pengelompokan</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Pada tambah dan kali, tanda kurung boleh digeser: (2 + 3) + 4 = 2 + (3 + 4). Ini membantu menghitung dengan lebih mudah.</p></div>
        <div className="rounded-2xl border border-border/70 bg-background/75 p-4"><h4 className="text-sm font-bold">Sifat distributif</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Perkalian dapat dibagikan ke penjumlahan: 4 × (10 + 2) = 4 × 10 + 4 × 2 = 48.</p></div>
        <div className="rounded-2xl border border-border/70 bg-background/75 p-4"><h4 className="text-sm font-bold">Elemen netral</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Menambah 0 atau mengalikan dengan 1 tidak mengubah bilangan: 12 + 0 = 12 dan 12 × 1 = 12.</p></div>
      </div>
    </div>
  )
}

function SignedIntegerLesson() {
  const [left, setLeft] = useState(-3)
  const [right, setRight] = useState(5)
  const [operation, setOperation] = useState<IntegerOperation>("+")
  const result = operation === "+" ? left + right
    : operation === "−" ? left - right
      : operation === "×" ? left * right
        : right === 0 ? null : left / right
  const movesOnLine = operation === "+" || operation === "−"
  const direction = result === null ? "tidak terdefinisi" : result > left ? "ke kanan" : result < left ? "ke kiri" : "tidak bergeser"
  const resultText = result === null ? "tidak terdefinisi"
    : operation === "÷" && !Number.isInteger(result) ? "≈ " + format(result, 6) + " (bukan bilangan bulat)"
      : format(result, 2)
  const sameSign = (left < 0 && right < 0) || (left > 0 && right > 0)

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SMP · bilangan bulat" title="Tanda negatif menunjukkan arah pada garis bilangan">
        Bilangan bulat memuat bilangan negatif, nol, dan positif. Ke kanan nilainya membesar; ke kiri nilainya mengecil. Bayangkan lantai gedung di atas tanah dan basement di bawah tanah.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm font-semibold">Bilangan awal: {left}
            <input type="range" min="-20" max="20" step="1" value={left} onChange={(event) => setLeft(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-emerald-600" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">Operasi
            <select value={operation} onChange={(event) => setOperation(event.target.value as IntegerOperation)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"><option value="+">Tambah (+)</option><option value="−">Kurang (−)</option><option value="×">Kali (×)</option><option value="÷">Bagi (÷)</option></select>
          </label>
          <label className="space-y-2 text-sm font-semibold">Bilangan yang dioperasikan: {right}
            <input type="range" min="-20" max="20" step="1" value={right} onChange={(event) => setRight(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-cyan-600" />
          </label>
        </div>
        <div className="mt-5 rounded-2xl bg-muted/30 p-3 sm:p-5">
          {movesOnLine && result !== null ? (
            <IntegerNumberLine start={left} end={result} label={left + " " + operation + " " + right + " = " + result + "; bergerak " + direction} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-background p-3 text-center"><p className="text-xs text-muted-foreground">Tanda bilangan pertama</p><p className="mt-1 text-lg font-black">{left < 0 ? "negatif (−)" : left > 0 ? "positif (+)" : "nol"}</p></div>
              <div className="flex items-center justify-center text-2xl font-black text-emerald-700 dark:text-emerald-300">{operation}</div>
              <div className="rounded-xl bg-background p-3 text-center"><p className="text-xs text-muted-foreground">Tanda bilangan kedua</p><p className="mt-1 text-lg font-black">{right < 0 ? "negatif (−)" : right > 0 ? "positif (+)" : "nol"}</p></div>
              <p className="text-center text-sm font-semibold leading-6 sm:col-span-3">{right === 0 && operation === "÷" ? "Pembagian dengan nol tidak terdefinisi." : left === 0 && operation === "÷" ? "Nol dibagi bilangan bukan nol hasilnya nol." : operation === "×" && (left === 0 || right === 0) ? "Bilangan apa pun dikali nol hasilnya nol." : sameSign ? "Tandanya sama, hasil kali atau bagi bertanda positif." : "Tandanya berbeda, hasil kali atau bagi bertanda negatif."}</p>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold tabular-nums">{left} {operation} ({right < 0 ? "(" + right + ")" : right}) = {resultText}</p>
            {movesOnLine && <span className="rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-bold">Bergerak {direction}</span>}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { text: "−3 + 5", a: -3, b: 5, op: "+" as IntegerOperation },
            { text: "−3 − 5", a: -3, b: 5, op: "−" as IntegerOperation },
            { text: "−3 − (−5)", a: -3, b: -5, op: "−" as IntegerOperation },
            { text: "−3 × 5", a: -3, b: 5, op: "×" as IntegerOperation },
            { text: "−3 × (−5)", a: -3, b: -5, op: "×" as IntegerOperation },
            { text: "−15 ÷ 5", a: -15, b: 5, op: "÷" as IntegerOperation },
            { text: "15 ÷ (−5)", a: 15, b: -5, op: "÷" as IntegerOperation },
          ].map((example) => (
            <button key={example.text} type="button" onClick={() => { setLeft(example.a); setRight(example.b); setOperation(example.op) }} className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-semibold transition hover:bg-muted">{example.text}</button>
          ))}
        </div>
      </section>
      <ConceptNote title={operation === "×" || operation === "÷" ? "Aturan tanda untuk kali dan bagi" : "Arah gerak dan lawan bilangan"} text={operation === "×" || operation === "÷" ? "Untuk perkalian dan pembagian, tanda sama menghasilkan positif; tanda berbeda menghasilkan negatif. Pengecualian penting: pembagian dengan nol tidak terdefinisi. Nol bukan bilangan positif maupun negatif." : "Pada garis bilangan, bilangan positif bergerak ke kanan dan bilangan negatif ke kiri. Mengurangi berarti menambahkan lawannya: a − (−b) = a + b, jadi −3 − (−5) bergerak 5 langkah ke kanan dan hasilnya 2. Nol bukan bilangan positif maupun negatif."} tone="amber" />
    </div>
  )
}

function FactorMultipleLesson() {
  const [first, setFirst] = useState(12)
  const [second, setSecond] = useState(18)
  const greatestCommonFactor = gcd(first, second)
  const leastCommonMultiple = (first / greatestCommonFactor) * second
  const factors = (number: number) => Array.from({ length: number }, (_, index) => index + 1).filter((candidate) => number % candidate === 0)
  const firstFactors = factors(first)
  const secondFactors = factors(second)
  const firstMultiples = Array.from({ length: leastCommonMultiple / first }, (_, index) => first * (index + 1))
  const secondMultiples = Array.from({ length: leastCommonMultiple / second }, (_, index) => second * (index + 1))

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SD · SMP · pola bilangan" title="Faktor membagi habis; kelipatan didapat dari perkalian">
        Faktor adalah bilangan yang membagi suatu bilangan tanpa sisa. Kelipatan adalah hasil mengalikan bilangan dengan 1, 2, 3, dan seterusnya. Keduanya membantu memecahkan soal kelompok dan kejadian berulang.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold">Bilangan pertama: {first}
            <input type="range" min="2" max="12" value={first} onChange={(event) => setFirst(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-emerald-600" />
          </label>
          <label className="space-y-2 text-sm font-semibold">Bilangan kedua: {second}
            <input type="range" min="2" max="12" value={second} onChange={(event) => setSecond(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-cyan-600" />
          </label>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-muted/30 p-4">
            <h4 className="font-bold">Faktor yang sama</h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Faktor {first}: {firstFactors.join(", ")} · Faktor {second}: {secondFactors.join(", ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">{firstFactors.filter((factor) => secondFactors.includes(factor)).map((factor) => <span key={factor} className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-bold">{factor}</span>)}</div>
            <p className="mt-3 text-sm leading-6"><strong>FPB = {greatestCommonFactor}</strong>: faktor bersama yang paling besar. Jika ada {first} dan {second} benda, keduanya dapat dikemas tanpa sisa dalam paket berisi {greatestCommonFactor} benda.</p>
          </div>
          <div className="rounded-2xl bg-muted/30 p-4">
            <h4 className="font-bold">Kelipatan yang sama</h4>
            <div className="mt-3 space-y-3">
              {[{ number: first, multiples: firstMultiples }, { number: second, multiples: secondMultiples }].map((row, index) => (
                <div key={index + "-" + row.number}>
                  <p className="text-xs font-semibold text-muted-foreground">Kelipatan {row.number}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">{row.multiples.map((multiple) => <span key={multiple} className={"rounded-full px-2.5 py-1 text-xs font-bold " + (multiple === leastCommonMultiple ? "bg-emerald-600 text-white" : "bg-background")}>{multiple}</span>)}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6"><strong>KPK = {leastCommonMultiple}</strong>: kelipatan positif bersama yang paling kecil. Jika dua kegiatan mulai bersamaan dan berulang tiap {first} dan {second} hari, keduanya bertepatan lagi setelah {leastCommonMultiple} hari.</p>
          </div>
        </div>
      </section>
      <ConceptNote title="Pilih berdasarkan pertanyaannya" text="Jika soal meminta membagi benda menjadi kelompok sama banyak dan sebesar mungkin, cari FPB. Jika meminta waktu atau jumlah terkecil saat beberapa pola bertemu lagi, cari KPK. Jangan memilih hanya dari kata kunci tanpa memahami ceritanya." tone="amber" />
    </div>
  )
}

function OrderOfOperationsLesson() {
  const [problemId, setProblemId] = useState(orderProblems[0].id)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const problem = orderProblems.find((item) => item.id === problemId) ?? orderProblems[0]
  const isCorrect = selectedAnswer === problem.answer

  const chooseProblem = (id: string) => {
    setProblemId(id)
    setSelectedAnswer(null)
    setChecked(false)
  }

  return (
    <div className="space-y-5">
      <LessonTitle eyebrow="SMP · hitung campuran" title="Ikuti tingkat operasi, lalu baca dari kiri ke kanan">
        Urutan umumnya: kurung, pangkat, perkalian atau pembagian, lalu penjumlahan atau pengurangan. Operasi pada tingkat yang sama dikerjakan berurutan dari kiri; perkalian tidak selalu harus mendahului pembagian.
      </LessonTitle>
      <section className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm sm:p-7">
        <label className="block max-w-xl space-y-2 text-sm font-semibold">Pilih contoh untuk dipecahkan
          <select value={problemId} onChange={(event) => chooseProblem(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base font-bold outline-none focus:ring-2 focus:ring-emerald-500">{orderProblems.map((item) => <option key={item.id} value={item.id}>{item.expression}</option>)}</select>
        </label>
        <p className="mt-5 text-center text-3xl font-black tracking-tight sm:text-4xl">{problem.expression}</p>
        <p className="mt-5 text-sm font-semibold">Menurutmu, berapa hasilnya?</p>
        <div className="mt-3 flex flex-wrap gap-2">{problem.options.map((option) => <button key={option} type="button" aria-pressed={selectedAnswer === option} onClick={() => { setSelectedAnswer(option); setChecked(false) }} className={"rounded-xl px-4 py-2.5 text-sm font-bold transition " + (selectedAnswer === option ? "bg-emerald-600 text-white" : "bg-muted/60 hover:bg-muted")}>{option}</button>)}</div>
        <button type="button" disabled={selectedAnswer === null} onClick={() => setChecked(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><Target className="h-4 w-4" />Periksa</button>
        {checked && (
          <div role="status" className={"mt-4 rounded-2xl p-4 " + (isCorrect ? "bg-emerald-500/10" : "bg-amber-500/10")}>
            <p className="text-sm font-bold">{isCorrect ? "Tepat." : "Belum tepat. Hasilnya " + problem.answer + "."}</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm leading-6 text-muted-foreground">{problem.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>
        )}
      </section>
      <ConceptNote title="× dan ÷ setingkat; + dan − juga setingkat" text="Dalam 18 ÷ 3 × 2, kerjakan 18 ÷ 3 lebih dulu karena posisinya di kiri: hasilnya 6 × 2 = 12. Jangan memaksa semua perkalian dikerjakan sebelum pembagian." tone="amber" />
    </div>
  )
}

function LearningPath() {
  const steps = [
    "SD: membaca nilai tempat, menyusun dan mengurai bilangan, lalu memperkirakan hasil hitung.",
    "SD: hubungkan tambah, kurang, kali, dan bagi dengan garis bilangan, kelompok, susunan titik, dan soal sehari-hari.",
    "SMP: perluas ke bilangan negatif, faktor, FPB–KPK, dan urutan operasi hitung campuran.",
  ]
  return (
    <section className="rounded-3xl border border-border/70 bg-background/75 p-5 sm:p-6">
      <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Urutan belajar SD sampai SMP</h3></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{steps.map((step, index) => <div key={step} className="rounded-2xl bg-muted/40 p-4"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-black text-emerald-800 dark:text-emerald-200">{index + 1}</span><p className="mt-2 text-sm leading-6 text-muted-foreground">{step}</p></div>)}</div>
    </section>
  )
}

export default function BilanganOperasiHitung({ resetSignal }: { resetSignal: number }) {
  const [activeLesson, setActiveLesson] = useState<LessonId>("nilai-tempat")
  const [resetKey, setResetKey] = useState(0)
  const [mode, setMode] = useState<LearningMode>("learn")
  const [guidedStep, setGuidedStep] = useState(0)

  useEffect(() => {
    if (resetSignal === 0) return
    setActiveLesson("nilai-tempat")
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
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Bilangan dan operasi hitung</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Amati nilai digit, gerakkan bilangan, dan susun kelompok. Setiap langkah hitung ditautkan ke model yang menunjukkan mengapa jawabannya masuk akal.</p>
        </div>
        <ModeSelector mode={mode} onChange={setMode} />
      </section>

      <section aria-labelledby="pilih-topik-bilangan" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 id="pilih-topik-bilangan" className="font-bold">Pilih jalur belajar</h3><p className="text-xs text-muted-foreground">5 laboratorium interaktif | SD dan SMP</p></div>
        <nav aria-label="Pilih topik bilangan" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {lessons.map(({ id, title, summary, Icon }) => <button key={id} type="button" onClick={() => { setActiveLesson(id); setGuidedStep(0) }} aria-current={activeLesson === id ? "page" : undefined} className={"flex min-h-[4.25rem] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 " + (activeLesson === id ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 shadow-sm dark:text-emerald-200" : "border-border/70 bg-background/75 hover:border-emerald-400/50 hover:bg-emerald-500/5")}><span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + (activeLesson === id ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong className="block text-xs leading-4 sm:text-sm">{title}</strong><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{summary}</span></span></button>)}
        </nav>
      </section>

      {mode === "learn" && <GuidedLearning steps={guidedSteps[activeLesson]} step={guidedStep} onStepChange={setGuidedStep} />}

      <main key={activeLesson + "-" + resetKey}>
        {activeLesson === "nilai-tempat" && <PlaceValueLesson />}
        {activeLesson === "operasi" && <OperationLesson />}
        {activeLesson === "bilangan-bulat" && <SignedIntegerLesson />}
        {activeLesson === "faktor-kelipatan" && <FactorMultipleLesson />}
        {activeLesson === "urutan-operasi" && <OrderOfOperationsLesson />}
      </main>

      <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-emerald-600" /><h3 className="font-bold">Pegangan konsep</h3></div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Tanyakan tiga hal: bilangan apa yang diwakili, tindakan apa yang diminta, dan apakah besar hasilnya masuk akal? Perkiraan sebelum menghitung membantu menangkap kesalahan tanda atau nilai tempat.</p>
        </div>
        <aside className="rounded-3xl bg-emerald-500/5 p-5 sm:p-6"><div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /><h3 className="font-bold">Supaya tidak tertukar</h3></div><ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground"><li>• Nilai digit ditentukan tempatnya.</li><li>• Perkalian adalah kelompok sama banyak; pembagian menjelaskan cara mengurai kelompok.</li><li>• Pada garis bilangan, kanan berarti lebih besar dan kiri berarti lebih kecil.</li></ul></aside>
      </section>

      <LearningPath />
      <RujukanPenyusunan material="bilangan" />
    </div>
  )
}

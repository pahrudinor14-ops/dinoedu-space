import { useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import { CheckCircle2, Clock3, Loader2, Send, ShieldAlert, UserRound, XCircle } from "lucide-react"
import { supabase } from "../lib/supabase"
import NumeaPage from "./NumeaPage"

interface NumeaAccessGateProps {
  onBack: () => void
  darkMode?: boolean
  onToggleTheme?: () => void
  onOpenDinoAI?: () => void
  onOpenAICV?: () => void
  onOpenAISurat?: () => void
  onOpenAISoal?: () => void
  onOpenAIModulAjar?: () => void
}

type MembershipStatus = "pending" | "approved" | "rejected" | "suspended" | null

const roles = ["Guru", "Siswa/Mahasiswa", "Tenaga kependidikan", "Orang tua", "Penggiat pendidikan", "Umum"]
const interestOptions = ["Pembelajaran", "Teknologi pendidikan", "AI & pendidikan", "Matematika", "Literasi", "Pengembangan guru", "Kreativitas", "Lainnya"]
const activityOptions = ["Belajar", "Membuat dan berbagi karya", "Berdiskusi", "Mengikuti kegiatan", "Mengembangkan kompetensi", "Berkolaborasi"]

function GlassCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`dino-glass rounded-[32px] ${className}`}>{children}</div>
}

export default function NumeaAccessGate({
  onBack,
  darkMode,
  onToggleTheme,
  onOpenDinoAI,
  onOpenAICV,
  onOpenAISurat,
  onOpenAISoal,
  onOpenAIModulAjar,
}: NumeaAccessGateProps) {
  const [status, setStatus] = useState<MembershipStatus>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("")
  const [institution, setInstitution] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [joinReason, setJoinReason] = useState("")
  const [activities, setActivities] = useState<string[]>([])
  const [agreement, setAgreement] = useState(false)

  async function loadAccess() {
    setLoading(true)
    setError("")
    const { data, error: statusError } = await supabase.rpc("get_numea_membership_status")
    if (statusError) {
      setError("Status akses NUMEA belum dapat diperiksa. Silakan coba lagi")
      setLoading(false)
      return
    }
    setStatus((data as MembershipStatus) ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void loadAccess()
  }, [])

  function toggleValue(value: string, current: string[], setter: Dispatch<SetStateAction<string[]>>) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const { data, error: submitError } = await supabase.rpc("submit_numea_join_request", {
      p_full_name: fullName.trim(),
      p_role: role,
      p_institution: institution.trim(),
      p_interests: interests,
      p_join_reason: joinReason.trim(),
      p_activities: activities,
      p_agreement: agreement,
    })
    if (submitError) {
      setError(submitError.message.replace(/^.*?: /, ""))
      setSubmitting(false)
      return
    }
    if (!data) {
      setError("Pengajuan belum dapat dikirim. Silakan coba lagi")
      setSubmitting(false)
      return
    }
    setStatus("pending")
    setSubmitting(false)
  }

  if (loading) {
    return <div className="min-h-dvh bg-background text-foreground"><div className="flex min-h-dvh items-center justify-center px-5"><div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-[#EF629F]" />Memeriksa akses NUMEA EDU</div></div></div>
  }

  if (status === "approved") return <NumeaPage
      onBack={onBack}
      darkMode={darkMode}
      onToggleTheme={onToggleTheme}
      onOpenDinoAI={onOpenDinoAI}
      onOpenAICV={onOpenAICV}
      onOpenAISurat={onOpenAISurat}
      onOpenAISoal={onOpenAISoal}
      onOpenAIModulAjar={onOpenAIModulAjar}
    />

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="dino-float absolute left-[-140px] top-[100px] h-[320px] w-[320px] rounded-full bg-[#EECDA3]/25 blur-3xl" />
        <div className="dino-float-slow absolute right-[-120px] top-[180px] h-[360px] w-[360px] rounded-full bg-[#EF629F]/15 blur-3xl" />
      </div>
      <main className="mx-auto flex min-h-dvh max-w-3xl items-center px-5 py-12 sm:px-6 lg:px-8">
        {status === null || status === "rejected" ? (
          <GlassCard className="w-full p-7 sm:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[14px] font-semibold text-[#EF629F]"><UserRound className="h-4 w-4" />NUMEA EDU</div>
                <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">{status === "rejected" ? "Ajukan kembali bergabung" : "Bergabung dengan NUMEA EDU"}</h1>
                <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">NUMEA adalah ruang belajar dan berbagi yang terkurasi. Isi beberapa informasi singkat agar pengajuanmu dapat ditinjau dengan baik</p>
              </div>
              <button type="button" onClick={onBack} className="dino-button shrink-0 rounded-full border border-border/60 bg-white/40 px-4 py-2 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5">Kembali</button>
            </div>
            {status === "rejected" && <div className="mt-7 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-[14px] text-muted-foreground"><div className="flex items-center gap-2 font-semibold text-foreground"><XCircle className="h-4 w-4 text-destructive" />Pengajuan sebelumnya belum disetujui</div><p className="mt-2">Kamu dapat mengajukan kembali dengan informasi yang lebih sesuai</p></div>}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div><label className="mb-2 block text-[14px] font-semibold">Nama lengkap</label><input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3 text-[15px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5" placeholder="Nama lengkap" /></div>
              <div><label className="mb-2 block text-[14px] font-semibold">Peran</label><select value={role} onChange={(event) => setRole(event.target.value)} required className="numea-select w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3 text-[15px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5"><option value="">Pilih peran</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div><label className="mb-2 block text-[14px] font-semibold">Institusi atau asal</label><input value={institution} onChange={(event) => setInstitution(event.target.value)} className="w-full rounded-2xl border border-border/70 bg-white/40 px-4 py-3 text-[15px] outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5" placeholder="Sekolah, kampus, komunitas, atau Individu" /></div>
              <div><label className="mb-2 block text-[14px] font-semibold">Minat utama</label><div className="flex flex-wrap gap-2">{interestOptions.map((item) => { const active = interests.includes(item); return <button key={item} type="button" onClick={() => toggleValue(item, interests, setInterests)} className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${active ? "border-[#EF629F]/40 bg-[#EF629F]/10 text-[#EF629F]" : "border-border/70 bg-white/30 text-muted-foreground dark:bg-white/5"}`}>{item}</button> })}</div></div>
              <div><label className="mb-2 block text-[14px] font-semibold">Apa yang membuat kamu ingin bergabung dengan NUMEA EDU?</label><textarea value={joinReason} onChange={(event) => setJoinReason(event.target.value)} required minLength={30} rows={5} className="w-full resize-none rounded-2xl border border-border/70 bg-white/40 px-4 py-3 text-[15px] leading-7 outline-none backdrop-blur-xl transition focus:border-[#EF629F]/50 dark:bg-white/5" placeholder="Ceritakan secara singkat alasanmu bergabung..." /><div className="mt-2 text-right text-[12px] text-muted-foreground">{joinReason.length}/30 minimum karakter</div></div>
              <div><label className="mb-2 block text-[14px] font-semibold">Apa yang ingin kamu lakukan di NUMEA?</label><div className="grid gap-2 sm:grid-cols-2">{activityOptions.map((item) => { const active = activities.includes(item); return <button key={item} type="button" onClick={() => toggleValue(item, activities, setActivities)} className={`rounded-2xl border px-4 py-3 text-left text-[14px] transition ${active ? "border-[#EF629F]/40 bg-[#EF629F]/10 text-foreground" : "border-border/70 bg-white/30 text-muted-foreground dark:bg-white/5"}`}><span className="inline-flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-[#EF629F] bg-[#EF629F] text-white" : "border-border/70"}`}>{active && <CheckCircle2 className="h-3.5 w-3.5" />}</span>{item}</span></button> })}</div></div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-white/30 p-4 text-[14px] leading-6 dark:bg-white/5"><input type="checkbox" checked={agreement} onChange={(event) => setAgreement(event.target.checked)} className="mt-1 accent-[#EF629F]" /><span>Saya bersedia mengikuti aturan dan menjaga NUMEA EDU sebagai ruang belajar yang aman, positif, dan saling menghargai</span></label>
              {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-[14px] text-destructive">{error}</div>}
              <button type="submit" disabled={submitting || !agreement} className="dino-gradient dino-button inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-[15px] font-semibold text-white shadow-lg shadow-pink-500/10 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitting ? "Mengirim pengajuan..." : "Ajukan Bergabung"}</button>
            </form>
          </GlassCard>
        ) : status === "pending" ? (
          <GlassCard className="w-full p-8 text-center sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EECDA3]/20"><Clock3 className="h-7 w-7 text-[#EF629F]" /></div><h1 className="mt-6 text-3xl font-bold">Pengajuan sedang ditinjau</h1><p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">Terima kasih sudah mengajukan bergabung dengan NUMEA EDU. Admin akan meninjau pengajuanmu sebelum akses diberikan</p><div className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#EF629F]/20 bg-[#EF629F]/5 px-4 py-2 text-[13px] font-semibold text-[#EF629F]"><Clock3 className="h-4 w-4" />Menunggu Persetujuan</div><button type="button" onClick={onBack} className="dino-button mt-8 inline-flex items-center justify-center rounded-full border border-border/60 bg-white/40 px-6 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5">Kembali ke DinoEdu Space</button></GlassCard>
        ) : (
          <GlassCard className="w-full p-8 text-center sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10"><ShieldAlert className="h-7 w-7 text-destructive" /></div><h1 className="mt-6 text-3xl font-bold">Akses NUMEA ditangguhkan</h1><p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">Akses ke NUMEA EDU untuk akun ini sedang ditangguhkan. Silakan hubungi Admin NUMEA jika membutuhkan informasi lebih lanjut</p><button type="button" onClick={onBack} className="dino-button mt-8 inline-flex items-center justify-center rounded-full border border-border/60 bg-white/40 px-6 py-3 text-[14px] font-semibold backdrop-blur-xl dark:bg-white/5">Kembali ke DinoEdu Space</button></GlassCard>
        )}
      </main>
      <style>{`.numea-select option { background: #fff; color: #2B2729; }.dark .numea-select option { background: #1D191F; color: #F8F4F5; }.dark .numea-select { color-scheme: dark; }`}</style>
    </div>
  )
}

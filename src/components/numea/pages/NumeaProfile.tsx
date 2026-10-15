import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import {
  Camera,
  Check,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react"
import { supabase } from "../../../lib/supabase"
type NumeaProfileProps = {
  onBack: () => void
  compact?: boolean
  onAvatarChange?: (url: string | null) => void
}
const AVATAR_BUCKET = "numea-profile-photos"
const MAX_AVATAR_SIZE = 5 * 1024 * 1024
export default function NumeaProfile({
  compact = false,
  onAvatarChange,
}: NumeaProfileProps) {
  const [fullName, setFullName] = useState("")
  const [institution, setInstitution] = useState("")
  const [hobbies, setHobbies] = useState("")
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [verifyingCurrentPassword, setVerifyingCurrentPassword] = useState(false)
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false)
  const [signingOut, setSigningOut] = useState<"local" | "global" | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [securityError, setSecurityError] = useState("")
  const [securitySuccess, setSecuritySuccess] = useState("")
  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      setLoading(true)
      setError("")
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        if (!user) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.")
        if (!cancelled) setEmail(user.email ?? "")
        const { data, error: profileError } = await supabase
          .from("numea_profiles")
          .select("full_name, institution, avatar_path, interests")
          .eq("user_id", user.id)
          .maybeSingle()
        if (profileError) throw profileError
        if (cancelled) return
        const loaded = data ?? {
          full_name: user.user_metadata?.full_name ?? "",
          institution: "",
          avatar_path: null,
          interests: [],
        }
        setFullName(loaded.full_name ?? "")
        setInstitution(loaded.institution ?? "")
        setHobbies(Array.isArray(loaded.interests) ? loaded.interests.join(", ") : "")
        setAvatarPath(loaded.avatar_path ?? null)
        if (loaded.avatar_path) {
          const { data: signed, error: signedError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .createSignedUrl(loaded.avatar_path, 60 * 60)
          if (!signedError && !cancelled) {
            setAvatarUrl(signed.signedUrl)
            onAvatarChange?.(signed.signedUrl)
          }
        } else {
          setAvatarUrl(null)
          onAvatarChange?.(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Profil gagal dimuat.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadProfile()
    return () => { cancelled = true }
  }, [onAvatarChange])
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")
    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError("Nama wajib diisi.")
      return
    }
    setSaving(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error("Sesi login tidak ditemukan.")
      const payload = {
        full_name: trimmedName,
        institution: institution.trim() || null,
        interests: hobbies.split(",").map((item) => item.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      }
      // Update the existing profile row first so required fields such as role
      // are not accidentally omitted by an upsert.
      const { data: updatedRows, error: updateError } = await supabase
        .from("numea_profiles")
        .update(payload)
        .eq("user_id", user.id)
        .select("user_id")
      if (updateError) throw updateError
      // Create a row only when this account does not have one yet.
      if (!updatedRows?.length) {
        const { error: insertError } = await supabase
          .from("numea_profiles")
          .insert({
            user_id: user.id,
            role: user.user_metadata?.role ?? "user",
            ...payload,
          })
        if (insertError) throw insertError
      }
      setSuccess("Informasi pribadi berhasil disimpan.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Informasi pribadi gagal disimpan.")
    } finally {
      setSaving(false)
    }
  }
  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setError("")
    setSuccess("")
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Foto harus berformat JPG, PNG, atau WEBP.")
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Ukuran foto maksimal 5 MB.")
      return
    }
    setUploadingAvatar(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error("Sesi login tidak ditemukan.")
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const path = `${user.id}/${Date.now()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError
      const { error: updateError } = await supabase
        .from("numea_profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName.trim() || user.user_metadata?.full_name || "",
          institution: institution.trim() || null,
          interests: hobbies.split(",").map((item) => item.trim()).filter(Boolean),
          avatar_path: path,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
      if (updateError) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path])
        throw updateError
      }
      const { data: signed, error: signedError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(path, 60 * 60)
      if (signedError) throw signedError
      const previousPath = avatarPath
      setAvatarPath(path)
      setAvatarUrl(signed.signedUrl)
      onAvatarChange?.(signed.signedUrl)
      if (previousPath && previousPath !== path) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousPath])
      }
      setSuccess("Foto profil berhasil diperbarui.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto profil gagal diperbarui.")
    } finally {
      setUploadingAvatar(false)
    }
  }
  async function handleDeleteAvatar() {
    if (!avatarPath) return
    if (!window.confirm("Hapus foto profil?")) return
    setError("")
    setSuccess("")
    setUploadingAvatar(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) throw new Error("Sesi login tidak ditemukan.")
      const { error: updateError } = await supabase
        .from("numea_profiles")
        .update({ avatar_path: null, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
      if (updateError) throw updateError
      const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath])
      if (removeError) throw removeError
      setAvatarPath(null)
      setAvatarUrl(null)
      onAvatarChange?.(null)
      setSuccess("Foto profil berhasil dihapus.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto profil gagal dihapus.")
    } finally {
      setUploadingAvatar(false)
    }
  }
  async function handleVerifyCurrentPassword() {
    setSecurityError("")
    setSecuritySuccess("")
    if (!email || !currentPassword) {
      setSecurityError("Masukkan kata sandi saat ini terlebih dahulu.")
      return
    }
    setVerifyingCurrentPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (signInError) throw new Error("Kata sandi saat ini tidak valid.")
      setCurrentPasswordVerified(true)
      setSecuritySuccess("Kata sandi saat ini terverifikasi. Anda dapat membuat kata sandi baru.")
    } catch (err) {
      setCurrentPasswordVerified(false)
      setSecurityError(err instanceof Error ? err.message : "Verifikasi kata sandi gagal.")
    } finally {
      setVerifyingCurrentPassword(false)
    }
  }
  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSecurityError("")
    setSecuritySuccess("")
    if (!currentPasswordVerified) {
      setSecurityError("Verifikasi kata sandi saat ini terlebih dahulu.")
      return
    }
    if (newPassword.length < 8) {
      setSecurityError("Kata sandi baru minimal 8 karakter.")
      return
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Konfirmasi kata sandi belum cocok.")
      return
    }
    setChangingPassword(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setNewPassword("")
      setConfirmPassword("")
      setSecuritySuccess("Kata sandi berhasil diperbarui.")
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "Kata sandi gagal diperbarui.")
    } finally {
      setChangingPassword(false)
    }
  }
  async function handleSignOut(scope: "local" | "global") {
    const message = scope === "global"
      ? "Keluar dari semua sesi di perangkat lain juga?"
      : "Keluar dari akun pada perangkat ini?"
    if (!window.confirm(message)) return
    setSecurityError("")
    setSecuritySuccess("")
    setSigningOut(scope)
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope })
      if (signOutError) throw signOutError
      setSecuritySuccess(scope === "global"
        ? "Perintah keluar dari semua sesi berhasil dikirim. Sesi ini juga akan berakhir."
        : "Sesi perangkat ini telah diakhiri.")
      // Supabase emits SIGNED_OUT; the app's auth listener should redirect to login.
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "Tidak dapat mengakhiri sesi.")
    } finally {
      setSigningOut(null)
    }
  }
  const sectionClass = "rounded-2xl border border-border/70 bg-card p-4 sm:p-5"
  const labelClass = "mb-1.5 block text-sm font-semibold text-foreground"
  const inputClass = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-[#EF629F] focus:ring-2 focus:ring-[#EF629F]/15"
  return (
    <div className={compact ? "space-y-5 p-4 sm:p-6" : "mx-auto max-w-3xl space-y-5 p-4 sm:p-6"}>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#EF629F]">
            <UserRound className="h-4 w-4" /> Akun NUMEA EDU
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Profil Saya</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kelola informasi pribadi, kata sandi, dan sesi akun.</p>
        </div>
      </header>
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Memuat profil...
        </div>
      ) : (
        <>
          <section className={sectionClass}>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-[#EF629F]" />
              <h3 className="font-bold text-foreground">Informasi pribadi</h3>
            </div>
            <div className="mb-5 flex flex-wrap items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {avatarUrl
                  ? <img src={avatarUrl} alt="Foto profil" className="h-full w-full object-cover" />
                  : <UserRound className="h-8 w-8 text-muted-foreground" />}
                {uploadingAvatar && <div className="absolute inset-0 flex items-center justify-center bg-background/80"><LoaderCircle className="h-5 w-5 animate-spin" /></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:bg-muted">
                  {uploadingAvatar ? <LoaderCircle className="h-4 w-4 animate-spin" /> : avatarUrl ? <Camera className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                  Ganti foto
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingAvatar} onChange={handleAvatarChange} />
                </label>
                {avatarUrl && (
                  <button type="button" disabled={uploadingAvatar} onClick={handleDeleteAvatar} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" /> Hapus
                  </button>
                )}
              </div>
              <p className="w-full text-xs text-muted-foreground">JPG, PNG, atau WEBP · Maksimal 5 MB.</p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="numea-profile-name" className={labelClass}>Nama</label>
                <input id="numea-profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required maxLength={120} className={inputClass} placeholder="Nama lengkap" />
              </div>
              <div>
                <label htmlFor="numea-profile-institution" className={labelClass}>Institusi</label>
                <input id="numea-profile-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} maxLength={180} className={inputClass} placeholder="Nama sekolah atau institusi" />
              </div>
              <div>
                <label htmlFor="numea-profile-hobbies" className={labelClass}>Hobi</label>
                <input id="numea-profile-hobbies" value={hobbies} onChange={(e) => setHobbies(e.target.value)} maxLength={300} className={inputClass} placeholder="Contoh: Membaca, Olahraga, Desain, Mengajar, dll." />
                <p className="mt-1 text-xs text-muted-foreground">Pisahkan beberapa hobi dengan koma.</p>
              </div>
              {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
              {success && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{success}</p>}
              <button type="submit" disabled={saving || uploadingAvatar} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EF629F] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#E65391] disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Menyimpan..." : "Simpan informasi"}
              </button>
            </form>
          </section>
          <section className={sectionClass}>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#EF629F]" />
              <h3 className="font-bold text-foreground">Keamanan</h3>
            </div>
            <div className="mb-5 rounded-xl bg-muted/60 p-3.5">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Akun yang sedang digunakan</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{email || "Email akun tidak tersedia"}</p>
                  <p className="mt-1 text-xs text-emerald-700">Sesi aktif pada perangkat ini</p>
                </div>
              </div>
            </div>
            <div className="space-y-3.5">
              <h4 className="text-sm font-bold text-foreground">Ubah kata sandi</h4>
              {!currentPasswordVerified ? (
                <>
                  <div>
                    <label htmlFor="numea-current-password" className={labelClass}>Kata sandi saat ini</label>
                    <input id="numea-current-password" type="password" value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setSecurityError(""); }} autoComplete="current-password" required className={inputClass} placeholder="Masukkan kata sandi yang berlaku" />
                  </div>
                  <button type="button" onClick={() => void handleVerifyCurrentPassword()} disabled={verifyingCurrentPassword || !currentPassword} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                    {verifyingCurrentPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {verifyingCurrentPassword ? "Memverifikasi..." : "Verifikasi kata sandi"}
                  </button>
                </>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-3.5">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                    Kata sandi saat ini terverifikasi. Formulir ganti kata sandi telah terbuka.
                  </div>
                  <div>
                    <label htmlFor="numea-new-password" className={labelClass}>Kata sandi baru</label>
                    <input id="numea-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={8} className={inputClass} placeholder="Minimal 8 karakter" />
                  </div>
                  <div>
                    <label htmlFor="numea-confirm-password" className={labelClass}>Konfirmasi kata sandi baru</label>
                    <input id="numea-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required minLength={8} className={inputClass} placeholder="Ulangi kata sandi baru" />
                  </div>
                  <button type="submit" disabled={changingPassword || !newPassword || !confirmPassword} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                    {changingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {changingPassword ? "Memperbarui..." : "Perbarui kata sandi"}
                  </button>
                </form>
              )}
              {securityError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{securityError}</p>}
              {securitySuccess && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{securitySuccess}</p>}
            </div>
            <div className="my-5 border-t border-border/70" />
            <div className="mb-3">
              <h4 className="text-sm font-bold text-foreground">Sesi</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Kelola sesi login dengan mengakhiri sesi pada perangkat ini atau keluar dari semua perangkat.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={!!signingOut} onClick={() => void handleSignOut("local")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:bg-muted disabled:opacity-50">
                {signingOut === "local" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Keluar dari perangkat ini
              </button>
              <button type="button" disabled={!!signingOut} onClick={() => void handleSignOut("global")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                {signingOut === "global" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Keluar dari semua sesi
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

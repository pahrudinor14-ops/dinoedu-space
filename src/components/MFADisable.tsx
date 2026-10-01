import { useEffect, useState } from "react"
import { Loader2, ShieldOff, X } from "lucide-react"
import { supabase } from "../lib/supabase"

interface MFADisableProps {
  onDisabled: () => void
  onClose: () => void
}

type Step = "loading" | "confirm" | "success"

export default function MFADisable({
  onDisabled,
  onClose,
}: MFADisableProps) {
  const [step, setStep] = useState<Step>("loading")
  const [code, setCode] = useState("")
  const [factorId, setFactorId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadFactor = async () => {
      setError("")

      const { data, error: factorError } =
        await supabase.auth.mfa.listFactors()

      if (factorError) {
        setError("Gagal memeriksa status 2FA")
        setStep("confirm")
        return
      }

      const verifiedFactor = data.totp?.find(
        (factor) => factor.status === "verified"
      )

      if (!verifiedFactor) {
        setError("Tidak ditemukan 2FA yang aktif")
        setStep("confirm")
        return
      }

      setFactorId(verifiedFactor.id)
      setStep("confirm")
    }

    loadFactor()
  }, [])

  const handleDisable = async () => {
    if (!factorId) {
      setError("2FA aktif tidak ditemukan")
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Masukkan kode 6 digit dari aplikasi authenticator")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Buat challenge untuk faktor 2FA
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId,
        })

      if (challengeError || !challengeData) {
        throw new Error(
          challengeError?.message || "Gagal membuat verifikasi 2FA"
        )
      }

      // Verifikasi kode 2FA
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      })

      if (verifyError) {
        throw new Error("Kode 2FA salah atau sudah kedaluwarsa")
      }

      // Hapus faktor 2FA
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      })

      if (unenrollError) {
        throw new Error(unenrollError.message)
      }

      // Segarkan session agar assurance level langsung turun ke AAL1
      const { error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        throw new Error(refreshError.message)
      }

      setStep("success")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menonaktifkan 2FA"
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    onDisabled()
  }

  return (
    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#171717] sm:p-8">
      {/* DINOEDU SPACE MFA DISABLE HEADER */}
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="absolute right-4 top-4 rounded-xl p-2 text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Tutup"
      >
        <X className="h-5 w-5" />
      </button>

      {step === "loading" && (
        <div className="flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-pink-500" />
        </div>
      )}

      {step === "confirm" && (
        <div className="pt-4">
          {/* DINOEDU SPACE MFA DISABLE ICON */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-500/10">
            <ShieldOff className="h-8 w-8 text-pink-500" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Matikan 2FA
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
              Masukkan kode 6 digit dari aplikasi authenticator untuk
              menonaktifkan verifikasi dua langkah
            </p>
          </div>

          {/* DINOEDU SPACE MFA CODE */}
          <div className="mt-7">
            <label
              htmlFor="disable-mfa-code"
              className="mb-2 block text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              Kode authenticator
            </label>

            <input
              id="disable-mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              disabled={loading}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-2xl font-semibold tracking-[0.45em] text-gray-900 outline-none transition duration-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-semibold text-gray-700 transition duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleDisable}
              disabled={loading || code.length !== 6}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/10 transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Matikan 2FA"
              )}
            </button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
            <ShieldOff className="h-8 w-8 text-green-500" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            2FA Berhasil Dimatikan
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
            Verifikasi dua langkah sudah dinonaktifkan pada akun
            DinoEdu Space
          </p>

          <button
            type="button"
            onClick={handleSuccess}
            className="mt-7 w-full rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/10 transition duration-200 hover:-translate-y-0.5"
          >
            Selesai
          </button>
        </div>
      )}
    </div>
  )
}
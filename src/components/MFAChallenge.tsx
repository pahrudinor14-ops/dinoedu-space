import { useState } from "react"
import { Loader2, ShieldCheck, X } from "lucide-react"
import { supabase } from "../lib/supabase"

type MFAChallengeProps = {
  onVerified?: () => void
  onClose?: () => void
}

export default function MFAChallenge({
  onVerified,
  onClose,
}: MFAChallengeProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState("")

  const handleVerify = async () => {
    setError("")

    if (code.length !== 6) {
      setError("Masukkan kode 6 digit dari aplikasi authenticator")
      return
    }

    setLoading(true)

    try {
      setPreparing(true)

      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors()

      if (factorsError) {
        throw factorsError
      }

      const factor = factorsData.totp.find(
        (item) => item.status === "verified"
      )

      if (!factor) {
        throw new Error("Faktor 2FA tidak ditemukan")
      }

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({
          factorId: factor.id,
        })

      if (challengeError) {
        throw challengeError
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeData.id,
        code,
      })

      if (verifyError) {
        throw verifyError
      }

      setCode("")
      onVerified?.()
    } catch (authError) {
      const errorMessage =
        authError instanceof Error
          ? authError.message
          : "Kode 2FA tidak valid"

      setError(errorMessage)
    } finally {
      setPreparing(false)
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="dino-glass relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] p-5 shadow-2xl shadow-black/10 sm:p-7">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup verifikasi 2FA"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-black/50 shadow-sm transition hover:scale-105 hover:bg-white hover:text-black dark:bg-black/30 dark:text-white/60 dark:hover:bg-black/50 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="pr-8 text-center">
          <div className="mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] text-white shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-bold sm:text-3xl">
            Verifikasi 2FA
          </h2>

          <p className="mt-2 text-[13px] leading-5 text-black/60 dark:text-white/60">
            Masukkan kode dari aplikasi authenticator untuk melanjutkan
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-black/10 bg-white/40 p-5 dark:border-white/10 dark:bg-white/5">
          <label
            htmlFor="mfa-login-code"
            className="block text-[13px] font-semibold"
          >
            Kode keamanan
          </label>

          <input
            id="mfa-login-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, ""))
            }
            placeholder="000000"
            autoFocus
            className="mt-3 h-14 w-full rounded-2xl border border-black/10 bg-white/80 px-4 text-center text-xl font-semibold tracking-[0.35em] outline-none transition focus:border-[#EF629F] focus:ring-2 focus:ring-[#EF629F]/20 dark:border-white/10 dark:bg-white/5"
          />

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] leading-5 text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EECDA3] to-[#EF629F] px-5 text-[15px] font-semibold text-white shadow-lg shadow-[#EF629F]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {preparing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Memverifikasi
              </>
            ) : (
              "Verifikasi & Lanjutkan"
            )}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">
          Buka Google Authenticator lalu gunakan kode 6 digit yang sedang aktif
        </p>
      </div>
    </div>
  )
}
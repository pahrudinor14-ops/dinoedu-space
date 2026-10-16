import { supabase } from "./supabase"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

async function readFunctionError(error: unknown, fallback: string): Promise<string> {
  if (isRecord(error)) {
    const context = error.context
    if (context instanceof Response) {
      const payload: unknown = await context.clone().json().catch(() => null)
      if (isRecord(payload)) {
        for (const key of ["error", "message"]) {
          if (typeof payload[key] === "string" && payload[key].trim()) {
            return payload[key].trim()
          }
        }
      }
    }

    if (typeof error.message === "string" && error.message.trim()) {
      const message = error.message.trim()
      if (/failed to send|fetch|network|load failed/i.test(message)) {
        return "Tidak dapat terhubung ke layanan AI. Periksa koneksi internet lalu coba lagi."
      }
      return message
    }
  }

  return fallback
}

/** Authenticates and invokes a DinoAI Edge Function with consistent errors. */
export async function invokeDinoAI<TResponse>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw new Error("Sesi login tidak dapat diperiksa. Silakan masuk kembali.")
  }

  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.")
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  })

  if (error) {
    throw new Error(await readFunctionError(error, `AI ${functionName} gagal diproses.`))
  }
  if (data === null || data === undefined) {
    throw new Error(`AI ${functionName} tidak mengembalikan respons.`)
  }

  return data as TResponse
}

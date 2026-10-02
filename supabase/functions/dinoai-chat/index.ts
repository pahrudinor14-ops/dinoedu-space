const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface HistoryItem {
  role: "user" | "model"
  text: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY_DINO_AI")
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "DinoAI belum dikonfigurasi. Atur secret GEMINI_API_KEY_DINO_AI.",
      },
      503,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: "Request harus berupa JSON yang valid." }, 400)
  }

  if (typeof body !== "object" || body === null) {
    return jsonResponse({ error: "Format request tidak valid." }, 400)
  }

  const input = body as Record<string, unknown>
  const message = typeof input.message === "string" ? input.message.trim() : ""

  if (!message || message.length > 8000) {
    return jsonResponse(
      { error: "Pesan harus diisi dan maksimal 8000 karakter." },
      400,
    )
  }

  const history: HistoryItem[] = Array.isArray(input.history)
    ? input.history
        .slice(-20)
        .flatMap((item): HistoryItem[] => {
          if (typeof item !== "object" || item === null) return []
          const entry = item as Record<string, unknown>
          if (
            (entry.role !== "user" && entry.role !== "model") ||
            typeof entry.text !== "string"
          ) {
            return []
          }

          const text = entry.text.trim().slice(0, 8000)
          return text ? [{ role: entry.role, text }] : []
        })
    : []
  const firstUserMessageIndex = history.findIndex(
    (item) => item.role === "user",
  )
  const conversationHistory =
    firstUserMessageIndex === -1 ? [] : history.slice(firstUserMessageIndex)

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash"

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "Kamu adalah DinoAI, asisten belajar yang ramah, jelas, dan profesional. Jawab dalam Bahasa Indonesia kecuali pengguna meminta bahasa lain. Susun jawaban dengan paragraf singkat dan runtut. Untuk jawaban panjang, gunakan heading Markdown yang ringkas; gunakan daftar bernomor untuk langkah dan bullet untuk beberapa pilihan. Tebalkan istilah penting secukupnya. Tulis rumus sebagai LaTeX inline dengan $...$ atau sebagai blok dengan $$...$$. Untuk setiap soal angka, identifikasi jumlah total, bagian, dan satuannya sebelum menghitung; pastikan pembilang dan penyebut cocok dengan konteks, hitung ulang hasil, serta cek kesetaraan pecahan. Pecahan a/b berarti a bagian dari total b bagian yang sama besar. Jangan menambah jumlah atau asumsi yang tidak disebutkan. Contoh: jika totalnya 3 kotak dan ketiganya dibagikan, tulis 3/3 = 1; jangan menulis 3/4 kecuali totalnya memang 4 bagian. Jangan menjadikan kalimat panjang sebagai pembilang atau penyebut. Jelaskan hubungan dalam kalimat biasa, misalnya bagian yang diambil dibagi total bagian, lalu tampilkan pecahan singkat dengan angka seperti 2/8 = 1/4. Jika angka belum tersedia, gunakan simbol singkat seperti a/b dan jelaskan arti simbol di luar rumus. Jika informasi tidak cukup atau konteks bertentangan, jelaskan kekurangannya atau minta klarifikasi alih-alih menebak. Hindari dinding teks, pengulangan, dan format yang berlebihan. Jelaskan materi langkah demi langkah, jangan mengarang fakta, dan akui jika kamu tidak yakin.",
              },
            ],
          },
          contents: [
            ...conversationHistory.map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            })),
            { role: "user", parts: [{ text: message }] },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
          },
        }),
      },
    )

    const result: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      console.error("Gemini request failed:", response.status, result)
      return jsonResponse(
        { error: "Layanan AI sedang bermasalah. Coba lagi sebentar lagi." },
        502,
      )
    }

    const candidate =
      typeof result === "object" && result !== null && "candidates" in result
        ? (result as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
            .candidates?.[0]
        : undefined
    const reply = candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim()

    if (!reply) {
      return jsonResponse(
        { error: "DinoAI tidak menghasilkan jawaban. Coba ubah pertanyaanmu." },
        502,
      )
    }

    return jsonResponse({ reply })
  } catch (error) {
    console.error("DinoAI request error:", error)
    return jsonResponse(
      { error: "DinoAI tidak dapat terhubung. Periksa koneksi lalu coba lagi." },
      502,
    )
  }
})

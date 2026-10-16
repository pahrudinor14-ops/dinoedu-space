import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_REQUEST_BYTES = 48_000;
const MAX_HISTORY_ITEMS = 20;
interface HistoryItem {
  role: "user" | "model";
  text: string;
}
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getEnv(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}
async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
function parseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_HISTORY_ITEMS).flatMap((item): HistoryItem[] => {
    if (!isRecord(item)) return [];
    if (
      (item.role !== "user" && item.role !== "model") ||
      typeof item.text !== "string"
    ) {
      return [];
    }
    const text = item.text.trim().slice(0, 8_000);
    return text ? [{ role: item.role, text }] : [];
  });
}
function quotaFailureStatus(reason: string): number {
  const normalized = reason.toLowerCase();
  if (normalized.includes("sudah diproses")) return 409;
  if (normalized.includes("batas") || normalized.includes("coba lagi sebentar")) {
    return 429;
  }
  if (normalized.includes("kuota") || normalized.includes("saldo")) return 402;
  return 429;
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "Pesan terlalu besar." }, 413);
  }
  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request, MAX_REQUEST_BYTES);
  } catch {
    return jsonResponse({ error: "Request tidak dapat dibaca." }, 400);
  }
  if (rawBody === null) {
    return jsonResponse({ error: "Pesan terlalu besar." }, 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Request harus berupa JSON yang valid." }, 400);
  }
  if (!isRecord(body)) {
    return jsonResponse({ error: "Format request tidak valid." }, 400);
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 8_000) {
    return jsonResponse(
      { error: "Pesan harus diisi dan maksimal 8000 karakter." },
      400,
    );
  }
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();
  if (!token) {
    return jsonResponse({ error: "Silakan masuk terlebih dahulu." }, 401);
  }
  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY") ?? getEnv("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = getEnv("GEMINI_API_KEY_DINO_AI");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !apiKey) {
    console.error("DinoAI Chat belum dikonfigurasi: secret layanan tidak lengkap.");
    return jsonResponse({ error: "Layanan DinoAI belum dikonfigurasi." }, 503);
  }
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let user: { id: string } | null = null;
  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      return jsonResponse({ error: "Sesi pengguna tidak valid. Silakan masuk kembali." }, 401);
    }
    user = data.user;
  } catch {
    return jsonResponse({ error: "Sesi pengguna tidak dapat diperiksa. Coba lagi." }, 503);
  }
  const history = parseHistory(body.history);
  const firstUserMessageIndex = history.findIndex((item) => item.role === "user");
  const conversationHistory = firstUserMessageIndex === -1
    ? []
    : history.slice(firstUserMessageIndex);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const idempotencyKey = crypto.randomUUID();
  const releaseReservation = async (failureReason: string) => {
    try {
      const { data, error } = await admin.rpc("fail_dino_ai_credit_request", {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
        p_failure_reason: failureReason,
      });
      if (error || data !== true) {
        console.error("DinoAI Chat: kredit gagal dikembalikan.", error?.code);
        return false;
      }
      return true;
    } catch {
      console.error("DinoAI Chat: pengembalian kredit tidak dapat dipastikan.");
      return false;
    }
  };
  let reservationData: unknown;
  try {
    const { data, error } = await admin.rpc("reserve_dino_ai_credit", {
      p_user_id: user.id,
      p_feature: "dinoai-chat",
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      console.error("DinoAI Chat: reservasi kredit gagal.", error.code);
      await releaseReservation("reservation_response_error");
      return jsonResponse({ error: "Kuota AI tidak dapat diperiksa. Coba lagi nanti." }, 503);
    }
    reservationData = data;
  } catch {
    await releaseReservation("reservation_response_error");
    return jsonResponse({ error: "Kuota AI tidak dapat diperiksa. Coba lagi nanti." }, 503);
  }
  const reservation = Array.isArray(reservationData)
    ? reservationData[0]
    : reservationData;
  if (
    !isRecord(reservation) ||
    typeof reservation.allowed !== "boolean" ||
    (reservation.allowed && reservation.credits_consumed !== 1)
  ) {
    console.error("DinoAI Chat: format respons reservasi kredit tidak valid.");
    await releaseReservation("invalid_reservation_response");
    return jsonResponse({ error: "Kuota AI tidak dapat diperiksa. Coba lagi nanti." }, 503);
  }
  if (!reservation.allowed) {
    const reason = typeof reservation.reason === "string"
      ? reservation.reason
      : "Kuota AI tidak mencukupi.";
    return jsonResponse({ error: reason }, quotaFailureStatus(reason));
  }
  const model = getEnv("GEMINI_MODEL") || "gemini-2.5-flash";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35_000);
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
            parts: [{
              text: "Kamu adalah DinoAI, asisten belajar yang ramah, jelas, dan profesional. Jawab dalam Bahasa Indonesia kecuali pengguna meminta bahasa lain. Susun jawaban dengan paragraf singkat dan runtut. Untuk jawaban panjang, gunakan heading Markdown yang ringkas; gunakan daftar bernomor untuk langkah dan bullet untuk beberapa pilihan. Tebalkan istilah penting secukupnya. Tulis rumus sebagai LaTeX inline dengan $...$ atau sebagai blok dengan $$...$$. Untuk setiap soal angka, identifikasi jumlah total, bagian, dan satuannya sebelum menghitung; pastikan pembilang dan penyebut cocok dengan konteks, hitung ulang hasil, serta cek kesetaraan pecahan. Pecahan a/b berarti a bagian dari total b bagian yang sama besar. Jangan menambah jumlah atau asumsi yang tidak disebutkan. Contoh: jika totalnya 3 kotak dan ketiganya dibagikan, tulis 3/3 = 1; jangan menulis 3/4 kecuali totalnya memang 4 bagian. Jangan menjadikan kalimat panjang sebagai pembilang atau penyebut. Jelaskan hubungan dalam kalimat biasa, misalnya bagian yang diambil dibagi total bagian, lalu tampilkan pecahan singkat dengan angka seperti 2/8 = 1/4. Jika angka belum tersedia, gunakan simbol singkat seperti a/b dan jelaskan arti simbol di luar rumus. Jika informasi tidak cukup atau konteks bertentangan, jelaskan kekurangannya atau minta klarifikasi alih-alih menebak. Hindari dinding teks, pengulangan, dan format yang berlebihan. Jelaskan materi langkah demi langkah, jangan mengarang fakta, dan akui jika kamu tidak yakin.",
            }],
          },
          contents: [
            ...conversationHistory.map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            })),
            { role: "user", parts: [{ text: message }] },
          ],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
        }),
        signal: controller.signal,
      },
    );
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Gemini request failed:", response.status);
      const creditsRestored = await releaseReservation(`gemini_http_${response.status}`);
      return jsonResponse({
        error: response.status === 429
          ? "Layanan AI sedang sibuk. Coba lagi beberapa saat."
          : "Layanan AI sedang bermasalah. Coba lagi sebentar lagi.",
        creditsRestored,
      }, response.status === 429 ? 429 : 502);
    }
    const candidates = isRecord(result) && Array.isArray(result.candidates)
      ? result.candidates
      : [];
    const candidate = isRecord(candidates[0]) ? candidates[0] : null;
    const content = candidate && isRecord(candidate.content)
      ? candidate.content
      : null;
    const parts = content && Array.isArray(content.parts) ? content.parts : [];
    const reply = parts
      .filter(isRecord)
      .map((part) => typeof part.text === "string" ? part.text : "")
      .join("")
      .trim();
    if (!reply) {
      const creditsRestored = await releaseReservation("empty_gemini_response");
      return jsonResponse({
        error: "DinoAI tidak menghasilkan jawaban. Coba ubah pertanyaanmu.",
        creditsRestored,
      }, 502);
    }
    try {
      const { data, error } = await admin.rpc("complete_dino_ai_credit_request", {
        p_user_id: user.id,
        p_idempotency_key: idempotencyKey,
      });
      if (error || data !== true) {
        console.error("DinoAI Chat: status penyelesaian kredit tidak tercatat.", error?.code);
        await releaseReservation("credit_completion_failed");
        return jsonResponse({
          error: "Status kredit belum dapat dipastikan. Coba lagi nanti.",
        }, 503);
      }
    } catch {
      console.error("DinoAI Chat: status penyelesaian kredit tidak dapat diperbarui.");
      await releaseReservation("credit_completion_failed");
      return jsonResponse({ error: "Status kredit belum dapat dipastikan. Coba lagi nanti." }, 503);
    }
    return jsonResponse({ reply });
  } catch (error) {
    console.error("DinoAI Chat request gagal:", error instanceof Error ? error.name : "unknown");
    const creditsRestored = await releaseReservation("gemini_network_error");
    return jsonResponse({
      error: "DinoAI tidak dapat terhubung. Periksa koneksi lalu coba lagi.",
      creditsRestored,
    }, 502);
  } finally {
    clearTimeout(timeoutId);
  }
});

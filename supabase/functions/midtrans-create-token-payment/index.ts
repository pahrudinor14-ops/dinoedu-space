import { createClient } from "npm:@supabase/supabase-js@2";
async function readBoundedBody(req: Request, maxBytes: number): Promise<string | null> {
  const reader = req.body?.getReader()
  if (!reader) return ""
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const AMOUNT_IDR = 5000;
const CREDITS = 10;
const MIDTRANS_URL = "https://api.sandbox.midtrans.com/v2/charge";
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function getEnv(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function safeQrUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      url.hostname === "api.sandbox.midtrans.com" &&
      !url.username &&
      !url.password
    ) {
      return url.toString();
    }
  } catch {
    // URL tidak valid.
  }
  return null;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  try {
    const bearer = req.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!bearer) {
      return jsonResponse({ error: "Silakan masuk terlebih dahulu." }, 401);
    }
    const supabaseUrl = getEnv("SUPABASE_URL");
    const anonKey =
      getEnv("SUPABASE_ANON_KEY") ??
      getEnv("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const serverKey = getEnv("MIDTRANS_SERVER_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !serverKey) {
      console.error("Token payment: environment belum lengkap.");
      return jsonResponse(
        { error: "Layanan pembayaran belum dikonfigurasi." },
        503,
      );
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(bearer);
    if (authError || !user) {
      return jsonResponse({ error: "Sesi pengguna tidak valid." }, 401);
    }
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 8_000) {
      return jsonResponse({ error: "Request terlalu besar." }, 413);
    }
    let rawBody: string | null;
    try {
      rawBody = await readBoundedBody(req, 8_000);
    } catch {
      return jsonResponse({ error: "Request tidak dapat dibaca." }, 400);
    }
    if (rawBody === null) {
      return jsonResponse({ error: "Request terlalu besar." }, 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Request JSON tidak valid." }, 400);
    }
    if (!isRecord(body)) {
      return jsonResponse({ error: "Format request tidak valid." }, 400);
    }
    const rawKey = body.idempotencyKey;
    if (
      typeof rawKey !== "string" ||
      rawKey.trim().length < 8 ||
      rawKey.trim().length > 128
    ) {
      return jsonResponse(
        { error: "idempotencyKey wajib diisi (8–128 karakter)." },
        400,
      );
    }
    const idempotencyKey = rawKey.trim();
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Gunakan ulang pesanan untuk kunci yang sama.
    const { data: existing, error: readError } = await admin
      .from("dino_ai_token_payment_orders")
      .select(
        "order_id, amount_idr, credits, currency, status, qr_url, transaction_id",
      )
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (readError) {
      console.error("Token payment: gagal membaca order.", readError.message);
      return jsonResponse({ error: "Pesanan tidak dapat diperiksa." }, 500);
    }
    if (existing) {
      if (existing.status === "pending" && existing.qr_url) {
        return jsonResponse({
          orderId: existing.order_id,
          amountIdr: existing.amount_idr,
          credits: existing.credits,
          currency: existing.currency,
          status: existing.status,
          qrUrl: existing.qr_url,
          reused: true,
        });
      }
      if (existing.status === "paid") {
        return jsonResponse({
          orderId: existing.order_id,
          amountIdr: existing.amount_idr,
          credits: existing.credits,
          currency: existing.currency,
          status: "paid",
          reused: true,
        });
      }
      return jsonResponse(
        {
          error: "Kunci sudah digunakan. Buat kunci baru untuk order baru.",
          status: existing.status,
        },
        409,
      );
    }
    const { data: pendingOrder, error: pendingError } = await admin
      .from("dino_ai_token_payment_orders")
      .select("order_id, amount_idr, credits, currency, status, qr_url")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (pendingError) {
      console.error("Token payment: gagal memeriksa order pending.", pendingError.code);
      return jsonResponse({ error: "Pesanan token tidak dapat diperiksa." }, 500);
    }
    if (pendingOrder) {
      if (pendingOrder.qr_url) {
        return jsonResponse({
          orderId: pendingOrder.order_id,
          amountIdr: pendingOrder.amount_idr,
          credits: pendingOrder.credits,
          currency: pendingOrder.currency,
          status: pendingOrder.status,
          qrUrl: pendingOrder.qr_url,
          reused: true,
        });
      }
      return jsonResponse(
        { error: "Pesanan token sebelumnya sedang dibuat. Periksa status sebelum mencoba lagi." },
        409,
      );
    }
    const orderId = `DINO-TOK-${crypto.randomUUID()}`;
    const { error: insertError } = await admin
      .from("dino_ai_token_payment_orders")
      .insert({
        user_id: user.id,
        provider: "midtrans",
        order_id: orderId,
        idempotency_key: idempotencyKey,
        amount_idr: AMOUNT_IDR,
        credits: CREDITS,
        currency: "IDR",
        status: "pending",
      });
    if (insertError) {
      console.error("Token payment: gagal membuat order.", insertError.message);
      return jsonResponse(
        {
          error:
            insertError.code === "23505"
              ? "Order sedang dibuat. Periksa status sebelum mencoba lagi."
              : "Pesanan token gagal dibuat.",
        },
        insertError.code === "23505" ? 409 : 500,
      );
    }
    let response: Response;
    try {
      response = await fetch(MIDTRANS_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${serverKey}:`)}`,
        },
        body: JSON.stringify({
          payment_type: "qris",
          transaction_details: {
            order_id: orderId,
            gross_amount: AMOUNT_IDR,
          },
          item_details: [
            {
              id: "dinoai-token-10",
              price: AMOUNT_IDR,
              quantity: 1,
              name: "DinoAI - 10 Kredit",
            },
          ],
          ...(user.email
            ? { customer_details: { email: user.email } }
            : {}),
        }),
      });
    } catch (error) {
      await admin
        .from("dino_ai_token_payment_orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .neq("status", "paid");
      console.error("Token payment: koneksi Midtrans gagal.", {
        message: error instanceof Error ? error.message : "unknown",
      });
      return jsonResponse(
        { error: "Tidak dapat terhubung ke Midtrans Sandbox." },
        502,
      );
    }
    const gateway: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(gateway)) {
      await admin
        .from("dino_ai_token_payment_orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("order_id", orderId)
        .neq("status", "paid");
      console.error("Token payment: Midtrans menolak charge.", {
        httpStatus: response.status,
        statusCode:
          isRecord(gateway) && typeof gateway.status_code === "string"
            ? gateway.status_code
            : null,
      });
      return jsonResponse(
        { error: "Midtrans menolak pembuatan QRIS." },
        502,
      );
    }
    const actions = Array.isArray(gateway.actions)
      ? gateway.actions.filter(isRecord)
      : [];
    const candidates = [
      ...actions.filter((a) => a.name === "generate-qr-code-v2"),
      ...actions.filter((a) => a.name === "generate-qr-code"),
    ];
    const selected = candidates.find((a) => safeQrUrl(a.url) !== null);
    const qrUrl = selected ? safeQrUrl(selected.url) : null;
    const transactionId =
      typeof gateway.transaction_id === "string"
        ? gateway.transaction_id
        : null;
    if (gateway.order_id !== orderId || !qrUrl) {
      await admin
        .from("dino_ai_token_payment_orders")
        .update({
          status: "failed",
          transaction_id: transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .neq("status", "paid");
      console.error("Token payment: respons QRIS tidak valid.", {
        orderIdMatches: gateway.order_id === orderId,
        actionNames: actions.map((a) =>
          typeof a.name === "string" ? a.name : null
        ),
      });
      return jsonResponse(
        { error: "Respons QRIS tidak valid. Periksa log Edge Function." },
        502,
      );
    }
    const { error: updateError } = await admin
      .from("dino_ai_token_payment_orders")
      .update({
        transaction_id: transactionId,
        payment_type: "qris",
        qr_url: qrUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .eq("status", "pending");
    if (updateError) {
      console.error("Token payment: gagal menyimpan QRIS.", updateError.message);
      return jsonResponse(
        {
          error:
            "QRIS dibuat tetapi data order gagal disimpan. Hubungi admin sebelum mencoba lagi.",
        },
        500,
      );
    }
    return jsonResponse({
      orderId,
      amountIdr: AMOUNT_IDR,
      credits: CREDITS,
      currency: "IDR",
      status: "pending",
      qrUrl,
      reused: false,
    });
  } catch (error) {
    console.error("Token payment: unexpected error.", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonResponse(
      { error: "Tidak dapat membuat pesanan QRIS saat ini." },
      500,
    );
  }
});

import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {

  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",

  "Access-Control-Allow-Methods": "POST, OPTIONS",

}

function jsonResponse(body: unknown, status = 200) {

  return new Response(JSON.stringify(body), {

    status,

    headers: { ...corsHeaders, "Content-Type": "application/json" },

  })

}

function getEnv(name: string): string | null {

  const value = Deno.env.get(name)?.trim()

  return value || null

}

function isRecord(value: unknown): value is Record<string, unknown> {

  return typeof value === "object" && value !== null && !Array.isArray(value)

}

function safeSandboxUrl(value: unknown): string | null {

  if (typeof value !== "string") return null

  try {

    const parsed = new URL(value)

    if (

      parsed.protocol === "https:" &&

      parsed.hostname === "api.sandbox.midtrans.com" &&

      !parsed.username &&

      !parsed.password

    ) {

      return parsed.toString()

    }

  } catch {

    // Invalid URL.

  }

  return null

}

function safeUrlShape(value: unknown): string | null {
  const url = safeSandboxUrl(value)
  if (!url) return null

  const parsed = new URL(url)
  const segments = parsed.pathname.split("/")
  // /v2/qris/{transaction-id}/qr-code; redact the transaction-specific segment.
  if (segments.length > 3) segments[3] = "[REDACTED]"
  return `${parsed.origin}${segments.join("/")}`
}

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

  try {

    const authorization = req.headers.get("Authorization")

    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()

    if (!token) return jsonResponse({ error: "Silakan masuk terlebih dahulu." }, 401)

    const supabaseUrl = getEnv("SUPABASE_URL")

    const anonKey = getEnv("SUPABASE_ANON_KEY") ?? getEnv("SUPABASE_PUBLISHABLE_KEY")

    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")

    const serverKey = getEnv("MIDTRANS_SERVER_KEY")

    const amountIdr = 29000

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {

      console.error("midtrans-create-payment: Supabase environment incomplete")

      return jsonResponse({ error: "Layanan pembayaran belum dikonfigurasi." }, 503)

    }

    if (!serverKey) {

      return jsonResponse({

        error: "Mode sandbox belum dikonfigurasi. Admin perlu mengatur secret MIDTRANS_SERVER_KEY.",

      }, 503)

    }

    const authClient = createClient(supabaseUrl, anonKey, {

      auth: { persistSession: false, autoRefreshToken: false },

    })

    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) return jsonResponse({ error: "Sesi pengguna tidak valid." }, 401)

    let body: unknown

    try {

      body = await req.json()

    } catch {

      return jsonResponse({ error: "Request harus berupa JSON yang valid." }, 400)

    }

    if (!isRecord(body)) return jsonResponse({ error: "Format request tidak valid." }, 400)

    const idempotencyKey = body.idempotencyKey

    if (

      typeof idempotencyKey !== "string" ||

      idempotencyKey.trim().length < 8 ||

      idempotencyKey.trim().length > 128

    ) {

      return jsonResponse({ error: "idempotencyKey wajib diisi (8–128 karakter)." }, 400)

    }

    const key = idempotencyKey.trim()

    const admin = createClient(supabaseUrl, serviceRoleKey, {

      auth: { persistSession: false, autoRefreshToken: false },

    })

    const { data: existing, error: existingError } = await admin

      .from("dino_supporter_payment_orders")

      .select("order_id, amount_idr, currency, status, qr_url")

      .eq("user_id", user.id)

      .eq("idempotency_key", key)

      .maybeSingle()

    if (existingError) {

      console.error("midtrans-create-payment: failed to read existing order", existingError.message)

      return jsonResponse({ error: "Pesanan pembayaran tidak dapat diperiksa." }, 500)

    }

    if (existing) {

      if (existing.status === "pending" && existing.qr_url) {

        return jsonResponse({

          orderId: existing.order_id,

          amountIdr: existing.amount_idr,

          currency: existing.currency,

          status: existing.status,

          qrUrl: existing.qr_url,

          qr_url: existing.qr_url,

          reused: true,

        })

      }

      if (existing.status === "paid") {

        return jsonResponse({

          orderId: existing.order_id,

          amountIdr: existing.amount_idr,

          currency: existing.currency,

          status: "paid",

          reused: true,

        })

      }

      return jsonResponse({

        error: "Kunci ini sudah digunakan untuk pesanan yang tidak dapat dilanjutkan. Buat kunci baru.",

        status: existing.status,

      }, 409)

    }

    const orderId = `DINO-SUP-${crypto.randomUUID()}`

    const { error: insertError } = await admin

      .from("dino_supporter_payment_orders")

      .insert({

        user_id: user.id,

        provider: "midtrans",

        order_id: orderId,

        idempotency_key: key,

        amount_idr: amountIdr,

        currency: "IDR",

        status: "pending",

      })

    if (insertError) {

      if (insertError.code === "23505") {

        return jsonResponse({

          error: "Pesanan dengan kunci ini sedang dibuat. Periksa status pesanan sebelum mencoba lagi.",

        }, 409)

      }

      console.error("midtrans-create-payment: failed to insert order", insertError.message)

      return jsonResponse({ error: "Pesanan pembayaran gagal dibuat." }, 500)

    }

    let midtransResponse: Response

    try {

      midtransResponse = await fetch("https\://api.sandbox.midtrans.com/v2/charge", {

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

            gross_amount: amountIdr,

          },

          item_details: [{

            id: "dinoedu-supporter-monthly",

            price: amountIdr,

            quantity: 1,

            name: "DinoEdu Supporter - 30 kredit bulanan",

          }],

          ...(user.email ? { customer_details: { email: user.email } } : {}),

        }),

      })

    } catch (error) {

      await admin.from("dino_supporter_payment_orders")

        .update({ status: "failed", updated_at: new Date().toISOString() })

        .eq("order_id", orderId)

        .neq("status", "paid")

      console.error("midtrans-create-payment: Midtrans network request failed", {

        message: error instanceof Error ? error.message : "unknown",

      })

      return jsonResponse({ error: "Tidak dapat terhubung ke Midtrans Sandbox." }, 502)

    }

    const gatewayData: unknown = await midtransResponse.json().catch(() => null)

    if (!midtransResponse.ok || !isRecord(gatewayData)) {

      await admin.from("dino_supporter_payment_orders")

        .update({ status: "failed", updated_at: new Date().toISOString() })

        .eq("order_id", orderId)

        .neq("status", "paid")

      console.error("midtrans-create-payment: Midtrans rejected charge", {

        httpStatus: midtransResponse.status,

        gatewayStatusCode: isRecord(gatewayData) && typeof gatewayData.status_code === "string"

          ? gatewayData.status_code

          : null,

        gatewayStatusMessage: isRecord(gatewayData) && typeof gatewayData.status_message === "string"

          ? gatewayData.status_message

          : null,

      })

      return jsonResponse({ error: "Midtrans Sandbox menolak pembuatan QRIS. Periksa log fungsi." }, 502)

    }

    const actions = Array.isArray(gatewayData.actions) ? gatewayData.actions.filter(isRecord) : []

    const actionDiagnostics = actions

  .filter((item) => typeof item === "object" && item !== null)

  .map((item) => {

    const action = item as Record<string, unknown>

    let hostname: string | null = null

    let protocol: string | null = null

    let urlForManualCheck: string | null = null

    try {

      if (typeof action.url === "string") {

        const parsed = new URL(action.url)

        hostname = parsed.hostname

        protocol = parsed.protocol

        // Only expose the transaction-specific QR image URL for the exact
        // Midtrans Sandbox host so it can be opened manually for diagnosis.
        if (
          protocol === "https:" &&
          hostname === "merchants-app.sbx.midtrans.com" &&
          !parsed.username &&
          !parsed.password
        ) {
          urlForManualCheck = parsed.toString()
        }
      }

    } catch {

      // URL tidak valid; jangan tampilkan URL mentah.

    }

    return {

      name: typeof action.name === "string" ? action.name : null,

      hostname,

      protocol,

      urlForManualCheck,

      allowedSandboxHost:

        protocol === "https:" &&

        hostname === "api.sandbox.midtrans.com",

    }

  })

    const candidates = [

      ...actions.filter((action) => action.name === "generate-qr-code-v2"),

      ...actions.filter((action) => action.name === "generate-qr-code"),

    ]

    const selected = candidates.find((action) => safeSandboxUrl(action.url) !== null)

    const safeQrUrl = selected ? safeSandboxUrl(selected.url) : null

    const transactionId = typeof gatewayData.transaction_id === "string"

      ? gatewayData.transaction_id

      : null

    // Safe diagnostics only: log field presence and lengths, never QR payload contents.
    console.log("midtrans-create-payment: QR payload fields", {
      responseKeys: Object.keys(gatewayData),
      hasQrString: typeof gatewayData.qr_string === "string",
      qrStringLength: typeof gatewayData.qr_string === "string"
        ? gatewayData.qr_string.length
        : 0,
      actionNames: actions.map((action) =>
        typeof action.name === "string" ? action.name : null
      ),
    })

    // The v2 URL is logged only when it belongs to the exact Midtrans Sandbox
    // host above; it contains a transaction-specific identifier, not credentials.
    console.log("midtrans-create-payment: QR response diagnostics", {

      orderIdMatches: gatewayData.order_id === orderId,

      httpStatus: midtransResponse.status,

      gatewayStatusCode: typeof gatewayData.status_code === "string" ? gatewayData.status_code : null,

      transactionStatus: typeof gatewayData.transaction_status === "string"

        ? gatewayData.transaction_status

        : null,

      actionDiagnostics,

      selectedActionName: typeof selected?.name === "string" ? selected.name : null,

      qrUrlShape: selected ? safeUrlShape(selected.url) : null,

      qrUrlAllowedSandboxHost: safeQrUrl !== null,

    })

    if (gatewayData.order_id !== orderId || !safeQrUrl) {

      await admin.from("dino_supporter_payment_orders")

        .update({

          status: "failed",

          transaction_id: transactionId,

          updated_at: new Date().toISOString(),

        })

        .eq("order_id", orderId)

        .neq("status", "paid")

      return jsonResponse({ error: "Respons QRIS dari Midtrans tidak valid. Periksa log diagnostik fungsi." }, 502)

    }

    const { error: updateError } = await admin

      .from("dino_supporter_payment_orders")

      .update({

        transaction_id: transactionId,

        payment_type: "qris",

        qr_url: safeQrUrl,

        updated_at: new Date().toISOString(),

      })

      .eq("order_id", orderId)

      .eq("status", "pending")

    if (updateError) {

      console.error("midtrans-create-payment: failed to save QR details", updateError.message)

      return jsonResponse({

        error: "QRIS dibuat, tetapi data pesanan belum berhasil disimpan. Hubungi admin sebelum membuat pembayaran baru.",

      }, 500)

    }

    return jsonResponse({

      orderId,

      amountIdr,

      currency: "IDR",

      status: "pending",

      qrUrl: safeQrUrl,

      qr_url: safeQrUrl,

      qrActionName: typeof selected?.name === "string" ? selected.name : null,

      reused: false,

    })

  } catch (error) {

    console.error("midtrans-create-payment: unexpected error", {

      message: error instanceof Error ? error.message : "unknown",

    })

    return jsonResponse({ error: "Tidak dapat membuat pesanan QRIS saat ini." }, 500)

  }

})

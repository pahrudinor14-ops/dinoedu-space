import { createClient } from "npm:@supabase/supabase-js@2"
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
async function sha512Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-512", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
function parseIdr(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }
  const text = String(value).trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null
  const amount = Number(text)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return null
  }
  return amount
}
function env(name: string): string | null {
  const value = Deno.env.get(name)?.trim()
  return value || null
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
function isValidDinoSupporterOrderId(value: string): boolean {
  const match = /^DINO-SUP-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(value)
  return Boolean(match)
}
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }
  try {
    const supabaseUrl = env("SUPABASE_URL")
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY")
    const serverKey = env("MIDTRANS_SERVER_KEY")
    if (!supabaseUrl || !serviceRoleKey || !serverKey) {
      console.error("Webhook environment is incomplete", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasMidtransServerKey: Boolean(serverKey),
      })
      return jsonResponse(
        { error: "Webhook belum dikonfigurasi." },
        503,
      )
    }
    const notification: unknown = await req.json().catch(() => null)
    if (!isRecord(notification)) {
      console.warn("Rejected Midtrans webhook: invalid JSON payload")
      return jsonResponse({ error: "Payload tidak valid." }, 400)
    }
    const body = notification
    const orderId =
      typeof body.order_id === "string" ? body.order_id.trim() : ""
    const statusCode =
      body.status_code === undefined || body.status_code === null
        ? ""
        : String(body.status_code)
    const grossAmount =
      typeof body.gross_amount === "string" ||
      typeof body.gross_amount === "number"
        ? String(body.gross_amount)
        : ""
    const suppliedSignature =
      typeof body.signature_key === "string"
        ? body.signature_key.trim().toLowerCase()
        : ""
    const payloadChecks = {
      validOrderId: isValidDinoSupporterOrderId(orderId),
      orderIdPrefixMatches: orderId.startsWith("DINO-SUP-"),
      hasStatusCode: statusCode.length > 0,
      hasGrossAmount: grossAmount.length > 0,
      hasSignature: /^[a-f0-9]{128}$/.test(suppliedSignature),
    }
    if (Object.values(payloadChecks).some((valid) => !valid)) {
      console.warn("Invalid webhook payload fields:", {
        ...payloadChecks,
        orderIdLength: orderId.length,
        orderIdPrefix: orderId.slice(0, 9),
      })
      return jsonResponse(
        { error: "Payload tidak lengkap atau order ID tidak valid." },
        400,
      )
    }
    // Signature Midtrans:
    // SHA512(order_id + status_code + gross_amount + Server Key)
    const expectedSignature = await sha512Hex(
      orderId + statusCode + grossAmount + serverKey,
    )
    if (!constantTimeEqual(expectedSignature, suppliedSignature)) {
      console.warn("Rejected Midtrans webhook: invalid signature")
      return jsonResponse(
        { error: "Signature tidak valid." },
        401,
      )
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    const { data: order, error: orderError } = await admin
      .from("dino_supporter_payment_orders")
      .select("order_id, amount_idr, currency, status")
      .eq("order_id", orderId)
      .maybeSingle()
    if (orderError) {
      console.error(
        "Could not load payment order:",
        orderError.message,
      )
      return jsonResponse(
        { error: "Pesanan tidak dapat diperiksa." },
        500,
      )
    }
    if (!order) {
      console.warn("Rejected Midtrans webhook: order not found")
      return jsonResponse(
        { error: "Pesanan tidak ditemukan." },
        404,
      )
    }
    if (
      order.amount_idr !== 29000 ||
      order.currency !== "IDR" ||
      parseIdr(grossAmount) !== order.amount_idr
    ) {
      console.warn(
        "Rejected Midtrans webhook: amount/currency mismatch",
      )
      return jsonResponse(
        { error: "Nominal transaksi tidak cocok." },
        400,
      )
    }
    // Verifikasi ulang transaksi melalui Midtrans Sandbox.
    const statusUrl =
      `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`
    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${btoa(`${serverKey}:`)}`,
      },
    })
    const statusData: unknown = await statusResponse
      .json()
      .catch(() => null)
    if (!statusResponse.ok || !isRecord(statusData)) {
      console.error(
        "Midtrans status API verification failed",
        { httpStatus: statusResponse.status },
      )
      return jsonResponse(
        { error: "Status transaksi belum dapat diverifikasi." },
        502,
      )
    }
    const verified = statusData
    if (
      verified.order_id !== orderId ||
      parseIdr(verified.gross_amount) !== order.amount_idr ||
      verified.currency !== "IDR"
    ) {
      console.warn(
        "Midtrans status API returned mismatched transaction details",
      )
      return jsonResponse(
        { error: "Detail transaksi terverifikasi tidak cocok." },
        400,
      )
    }
    const transactionStatus =
      typeof verified.transaction_status === "string"
        ? verified.transaction_status
        : ""
    const fraudStatus =
      typeof verified.fraud_status === "string"
        ? verified.fraud_status
        : ""
    const verifiedPaymentType =
      typeof verified.payment_type === "string"
        ? verified.payment_type
        : ""
    if (verifiedPaymentType !== "qris") {
      console.warn(
        "Rejected Midtrans webhook: verified payment type is not QRIS",
      )
      return jsonResponse(
        { error: "Jenis pembayaran tidak sesuai." },
        400,
      )
    }
    let newStatus: "pending" | "paid" | "failed" | "expired" =
      "pending"
    if (
      transactionStatus === "settlement" &&
      (!fraudStatus || fraudStatus === "accept")
    ) {
      newStatus = "paid"
    } else if (transactionStatus === "expire") {
      newStatus = "expired"
    } else if (
      transactionStatus === "deny" ||
      transactionStatus === "cancel"
    ) {
      newStatus = "failed"
    }
    const transactionId =
      typeof verified.transaction_id === "string"
        ? verified.transaction_id
        : typeof body.transaction_id === "string"
          ? body.transaction_id
          : null
    // RPC mengaktifkan paket dan mengubah status pesanan menjadi paid
    // dalam satu transaksi database.
    if (newStatus === "paid") {
      const { data: activation, error: activationError } =
        await admin.rpc("activate_dino_supporter_payment", {
          p_order_id: orderId,
          p_transaction_id: transactionId,
        })
      if (activationError) {
        console.error(
          "Supporter activation failed:",
          activationError.message,
        )
        return jsonResponse(
          {
            error:
              "Pembayaran terverifikasi, tetapi aktivasi Supporter gagal.",
          },
          500,
        )
      }
      if (!Array.isArray(activation) || activation.length === 0) {
        console.error(
          "Supporter activation RPC returned no result",
        )
        return jsonResponse(
          { error: "Hasil aktivasi Supporter tidak ditemukan." },
          500,
        )
      }
      const activationResult = activation[0]
      if (activationResult.payment_status !== "paid") {
        console.error(
          "Supporter activation RPC returned unexpected status",
        )
        return jsonResponse(
          { error: "Status aktivasi Supporter tidak sesuai." },
          500,
        )
      }
      return jsonResponse({
        received: true,
        status: "paid",
        alreadyProcessed:
          activationResult.already_processed === true,
      })
    }
    // Status non-paid tidak boleh menurunkan pesanan yang sudah paid.
    const { error: updateError } = await admin
      .from("dino_supporter_payment_orders")
      .update({
        status: newStatus,
        transaction_id: transactionId,
        payment_type: verifiedPaymentType,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .neq("status", "paid")
    if (updateError) {
      console.error(
        "Could not update payment order status:",
        updateError.message,
      )
      return jsonResponse(
        { error: "Status transaksi belum berhasil disimpan." },
        500,
      )
    }
    return jsonResponse({
      received: true,
      status: newStatus,
    })
  } catch (error) {
    console.error(
      "midtrans-webhook error:",
      error instanceof Error ? error.message : "Unknown error",
    )
    return jsonResponse(
      { error: "Webhook tidak dapat diproses." },
      500,
    )
  }
})

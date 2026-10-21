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
function env(name: string): string | null {
  const value = Deno.env.get(name)?.trim()
  return value ? value : null
}
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
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
    if (!token) return jsonResponse({ error: "Silakan masuk terlebih dahulu." }, 401)
    const supabaseUrl = env("SUPABASE_URL")
    const anonKey = env("SUPABASE_ANON_KEY") ?? env("SUPABASE_PUBLISHABLE_KEY")
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Layanan pembayaran belum dikonfigurasi." }, 503)
    }
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return jsonResponse({ error: "Sesi pengguna tidak valid." }, 401)
    const contentLength = Number(req.headers.get("content-length") ?? "0")
    if (Number.isFinite(contentLength) && contentLength > 4_096) {
      return jsonResponse({ error: "Request terlalu besar." }, 413)
    }
    let rawBody: string | null
    try {
      rawBody = await readBoundedBody(req, 4_096)
    } catch {
      return jsonResponse({ error: "Request tidak dapat dibaca." }, 400)
    }
    if (rawBody === null) return jsonResponse({ error: "Request terlalu besar." }, 413)
    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return jsonResponse({ error: "Request harus berupa JSON yang valid." }, 400)
    }
    const orderId = typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).orderId
      : null
    if (typeof orderId !== "string" || !/^DINO-SUP-[0-9a-f-]{36}$/i.test(orderId)) {
      return jsonResponse({ error: "orderId tidak valid." }, 400)
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: order, error } = await admin
      .from("dino_supporter_payment_orders")
      .select("order_id, amount_idr, currency, status, qr_url, paid_at")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (error) {
      console.error("Payment status lookup failed:", error.message)
      return jsonResponse({ error: "Status pembayaran tidak dapat diperiksa." }, 500)
    }
    if (!order) return jsonResponse({ error: "Pesanan tidak ditemukan." }, 404)
    // This endpoint only reports the locally verified payment state.
    // It never grants credits or activates Supporter.
    return jsonResponse({
      orderId: order.order_id,
      amountIdr: order.amount_idr,
      currency: order.currency,
      status: order.status,
      qrUrl: order.qr_url,
      paidAt: order.paid_at,
    })
  } catch (error) {
    console.error("midtrans-payment-status error:", error)
    return jsonResponse({ error: "Status pembayaran tidak dapat diperiksa." }, 500)
  }
})

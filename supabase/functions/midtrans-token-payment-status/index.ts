import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function env(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}

function isTokenOrderId(value: unknown): value is string {
  return typeof value === "string" &&
    /^DINO-TOK-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const token = req.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

    if (!token) {
      return jsonResponse({ error: "Silakan masuk terlebih dahulu." }, 401);
    }

    const supabaseUrl = env("SUPABASE_URL");
    const anonKey =
      env("SUPABASE_ANON_KEY") ?? env("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const midtransServerKey = env("MIDTRANS_SERVER_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !midtransServerKey) {
      console.error("Token status: konfigurasi environment belum lengkap.");
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
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Sesi pengguna tidak valid." }, 401);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Request harus berupa JSON yang valid." },
        400,
      );
    }

    const orderId =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).orderId
        : null;

    if (!isTokenOrderId(orderId)) {
      return jsonResponse({ error: "orderId tidak valid." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: order, error: orderError } = await admin
      .from("dino_ai_token_payment_orders")
      .select(
        "order_id, user_id, amount_idr, credits, currency, status, qr_url, paid_at, transaction_id, payment_type",
      )
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) {
      console.error("Token status: order lookup failed.", orderError.message);
      return jsonResponse(
        { error: "Status pembayaran tidak dapat diperiksa." },
        500,
      );
    }

    if (!order) {
      return jsonResponse({ error: "Pesanan tidak ditemukan." }, 404);
    }

    // Order yang sudah paid tetap dibaca; RPC aktivasi tetap idempoten.
    if (order.status === "paid") {
      return jsonResponse({
        orderId: order.order_id,
        amountIdr: order.amount_idr,
        credits: order.credits,
        currency: order.currency,
        status: order.status,
        qrUrl: order.qr_url,
        paidAt: order.paid_at,
      });
    }

    // Nilai order wajib sesuai paket token tetap.
    if (
      order.amount_idr !== 5000 ||
      order.credits !== 10 ||
      order.currency !== "IDR" ||
      order.order_id !== orderId
    ) {
      console.error("Token status: data order tidak sesuai paket.");
      return jsonResponse(
        { error: "Data pesanan tidak sesuai konfigurasi pembayaran." },
        409,
      );
    }

    const basicAuth = btoa(`${midtransServerKey}:`);
    const statusUrl =
      `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`;

    const midtransResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
    });

    const midtransBody = await midtransResponse.text();
    let midtrans: Record<string, unknown>;

    try {
      midtrans = JSON.parse(midtransBody);
    } catch {
      console.error("Token status: respons Midtrans bukan JSON.", {
        httpStatus: midtransResponse.status,
      });
      return jsonResponse(
        { error: "Respons verifikasi pembayaran tidak valid." },
        502,
      );
    }

    if (!midtransResponse.ok) {
      console.error("Token status: Midtrans status API rejected request.", {
        httpStatus: midtransResponse.status,
        statusCode: midtrans.status_code,
        statusMessage: midtrans.status_message,
      });
      return jsonResponse(
        { error: "Status transaksi belum dapat diverifikasi ke Midtrans." },
        502,
      );
    }

    const sameOrder = midtrans.order_id === orderId;
    const sameAmount = Number(midtrans.gross_amount) === 5000;
    const sameCurrency = midtrans.currency === "IDR";
    const sameTransaction =
      typeof order.transaction_id === "string" &&
      order.transaction_id.length > 0 &&
      midtrans.transaction_id === order.transaction_id;
    const isQris =
      midtrans.payment_type === "qris" &&
      order.payment_type === "qris";
    const isSettlement = midtrans.transaction_status === "settlement";
    const fraudAccepted =
      midtrans.fraud_status === undefined ||
      midtrans.fraud_status === "accept";

    if (
      !sameOrder ||
      !sameAmount ||
      !sameCurrency ||
      !sameTransaction ||
      !isQris
    ) {
      console.error("Token status: data transaksi tidak cocok.", {
        sameOrder,
        sameAmount,
        sameCurrency,
        sameTransaction,
        isQris,
      });
      return jsonResponse(
        { error: "Data transaksi Midtrans tidak cocok dengan pesanan." },
        409,
      );
    }

    if (isSettlement && fraudAccepted) {
      const { data: activation, error: activationError } = await admin.rpc(
        "activate_dino_ai_token_payment",
        {
          p_order_id: orderId,
          p_transaction_id: String(midtrans.transaction_id),
        },
      );

      if (activationError) {
        console.error("Token status: credit activation failed.", {
          message: activationError.message,
          code: activationError.code,
        });
        return jsonResponse(
          { error: "Pembayaran terverifikasi, tetapi aktivasi kredit gagal." },
          500,
        );
      }

      console.log("Token status: activation RPC completed.", {
        orderId,
        activation,
      });
    }

    const { data: refreshedOrder, error: refreshError } = await admin
      .from("dino_ai_token_payment_orders")
      .select("order_id, amount_idr, credits, currency, status, qr_url, paid_at")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (refreshError || !refreshedOrder) {
      console.error("Token status: refreshed order lookup failed.");
      return jsonResponse(
        { error: "Status pembayaran belum dapat dimuat ulang." },
        500,
      );
    }

    return jsonResponse({
      orderId: refreshedOrder.order_id,
      amountIdr: refreshedOrder.amount_idr,
      credits: refreshedOrder.credits,
      currency: refreshedOrder.currency,
      status: refreshedOrder.status,
      qrUrl: refreshedOrder.qr_url,
      paidAt: refreshedOrder.paid_at,
    });
  } catch (error) {
    console.error("midtrans-token-payment-status error:", {
      message: error instanceof Error ? error.message : "unknown",
    });

    return jsonResponse(
      { error: "Status pembayaran tidak dapat diperiksa." },
      500,
    );
  }
});
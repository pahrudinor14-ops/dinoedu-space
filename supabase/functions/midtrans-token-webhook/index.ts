
import { createClient } from "npm:@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function env(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha512Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseIdr(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = env("SUPABASE_URL");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const serverKey = env("MIDTRANS_SERVER_KEY");

    if (!supabaseUrl || !serviceRoleKey || !serverKey) {
      console.error("Token webhook environment incomplete");
      return jsonResponse({ error: "Webhook belum dikonfigurasi." }, 503);
    }

    const notification: unknown = await req.json().catch(() => null);
    if (!isRecord(notification)) {
      return jsonResponse({ error: "Payload tidak valid." }, 400);
    }

    const body = notification;
    const orderId =
      typeof body.order_id === "string" ? body.order_id.trim() : "";
    const statusCode =
      body.status_code == null ? "" : String(body.status_code);
    const grossAmount =
      typeof body.gross_amount === "string" ||
      typeof body.gross_amount === "number"
        ? String(body.gross_amount)
        : "";
    const signature =
      typeof body.signature_key === "string"
        ? body.signature_key.trim().toLowerCase()
        : "";

    if (
      !/^DINO-TOK-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderId,
      ) ||
      !statusCode ||
      !grossAmount ||
      !/^[a-f0-9]{128}$/.test(signature)
    ) {
      return jsonResponse(
        { error: "Payload tidak lengkap atau order ID tidak valid." },
        400,
      );
    }

    const expectedSignature = await sha512Hex(
      orderId + statusCode + grossAmount + serverKey,
    );

    if (!constantTimeEqual(expectedSignature, signature)) {
      return jsonResponse({ error: "Signature tidak valid." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: order, error: orderError } = await admin
      .from("dino_ai_token_payment_orders")
      .select("order_id, amount_idr, credits, currency, status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Token webhook: order lookup failed", orderError.message);
      return jsonResponse({ error: "Pesanan tidak dapat diperiksa." }, 500);
    }

    if (!order) {
      return jsonResponse({ error: "Pesanan tidak ditemukan." }, 404);
    }

    if (
      order.amount_idr !== 5000 ||
      order.credits !== 10 ||
      order.currency !== "IDR" ||
      parseIdr(grossAmount) !== 5000
    ) {
      return jsonResponse({ error: "Nominal transaksi tidak cocok." }, 400);
    }

    // Verifikasi status langsung ke Midtrans Sandbox.
    const statusResponse = await fetch(
      `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${btoa(`${serverKey}:`)}`,
        },
      },
    );

    const statusData: unknown = await statusResponse.json().catch(() => null);

    if (!statusResponse.ok || !isRecord(statusData)) {
      console.error("Token webhook: Midtrans status check failed", {
        httpStatus: statusResponse.status,
      });
      return jsonResponse(
        { error: "Status transaksi belum dapat diverifikasi." },
        502,
      );
    }

    if (
      statusData.order_id !== orderId ||
      parseIdr(statusData.gross_amount) !== 5000 ||
      statusData.currency !== "IDR"
    ) {
      return jsonResponse(
        { error: "Detail transaksi terverifikasi tidak cocok." },
        400,
      );
    }

    const transactionStatus =
      typeof statusData.transaction_status === "string"
        ? statusData.transaction_status
        : "";
    const fraudStatus =
      typeof statusData.fraud_status === "string"
        ? statusData.fraud_status
        : "";
    const paymentType =
      typeof statusData.payment_type === "string"
        ? statusData.payment_type
        : "";
    const transactionId =
      typeof statusData.transaction_id === "string"
        ? statusData.transaction_id
        : "";

    if (paymentType !== "qris") {
      return jsonResponse({ error: "Jenis pembayaran bukan QRIS." }, 400);
    }

    if (
      transactionStatus === "settlement" &&
      (!fraudStatus || fraudStatus === "accept")
    ) {
      if (!transactionId) {
        return jsonResponse(
          { error: "ID transaksi terverifikasi tidak ditemukan." },
          400,
        );
      }

      const { data: activation, error: activationError } = await admin.rpc(
        "activate_dino_ai_token_payment",
        {
          p_order_id: orderId,
          p_transaction_id: transactionId,
        },
      );

      if (activationError) {
        console.error("Token activation failed", activationError.message);
        return jsonResponse(
          { error: "Pembayaran terverifikasi, tetapi aktivasi token gagal." },
          500,
        );
      }

      if (
        !Array.isArray(activation) ||
        activation.length === 0 ||
        activation[0].payment_status !== "paid"
      ) {
        return jsonResponse(
          { error: "Hasil aktivasi token tidak valid." },
          500,
        );
      }

      return jsonResponse({
        received: true,
        status: "paid",
        credits: 10,
        alreadyProcessed: activation[0].already_processed === true,
      });
    }

    let newStatus: "pending" | "failed" | "expired" = "pending";

    if (transactionStatus === "expire") {
      newStatus = "expired";
    } else if (
      transactionStatus === "deny" ||
      transactionStatus === "cancel"
    ) {
      newStatus = "failed";
    }

    // Jangan pernah menurunkan status pesanan yang sudah paid.
    const { error: updateError } = await admin
      .from("dino_ai_token_payment_orders")
      .update({
        status: newStatus,
        payment_type: paymentType,
        transaction_id: transactionId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .neq("status", "paid");

    if (updateError) {
      console.error("Token webhook: status update failed", updateError.message);
      return jsonResponse(
        { error: "Status transaksi belum berhasil disimpan." },
        500,
      );
    }

    return jsonResponse({ received: true, status: newStatus });
  } catch (error) {
    console.error("midtrans-token-webhook unexpected error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonResponse({ error: "Webhook tidak dapat diproses." }, 500);
  }
});

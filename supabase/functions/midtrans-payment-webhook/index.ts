function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function getEnv(name: string): string | null {
  return Deno.env.get(name)?.trim() || null;
}
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Payment dispatcher: environment incomplete");
    return jsonResponse(
      { error: "Dispatcher belum dikonfigurasi." },
      503,
    );
  }
  try {
    // Baca payload mentah supaya body notifikasi tetap utuh saat diteruskan.
    const rawBody = await req.text();
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Payload JSON tidak valid." }, 400);
    }
    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      return jsonResponse({ error: "Format payload tidak valid." }, 400);
    }
    const orderId = (payload as Record<string, unknown>).order_id;
    console.log("Dispatcher received order_id:", orderId);
    if (typeof orderId !== "string") {
  console.error("Dispatcher rejected payload: missing order_id", {
    payloadType: Array.isArray(payload) ? "array" : typeof payload,
    keys: Object.keys(payload as Record<string, unknown>),
  });
  return jsonResponse({ error: "Order ID tidak ditemukan." }, 400);
}
    let targetFunction: string;
    if (/^DINO-SUP-[0-9a-f-]{36}$/i.test(orderId)) {
      targetFunction = "midtrans-webhook";
    } else if (/^DINO-TOK-[0-9a-f-]{36}$/i.test(orderId)) {
      targetFunction = "midtrans-token-webhook";
   } else if (orderId.startsWith("payment_notif_test_")) {
  console.log("Midtrans test notification received.");
  return jsonResponse({
    message: "Midtrans test notification received.",
  });
} else {
  console.error("Dispatcher rejected unknown order prefix", {
    orderId,
  });
  return jsonResponse({ error: "Prefix order ID tidak dikenal." }, 400);
}
    const targetUrl =
      `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/${targetFunction}`;
    // Kredensial server hanya digunakan untuk panggilan internal.
    // Webhook tujuan tetap memverifikasi signature dan status Midtrans.
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
      body: rawBody,
    });
    const responseBody = await response.text();
    console.log("Dispatcher target response:", {
    targetFunction,
    status: response.status,
    body: responseBody.slice(0, 500),
    });
    console.log("Payment dispatcher:", {
      targetFunction,
      status: response.status,
    });
    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Payment dispatcher error:", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return jsonResponse(
      { error: "Notifikasi pembayaran gagal diteruskan." },
      502,
    );
  }
});

const SITE_ORIGIN = "https://will292929.github.io";
const RETURN_URL = `${SITE_ORIGIN}/packardfor64/donate/return/?session_id={CHECKOUT_SESSION_ID}`;
const MIN_CENTS = 500;
const MAX_CENTS = 50000;

function headers(origin) {
  const result = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  });
  if (origin === SITE_ORIGIN) {
    result.set("Access-Control-Allow-Origin", SITE_ORIGIN);
    result.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    result.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return result;
}

function json(status, value, origin) {
  return new Response(JSON.stringify(value), { status, headers: headers(origin) });
}

export function sessionParameters(amountCents) {
  const params = new URLSearchParams({
    mode: "payment",
    ui_mode: "embedded",
    submit_type: "donate",
    redirect_on_completion: "if_required",
    return_url: RETURN_URL,
    billing_address_collection: "required",
    "name_collection[individual][enabled]": "true",
    "name_collection[individual][optional]": "false",
    "phone_number_collection[enabled]": "true",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amountCents),
    "line_items[0][price_data][product_data][name]": "2026 General Election Contribution",
    "line_items[0][quantity]": "1",
    "custom_fields[0][key]": "occupation",
    "custom_fields[0][label][type]": "custom",
    "custom_fields[0][label][custom]": "Occupation",
    "custom_fields[0][type]": "text",
    "custom_fields[0][optional]": "false",
    "custom_fields[0][text][minimum_length]": "1",
    "custom_fields[1][key]": "employer",
    "custom_fields[1][label][type]": "custom",
    "custom_fields[1][label][custom]": "Employer or principal place of business",
    "custom_fields[1][type]": "text",
    "custom_fields[1][optional]": "false",
    "custom_fields[1][text][minimum_length]": "1",
    "metadata[election]": "2026-general",
    "payment_intent_data[metadata][election]": "2026-general"
  });
  return params;
}

export async function handleRequest(request, env, fetchStripe = fetch) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (url.pathname !== "/checkout-session" && url.pathname !== "/session-status") {
    return json(404, { error: "Not found" }, origin);
  }
  if (origin !== SITE_ORIGIN) {
    return json(403, { error: "Origin not allowed" }, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: headers(origin) });
  }
  if (url.pathname === "/session-status") {
    if (request.method !== "GET") {
      return json(405, { error: "Method not allowed" }, origin);
    }
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
      return json(400, { error: "Invalid session" }, origin);
    }
    if (!env.STRIPE_SECRET_KEY) {
      return json(503, { error: "Checkout is temporarily unavailable" }, origin);
    }
    let stripeResponse;
    try {
      stripeResponse = await fetchStripe(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Stripe-Version": "2025-09-30.clover"
        }
      });
    } catch {
      return json(502, { error: "Could not check contribution" }, origin);
    }
    if (!stripeResponse.ok) {
      return json(502, { error: "Could not check contribution" }, origin);
    }
    const session = await stripeResponse.json();
    if (session.metadata?.election !== "2026-general" || session.ui_mode !== "embedded") {
      return json(404, { error: "Session not found" }, origin);
    }
    return json(200, { status: session.status, paymentStatus: session.payment_status }, origin);
  }
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed" }, origin);
  }
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return json(415, { error: "JSON required" }, origin);
  }
  const raw = await request.text();
  if (raw.length > 1024) {
    return json(413, { error: "Request too large" }, origin);
  }
  let amountCents;
  try {
    ({ amountCents } = JSON.parse(raw));
  } catch {
    return json(400, { error: "Invalid JSON" }, origin);
  }
  if (!Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    return json(400, { error: "Enter an amount from $5 to $500" }, origin);
  }
  if (!env.STRIPE_SECRET_KEY) {
    return json(503, { error: "Checkout is temporarily unavailable" }, origin);
  }

  let stripeResponse;
  try {
    stripeResponse = await fetchStripe("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2025-09-30.clover"
      },
      body: sessionParameters(amountCents).toString()
    });
  } catch {
    return json(502, { error: "Could not start checkout" }, origin);
  }

  if (!stripeResponse.ok) {
    console.error("Stripe checkout session rejected", stripeResponse.status,
      stripeResponse.headers.get("Request-Id") || "no request id");
    return json(502, { error: "Could not start checkout" }, origin);
  }
  const session = await stripeResponse.json();
  if (typeof session.client_secret !== "string") {
    return json(502, { error: "Could not start checkout" }, origin);
  }
  return json(200, { clientSecret: session.client_secret }, origin);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};

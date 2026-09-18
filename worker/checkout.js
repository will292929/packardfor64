const PAGES_ORIGIN = "https://will292929.github.io";
const SITE_PATHS = new Map([
  [PAGES_ORIGIN, "/packardfor64"],
  ["https://packardfor64.com", ""],
  ["https://www.packardfor64.com", ""]
]);
const MIN_CENTS = 500;
const MAX_CENTS = 50000;
const STRIPE_VERSION = "2025-09-30.clover";
const FORM_EMAIL = "ShawnPackardfor64@gmail.com";
const FORM_URL = `https://formsubmit.co/ajax/${FORM_EMAIL}`;

function returnUrl(origin) {
  return `${origin}${SITE_PATHS.get(origin)}/donate/return/?session_id={CHECKOUT_SESSION_ID}`;
}

function headers(origin) {
  const result = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  });
  if (SITE_PATHS.has(origin)) {
    result.set("Access-Control-Allow-Origin", origin);
    result.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    result.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return result;
}

function json(status, value, origin) {
  return new Response(JSON.stringify(value), { status, headers: headers(origin) });
}

export function sessionParameters(amountCents, origin = PAGES_ORIGIN) {
  const params = new URLSearchParams({
    mode: "payment",
    ui_mode: "embedded",
    submit_type: "donate",
    redirect_on_completion: "if_required",
    return_url: returnUrl(origin),
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
    "custom_fields[1][key]": "employer",
    "custom_fields[1][label][type]": "custom",
    "custom_fields[1][label][custom]": "Employer or principal place of business",
    "custom_fields[1][type]": "text",
    "custom_fields[1][optional]": "false",
    "metadata[election]": "2026-general",
    "payment_intent_data[metadata][election]": "2026-general"
  });
  return params;
}

export function elementsSessionParameters(amountCents, origin = PAGES_ORIGIN) {
  return new URLSearchParams({
    mode: "payment",
    ui_mode: "custom",
    return_url: returnUrl(origin),
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amountCents),
    "line_items[0][price_data][product_data][name]": "2026 General Election Contribution",
    "line_items[0][quantity]": "1",
    "metadata[election]": "2026-general",
    "payment_intent_data[metadata][election]": "2026-general"
  });
}

const textFields = {
  fullName: 120, streetAddress: 160, addressLine2: 160, city: 100,
  state: 60, country: 2, postalCode: 20, occupation: 120,
  employer: 160, phone: 40, email: 254
};

export function validateDonor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const donor = {};
  for (const [field, limit] of Object.entries(textFields)) {
    const raw = value[field];
    if (typeof raw !== "string" || raw.length > limit) return null;
    donor[field] = raw.trim();
    if (field !== "addressLine2" && !donor[field]) return null;
  }
  if (donor.country !== "US" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(donor.email)
    || !/^[+()\d.\s-]{7,40}$/.test(donor.phone)
    || !/^[\d-]{5,10}$/.test(donor.postalCode)) return null;
  return donor;
}

async function stripeSession(fetchStripe, secret, params) {
  let response;
  try {
    response = await fetchStripe("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_VERSION
      },
      body: params.toString()
    });
  } catch {
    return null;
  }
  if (!response.ok) {
    let stripeError;
    try { stripeError = (await response.json()).error; } catch { /* no safe error body */ }
    console.error("Stripe checkout session rejected", response.status,
      response.headers.get("Request-Id") || "no request id",
      stripeError?.code || stripeError?.type || "unknown error",
      stripeError?.param || "no parameter");
    return null;
  }
  return response.json();
}

async function saveDonor(db, sessionId, amountCents, donor) {
  await db.prepare(`INSERT INTO donor_submissions
    (session_id, amount_cents, full_name, street_address, address_line2, city,
     state, country, postal_code, occupation, employer, phone, email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(sessionId, amountCents, donor.fullName, donor.streetAddress,
      donor.addressLine2, donor.city, donor.state, donor.country, donor.postalCode,
      donor.occupation, donor.employer, donor.phone, donor.email).run();
}

async function sendPaidDonationEmail(row, fetchMail) {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD"
  }).format(row.amount_cents / 100);
  const response = await fetchMail(FORM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: PAGES_ORIGIN,
      Referer: `${PAGES_ORIGIN}/packardfor64/donate/`
    },
    body: JSON.stringify({
      _subject: `Packard for 64 — paid donation ${row.session_id}`,
      _captcha: "false",
      _template: "table",
      payment_status: "PAID — confirmed by Stripe",
      election: "2026 General Election",
      amount,
      full_name: row.full_name,
      street_address: row.street_address,
      address_line_2: row.address_line2,
      city: row.city,
      state: row.state,
      country: row.country,
      postal_code: row.postal_code,
      occupation: row.occupation,
      employer: row.employer,
      phone: row.phone,
      email: row.email,
      stripe_checkout_session: row.session_id,
      note: "Card details are held by Stripe, not included in this email. Reconcile in Stripe before reporting."
    })
  });
  if (!response.ok) throw new Error("Mail provider rejected request");
  const result = await response.json();
  if (result.success !== true && result.success !== "true") {
    throw new Error("Mail provider did not accept submission");
  }
}

export async function reconcileDonations(env, fetchStripe = fetch, fetchMail = fetch) {
  if (!env.DONORS || !env.STRIPE_SECRET_KEY) {
    throw new Error("Donation reconciliation is not configured");
  }
  const { results = [] } = await env.DONORS.prepare(`SELECT session_id, amount_cents,
    full_name, street_address, address_line2, city, state, country, postal_code,
    occupation, employer, phone, email, payment_status
    FROM donor_submissions
    WHERE payment_status IN ('pending', 'paid') AND email_sent_at IS NULL
    ORDER BY created_at ASC LIMIT 25`).all();
  for (const row of results) {
    try {
      const stripeResponse = await fetchStripe(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(row.session_id)}`,
        { headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Stripe-Version": STRIPE_VERSION
        } }
      );
      if (!stripeResponse.ok) throw new Error("Could not check Stripe session");
      const session = await stripeResponse.json();
      if (session.id !== row.session_id || session.ui_mode !== "custom"
        || session.metadata?.election !== "2026-general"
        || session.currency !== "usd" || session.amount_total !== row.amount_cents) {
        throw new Error("Stripe session does not match the donor record");
      }
      if (session.status === "expired" && row.payment_status === "pending") {
        await env.DONORS.prepare(`UPDATE donor_submissions SET payment_status = 'expired',
          updated_at = CURRENT_TIMESTAMP WHERE session_id = ? AND payment_status = 'pending'`)
          .bind(row.session_id).run();
        continue;
      }
      if (session.status !== "complete" || session.payment_status !== "paid") continue;
      if (row.payment_status !== "paid") {
        await env.DONORS.prepare(`UPDATE donor_submissions SET payment_status = 'paid',
          updated_at = CURRENT_TIMESTAMP WHERE session_id = ? AND payment_status = 'pending'`)
          .bind(row.session_id).run();
      }
      const claim = await env.DONORS.prepare(`UPDATE donor_submissions
        SET email_claimed_at = CURRENT_TIMESTAMP WHERE session_id = ?
        AND payment_status = 'paid' AND email_sent_at IS NULL
        AND (email_claimed_at IS NULL OR email_claimed_at <= datetime('now', '-10 minutes'))`)
        .bind(row.session_id).run();
      if (claim.meta.changes !== 1) continue;
      try {
        await sendPaidDonationEmail(row, fetchMail);
        await env.DONORS.prepare(`UPDATE donor_submissions SET email_sent_at = CURRENT_TIMESTAMP,
          email_claimed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?`)
          .bind(row.session_id).run();
      } catch {
        await env.DONORS.prepare(`UPDATE donor_submissions SET email_claimed_at = NULL
          WHERE session_id = ? AND email_sent_at IS NULL`).bind(row.session_id).run();
        throw new Error("Donation email was not accepted");
      }
    } catch (error) {
      console.error("Donation reconciliation failed", error.message);
    }
  }
}

export async function handleRequest(request, env, fetchStripe = fetch) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!["/checkout-session", "/elements-session", "/donor-details", "/session-status"].includes(url.pathname)) {
    return json(404, { error: "Not found" }, origin);
  }
  if (!SITE_PATHS.has(origin)) {
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
          "Stripe-Version": STRIPE_VERSION
        }
      });
    } catch {
      return json(502, { error: "Could not check contribution" }, origin);
    }
    if (!stripeResponse.ok) {
      return json(502, { error: "Could not check contribution" }, origin);
    }
    const session = await stripeResponse.json();
    if (session.metadata?.election !== "2026-general" || !["embedded", "custom"].includes(session.ui_mode)) {
      return json(404, { error: "Session not found" }, origin);
    }
    if (session.ui_mode === "custom" && env.DONORS && session.payment_status === "paid") {
      try {
        await env.DONORS.prepare(`UPDATE donor_submissions SET payment_status = 'paid',
          updated_at = CURRENT_TIMESTAMP WHERE session_id = ?`).bind(sessionId).run();
      } catch {
        console.error("Could not mark donor submission paid");
      }
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
  if (raw.length > 4096) {
    return json(413, { error: "Request too large" }, origin);
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: "Invalid JSON" }, origin);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json(400, { error: "Invalid JSON" }, origin);
  }
  if (url.pathname === "/donor-details") {
    const donor = validateDonor(payload.donor);
    if (!donor || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(payload.sessionId || "") || !env.DONORS) {
      return json(400, { error: "Valid donor details are required" }, origin);
    }
    const result = await env.DONORS.prepare(`UPDATE donor_submissions SET full_name = ?,
      street_address = ?, address_line2 = ?, city = ?, state = ?, country = ?,
      postal_code = ?, occupation = ?, employer = ?, phone = ?, email = ?,
      updated_at = CURRENT_TIMESTAMP WHERE session_id = ? AND payment_status = 'pending'`)
      .bind(donor.fullName, donor.streetAddress, donor.addressLine2, donor.city,
        donor.state, donor.country, donor.postalCode, donor.occupation,
        donor.employer, donor.phone, donor.email, payload.sessionId).run();
    return result.meta.changes === 1
      ? json(200, { saved: true }, origin)
      : json(404, { error: "Session not found" }, origin);
  }
  const { amountCents } = payload;
  if (!Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    return json(400, { error: "Enter an amount from $5 to $500" }, origin);
  }
  if (!env.STRIPE_SECRET_KEY) {
    return json(503, { error: "Checkout is temporarily unavailable" }, origin);
  }

  if (url.pathname === "/elements-session") {
    const donor = validateDonor(payload.donor);
    if (!donor) return json(400, { error: "Valid donor details are required" }, origin);
    if (!env.DONORS) return json(503, { error: "Checkout is temporarily unavailable" }, origin);
    const session = await stripeSession(fetchStripe, env.STRIPE_SECRET_KEY,
      elementsSessionParameters(amountCents, origin));
    if (!session || typeof session.client_secret !== "string" || typeof session.id !== "string") {
      return json(502, { error: "Could not start checkout" }, origin);
    }
    try {
      await saveDonor(env.DONORS, session.id, amountCents, donor);
    } catch {
      console.error("Could not save donor submission");
      return json(503, { error: "Could not save donor details" }, origin);
    }
    return json(200, { clientSecret: session.client_secret, sessionId: session.id }, origin);
  }

  const session = await stripeSession(fetchStripe, env.STRIPE_SECRET_KEY,
    sessionParameters(amountCents, origin));
  if (!session) {
    return json(502, { error: "Could not start checkout" }, origin);
  }
  if (typeof session.client_secret !== "string") {
    return json(502, { error: "Could not start checkout" }, origin);
  }
  return json(200, { clientSecret: session.client_secret }, origin);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
  scheduled(_event, env, ctx) {
    ctx.waitUntil(reconcileDonations(env));
  }
};

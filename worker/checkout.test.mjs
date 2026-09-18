import assert from "node:assert/strict";
import test from "node:test";
import { elementsSessionParameters, handleRequest, reconcileDonations, sessionParameters, validateDonor } from "./checkout.js";

const url = "https://packardfor64-donations.example.workers.dev/checkout-session";
const origin = "https://will292929.github.io";
const request = (amountCents, extraHeaders = {}) => new Request(url, {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json", ...extraHeaders },
  body: JSON.stringify({ amountCents })
});

test("builds a one-time embedded session with required donor fields", () => {
  const params = sessionParameters(2500);
  assert.equal(params.get("mode"), "payment");
  assert.equal(params.get("ui_mode"), "embedded");
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "2500");
  assert.equal(params.get("billing_address_collection"), "required");
  assert.equal(params.get("name_collection[individual][enabled]"), "true");
  assert.equal(params.get("name_collection[individual][optional]"), "false");
  assert.equal(params.get("phone_number_collection[enabled]"), "true");
  assert.equal(params.get("custom_fields[0][label][custom]"), "Occupation");
  assert.equal(params.get("custom_fields[0][optional]"), "false");
  assert.equal(params.get("custom_fields[1][label][custom]"), "Employer or principal place of business");
  assert.equal(params.get("custom_fields[1][optional]"), "false");
});

const donor = {
  fullName: "Test Donor", streetAddress: "123 Example Street", addressLine2: "",
  city: "Waterville", state: "ME", country: "US", postalCode: "04901",
  occupation: "Tester", employer: "Example Organization", phone: "2075550123",
  email: "test@example.com"
};

test("builds a custom Stripe session without donor PII in parameters", () => {
  const params = elementsSessionParameters(10000);
  assert.equal(params.get("ui_mode"), "custom");
  assert.equal(params.get("line_items[0][price_data][unit_amount]"), "10000");
  assert.equal(params.get("custom_fields[0][key]"), null);
  assert.equal(params.toString().includes(donor.email), false);
  assert.deepEqual(validateDonor(donor), donor);
  assert.equal(validateDonor({ ...donor, occupation: "" }), null);
  assert.equal(validateDonor({ ...donor, country: "GB" }), null);
});

test("uses the custom domain root for Stripe's return URL", () => {
  const params = elementsSessionParameters(10000, "https://packardfor64.com");
  assert.equal(params.get("return_url"),
    "https://packardfor64.com/donate/return/?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(elementsSessionParameters(10000).get("return_url"),
    "https://will292929.github.io/packardfor64/donate/return/?session_id={CHECKOUT_SESSION_ID}");
});

test("stores required donor details before returning custom checkout secrets", async () => {
  let saved;
  const db = {
    prepare: () => ({ bind: (...args) => ({ run: async () => { saved = args; } }) })
  };
  const response = await handleRequest(new Request(url.replace("checkout-session", "elements-session"), {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ amountCents: 10000, donor })
  }), { STRIPE_SECRET_KEY: "sk_test_not_real", DONORS: db }, async (_url, options) => {
    assert.equal(new URLSearchParams(options.body).get("ui_mode"), "custom");
    return new Response(JSON.stringify({ client_secret: "cs_test_abc_secret_xyz", id: "cs_test_abc" }));
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sessionId, "cs_test_abc");
  assert.equal(saved[0], "cs_test_abc");
  assert.equal(saved[1], 10000);
  assert.equal(saved[2], donor.fullName);
});

test("rejects amounts outside the payment range before contacting Stripe", async () => {
  for (const amountCents of [499, 50001, 12.5, "2500"]) {
    const response = await handleRequest(request(amountCents), { STRIPE_SECRET_KEY: "sk_test_not_real" }, () => {
      throw new Error("Stripe should not be called");
    });
    assert.equal(response.status, 400);
  }
});

test("requires the published site origin", async () => {
  const response = await handleRequest(request(2500, { Origin: "https://example.com" }), {
    STRIPE_SECRET_KEY: "sk_test_not_real"
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("allows the custom domain and returns its own CORS origin", async () => {
  const response = await handleRequest(request(2500, { Origin: "https://packardfor64.com" }),
    { STRIPE_SECRET_KEY: "sk_test_not_real" }, async (_url, options) => {
      assert.equal(new URLSearchParams(options.body).get("return_url"),
        "https://packardfor64.com/donate/return/?session_id={CHECKOUT_SESSION_ID}");
      return new Response(JSON.stringify({ client_secret: "cs_test_123_secret_abc" }));
    });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://packardfor64.com");
});

test("returns only the client secret to the site", async () => {
  let received;
  const response = await handleRequest(request(2500), { STRIPE_SECRET_KEY: "sk_test_not_real" },
    async (_url, options) => {
      received = options;
      return new Response(JSON.stringify({ client_secret: "cs_test_123_secret_abc", id: "cs_test_123" }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { clientSecret: "cs_test_123_secret_abc" });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(received.headers.Authorization, "Bearer sk_test_not_real");
});

test("returns a campaign session's payment status without donor data", async () => {
  const response = await handleRequest(new Request(`${url.replace("checkout-session", "session-status")}?session_id=cs_live_abc123`, {
    headers: { Origin: origin }
  }), { STRIPE_SECRET_KEY: "sk_test_not_real" }, async (_url, options) => {
    assert.equal(options.headers.Authorization, "Bearer sk_test_not_real");
    return new Response(JSON.stringify({
      id: "cs_live_abc123", status: "complete", payment_status: "paid",
      metadata: { election: "2026-general" }, ui_mode: "embedded",
      customer_details: { email: "private@example.com" }
    }));
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "complete", paymentStatus: "paid" });
});

function donationDatabase() {
  const row = {
    session_id: "cs_test_abc", amount_cents: 10000,
    full_name: donor.fullName, street_address: donor.streetAddress,
    address_line2: donor.addressLine2, city: donor.city, state: donor.state,
    country: donor.country, postal_code: donor.postalCode,
    occupation: donor.occupation, employer: donor.employer,
    phone: donor.phone, email: donor.email, payment_status: "pending",
    email_claimed_at: null, email_sent_at: null
  };
  return {
    row,
    prepare(sql) {
      return {
        all: async () => ({ results: row.email_sent_at ? [] : [{ ...row }] }),
        bind: () => ({ run: async () => {
          if (sql.includes("payment_status = 'expired'")) row.payment_status = "expired";
          if (sql.includes("payment_status = 'paid',")) row.payment_status = "paid";
          if (sql.includes("SET email_claimed_at = CURRENT_TIMESTAMP")) {
            if (row.email_claimed_at || row.email_sent_at) return { meta: { changes: 0 } };
            row.email_claimed_at = "claimed";
          }
          if (sql.includes("email_sent_at = CURRENT_TIMESTAMP")) row.email_sent_at = "sent";
          if (sql.includes("SET email_claimed_at = NULL")) row.email_claimed_at = null;
          return { meta: { changes: 1 } };
        } })
      };
    }
  };
}

function stripeLookup(paymentStatus, status = "complete") {
  return async (_url, options) => {
    assert.equal(options.headers.Authorization, "Bearer sk_test_not_real");
    return new Response(JSON.stringify({
      id: "cs_test_abc", ui_mode: "custom", metadata: { election: "2026-general" },
      currency: "usd", amount_total: 10000, status, payment_status: paymentStatus
    }));
  };
}

test("emails full donor details only after Stripe confirms payment, then deduplicates", async () => {
  const db = donationDatabase();
  let emails = 0;
  const mail = async (url, options) => {
    emails += 1;
    assert.equal(url, "https://formsubmit.co/ajax/ShawnPackardfor64@gmail.com");
    const body = JSON.parse(options.body);
    assert.match(body._subject, /paid donation cs_test_abc/);
    assert.equal(body.amount, "$100.00");
    assert.equal(body.full_name, donor.fullName);
    assert.equal(body.occupation, donor.occupation);
    assert.equal(body.employer, donor.employer);
    assert.equal(body.email, donor.email);
    assert.equal(options.body.includes("card_number"), false);
    return new Response(JSON.stringify({ success: "true" }));
  };
  await reconcileDonations({ DONORS: db, STRIPE_SECRET_KEY: "sk_test_not_real" },
    stripeLookup("unpaid", "open"), mail);
  assert.equal(emails, 0);
  await reconcileDonations({ DONORS: db, STRIPE_SECRET_KEY: "sk_test_not_real" },
    stripeLookup("paid"), mail);
  assert.equal(db.row.payment_status, "paid");
  assert.equal(db.row.email_sent_at, "sent");
  await reconcileDonations({ DONORS: db, STRIPE_SECRET_KEY: "sk_test_not_real" },
    stripeLookup("paid"), mail);
  assert.equal(emails, 1);
});

test("failed email delivery remains retryable", async () => {
  const db = donationDatabase();
  const originalError = console.error;
  console.error = () => {};
  try {
    await reconcileDonations({ DONORS: db, STRIPE_SECRET_KEY: "sk_test_not_real" },
      stripeLookup("paid"), async () => new Response(JSON.stringify({ success: "false" })));
  } finally {
    console.error = originalError;
  }
  assert.equal(db.row.payment_status, "paid");
  assert.equal(db.row.email_sent_at, null);
  assert.equal(db.row.email_claimed_at, null);
});

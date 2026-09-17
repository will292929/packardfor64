import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest, sessionParameters } from "./checkout.js";

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
  assert.equal(params.get("custom_fields[0][text][minimum_length]"), "1");
  assert.equal(params.get("custom_fields[1][label][custom]"), "Employer or principal place of business");
  assert.equal(params.get("custom_fields[1][optional]"), "false");
  assert.equal(params.get("custom_fields[1][text][minimum_length]"), "1");
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

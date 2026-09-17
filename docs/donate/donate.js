const CHECKOUT_API = "https://packardfor64-donations.rumble-inbox-worker.workers.dev";
const STRIPE_PUBLISHABLE_KEY = "pk_live_51SmeMmJF9WPoPEyCGEd0GpqWFUNOPO08xqjmpskF6P7Hh3GN4dIuoGXRNLADVoHITqUMJR7k5Rj7jNqQ9jTA3Jkm00DNOIWPL1";
const form = document.getElementById("donation-form");
const statusMessage = document.getElementById("checkout-status");
const paymentHint = document.getElementById("payment-hint");
const paymentMount = document.getElementById("payment-element");
const totalLabel = document.getElementById("payment-total");
const donateButton = document.getElementById("donate-button");
const otherButton = document.getElementById("other-amount-button");
const otherField = document.querySelector(".other-amount-field");
const otherInput = document.getElementById("other-amount");
const amountButtons = [...document.querySelectorAll("[data-amount]")];
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
let selectedAmount = 100;
let checkout;
let actions;
let paymentElement;
let sessionId;
let loadedAmountCents;
let loading;
let loadTimer;
let loadVersion = 0;

function donorDetails() {
  const field = (name) => form.elements.namedItem(name).value.trim();
  return {
    fullName: field("fullName"),
    streetAddress: field("streetAddress"),
    addressLine2: field("addressLine2"),
    city: field("city"),
    state: field("state"),
    country: field("country"),
    postalCode: field("postalCode"),
    occupation: field("occupation"),
    employer: field("employer"),
    phone: field("phone"),
    email: field("email")
  };
}

function amountCents() {
  const dollars = otherButton.classList.contains("selected") ? Number(otherInput.value) : selectedAmount;
  const cents = Math.round(dollars * 100);
  return Number.isFinite(dollars) && Number.isInteger(cents) && cents >= 500 && cents <= 50000
    && Math.abs(dollars * 100 - cents) < 0.001 ? cents : null;
}

function updateAmountDisplay() {
  const cents = amountCents();
  totalLabel.textContent = cents === null ? "" : money.format(cents / 100);
}

function clearPayment() {
  loadVersion += 1;
  if (paymentElement) paymentElement.destroy();
  paymentElement = undefined;
  checkout = undefined;
  actions = undefined;
  sessionId = undefined;
  loadedAmountCents = undefined;
  paymentMount.replaceChildren();
  paymentHint.hidden = false;
  paymentHint.textContent = "Complete the required fields above to load secure payment.";
}

function schedulePayment() {
  clearTimeout(loadTimer);
  if (!form.checkValidity() || amountCents() === null) return;
  if (actions && loadedAmountCents === amountCents()) return;
  loadTimer = setTimeout(loadPayment, 500);
}

async function postJson(path, body) {
  const response = await fetch(`${CHECKOUT_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The secure form could not load. Please try again.");
  return data;
}

async function loadPayment() {
  if (loading || !form.checkValidity()) return;
  const cents = amountCents();
  if (cents === null || (actions && loadedAmountCents === cents)) return;
  if (typeof window.Stripe !== "function") {
    statusMessage.textContent = "Secure payment could not load. Please refresh the page and try again.";
    return;
  }
  clearPayment();
  const version = loadVersion;
  loading = true;
  paymentHint.textContent = "Loading secure payment…";
  statusMessage.textContent = "";
  try {
    const session = await postJson("/elements-session", { amountCents: cents, donor: donorDetails() });
    if (version !== loadVersion) return;
    if (typeof session.clientSecret !== "string" || typeof session.sessionId !== "string") {
      throw new Error("The secure form could not load. Please try again.");
    }
    const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    checkout = stripe.initCheckout({
      clientSecret: session.clientSecret,
      elementsOptions: {
        appearance: { theme: "stripe", variables: { colorPrimary: "#e63339", borderRadius: "5px" } }
      }
    });
    paymentElement = checkout.createPaymentElement({
      layout: "accordion",
      fields: { billingDetails: "never" }
    });
    paymentElement.mount(paymentMount);
    const result = await checkout.loadActions();
    if (version !== loadVersion) return;
    if (result.type !== "success") throw new Error("The secure form could not load. Please try again.");
    const actualTotal = result.actions.getSession()?.total?.total;
    if (!actualTotal?.amount || actualTotal.minorUnitsAmount !== cents) {
      throw new Error("The donation total could not be verified. Please try again.");
    }
    totalLabel.textContent = actualTotal.amount;
    actions = result.actions;
    sessionId = session.sessionId;
    loadedAmountCents = cents;
    paymentHint.hidden = true;
  } catch (error) {
    if (version === loadVersion) {
      clearPayment();
      paymentHint.textContent = "Secure payment is unavailable. Check your details and try again.";
      statusMessage.textContent = error.message || "The secure form could not load. Please try again.";
    }
  } finally {
    loading = false;
  }
}

function chooseAmount(button, dollars) {
  for (const option of [...amountButtons, otherButton]) {
    const selected = option === button;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-pressed", String(selected));
  }
  selectedAmount = dollars;
  otherField.hidden = button !== otherButton;
  otherInput.required = button === otherButton;
  clearPayment();
  updateAmountDisplay();
  schedulePayment();
  if (button === otherButton) otherInput.focus();
}

for (const button of amountButtons) {
  button.setAttribute("aria-pressed", String(button.classList.contains("selected")));
  button.addEventListener("click", () => chooseAmount(button, Number(button.dataset.amount)));
}
otherButton.setAttribute("aria-pressed", "false");
otherButton.addEventListener("click", () => chooseAmount(otherButton, null));
otherInput.addEventListener("input", () => {
  clearPayment();
  updateAmountDisplay();
  schedulePayment();
});
form.addEventListener("input", (event) => {
  if (event.target === otherInput) return;
  schedulePayment();
});
form.addEventListener("change", schedulePayment);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (amountCents() === null) {
    statusMessage.textContent = "Enter an amount from $5 to $500.";
    otherInput.focus();
    return;
  }
  if (!actions || loadedAmountCents !== amountCents()) {
    await loadPayment();
    if (actions) {
      statusMessage.textContent = "Enter your payment details, then press Donate.";
      paymentMount.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }
  donateButton.disabled = true;
  statusMessage.textContent = "Submitting your contribution securely…";
  try {
    const donor = donorDetails();
    await postJson("/donor-details", { sessionId, donor });
    const result = await actions.confirm({
      redirect: "if_required",
      email: donor.email,
      phoneNumber: donor.phone,
      billingAddress: {
        name: donor.fullName,
        address: {
          country: donor.country, line1: donor.streetAddress, line2: donor.addressLine2,
          city: donor.city, state: donor.state, postal_code: donor.postalCode
        }
      }
    });
    if (result?.error) throw new Error(result.error.message || "Payment was not completed.");
    const response = await fetch(`${CHECKOUT_API}/session-status?session_id=${encodeURIComponent(sessionId)}`);
    if (!response.ok) throw new Error("We could not confirm the payment yet. Please check your Stripe receipt before retrying.");
    const payment = await response.json();
    if (payment.status === "complete" && payment.paymentStatus === "paid") {
      form.classList.add("donation-success");
      form.replaceChildren();
      const heading = document.createElement("h1");
      heading.textContent = "Thank you for your contribution";
      const note = document.createElement("p");
      note.textContent = "Stripe has confirmed your payment. A receipt will be sent to your email.";
      form.append(heading, note);
    } else if (payment.status === "complete") {
      statusMessage.textContent = "Your contribution was submitted and is processing. Check your Stripe receipt for the final status.";
    } else {
      statusMessage.textContent = "Payment was not completed. Please review your payment details and try again.";
    }
  } catch (error) {
    statusMessage.textContent = error.message || "Payment was not completed. Please try again.";
  } finally {
    donateButton.disabled = false;
  }
});

updateAmountDisplay();

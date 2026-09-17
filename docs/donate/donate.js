const CHECKOUT_API = "https://packardfor64-donations.rumble-inbox-worker.workers.dev";
const STRIPE_PUBLISHABLE_KEY = "pk_live_51SmeMmJF9WPoPEyCGEd0GpqWFUNOPO08xqjmpskF6P7Hh3GN4dIuoGXRNLADVoHITqUMJR7k5Rj7jNqQ9jTA3Jkm00DNOIWPL1";

const amountForm = document.getElementById("donation-amount-form");
const amountInput = document.getElementById("donation-amount");
const checkoutMount = document.getElementById("checkout");
const statusMessage = document.getElementById("checkout-status");
const submitButton = amountForm.querySelector("button[type=submit]");
let checkoutInstance;

amountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amountCents = Math.round(Number(amountInput.value) * 100);
  if (!Number.isInteger(amountCents) || amountCents < 500 || amountCents > 50000 ||
      Math.abs(Number(amountInput.value) * 100 - amountCents) > 0.0001) {
    statusMessage.textContent = "Enter an amount from $5 to $500.";
    return;
  }
  if (typeof window.Stripe !== "function") {
    statusMessage.textContent = "The secure form could not load. Please try again.";
    return;
  }

  submitButton.disabled = true;
  statusMessage.textContent = "Opening the secure donation form…";
  if (checkoutInstance) {
    checkoutInstance.destroy();
    checkoutInstance = undefined;
  }
  checkoutMount.hidden = true;

  try {
    const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    checkoutInstance = await stripe.initEmbeddedCheckout({
      fetchClientSecret: async () => {
        const response = await fetch(`${CHECKOUT_API}/checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents })
        });
        if (!response.ok) throw new Error("Session creation failed");
        const data = await response.json();
        if (typeof data.clientSecret !== "string") throw new Error("Missing client secret");
        return data.clientSecret;
      },
      onComplete: () => {
        amountForm.hidden = true;
        checkoutMount.hidden = true;
        statusMessage.textContent = "Checkout completed. Stripe will send a receipt if your contribution was accepted.";
      }
    });
    checkoutMount.hidden = false;
    checkoutInstance.mount(checkoutMount);
    statusMessage.textContent = "";
    submitButton.textContent = "Update amount and restart form";
  } catch {
    statusMessage.textContent = "The secure form could not load. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
});

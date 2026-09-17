const CHECKOUT_API = "https://packardfor64-donations.rumble-inbox-worker.workers.dev";
const STRIPE_PUBLISHABLE_KEY = "pk_live_51SmeMmJF9WPoPEyCGEd0GpqWFUNOPO08xqjmpskF6P7Hh3GN4dIuoGXRNLADVoHITqUMJR7k5Rj7jNqQ9jTA3Jkm00DNOIWPL1";
const DONATION_AMOUNT_CENTS = 2500;

const checkoutMount = document.getElementById("checkout");
const statusMessage = document.getElementById("checkout-status");
const retryButton = document.getElementById("checkout-retry");
let checkoutInstance;

async function loadCheckout() {
  retryButton.hidden = true;
  statusMessage.textContent = "Loading secure donation form…";
  if (typeof window.Stripe !== "function") {
    statusMessage.textContent = "The secure form could not load. Please try again.";
    retryButton.hidden = false;
    return;
  }

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
          body: JSON.stringify({ amountCents: DONATION_AMOUNT_CENTS })
        });
        if (!response.ok) throw new Error("Session creation failed");
        const data = await response.json();
        if (typeof data.clientSecret !== "string") throw new Error("Missing client secret");
        return data.clientSecret;
      },
      onComplete: () => {
        checkoutMount.hidden = true;
        statusMessage.textContent = "Checkout completed. Stripe will send a receipt if your contribution was accepted.";
      }
    });
    checkoutMount.hidden = false;
    checkoutInstance.mount(checkoutMount);
    statusMessage.textContent = "";
  } catch {
    statusMessage.textContent = "The secure form could not load. Please try again.";
    retryButton.hidden = false;
  }
}

retryButton.addEventListener("click", loadCheckout);
loadCheckout();

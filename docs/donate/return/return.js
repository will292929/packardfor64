const statusElement = document.getElementById("return-status");
const sessionId = new URLSearchParams(window.location.search).get("session_id");
const checkoutApi = "https://packardfor64-donations.rumble-inbox-worker.workers.dev";

async function showContributionStatus() {
  if (!sessionId || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
    statusElement.textContent = "No contribution could be verified on this page.";
    return;
  }
  try {
    const response = await fetch(`${checkoutApi}/session-status?session_id=${encodeURIComponent(sessionId)}`);
    if (!response.ok) throw new Error("Status unavailable");
    const data = await response.json();
    if (data.status === "complete" && data.paymentStatus === "paid") {
      statusElement.textContent = "Stripe has confirmed your contribution. Thank you.";
    } else if (data.status === "complete") {
      statusElement.textContent = "Your contribution was submitted and may still be processing. Check your Stripe receipt for the final status.";
    } else {
      statusElement.textContent = "Your contribution is not complete. You can return to the donation form to try again.";
    }
  } catch {
    statusElement.textContent = "We could not confirm your contribution here. Please check for a Stripe receipt before trying again.";
  }
}

showContributionStatus();

let scriptLoaded = false;

function loadScript() {
  return new Promise((resolve, reject) => {
    if (scriptLoaded || window.Razorpay) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error("Could not load Razorpay. Check your connection."));
    document.body.appendChild(s);
  });
}

// order: { key_id, order_id, amount, currency, email } from POST /billing/checkout
export async function openRazorpayCheckout(order, { onSuccess, onDismiss } = {}) {
  await loadScript();
  const rzp = new window.Razorpay({
    key: order.key_id,
    order_id: order.order_id,
    amount: order.amount,
    currency: order.currency,
    name: "SoloCRM",
    description: "Pro plan",
    prefill: { email: order.email },
    theme: { color: "#059669" },
    handler: (response) => onSuccess && onSuccess(response),
    modal: { ondismiss: () => onDismiss && onDismiss() },
  });
  rzp.open();
}

import { getAuthHeaders } from "./api-client";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export type BillingCycle = "monthly" | "annual";
export type Currency = "inr" | "usd";

let _inFlight: Promise<void> | null = null;

/**
 * Open the Razorpay hosted recurring-subscription checkout for the current user.
 *
 * Opens a popup synchronously before the network call to avoid popup blockers,
 * then navigates it to the checkout URL once the server returns one.
 *
 * A module-level in-flight lock dedupes concurrent calls, so rapid double-clicks
 * (or simultaneous clicks from different UI surfaces) cannot create duplicate
 * subscription orders. Subsequent callers receive the same in-flight Promise.
 *
 * Throws on any failure (network, server error, missing checkout URL).
 */
export async function startUpgrade(
  cycle: BillingCycle,
  currency: Currency = "inr",
): Promise<void> {
  if (_inFlight) return _inFlight;
  _inFlight = _startUpgradeInner(cycle, currency).finally(() => {
    _inFlight = null;
  });
  return _inFlight;
}

async function _startUpgradeInner(
  cycle: BillingCycle,
  currency: Currency,
): Promise<void> {
  const popup = window.open("about:blank", "_blank", "noopener,noreferrer");

  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE}/api/subscription/create-order`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        planKey: cycle === "annual" ? "pro_annual" : "pro_monthly",
        currency,
      }),
    });

    if (!res.ok) {
      let serverMsg = "";
      try {
        const body = await res.json();
        serverMsg = body?.error || body?.message || "";
      } catch {
        // ignore
      }
      if (popup) popup.close();
      throw new Error(serverMsg || `Could not create order (HTTP ${res.status})`);
    }

    const { checkoutUrl } = await res.json();
    if (!checkoutUrl) {
      if (popup) popup.close();
      throw new Error("Checkout URL missing from server response");
    }

    if (popup && !popup.closed) {
      popup.location.href = checkoutUrl;
    } else {
      window.location.href = checkoutUrl;
    }
  } catch (err) {
    if (popup && !popup.closed) popup.close();
    throw err;
  }
}

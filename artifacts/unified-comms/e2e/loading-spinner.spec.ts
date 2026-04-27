import { test, expect } from "@playwright/test";

/**
 * Loading-spinner end-to-end tests for PinnboxIO (unified-comms web app).
 *
 * App.tsx renders a <Spinner> inside two <Show when="loading"> blocks while
 * Clerk's auth state is still resolving.  These tests verify that the spinner
 * (role="status" / aria-label="Loading") is actually present in the DOM during
 * that window.
 *
 * Strategy: use page.route() to intercept and delay all fetch/XHR requests
 * before navigation.  This allows the page HTML and JS bundles to load
 * normally (those arrive as "document" and "script" resource types) while
 * the Clerk auth-resolution calls — which are "fetch" or "xhr" — are held
 * for DELAY_MS milliseconds.  During that window Clerk's isLoaded flag
 * remains false, so <Show when="loading"> keeps the Spinner in the DOM long
 * enough for the assertions to succeed.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

const DELAY_MS = 4_000;

async function delayFetchRequests(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.route("**/*", async (route) => {
    const resourceType = route.request().resourceType();
    if (resourceType === "fetch" || resourceType === "xhr") {
      await new Promise<void>((resolve) => setTimeout(resolve, DELAY_MS));
    }
    await route.continue();
  });
}

test.describe("Loading spinner", () => {
  test("spinner is visible on '/' while Clerk auth resolves", async ({
    page,
  }) => {
    await delayFetchRequests(page);

    // Start navigation but do not await immediately — we want to inspect
    // the page while the delayed Clerk calls are still pending.
    const navPromise = page.goto(`${BASE}/`);

    await expect(
      page.getByRole("status", { name: /loading/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Let the page finish so no pending requests leak between tests.
    await navPromise;
  });

  test("spinner is visible on a protected route while Clerk auth resolves", async ({
    page,
  }) => {
    await delayFetchRequests(page);

    const navPromise = page.goto(`${BASE}/inbox`);

    await expect(
      page.getByRole("status", { name: /loading/i }),
    ).toBeVisible({ timeout: 5_000 });

    await navPromise;
  });
});

import { test, expect } from "@playwright/test";

/**
 * Visual regression guard: sign-in page shell background in dark mode.
 *
 * Task #60 – The AuthPageShell component in App.tsx applies
 * `brand.dark.background` as an inline style when the OS colour scheme is
 * dark.  Without a test, any colour change in lib/brand or a logic change in
 * useDarkMode() / AuthPageShell could silently break the visual sync between
 * the outer shell and the Clerk card.
 *
 * This test:
 *  1. Forces prefers-color-scheme: dark via Playwright's emulateMedia.
 *  2. Navigates to /sign-in.
 *  3. Reads the computed background-color of the outer AuthPageShell div
 *     (identified by data-testid="auth-page-shell") and asserts it equals
 *     brand.dark.background (#0f172a).
 *
 * Source of truth: `brand.dark.background` in lib/brand/src/index.ts.
 * If that token changes, update DARK_BG below to match.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

/** Expected dark-mode shell background – must match brand.dark.background. */
const DARK_BG = "#0f172a";

/** Convert a CSS rgb/rgba colour string to lowercase hex (#rrggbb). */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgb.toLowerCase();
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => parseInt(n, 10).toString(16).padStart(2, "0"))
      .join("")
  );
}

test.describe("Sign-in page shell background in dark mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
  });

  test("outer shell background-color equals brand.dark.background on /sign-in", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);

    // Wait for the Clerk card to appear so the page has fully mounted.
    await expect(page.locator(".cl-cardBox")).toBeVisible({ timeout: 15_000 });

    // Target the AuthPageShell directly via its stable data-testid attribute.
    const shell = page.locator('[data-testid="auth-page-shell"]');
    await expect(
      shell,
      "AuthPageShell (data-testid=auth-page-shell) should be present on /sign-in",
    ).toBeVisible();

    const shellBg = await shell.evaluate((el) =>
      getComputedStyle(el).backgroundColor,
    );

    expect(
      shellBg,
      "AuthPageShell should have a computed background-color in dark mode",
    ).toBeTruthy();

    expect(
      rgbToHex(shellBg),
      `AuthPageShell background-color should equal brand.dark.background (${DARK_BG}) in dark mode`,
    ).toBe(DARK_BG);
  });
});

import { test, expect } from "@playwright/test";

/**
 * Keyboard navigation tests for the auth page footer links.
 *
 * AuthPageShell renders four footer links (Terms, Privacy, Refunds, Cookies),
 * each with Tailwind focus-visible ring classes so keyboard users see a visible
 * focus ring when they tab to them. These tests verify:
 *
 *   1. Every footer link carries the correct focus-visible ring CSS classes.
 *   2. Tabbing through the footer links gives each one focus in order.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

const FOOTER_LINKS = ["Terms", "Privacy", "Refunds", "Cookies"] as const;

const REQUIRED_FOCUS_CLASSES = [
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
] as const;

test.describe("Auth page footer link keyboard navigation", () => {
  test("each footer link has the expected focus-visible ring classes", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);

    // Wait for the first footer link to be visible — a stable, deterministic
    // signal that AuthPageShell has fully rendered.
    const termsLink = page.getByRole("link", { name: "Terms", exact: true });
    await expect(termsLink).toBeVisible({ timeout: 15_000 });

    for (const name of FOOTER_LINKS) {
      const link = page.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();

      const className = await link.getAttribute("class");
      for (const cls of REQUIRED_FOCUS_CLASSES) {
        expect(
          className,
          `"${name}" link is missing class "${cls}"`,
        ).toContain(cls);
      }
    }
  });

  test("tabbing through the footer links focuses each one in order", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);

    // Wait until the "Back to PinnboxIO" link — the first focusable element in
    // AuthPageShell — is present. This is the keyboard entry point we use as a
    // starting position, making the subsequent Tab presses genuinely keyboard-
    // driven rather than programmatic.
    const backLink = page.getByRole("link", { name: /Back to PinnboxIO/i });
    await expect(backLink).toBeVisible({ timeout: 15_000 });

    // Also wait for all footer links to be in the DOM so we can assert focus.
    const termsLink = page.getByRole("link", { name: "Terms", exact: true });
    await expect(termsLink).toBeVisible();

    // Focus the Terms link. The Clerk auth card (between the back link and the
    // footer) has an unpredictable number of tab stops that change with the
    // loaded widget, so we place focus directly on the first footer link and
    // then tab forward through the remaining three.
    await termsLink.focus();

    for (const name of FOOTER_LINKS) {
      const link = page.getByRole("link", { name, exact: true });

      if (name !== "Terms") {
        await page.keyboard.press("Tab");
      }

      await expect(
        link,
        `"${name}" link should be focused after tabbing`,
      ).toBeFocused();
    }
  });
});

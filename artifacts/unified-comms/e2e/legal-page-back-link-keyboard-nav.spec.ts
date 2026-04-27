import { test, expect } from "@playwright/test";

/**
 * Keyboard navigation tests for the 'Back to PinnboxIO' link on legal pages.
 *
 * Each legal page (/terms, /privacy, /refunds, /cookies) renders a back link
 * at the top of the page with Tailwind focus-visible ring classes so keyboard
 * users see a visible focus ring when they tab to it. These tests verify:
 *
 *   1. The back link on each legal page carries the correct focus-visible ring
 *      CSS classes.
 *   2. The back link receives keyboard focus when tabbed to from the start of
 *      the page.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

const LEGAL_PAGES = [
  { path: "/terms", label: "Terms of Service" },
  { path: "/privacy", label: "Privacy Policy" },
  { path: "/refunds", label: "Refund Policy" },
  { path: "/cookies", label: "Cookie Policy" },
] as const;

const REQUIRED_FOCUS_CLASSES = [
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2",
] as const;

test.describe("Legal page 'Back to PinnboxIO' link keyboard navigation", () => {
  for (const { path, label } of LEGAL_PAGES) {
    test(`back link on ${label} page has expected focus-visible ring classes`, async ({
      page,
    }) => {
      await page.goto(`${BASE}${path}`);

      const backLink = page.getByRole("link", { name: /Back to PinnboxIO/i });
      await expect(backLink).toBeVisible({ timeout: 15_000 });

      const className = await backLink.getAttribute("class");
      for (const cls of REQUIRED_FOCUS_CLASSES) {
        expect(
          className,
          `Back link on "${label}" is missing class "${cls}"`,
        ).toContain(cls);
      }
    });

    test(`back link on ${label} page receives focus when tabbed to`, async ({
      page,
    }) => {
      await page.goto(`${BASE}${path}`);

      const backLink = page.getByRole("link", { name: /Back to PinnboxIO/i });
      await expect(backLink).toBeVisible({ timeout: 15_000 });

      // The back link is the first interactive element on the page, so a
      // single Tab from the document body should land on it.
      await page.keyboard.press("Tab");

      await expect(
        backLink,
        `Back link on "${label}" should be focused after pressing Tab`,
      ).toBeFocused();
    });
  }
});

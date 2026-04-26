import { test, expect } from "@playwright/test";

/**
 * Dark-mode colour regression test.
 *
 * Task #26 wired brand.dark palette values into Clerk's sign-in/sign-up UI via
 * buildClerkAppearance(isDark). AuthPageShell also applies brand.dark.background
 * as an inline style when useDarkMode() returns true. This test guards against
 * regressions where:
 *   - useDarkMode() silently returns false (e.g. matchMedia emulation ignored)
 *   - The wrong brand token is passed to buildClerkAppearance
 *   - AuthPageShell stops using the dark background in dark mode
 *
 * ## Tokens under test (lib/brand/src/index.ts + App.tsx)
 *
 *   bg = brand.dark.background = "#0f172a" → rgb(15, 23, 42)
 *
 * ## Assertions (both /sign-in and /sign-up)
 *
 * 1. Card background (opaque ancestor of .cl-cardBox):
 *    Walk up from .cl-cardBox to the first opaque ancestor. In dark mode,
 *    AuthPageShell's outer div carries `style={{ backgroundColor: brand.dark.background }}`
 *    so this walk returns rgb(15, 23, 42) = #0f172a.
 *
 * 2. Input background (computed style on .cl-formFieldInput):
 *    Clerk maps `colorInput: bg` to a CSS custom-property applied directly to
 *    each <input> element. getComputedStyle reliably reflects this.
 *
 * Both pages are tested to catch any per-route colour override.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

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

/**
 * Expected dark-mode background colour.
 * Source of truth: `brand.dark.background` in `lib/brand/src/index.ts`.
 * Update here whenever that token changes.
 */
const DARK_BG = "#0f172a"; // brand.dark.background

test.describe("Dark-mode Clerk appearance colours", () => {
  test.beforeEach(async ({ page }) => {
    // Emulate dark OS preference so useDarkMode() returns true before mount.
    await page.emulateMedia({ colorScheme: "dark" });
  });

  for (const route of ["/sign-in", "/sign-up"] as const) {
    test(`card background is brand.dark.background on ${route}`, async ({
      page,
    }) => {
      await page.goto(`${BASE}${route}`);
      await expect(page.locator(".cl-cardBox")).toBeVisible({ timeout: 15_000 });

      /**
       * Walk up from .cl-cardBox to find the first opaque background.
       * In dark mode the AuthPageShell div carries an inline
       * style={{ backgroundColor: brand.dark.background }} so this returns
       * the dark page/card background colour.
       */
      const cardBg = await page.evaluate(() => {
        let el: Element | null = document.querySelector(".cl-cardBox");
        while (el && el !== document.documentElement) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent")
            return bg;
          el = el.parentElement;
        }
        return getComputedStyle(document.body).backgroundColor;
      });

      expect(cardBg, "card background should be set").toBeTruthy();
      expect(
        rgbToHex(cardBg!),
        `card background should be brand.dark.background (${DARK_BG}) in dark mode`,
      ).toBe(DARK_BG);
    });

    test(`form input background is brand.dark.background on ${route}`, async ({
      page,
    }) => {
      await page.goto(`${BASE}${route}`);
      await expect(page.locator(".cl-cardBox")).toBeVisible({ timeout: 15_000 });

      // Clerk maps colorInput → computed background-color on .cl-formFieldInput.
      const inputBg = await page.evaluate(() => {
        const el = document.querySelector(".cl-formFieldInput");
        return el ? getComputedStyle(el).backgroundColor : null;
      });

      expect(inputBg, "formFieldInput backgroundColor should be set").toBeTruthy();
      expect(
        rgbToHex(inputBg!),
        `input background should be brand.dark.background (${DARK_BG}) in dark mode`,
      ).toBe(DARK_BG);
    });
  }
});

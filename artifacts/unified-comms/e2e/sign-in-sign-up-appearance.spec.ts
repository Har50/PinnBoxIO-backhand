import { test, expect } from "@playwright/test";

/**
 * Visual consistency test: sign-in and sign-up pages share the same appearance.
 *
 * Both pages use the same AuthPageShell wrapper and the same clerkAppearance
 * config derived from brand tokens. This test asserts that the computed styles
 * for the page background (AuthPageShell container), Clerk card background, and
 * primary action button are identical between /sign-in and /sign-up.
 *
 * A hardcoded colour override on either page would cause these assertions to
 * fail, catching visual divergence early.
 */

const BASE = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

const SELECTORS = {
  /** Card wrapper injected by Clerk for the form card. */
  cardBox: ".cl-cardBox",
  /** Primary submit button ("Continue" / "Sign up"). */
  primaryButton: ".cl-formButtonPrimary",
} as const;

/**
 * Navigate to a page, wait for the Clerk card, then collect the three
 * computed-colour tokens we care about.
 */
async function collectAppearanceTokens(page: import("@playwright/test").Page) {
  await expect(page.locator(SELECTORS.cardBox)).toBeVisible({
    timeout: 15_000,
  });

  return page.evaluate(
    ({ cardBox, primaryButton }) => {
      function opaqueBg(selector: string): string | null {
        let el: Element | null = document.querySelector(selector);
        while (el && el !== document.documentElement) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent")
            return bg;
          el = el.parentElement;
        }
        return getComputedStyle(document.body).backgroundColor;
      }

      return {
        /**
         * Background of the AuthPageShell container — the first opaque
         * ancestor of .cl-rootBox, which is the min-h-screen div with
         * bg-background. More reliable than reading body directly.
         */
        shellBackground: opaqueBg(".cl-rootBox"),
        /**
         * Effective card background — the first opaque ancestor of .cl-cardBox,
         * skipping any transparent Clerk wrapper layers.
         */
        cardBackground: opaqueBg(cardBox),
        /** Background of the primary action button (brand blue). */
        primaryButtonBackground: (() => {
          const el = document.querySelector(primaryButton);
          return el ? getComputedStyle(el).backgroundColor : null;
        })(),
      };
    },
    { cardBox: SELECTORS.cardBox, primaryButton: SELECTORS.primaryButton },
  );
}

test.describe("Sign-in / sign-up appearance parity — light mode", () => {
  test("both pages render the same auth-shell background colour", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    const signIn = await collectAppearanceTokens(page);

    await page.goto(`${BASE}/sign-up`);
    const signUp = await collectAppearanceTokens(page);

    expect(signIn.shellBackground).toBeTruthy();
    expect(signIn.shellBackground).toEqual(signUp.shellBackground);
  });

  test("both pages render the same card background colour", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    const signIn = await collectAppearanceTokens(page);

    await page.goto(`${BASE}/sign-up`);
    const signUp = await collectAppearanceTokens(page);

    expect(signIn.cardBackground).toBeTruthy();
    expect(signIn.cardBackground).toEqual(signUp.cardBackground);
  });

  test("both pages render the same primary button colour", async ({ page }) => {
    await page.goto(`${BASE}/sign-in`);
    const signIn = await collectAppearanceTokens(page);

    await page.goto(`${BASE}/sign-up`);
    const signUp = await collectAppearanceTokens(page);

    expect(signIn.primaryButtonBackground).toBeTruthy();
    expect(signIn.primaryButtonBackground).toEqual(
      signUp.primaryButtonBackground,
    );
  });

  test("both pages contain a Clerk card with identical custom layout classes", async ({
    page,
  }) => {
    /**
     * Clerk automatically adds page-specific classes like `cl-signIn-start`
     * and `cl-signUp-start`, so we only compare the custom Tailwind classes
     * that our appearance config injects (i.e. classes not prefixed by `cl-`
     * or the lock emoji Clerk adds for internal classes).
     */
    function customClasses(cls: string | null): Set<string> {
      return new Set(
        (cls ?? "")
          .split(/\s+/)
          .filter(
            (c) =>
              c.length > 0 && !c.startsWith("cl-") && !c.startsWith("🔒"),
          ),
      );
    }

    await page.goto(`${BASE}/sign-in`);
    await expect(page.locator(SELECTORS.cardBox)).toBeVisible({
      timeout: 15_000,
    });
    const signInClasses = await page
      .locator(SELECTORS.cardBox)
      .getAttribute("class");

    await page.goto(`${BASE}/sign-up`);
    await expect(page.locator(SELECTORS.cardBox)).toBeVisible({
      timeout: 15_000,
    });
    const signUpClasses = await page
      .locator(SELECTORS.cardBox)
      .getAttribute("class");

    const signInSet = customClasses(signInClasses);
    const signUpSet = customClasses(signUpClasses);

    const onlyInSignIn = [...signInSet].filter((c) => !signUpSet.has(c));
    const onlyInSignUp = [...signUpSet].filter((c) => !signInSet.has(c));

    expect(onlyInSignIn, "classes only on sign-in card").toHaveLength(0);
    expect(onlyInSignUp, "classes only on sign-up card").toHaveLength(0);
  });
});

/**
 * Dark-mode parity: the same three colour tokens must be identical between
 * /sign-in and /sign-up when the OS colour scheme is dark.
 *
 * Playwright emulates the media query via `colorScheme: 'dark'`, which causes
 * `useDarkMode()` in App.tsx to return true and `buildClerkAppearance()` to
 * switch every colour token to the dark-mode brand values.
 *
 * A hardcoded colour override that affects only one page in dark mode would
 * fail these assertions, catching the regression early.
 */
test.describe("Sign-in / sign-up appearance parity — dark mode", () => {
  test.use({ colorScheme: "dark" });

  test("both pages render the same auth-shell background colour in dark mode", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    const signIn = await collectAppearanceTokens(page);

    await page.goto(`${BASE}/sign-up`);
    const signUp = await collectAppearanceTokens(page);

    expect(signIn.shellBackground).toBeTruthy();
    expect(signIn.shellBackground).toEqual(signUp.shellBackground);
  });

  test("both pages render the same card background colour in dark mode", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    const signIn = await collectAppearanceTokens(page);

    await page.goto(`${BASE}/sign-up`);
    const signUp = await collectAppearanceTokens(page);

    expect(signIn.cardBackground).toBeTruthy();
    expect(signIn.cardBackground).toEqual(signUp.cardBackground);
  });

  test("both pages render the same primary button colour in dark mode", async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`);
    const signIn = await collectAppearanceTokens(page);

    await page.goto(`${BASE}/sign-up`);
    const signUp = await collectAppearanceTokens(page);

    expect(signIn.primaryButtonBackground).toBeTruthy();
    expect(signIn.primaryButtonBackground).toEqual(
      signUp.primaryButtonBackground,
    );
  });
});

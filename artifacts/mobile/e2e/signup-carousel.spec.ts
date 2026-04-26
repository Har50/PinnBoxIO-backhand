import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for the signup onboarding carousel (artifacts/mobile/app/signup.tsx).
 *
 * Covers:
 *  1. Advancing slides via the Next button (slides 0 → 1 → 2 → 3)
 *  2. CTA button ("Create my free account") appears only on the final slide (3)
 *  3. Jumping to a slide via the dot indicators
 *  4. Back button returns to the login screen
 *
 * testID reference (React Native testID → data-testid on Expo web):
 *   signup-carousel       — horizontal ScrollView wrapping all slides
 *   signup-back-button    — back arrow in the header
 *   signup-next-button    — "Next →" footer button (slides 0-2 only)
 *   signup-continue-button— "Create my free account" CTA (slide 3 only)
 *   signup-dot-{0..3}     — dot indicators; tap to jump to that slide
 */

const SLIDES = [
  { index: 0, title: "All your inboxes, one place" },
  { index: 1, title: "Unified search" },
  { index: 2, title: "AI-powered replies" },
  { index: 3, title: "Free from day one" },
];

test.describe("Signup carousel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
    await page
      .getByTestId("signup-carousel")
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  test("shows slide 1 content and Next button on initial load", async ({
    page,
  }) => {
    await expect(page.getByText(SLIDES[0].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).toBeVisible();
    await expect(page.getByTestId("signup-continue-button")).not.toBeVisible();
  });

  test("advances through all slides via Next button", async ({ page }) => {
    for (let i = 0; i < SLIDES.length - 1; i++) {
      await expect(page.getByText(SLIDES[i].title)).toBeVisible();

      if (i < SLIDES.length - 1) {
        await expect(page.getByTestId("signup-next-button")).toBeVisible();
        await expect(
          page.getByTestId("signup-continue-button"),
        ).not.toBeVisible();
      }

      await page.getByTestId("signup-next-button").click();
    }

    await expect(page.getByText(SLIDES[3].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).not.toBeVisible();
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();
  });

  test("CTA button appears only on the final slide", async ({ page }) => {
    await expect(page.getByTestId("signup-continue-button")).not.toBeVisible();

    for (let i = 0; i < SLIDES.length - 1; i++) {
      await page.getByTestId("signup-next-button").click();
      if (i < SLIDES.length - 2) {
        await expect(
          page.getByTestId("signup-continue-button"),
        ).not.toBeVisible();
      }
    }

    await expect(page.getByTestId("signup-continue-button")).toBeVisible();
    await expect(page.getByText("Create my free account")).toBeVisible();
  });

  test("jumping via dot indicators switches slides", async ({ page }) => {
    await page.getByTestId("signup-dot-3").click();
    await expect(page.getByTestId("signup-continue-button")).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).not.toBeVisible();

    await page.getByTestId("signup-dot-0").click();
    await expect(page.getByText(SLIDES[0].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).toBeVisible();
    await expect(page.getByTestId("signup-continue-button")).not.toBeVisible();

    await page.getByTestId("signup-dot-2").click();
    await expect(page.getByText(SLIDES[2].title)).toBeVisible();
    await expect(page.getByTestId("signup-next-button")).toBeVisible();
  });

  test("back button returns to the login screen", async ({ page }) => {
    await page.getByTestId("signup-back-button").click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByTestId("signup-carousel")).not.toBeVisible();
  });
});

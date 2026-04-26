import { clerkSetup } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { FullConfig } from "@playwright/test";

export const TEST_USER_EMAIL = "e2e.pinnbox.testuser@example.com";

export default async function globalSetup(config: FullConfig) {
  await clerkSetup();

  if (!process.env.CLERK_SECRET_KEY) {
    return;
  }

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  const existing = await clerk.users.getUserList({
    emailAddress: [TEST_USER_EMAIL],
  });

  if (existing.data.length === 0) {
    await clerk.users.createUser({
      emailAddress: [TEST_USER_EMAIL],
      firstName: "E2E",
      lastName: "TestUser",
      skipPasswordRequirement: true,
    });
  }
}

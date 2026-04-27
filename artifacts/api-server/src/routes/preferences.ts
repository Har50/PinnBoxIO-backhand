import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userPreferencesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { UpdateUserPreferencesBody } from "@workspace/api-zod";
import { ensureUser } from "../services/tokenManager";

const router: IRouter = Router();

router.get("/user/preferences", async (req, res) => {
  const userId = (req as any).userId as string;
  const [row] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId));

  if (row) {
    res.json({
      emailSummary: row.emailSummary,
      importantMessages: row.importantMessages,
      weeklyDigest: row.weeklyDigest,
    });
  } else {
    res.json({ emailSummary: true, importantMessages: true, weeklyDigest: false });
  }
});

router.patch("/user/preferences", async (req, res) => {
  const userId = (req as any).userId as string;

  const parsed = UpdateUserPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { emailSummary, importantMessages, weeklyDigest } = parsed.data;

  await ensureUser(userId);

  const updates: Partial<typeof userPreferencesTable.$inferInsert> = { userId };
  if (typeof emailSummary === "boolean") updates.emailSummary = emailSummary;
  if (typeof importantMessages === "boolean") updates.importantMessages = importantMessages;
  if (typeof weeklyDigest === "boolean") updates.weeklyDigest = weeklyDigest;

  const [row] = await db
    .insert(userPreferencesTable)
    .values({ userId, ...updates })
    .onConflictDoUpdate({
      target: userPreferencesTable.userId,
      set: updates,
    })
    .returning();

  res.json({
    emailSummary: row.emailSummary,
    importantMessages: row.importantMessages,
    weeklyDigest: row.weeklyDigest,
  });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { waitlistTable } from "@workspace/db";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

const router = Router();

const bodySchema = z.object({
  email: z.email(),
});

router.post("/waitlist", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }

  await db
    .insert(waitlistTable)
    .values({ email: parsed.data.email })
    .onConflictDoNothing();

  res.status(200).json({ ok: true });
});

export default router;

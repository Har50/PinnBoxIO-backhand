import { Router, type IRouter } from "express";
import { db, autoRepliesTable, emailWorkflowsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { logger } from "../lib/logger";
import { ensureUser } from "../services/tokenManager";

const router: IRouter = Router();

const AutoReplyBody = z.object({
  isEnabled: z.boolean().optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(4000).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const WorkflowBody = z.object({
  name: z.string().min(1).max(100),
  isEnabled: z.boolean().optional(),
  triggerType: z.enum(["from", "subject_contains", "has_attachment", "any"]),
  triggerValue: z.string().max(200).nullable().optional(),
  actionType: z.enum(["label", "star", "mark_read", "forward", "delete"]),
  actionValue: z.string().max(200).nullable().optional(),
});

router.get("/automation/auto-reply", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  try {
    const [row] = await db
      .select()
      .from(autoRepliesTable)
      .where(eq(autoRepliesTable.userId, userId));

    if (row) {
      res.json({
        id: row.id,
        isEnabled: row.isEnabled,
        subject: row.subject,
        body: row.body,
        startDate: row.startDate?.toISOString() ?? null,
        endDate: row.endDate?.toISOString() ?? null,
      });
    } else {
      res.json({
        id: null,
        isEnabled: false,
        subject: "Re: {{subject}}",
        body: "Thanks for your message. I'm currently away and will get back to you soon.",
        startDate: null,
        endDate: null,
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to get auto-reply");
    res.status(500).json({ error: "Failed to get auto-reply settings" });
  }
});

router.put("/automation/auto-reply", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const parsed = AutoReplyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    await ensureUser(userId);
    const { isEnabled, subject, body, startDate, endDate } = parsed.data;

    const values: Partial<typeof autoRepliesTable.$inferInsert> = { userId };
    if (typeof isEnabled === "boolean") values.isEnabled = isEnabled;
    if (subject !== undefined) values.subject = subject;
    if (body !== undefined) values.body = body;
    if (startDate !== undefined) values.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) values.endDate = endDate ? new Date(endDate) : null;

    const [row] = await db
      .insert(autoRepliesTable)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: autoRepliesTable.userId,
        set: values,
      })
      .returning();

    res.json({
      id: row.id,
      isEnabled: row.isEnabled,
      subject: row.subject,
      body: row.body,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update auto-reply");
    res.status(500).json({ error: "Failed to update auto-reply settings" });
  }
});

router.get("/automation/workflows", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  try {
    const rows = await db
      .select()
      .from(emailWorkflowsTable)
      .where(eq(emailWorkflowsTable.userId, userId));

    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      isEnabled: r.isEnabled,
      triggerType: r.triggerType,
      triggerValue: r.triggerValue ?? null,
      actionType: r.actionType,
      actionValue: r.actionValue ?? null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to list workflows");
    res.status(500).json({ error: "Failed to list workflows" });
  }
});

router.post("/automation/workflows", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const parsed = WorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    await ensureUser(userId);
    const { name, isEnabled, triggerType, triggerValue, actionType, actionValue } = parsed.data;

    const [row] = await db
      .insert(emailWorkflowsTable)
      .values({
        userId,
        name,
        isEnabled: isEnabled ?? true,
        triggerType,
        triggerValue: triggerValue ?? null,
        actionType,
        actionValue: actionValue ?? null,
      })
      .returning();

    res.status(201).json({
      id: row.id,
      name: row.name,
      isEnabled: row.isEnabled,
      triggerType: row.triggerType,
      triggerValue: row.triggerValue ?? null,
      actionType: row.actionType,
      actionValue: row.actionValue ?? null,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to create workflow");
    res.status(500).json({ error: "Failed to create workflow" });
  }
});

router.patch("/automation/workflows/:id", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid workflow id" });
    return;
  }

  const parsed = WorkflowBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(emailWorkflowsTable)
      .where(and(eq(emailWorkflowsTable.id, id), eq(emailWorkflowsTable.userId, userId)));

    if (!existing) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    const updates: Partial<typeof emailWorkflowsTable.$inferInsert> = {};
    const d = parsed.data;
    if (d.name !== undefined) updates.name = d.name;
    if (typeof d.isEnabled === "boolean") updates.isEnabled = d.isEnabled;
    if (d.triggerType !== undefined) updates.triggerType = d.triggerType;
    if (d.triggerValue !== undefined) updates.triggerValue = d.triggerValue ?? null;
    if (d.actionType !== undefined) updates.actionType = d.actionType;
    if (d.actionValue !== undefined) updates.actionValue = d.actionValue ?? null;

    const [row] = await db
      .update(emailWorkflowsTable)
      .set(updates)
      .where(and(eq(emailWorkflowsTable.id, id), eq(emailWorkflowsTable.userId, userId)))
      .returning();

    res.json({
      id: row.id,
      name: row.name,
      isEnabled: row.isEnabled,
      triggerType: row.triggerType,
      triggerValue: row.triggerValue ?? null,
      actionType: row.actionType,
      actionValue: row.actionValue ?? null,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to update workflow");
    res.status(500).json({ error: "Failed to update workflow" });
  }
});

router.delete("/automation/workflows/:id", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid workflow id" });
    return;
  }

  try {
    const deleted = await db
      .delete(emailWorkflowsTable)
      .where(and(eq(emailWorkflowsTable.id, id), eq(emailWorkflowsTable.userId, userId)))
      .returning({ id: emailWorkflowsTable.id });

    if (!deleted.length) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete workflow");
    res.status(500).json({ error: "Failed to delete workflow" });
  }
});

export default router;

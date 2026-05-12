import { Router, type IRouter } from "express";
import { db, imapCredentialsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { testImapConnection, encryptPassword, decryptPassword } from "../services/imap";

const router: IRouter = Router();

router.post("/auth/imap/connect", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const { email, displayName, host, port, secure, username, password, color } = req.body as {
    email: string;
    displayName?: string;
    host: string;
    port?: number;
    secure?: boolean;
    username: string;
    password: string;
    color?: string;
  };

  if (!email || !host || !username || !password) {
    res.status(400).json({ error: "email, host, username and password are required" });
    return;
  }

  const resolvedPort = port ?? 993;
  const resolvedSecure = secure ?? true;

  const test = await testImapConnection({
    host,
    port: resolvedPort,
    secure: resolvedSecure,
    username,
    password,
  });

  if (!test.ok) {
    res.status(400).json({
      error: test.error ?? "Could not connect to IMAP server. Check your credentials.",
    });
    return;
  }

  let encryptedPassword: string;
  try {
    encryptedPassword = encryptPassword(password);
  } catch (err: any) {
    req.log.error({ err }, "IMAP encryption key not configured");
    res.status(500).json({ error: "Server encryption not configured. Contact support." });
    return;
  }

  const [cred] = await db
    .insert(imapCredentialsTable)
    .values({
      userId,
      email,
      displayName: displayName || null,
      host,
      port: resolvedPort,
      secure: resolvedSecure,
      username,
      password: encryptedPassword,
      color: color || "#6366f1",
      isActive: true,
    })
    .returning();

  res.status(201).json({ id: cred.id, email: cred.email, displayName: cred.displayName });
});

router.post("/auth/imap/:id/test", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const credentialId = Number(req.params.id);

  const [cred] = await db
    .select()
    .from(imapCredentialsTable)
    .where(and(eq(imapCredentialsTable.id, credentialId), eq(imapCredentialsTable.userId, userId)));

  if (!cred) {
    res.status(404).json({ error: "IMAP account not found" });
    return;
  }

  let plainPassword: string;
  try {
    plainPassword = decryptPassword(cred.password);
  } catch {
    res.status(500).json({ error: "Could not decrypt credentials" });
    return;
  }

  const result = await testImapConnection({
    host: cred.host,
    port: cred.port,
    secure: cred.secure,
    username: cred.username,
    password: plainPassword,
  });

  res.json(result);
});

router.delete("/auth/imap/:id/disconnect", async (req: any, res): Promise<void> => {
  const userId: string = req.userId;
  const credentialId = Number(req.params.id);

  const [deleted] = await db
    .delete(imapCredentialsTable)
    .where(
      and(
        eq(imapCredentialsTable.id, credentialId),
        eq(imapCredentialsTable.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "IMAP account not found" });
    return;
  }

  res.json({ success: true });
});

export default router;

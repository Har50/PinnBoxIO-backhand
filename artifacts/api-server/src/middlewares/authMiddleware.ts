import type { AuthUser } from "@workspace/api-zod";
import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    user?: AuthUser;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    code_verifier?: string;
    nonce?: string;
    oidc_state?: string;
    return_to?: string;
  }
}

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

async function getUserFromSessionId(sessionId: string): Promise<AuthUser | null> {
  try {
    const result = await db.execute(
      sql`SELECT sess FROM sessions WHERE sid = ${sessionId} AND expire > NOW() LIMIT 1`
    );
    const row = result.rows[0] as { sess?: { user?: AuthUser } } | undefined;
    return row?.sess?.user ?? null;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  if (req.session?.user?.id) {
    req.user = req.session.user;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const sessionId = authHeader.slice(7).trim();
    if (sessionId) {
      const user = await getUserFromSessionId(sessionId);
      if (user?.id) {
        req.user = user;
      }
    }
  }

  next();
}

import type { AuthUser } from "@workspace/api-zod";
import { type Request, type Response, type NextFunction } from "express";

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
  }

  next();
}

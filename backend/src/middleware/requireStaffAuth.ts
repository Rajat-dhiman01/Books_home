import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { staffUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export interface AuthenticatedStaffRequest extends Request {
  staff?: typeof staffUsers.$inferSelect;
}

// Protects every staff/admin route. Verifies the bearer token against
// Supabase Auth, then requires a matching row in staff_users — having a
// valid Supabase session alone is not enough (that would also let a member
// portal login in through the front door). Mirrors requireMemberAuth.ts.
export async function requireStaffAuth(
  req: AuthenticatedStaffRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token." });
  }
  const token = authHeader.slice("Bearer ".length);

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  const rows = await db.select().from(staffUsers).where(eq(staffUsers.authUserId, data.user.id));
  if (rows.length === 0) {
    return res.status(403).json({ error: "No staff account linked to this identity." });
  }

  req.staff = rows[0];
  next();
}
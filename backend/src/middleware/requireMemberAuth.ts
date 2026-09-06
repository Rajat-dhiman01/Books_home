import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db";
import { members } from "../db/schema";
import { eq } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export interface AuthenticatedMemberRequest extends Request {
  member?: typeof members.$inferSelect;
}

export async function requireMemberAuth(
  req: AuthenticatedMemberRequest,
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

  const rows = await db.select().from(members).where(eq(members.authUserId, data.user.id));
  if (rows.length === 0) {
    return res.status(403).json({ error: "No member account linked to this identity." });
  }

  req.member = rows[0];
  next();
}
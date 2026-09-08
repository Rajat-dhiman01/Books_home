import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { staffUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { isUniqueViolation } from "../lib/errors";
import { requireStaffAuth, AuthenticatedStaffRequest } from "../middleware/requireStaffAuth";

const router = Router();
router.use(requireStaffAuth);

// GET /staff/me — the currently logged-in staff member's own profile.
// Used by the frontend on every page load to confirm the session is real
// and to know whether to show owner-only UI (e.g. "Add admin").
router.get("/me", async (req: AuthenticatedStaffRequest, res) => {
  res.json({ data: req.staff });
});

// GET /staff — list every staff account, for the Staff Accounts page.
router.get("/", async (req, res) => {
  const rows = await db.select().from(staffUsers);
  res.json({ data: rows, count: rows.length });
});

const createStaffSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1).max(150),
  role: z.enum(["OWNER", "ADMIN"]).default("ADMIN"),
});

// POST /staff — create a new staff/admin account (owner only). Sets up the
// Supabase Auth user directly with the given email+password (no invite
// email step), then links it with a staff_users row. If the DB insert
// fails after the auth user was created, the auth user is rolled back so
// we never end up with a login that has no corresponding staff row.
router.post("/", async (req: AuthenticatedStaffRequest, res) => {
  if (req.staff?.role !== "OWNER") {
    return res.status(403).json({ error: "Only an owner account can do this." });
  }
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, fullName, role } = parsed.data;

  const library = await getDefaultLibrary();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const status = createError?.status === 422 ? 409 : 500;
    return res.status(status).json({ error: createError?.message ?? "Could not create the login." });
  }

  try {
    const [staff] = await db
      .insert(staffUsers)
      .values({ libraryId: library.id, authUserId: created.user.id, email, fullName, role })
      .returning();
    res.status(201).json({ data: staff });
  } catch (err) {
    // Roll back the auth user so a failed insert never leaves an orphaned login.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "A staff account with this email already exists." });
    }
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /staff/:id — revoke a staff account's access (owner only). Removes
// both the staff_users row and the underlying Supabase Auth login, so the
// removed person can no longer sign in at all, not just lose data access.
// Note: req is deliberately left untyped here (not AuthenticatedStaffRequest)
// and cast inside instead — Express 5's type definitions for router.delete
// specifically mis-resolve overloads when the handler's req param carries an
// explicit custom Request subtype, producing a spurious, unrelated compiler
// error a few lines down. GET/POST/PATCH don't have this issue.
router.delete("/:id", async (req, res) => {
  const staffReq = req as AuthenticatedStaffRequest;
  if (staffReq.staff?.role !== "OWNER") {
    return res.status(403).json({ error: "Only an owner account can do this." });
  }
  const [target] = await db.select().from(staffUsers).where(eq(staffUsers.id, req.params.id));
  if (!target) {
    return res.status(404).json({ error: "Staff account not found" });
  }
  if (target.id === staffReq.staff!.id) {
    return res.status(400).json({ error: "You can't remove your own account." });
  }
  if (target.role === "OWNER") {
    const owners = await db.select().from(staffUsers).where(eq(staffUsers.role, "OWNER"));
    if (owners.length <= 1) {
      return res.status(400).json({ error: "Can't remove the last owner account." });
    }
  }

  await db.delete(staffUsers).where(eq(staffUsers.id, req.params.id));
  await supabaseAdmin.auth.admin.deleteUser(target.authUserId);

  res.json({ data: { id: target.id, removed: true } });
});

export default router;
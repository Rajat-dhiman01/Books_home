import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { members } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { isUniqueViolation, isForeignKeyViolation } from "../lib/errors";

const router = Router();

const createMemberSchema = z.object({
  memberCode: z.string().max(50).optional(),
  fullName: z.string().min(1).max(150),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(255).optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateMemberSchema = createMemberSchema.partial();

// GET /members
router.get("/", async (req, res) => {
  const rows = await db.select().from(members);
  res.json({ data: rows, count: rows.length });
});

// GET /members/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(members).where(eq(members.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Member not found" });
  }
  res.json({ data: rows[0] });
});

// POST /members
router.post("/", async (req, res) => {
  const parsed = createMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const library = await getDefaultLibrary();
  let authUserId: string | undefined;

  // Create the member-portal auth identity first, if an email was given.
  // This lets the member log in via magic link immediately, with no
  // separate linking step later (see design decision, Session 07 —
  // switched from phone/SMS to email due to India DLT registration
  // requirements for SMS delivery).
  if (parsed.data.email) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.data.email,
      email_confirm: true,
    });
    if (authError) {
      return res.status(409).json({
        error: `Could not create member portal login for email '${parsed.data.email}': ${authError.message}`,
      });
    }
    authUserId = authData.user.id;
  }

  try {
    const [created] = await db
      .insert(members)
      .values({ ...parsed.data, libraryId: library.id, authUserId })
      .returning();
    res.status(201).json({ data: created });
  } catch (err: any) {
    // Member row failed to insert after the auth identity was already
    // created above — clean it up so it doesn't linger as an orphaned,
    // unlinked identity blocking future reuse of this phone number.
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: `Member code '${parsed.data.memberCode}' already exists in this library.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /members/:id
router.patch("/:id", async (req, res) => {
  const parsed = updateMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existingRows = await db.select().from(members).where(eq(members.id, req.params.id));
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ error: "Member not found" });
  }

  const emailChanged = parsed.data.email !== undefined && parsed.data.email !== existing.email;

  // Keeps the member-portal login identity in sync with the member row.
  // Without this, changing a member's email here would silently leave the
  // Supabase Auth identity pointed at the old email — the member could no
  // longer log in with their new email, and a magic link sent to the new
  // address would create an orphaned, unlinked auth identity instead.
  let newAuthUserId: string | undefined;
  let createdFreshAuthUser = false;

  if (emailChanged) {
    if (existing.authUserId) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(existing.authUserId, {
        email: parsed.data.email,
        email_confirm: true,
      });
      if (updateAuthError) {
        return res.status(409).json({
          error: `Could not update member portal login to '${parsed.data.email}': ${updateAuthError.message}`,
        });
      }
    } else {
      const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: parsed.data.email!,
        email_confirm: true,
      });
      if (createAuthError) {
        return res.status(409).json({
          error: `Could not create member portal login for '${parsed.data.email}': ${createAuthError.message}`,
        });
      }
      newAuthUserId = authData.user.id;
      createdFreshAuthUser = true;
    }
  }

  try {
    const [updated] = await db
      .update(members)
      .set({ ...parsed.data, ...(newAuthUserId ? { authUserId: newAuthUserId } : {}), updatedAt: new Date() })
      .where(eq(members.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Member not found" });
    }
    res.json({ data: updated });
  } catch (err: any) {
    // DB write failed after an Auth-side change already succeeded above —
    // undo it so the two systems don't drift out of sync.
    if (createdFreshAuthUser && newAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(newAuthUserId).catch(() => {});
    } else if (emailChanged && existing.authUserId && existing.email) {
      await supabaseAdmin.auth.admin
        .updateUserById(existing.authUserId, { email: existing.email, email_confirm: true })
        .catch(() => {});
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: `Member code '${parsed.data.memberCode}' already exists in this library.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /members/:id
router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(members).where(eq(members.id, req.params.id)).returning();
    if (!deleted) {
      return res.status(404).json({ error: "Member not found" });
    }
    res.json({ data: deleted });
  } catch (err: any) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).json({
        error: "Cannot delete this member — they have existing membership records. Remove or reassign their memberships first.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { members } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";

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

function isUniqueViolation(err: any) {
  return err.code === "23505" || err.cause?.code === "23505";
}

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

  try {
    const library = await getDefaultLibrary();
    const [created] = await db
      .insert(members)
      .values({ ...parsed.data, libraryId: library.id })
      .returning();
    res.status(201).json({ data: created });
  } catch (err: any) {
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

  try {
    const [updated] = await db
      .update(members)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(members.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Member not found" });
    }
    res.json({ data: updated });
  } catch (err: any) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: `Member code '${parsed.data.memberCode}' already exists in this library.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /members/:id
router.delete("/:id", async (req, res) => {
  const [deleted] = await db.delete(members).where(eq(members.id, req.params.id)).returning();
  if (!deleted) {
    return res.status(404).json({ error: "Member not found" });
  }
  res.json({ data: deleted });
});

export default router;
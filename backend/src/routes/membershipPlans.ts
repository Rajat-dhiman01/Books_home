import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { membershipPlans, shifts } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";
import { isUniqueViolation, isForeignKeyViolation } from "../lib/errors";

const router = Router();

const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  shiftId: z.string().uuid(),
  seatReservationType: z.enum(["REQUIRED", "OPTIONAL", "NONE"]),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

const updatePlanSchema = createPlanSchema.partial();

// GET /membership_plans
router.get("/", async (req, res) => {
  const rows = await db.select().from(membershipPlans);
  res.json({ data: rows, count: rows.length });
});

// GET /membership_plans/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(membershipPlans).where(eq(membershipPlans.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Membership plan not found" });
  }
  res.json({ data: rows[0] });
});

// POST /membership_plans
router.post("/", async (req, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Confirm the referenced shift actually exists — gives a clean 400
  // instead of a raw FK-violation error from Postgres.
  const shiftRows = await db.select().from(shifts).where(eq(shifts.id, parsed.data.shiftId));
  if (shiftRows.length === 0) {
    return res.status(400).json({ error: `No shift found with id '${parsed.data.shiftId}'.` });
  }

  try {
    const library = await getDefaultLibrary();
    const [created] = await db
      .insert(membershipPlans)
      .values({ ...parsed.data, libraryId: library.id })
      .returning();
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: `A plan named '${parsed.data.name}' already exists in this library.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /membership_plans/:id
router.patch("/:id", async (req, res) => {
  const parsed = updatePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (parsed.data.shiftId) {
    const shiftRows = await db.select().from(shifts).where(eq(shifts.id, parsed.data.shiftId));
    if (shiftRows.length === 0) {
      return res.status(400).json({ error: `No shift found with id '${parsed.data.shiftId}'.` });
    }
  }

  try {
    const [updated] = await db
      .update(membershipPlans)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(membershipPlans.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Membership plan not found" });
    }
    res.json({ data: updated });
  } catch (err: any) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: `A plan named '${parsed.data.name}' already exists in this library.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /membership_plans/:id
router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(membershipPlans).where(eq(membershipPlans.id, req.params.id)).returning();
    if (!deleted) {
      return res.status(404).json({ error: "Membership plan not found" });
    }
    res.json({ data: deleted });
  } catch (err: any) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).json({
        error: "Cannot delete this membership plan — it is used by one or more memberships. Reassign or remove those memberships first.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
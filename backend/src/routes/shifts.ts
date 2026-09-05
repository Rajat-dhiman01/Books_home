import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { shifts } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";

const router = Router();

const createShiftSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected HH:MM or HH:MM:SS"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected HH:MM or HH:MM:SS"),
  crossesMidnight: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateShiftSchema = createShiftSchema.partial();

// GET /shifts
router.get("/", async (req, res) => {
  const rows = await db.select().from(shifts);
  res.json({ data: rows, count: rows.length });
});

// GET /shifts/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(shifts).where(eq(shifts.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Shift not found" });
  }
  res.json({ data: rows[0] });
});

// POST /shifts
router.post("/", async (req, res) => {
  const parsed = createShiftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const library = await getDefaultLibrary();
    const [created] = await db
      .insert(shifts)
      .values({ ...parsed.data, libraryId: library.id })
      .returning();
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /shifts/:id
router.patch("/:id", async (req, res) => {
  const parsed = updateShiftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const [updated] = await db
    .update(shifts)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(shifts.id, req.params.id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Shift not found" });
  }
  res.json({ data: updated });
});

// DELETE /shifts/:id
router.delete("/:id", async (req, res) => {
  const [deleted] = await db.delete(shifts).where(eq(shifts.id, req.params.id)).returning();
  if (!deleted) {
    return res.status(404).json({ error: "Shift not found" });
  }
  res.json({ data: deleted });
});

export default router;
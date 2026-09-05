import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { seats } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";

const router = Router();

const createSeatSchema = z.object({
  seatNumber: z.string().min(1).max(50),
  name: z.string().max(100).optional(),
  floor: z.string().max(50).optional(),
  section: z.string().max(50).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
  notes: z.string().optional(),
});

const updateSeatSchema = createSeatSchema.partial();

// GET /seats
router.get("/", async (req, res) => {
  const rows = await db.select().from(seats);
  res.json({ data: rows, count: rows.length });
});

// GET /seats/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(seats).where(eq(seats.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Seat not found" });
  }
  res.json({ data: rows[0] });
});

// POST /seats
router.post("/", async (req, res) => {
  const parsed = createSeatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const library = await getDefaultLibrary();
    const [created] = await db
      .insert(seats)
      .values({ ...parsed.data, libraryId: library.id })
      .returning();
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (err.code === "23505" || err.cause?.code === "23505") {
      // Postgres unique_violation
      return res.status(409).json({ error: `Seat number '${parsed.data.seatNumber}' already exists in this library.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /seats/:id
router.patch("/:id", async (req, res) => {
  const parsed = updateSeatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const [updated] = await db
      .update(seats)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(seats.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Seat not found" });
    }
    res.json({ data: updated });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: `Seat number '${parsed.data.seatNumber}' already exists in this library.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /seats/:id
router.delete("/:id", async (req, res) => {
  const [deleted] = await db.delete(seats).where(eq(seats.id, req.params.id)).returning();
  if (!deleted) {
    return res.status(404).json({ error: "Seat not found" });
  }
  res.json({ data: deleted });
});

export default router;
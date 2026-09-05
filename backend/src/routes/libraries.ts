import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { libraries } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const createLibrarySchema = z.object({
  name: z.string().min(1).max(150),
  timezone: z.string().min(1).max(50).optional(),
});

const updateLibrarySchema = createLibrarySchema.partial();

// GET /libraries
router.get("/", async (req, res) => {
  const rows = await db.select().from(libraries);
  res.json({ data: rows, count: rows.length });
});

// GET /libraries/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(libraries).where(eq(libraries.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Library not found" });
  }
  res.json({ data: rows[0] });
});

// POST /libraries
router.post("/", async (req, res) => {
  const parsed = createLibrarySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const [created] = await db.insert(libraries).values(parsed.data).returning();
  res.status(201).json({ data: created });
});

// PATCH /libraries/:id
router.patch("/:id", async (req, res) => {
  const parsed = updateLibrarySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const [updated] = await db
    .update(libraries)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(libraries.id, req.params.id))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Library not found" });
  }
  res.json({ data: updated });
});

// DELETE /libraries/:id
router.delete("/:id", async (req, res) => {
  const [deleted] = await db.delete(libraries).where(eq(libraries.id, req.params.id)).returning();
  if (!deleted) {
    return res.status(404).json({ error: "Library not found" });
  }
  res.json({ data: deleted });
});

export default router;
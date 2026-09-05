import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { seatAssignments, memberships, seats } from "../db/schema";
import { eq } from "drizzle-orm";
import { isExclusionViolation, isForeignKeyViolation } from "../lib/errors";

const router = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const seatAssignmentBaseSchema = z.object({
  membershipId: z.string().uuid(),
  seatId: z.string().uuid(),
  assignmentType: z.enum(["RESERVED", "PREFERRED"]),
  startDate: z.string().regex(dateRegex, "must be in YYYY-MM-DD format"),
  endDate: z.string().regex(dateRegex, "must be in YYYY-MM-DD format"),
});

const createSeatAssignmentSchema = seatAssignmentBaseSchema.refine(
  (data) => data.endDate >= data.startDate,
  { message: "endDate must be on or after startDate", path: ["endDate"] }
);

const updateSeatAssignmentSchema = seatAssignmentBaseSchema.partial();

// GET /seat_assignments
router.get("/", async (req, res) => {
  const rows = await db.select().from(seatAssignments);
  res.json({ data: rows, count: rows.length });
});

// GET /seat_assignments/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(seatAssignments).where(eq(seatAssignments.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Seat assignment not found" });
  }
  res.json({ data: rows[0] });
});

// POST /seat_assignments
router.post("/", async (req, res) => {
  const parsed = createSeatAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { membershipId, seatId, assignmentType, startDate, endDate } = parsed.data;

  const membershipRows = await db.select().from(memberships).where(eq(memberships.id, membershipId));
  if (membershipRows.length === 0) {
    return res.status(400).json({ error: `No membership found with id '${membershipId}'.` });
  }

  const seatRows = await db.select().from(seats).where(eq(seats.id, seatId));
  if (seatRows.length === 0) {
    return res.status(400).json({ error: `No seat found with id '${seatId}'.` });
  }

  try {
    const [created] = await db
      .insert(seatAssignments)
      .values({ membershipId, seatId, assignmentType, startDate, endDate })
      .returning();
    res.status(201).json({ data: created });
  } catch (err: any) {
    if (isExclusionViolation(err)) {
      return res
        .status(409)
        .json({ error: "That seat is already reserved for an overlapping date range." });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /seat_assignments/:id
// Typical use: shortening endDate to "end" an assignment early when reassigning a seat.
router.patch("/:id", async (req, res) => {
  const parsed = updateSeatAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (parsed.data.membershipId) {
    const membershipRows = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, parsed.data.membershipId));
    if (membershipRows.length === 0) {
      return res.status(400).json({ error: `No membership found with id '${parsed.data.membershipId}'.` });
    }
  }
  if (parsed.data.seatId) {
    const seatRows = await db.select().from(seats).where(eq(seats.id, parsed.data.seatId));
    if (seatRows.length === 0) {
      return res.status(400).json({ error: `No seat found with id '${parsed.data.seatId}'.` });
    }
  }

  try {
    const [updated] = await db
      .update(seatAssignments)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(seatAssignments.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Seat assignment not found" });
    }
    res.json({ data: updated });
  } catch (err: any) {
    if (isExclusionViolation(err)) {
      return res
        .status(409)
        .json({ error: "That seat is already reserved for an overlapping date range." });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /seat_assignments/:id
router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(seatAssignments)
      .where(eq(seatAssignments.id, req.params.id))
      .returning();
    if (!deleted) {
      return res.status(404).json({ error: "Seat assignment not found" });
    }
    res.json({ data: deleted });
  } catch (err: any) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).json({ error: "Cannot delete this seat assignment — it is still referenced elsewhere." });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
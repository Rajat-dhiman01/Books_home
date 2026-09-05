import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { attendance, memberships } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { isUniqueViolation, isForeignKeyViolation } from "../lib/errors";

const router = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const attendanceBaseSchema = z.object({
  membershipId: z.string().uuid(),
  attendanceDate: z.string().regex(dateRegex, "must be in YYYY-MM-DD format"),
  status: z.enum(["PRESENT", "ABSENT"]),
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const createAttendanceSchema = attendanceBaseSchema.refine(
  (data) => !data.checkInAt || !data.checkOutAt || data.checkOutAt >= data.checkInAt,
  { message: "checkOutAt must be on or after checkInAt", path: ["checkOutAt"] }
);

const updateAttendanceSchema = attendanceBaseSchema.partial();

const listQuerySchema = z.object({
  membershipId: z.string().uuid().optional(),
  date: z.string().regex(dateRegex).optional(),
});

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// Rule 1 (schema doc section 18): attendance must fall within the membership's
// own start/end dates. Not enforced by any DB constraint, so it's checked here.
async function validateDateWithinMembership(membershipId: string, attendanceDate: string) {
  const rows = await db.select().from(memberships).where(eq(memberships.id, membershipId));
  if (rows.length === 0) {
    return { ok: false as const, error: `No membership found with id '${membershipId}'.` };
  }
  const membership = rows[0];
  if (attendanceDate < membership.startDate || attendanceDate > membership.endDate) {
    return {
      ok: false as const,
      error: `attendanceDate '${attendanceDate}' is outside this membership's period (${membership.startDate} to ${membership.endDate}).`,
    };
  }
  return { ok: true as const, membership };
}

// GET /attendance?membershipId=<uuid>&date=YYYY-MM-DD
router.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const conditions = [];
  if (parsed.data.membershipId) conditions.push(eq(attendance.membershipId, parsed.data.membershipId));
  if (parsed.data.date) conditions.push(eq(attendance.attendanceDate, parsed.data.date));

  const rows = conditions.length > 0
    ? await db.select().from(attendance).where(and(...conditions))
    : await db.select().from(attendance);

  res.json({ data: rows, count: rows.length });
});

// GET /attendance/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(attendance).where(eq(attendance.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Attendance record not found" });
  }
  res.json({ data: rows[0] });
});

// POST /attendance
router.post("/", async (req, res) => {
  const parsed = createAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { membershipId, attendanceDate, status, checkInAt, checkOutAt, notes } = parsed.data;

  const check = await validateDateWithinMembership(membershipId, attendanceDate);
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  try {
    const [created] = await db
      .insert(attendance)
      .values(
        stripUndefined({
          membershipId,
          attendanceDate,
          status,
          checkInAt: checkInAt ? new Date(checkInAt) : undefined,
          checkOutAt: checkOutAt ? new Date(checkOutAt) : undefined,
          notes,
        }) as any
      )
      .returning();

    res.status(201).json({ data: created });
  } catch (err: any) {
    if (isUniqueViolation(err)) {
      return res
        .status(409)
        .json({ error: "Attendance is already recorded for this membership on this date." });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /attendance/:id
router.patch("/:id", async (req, res) => {
  const parsed = updateAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // If either membershipId or attendanceDate is being changed, re-validate
  // against the (possibly new) membership's period using the resulting pair.
  if (parsed.data.membershipId || parsed.data.attendanceDate) {
    const existingRows = await db.select().from(attendance).where(eq(attendance.id, req.params.id));
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    const effectiveMembershipId = parsed.data.membershipId ?? existingRows[0].membershipId;
    const effectiveDate = parsed.data.attendanceDate ?? existingRows[0].attendanceDate;

    const check = await validateDateWithinMembership(effectiveMembershipId, effectiveDate);
    if (!check.ok) {
      return res.status(400).json({ error: check.error });
    }
  }

  try {
    const updateValues: any = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.checkInAt) updateValues.checkInAt = new Date(parsed.data.checkInAt);
    if (parsed.data.checkOutAt) updateValues.checkOutAt = new Date(parsed.data.checkOutAt);

    const [updated] = await db
      .update(attendance)
      .set(updateValues)
      .where(eq(attendance.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json({ data: updated });
  } catch (err: any) {
    if (isUniqueViolation(err)) {
      return res
        .status(409)
        .json({ error: "Attendance is already recorded for this membership on this date." });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /attendance/:id
router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(attendance).where(eq(attendance.id, req.params.id)).returning();
    if (!deleted) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    res.json({ data: deleted });
  } catch (err: any) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).json({ error: "Cannot delete this attendance record." });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
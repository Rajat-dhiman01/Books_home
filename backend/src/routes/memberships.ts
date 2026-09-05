import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { memberships, members, membershipPlans, seatAssignments, seats } from "../db/schema";
import { eq } from "drizzle-orm";
import { isUniqueViolation, isExclusionViolation, isForeignKeyViolation } from "../lib/errors";

const router = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const membershipBaseSchema = z.object({
  memberId: z.string().uuid(),
  membershipPlanId: z.string().uuid(),
  startDate: z.string().regex(dateRegex, "must be in YYYY-MM-DD format"),
  endDate: z.string().regex(dateRegex, "must be in YYYY-MM-DD format"),
  status: z.enum(["SCHEDULED", "ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

const createMembershipSchema = membershipBaseSchema
  .extend({
    // Optional: if provided, a seat_assignment is created in the same
    // transaction as the membership. Omit entirely for a plan with no seat.
    seatId: z.string().uuid().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

const updateMembershipSchema = membershipBaseSchema.partial();

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// GET /memberships
router.get("/", async (req, res) => {
  const rows = await db.select().from(memberships);
  res.json({ data: rows, count: rows.length });
});

// GET /memberships/:id
router.get("/:id", async (req, res) => {
  const rows = await db.select().from(memberships).where(eq(memberships.id, req.params.id));
  if (rows.length === 0) {
    return res.status(404).json({ error: "Membership not found" });
  }
  res.json({ data: rows[0] });
});

// POST /memberships
// If `seatId` is provided, creates the membership AND its seat_assignment
// in a single transaction: either both rows commit or neither does.
router.post("/", async (req, res) => {
  const parsed = createMembershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { memberId, membershipPlanId, startDate, endDate, status, notes, seatId } = parsed.data;

  // Validate referenced member exists
  const memberRows = await db.select().from(members).where(eq(members.id, memberId));
  if (memberRows.length === 0) {
    return res.status(400).json({ error: `No member found with id '${memberId}'.` });
  }

  // Validate referenced plan exists, and grab its seatReservationType
  const planRows = await db.select().from(membershipPlans).where(eq(membershipPlans.id, membershipPlanId));
  if (planRows.length === 0) {
    return res.status(400).json({ error: `No membership plan found with id '${membershipPlanId}'.` });
  }
  const plan = planRows[0];

  // Validate referenced seat exists, if one was given
  if (seatId) {
    const seatRows = await db.select().from(seats).where(eq(seats.id, seatId));
    if (seatRows.length === 0) {
      return res.status(400).json({ error: `No seat found with id '${seatId}'.` });
    }
  }

  // REQUIRED plans get a RESERVED seat; anything else gets PREFERRED.
  // (No strict enforcement yet that REQUIRED plans must include a seatId —
  // that's a deliberate deferral, see Session 4 design notes.)
  const assignmentType = plan.seatReservationType === "REQUIRED" ? "RESERVED" : "PREFERRED";

  try {
    const result = await db.transaction(async (tx) => {
      const [createdMembership] = await tx
        .insert(memberships)
        .values(stripUndefined({ memberId, membershipPlanId, startDate, endDate, status, notes }) as any)
        .returning();

      let createdSeatAssignment = null;
      if (seatId) {
        [createdSeatAssignment] = await tx
          .insert(seatAssignments)
          .values({
            membershipId: createdMembership.id,
            seatId,
            assignmentType,
            startDate,
            endDate,
          })
          .returning();
      }

      return { membership: createdMembership, seatAssignment: createdSeatAssignment };
    });

    res.status(201).json({ data: result });
  } catch (err: any) {
    if (isExclusionViolation(err)) {
      return res
        .status(409)
        .json({ error: "That seat is already reserved for an overlapping date range." });
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "Conflict creating membership or seat assignment." });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /memberships/:id
// Does not touch seat assignments — use the seat_assignments routes
// to reassign or end a seat for an existing membership.
router.patch("/:id", async (req, res) => {
  const parsed = updateMembershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (parsed.data.memberId) {
    const memberRows = await db.select().from(members).where(eq(members.id, parsed.data.memberId));
    if (memberRows.length === 0) {
      return res.status(400).json({ error: `No member found with id '${parsed.data.memberId}'.` });
    }
  }
  if (parsed.data.membershipPlanId) {
    const planRows = await db
      .select()
      .from(membershipPlans)
      .where(eq(membershipPlans.id, parsed.data.membershipPlanId));
    if (planRows.length === 0) {
      return res
        .status(400)
        .json({ error: `No membership plan found with id '${parsed.data.membershipPlanId}'.` });
    }
  }

  try {
    const [updated] = await db
      .update(memberships)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(memberships.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Membership not found" });
    }
    res.json({ data: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /memberships/:id
router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db.delete(memberships).where(eq(memberships.id, req.params.id)).returning();
    if (!deleted) {
      return res.status(404).json({ error: "Membership not found" });
    }
    res.json({ data: deleted });
  } catch (err: any) {
    if (isForeignKeyViolation(err)) {
      return res.status(409).json({
        error: "Cannot delete this membership — it has existing seat assignments or attendance records.",
      });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
import { Router, Response } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { attendance, memberships, membershipPlans, shifts, seatAssignments, seats } from "../db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";
import { getNowInTimezone, isTimeInShift, shiftDate, startOfMonth } from "../lib/shiftTime";
import { requireMemberAuth, AuthenticatedMemberRequest } from "../middleware/requireMemberAuth";
import { isUniqueViolation } from "../lib/errors";

const router = Router();
router.use(requireMemberAuth);

// Resolves this member's currently active membership from the server side —
// never trust a membershipId supplied by the client for these routes.
async function getActiveMembership(memberId: string, todayDate: string) {
  const rows = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.memberId, memberId),
        lte(memberships.startDate, todayDate),
        gte(memberships.endDate, todayDate)
      )
    );
  return rows[0] ?? null;
}

// GET /member/me
router.get("/me", async (req: AuthenticatedMemberRequest, res: Response) => {
  const library = await getDefaultLibrary();
  const { date: today } = getNowInTimezone(library.timezone);

  const membership = await getActiveMembership(req.member!.id, today);
  if (!membership) {
    return res.json({ data: { member: req.member, membership: null } });
  }

  const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, membership.membershipPlanId));
  const [shift] = plan ? await db.select().from(shifts).where(eq(shifts.id, plan.shiftId)) : [];

  const seatRows = await db
    .select({ seatNumber: seats.seatNumber, assignmentType: seatAssignments.assignmentType })
    .from(seatAssignments)
    .innerJoin(seats, eq(seatAssignments.seatId, seats.id))
    .where(
      and(
        eq(seatAssignments.membershipId, membership.id),
        lte(seatAssignments.startDate, today),
        gte(seatAssignments.endDate, today)
      )
    );

  const [todayAttendance] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.membershipId, membership.id), eq(attendance.attendanceDate, today)));

  res.json({
    data: { member: req.member, membership, plan, shift, seat: seatRows[0] ?? null, todayAttendance: todayAttendance ?? null },
  });
});

// POST /member/attendance/check-in
router.post("/attendance/check-in", async (req: AuthenticatedMemberRequest, res: Response) => {
  const library = await getDefaultLibrary();
  const { date: today, time: now } = getNowInTimezone(library.timezone);

  const membership = await getActiveMembership(req.member!.id, today);
  if (!membership) return res.status(400).json({ error: "No active membership found for today." });

  const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, membership.membershipPlanId));

  if (plan?.restrictCheckInToShift) {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, plan.shiftId));
    if (shift && !isTimeInShift(now, shift)) {
      return res.status(400).json({ error: `Check-in is only allowed during your shift (${shift.startTime}–${shift.endTime}).` });
    }
  }

  try {
    const [created] = await db
      .insert(attendance)
      .values({ membershipId: membership.id, attendanceDate: today, status: "PRESENT", checkInAt: new Date() })
      .returning();
    res.status(201).json({ data: created });
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(409).json({ error: "You've already checked in today." });
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /member/attendance/check-out
router.patch("/attendance/check-out", async (req: AuthenticatedMemberRequest, res: Response) => {
  const library = await getDefaultLibrary();
  const { date: today } = getNowInTimezone(library.timezone);

  const membership = await getActiveMembership(req.member!.id, today);
  if (!membership) return res.status(400).json({ error: "No active membership found for today." });

  const [existing] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.membershipId, membership.id), eq(attendance.attendanceDate, today)));

  if (!existing) return res.status(400).json({ error: "You must check in before checking out." });
  if (existing.checkOutAt) return res.status(409).json({ error: "You've already checked out today." });

  const [updated] = await db
    .update(attendance)
    .set({ checkOutAt: new Date(), updatedAt: new Date() })
    .where(eq(attendance.id, existing.id))
    .returning();

  res.json({ data: updated });
});

// GET /member/attendance/history — defaults to the last 7 calendar days
// (including today), or the current calendar-month-to-date when
// ?range=month is passed. The month window intentionally resets on the 1st
// of each calendar month rather than tracking the member's membership or
// subscription start date — "this month" always means the current
// wall-clock month in the library's own timezone, not a rolling 30 days.
// Days with no attendance row are reported as absent from the array (not
// assumed absent) — a member might not have had a membership yet on an
// earlier day in the range.
const historyQuerySchema = z.object({
  range: z.enum(["7d", "month"]).default("7d"),
});

router.get("/attendance/history", async (req: AuthenticatedMemberRequest, res: Response) => {
  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const library = await getDefaultLibrary();
  const { date: today } = getNowInTimezone(library.timezone);
  const fromDate = parsed.data.range === "month" ? startOfMonth(today) : shiftDate(today, -6);

  const rows = await db
    .select({
      attendanceDate: attendance.attendanceDate,
      status: attendance.status,
      checkInAt: attendance.checkInAt,
      checkOutAt: attendance.checkOutAt,
    })
    .from(attendance)
    .innerJoin(memberships, eq(attendance.membershipId, memberships.id))
    .where(
      and(
        eq(memberships.memberId, req.member!.id),
        gte(attendance.attendanceDate, fromDate),
        lte(attendance.attendanceDate, today)
      )
    );

  res.json({ data: rows, from: fromDate, to: today });
});

export default router;
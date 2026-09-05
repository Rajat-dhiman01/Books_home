import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { seats, shifts, seatAssignments, memberships, membershipPlans, attendance } from "../db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";

const router = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const querySchema = z.object({
  date: z.string().regex(dateRegex).optional(),
  time: z.string().regex(timeRegex).optional(),
  shiftId: z.string().uuid().optional(),
});

function getNowInTimezone(timezone: string) {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  return { date, time };
}

function isTimeInShift(time: string, shift: { startTime: string; endTime: string; crossesMidnight: boolean }) {
  const t = time.length === 5 ? `${time}:00` : time;
  if (!shift.crossesMidnight) {
    return t >= shift.startTime && t < shift.endTime;
  }
  return t >= shift.startTime || t < shift.endTime;
}

// GET /availability?date=YYYY-MM-DD&time=HH:MM&shiftId=<uuid>
router.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const library = await getDefaultLibrary();
  const nowInLibraryTz = getNowInTimezone(library.timezone);
  const targetDate = parsed.data.date ?? nowInLibraryTz.date;
  const targetTime = parsed.data.time ?? nowInLibraryTz.time;

  const allShifts = await db.select().from(shifts).where(eq(shifts.isActive, true));

  let targetShifts;
  if (parsed.data.shiftId) {
    targetShifts = allShifts.filter((s) => s.id === parsed.data.shiftId);
    if (targetShifts.length === 0) {
      return res.status(400).json({ error: `No active shift found with id '${parsed.data.shiftId}'.` });
    }
  } else {
    targetShifts = allShifts.filter((s) => isTimeInShift(targetTime, s));
  }

  // All seats regardless of status, needed to render INACTIVE/MAINTENANCE seats on a seat map too.
  const allSeats = await db.select().from(seats);
  const activeSeats = allSeats.filter((s) => s.status === "ACTIVE");

  const assignmentRows = await db
    .select({
      seatId: seatAssignments.seatId,
      assignmentType: seatAssignments.assignmentType,
      planShiftId: membershipPlans.shiftId,
      attendanceStatus: attendance.status,
    })
    .from(seatAssignments)
    .innerJoin(memberships, eq(seatAssignments.membershipId, memberships.id))
    .innerJoin(membershipPlans, eq(memberships.membershipPlanId, membershipPlans.id))
    .leftJoin(
      attendance,
      and(eq(attendance.membershipId, memberships.id), eq(attendance.attendanceDate, targetDate))
    )
    .where(and(lte(seatAssignments.startDate, targetDate), gte(seatAssignments.endDate, targetDate)));

  const reservedSeatIds = new Set(
    assignmentRows.filter((r) => r.assignmentType === "RESERVED").map((r) => r.seatId)
  );

  const shiftResults = targetShifts.map((shift) => {
    const preferredBlocked = new Set(
      assignmentRows
        .filter(
          (r) =>
            r.assignmentType === "PREFERRED" &&
            r.planShiftId === shift.id &&
            r.attendanceStatus !== "ABSENT"
        )
        .map((r) => r.seatId)
    );

    const availableSeats = activeSeats.filter(
      (s) => !reservedSeatIds.has(s.id) && !preferredBlocked.has(s.id)
    );

    // Per-seat breakdown covering every seat (including inactive/maintenance),
    // needed to render a full visual seat map, not just a count.
    const seatStatuses = allSeats.map((s) => {
      let status: "AVAILABLE" | "RESERVED" | "PREFERRED_OCCUPIED" | "INACTIVE" | "MAINTENANCE";
      if (s.status === "INACTIVE") status = "INACTIVE";
      else if (s.status === "MAINTENANCE") status = "MAINTENANCE";
      else if (reservedSeatIds.has(s.id)) status = "RESERVED";
      else if (preferredBlocked.has(s.id)) status = "PREFERRED_OCCUPIED";
      else status = "AVAILABLE";

      return {
        seatId: s.id,
        seatNumber: s.seatNumber,
        name: s.name,
        floor: s.floor,
        section: s.section,
        status,
      };
    });

    return {
      shiftId: shift.id,
      shiftName: shift.name,
      totalActiveSeats: activeSeats.length,
      reservedCount: reservedSeatIds.size,
      preferredBlockedCount: preferredBlocked.size,
      availableCount: availableSeats.length,
      availableSeatIds: availableSeats.map((s) => s.id),
      seatStatuses,
    };
  });

  res.json({
    data: {
      date: targetDate,
      time: targetTime,
      shifts: shiftResults,
    },
  });
});

export default router;
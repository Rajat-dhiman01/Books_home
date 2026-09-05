import { db } from "../lib/db";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";
import {
  shifts,
  membershipPlans,
  seats,
  members,
  memberships,
  seatAssignments,
  attendance,
} from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * ONE-OFF VERIFICATION SCRIPT — Priority 1 (Session 04 context, "What Is NOT Done Yet")
 *
 * ADAPTED VERSION: reuses whatever already exists (library, shifts, plans, seat "01",
 * member "Rahul Sharma") instead of assuming an empty database. Only creates what's
 * actually missing: seat "02", a test member "Amit", and the memberships/seat_assignments/
 * attendance rows needed for the test itself. Nothing existing is deleted or duplicated.
 *
 * Idempotency: if Rahul already has a Full Day membership, the script aborts rather
 * than creating a second one, so it's safe to run more than once.
 *
 * Run from backend/ with:
 *   npx tsx src/scripts/seedPriority1.ts
 */
async function main() {
  const library = await getDefaultLibrary();
  console.log("Using existing library:", library.id, library.name);

  const allShifts = await db.select().from(shifts).where(eq(shifts.libraryId, library.id));
  const morningShift = allShifts.find((s) => s.name === "Morning");
  const fullDayShift = allShifts.find((s) => s.name === "Full Day");
  const eveningShift = allShifts.find((s) => s.name === "Evening");

  if (!morningShift || !fullDayShift || !eveningShift) {
    console.error(
      "ABORTED: expected shifts named 'Morning', 'Full Day', and 'Evening' to all exist under this library, but at least one is missing. Found:",
      allShifts.map((s) => s.name)
    );
    process.exit(1);
  }
  console.log("Using existing shifts:", { morningShift: morningShift.id, fullDayShift: fullDayShift.id, eveningShift: eveningShift.id });

  const allPlans = await db.select().from(membershipPlans).where(eq(membershipPlans.libraryId, library.id));
  const fullDayPlan = allPlans.find((p) => p.name === "Full Day");
  const morningPlan = allPlans.find((p) => p.name === "Morning");

  if (!fullDayPlan || !morningPlan) {
    console.error(
      "ABORTED: expected membership plans named 'Full Day' and 'Morning' to exist under this library, but at least one is missing. Found:",
      allPlans.map((p) => p.name)
    );
    process.exit(1);
  }
  console.log("Using existing plans:", { fullDayPlan: fullDayPlan.id, morningPlan: morningPlan.id });

  // Seat 01 must already exist (per Rajat's earlier manual testing). Seat 02 is created if missing.
  const allSeats = await db.select().from(seats).where(eq(seats.libraryId, library.id));
  const seat1 = allSeats.find((s) => s.seatNumber === "01");
  if (!seat1) {
    console.error("ABORTED: expected seat '01' to already exist under this library, but it doesn't.");
    process.exit(1);
  }

  let seat2 = allSeats.find((s) => s.seatNumber === "02");
  if (!seat2) {
    [seat2] = await db.insert(seats).values({ libraryId: library.id, seatNumber: "02" }).returning();
    console.log("Created new seat 02:", seat2.id);
  } else {
    console.log("Using existing seat 02:", seat2.id);
  }

  // Rahul must already exist (per Rajat's earlier manual testing).
  const allMembers = await db.select().from(members).where(eq(members.libraryId, library.id));
  const rahul = allMembers.find((m) => m.fullName === "Rahul Sharma");
  if (!rahul) {
    console.error("ABORTED: expected member 'Rahul Sharma' to already exist under this library, but doesn't.");
    process.exit(1);
  }

  let amit = allMembers.find((m) => m.fullName === "Amit (Priority 1 test)");
  if (!amit) {
    [amit] = await db
      .insert(members)
      .values({ libraryId: library.id, fullName: "Amit (Priority 1 test)" })
      .returning();
    console.log("Created new member Amit:", amit.id);
  } else {
    console.log("Using existing member Amit:", amit.id);
  }

  // Idempotency guard: don't create duplicate memberships if this script already ran.
  const existingRahulMemberships = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.memberId, rahul.id), eq(memberships.membershipPlanId, fullDayPlan.id)));

  if (existingRahulMemberships.length > 0) {
    console.error(
      "ABORTED: Rahul already has a Full Day membership (id: " +
        existingRahulMemberships[0].id +
        "). This script appears to have already been run. Not creating duplicates."
    );
    process.exit(1);
  }

  // --- Scenario 1: Full Day RESERVED membership for Rahul on seat 01 ---
  const [rahulMembership] = await db
    .insert(memberships)
    .values({
      memberId: rahul.id,
      membershipPlanId: fullDayPlan.id,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      status: "ACTIVE",
    })
    .returning();

  await db.insert(seatAssignments).values({
    membershipId: rahulMembership.id,
    seatId: seat1.id,
    assignmentType: "RESERVED",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  });

  console.log("Created Rahul's Full Day membership + RESERVED seat 01:", rahulMembership.id);

  // --- Scenario 2 & 3: Morning PREFERRED membership for Amit on seat 02, absent on one date only ---
  const [amitMembership] = await db
    .insert(memberships)
    .values({
      memberId: amit.id,
      membershipPlanId: morningPlan.id,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      status: "ACTIVE",
    })
    .returning();

  await db.insert(seatAssignments).values({
    membershipId: amitMembership.id,
    seatId: seat2.id,
    assignmentType: "PREFERRED",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  });

  await db.insert(attendance).values({
    membershipId: amitMembership.id,
    attendanceDate: "2026-09-10",
    status: "ABSENT",
  });

  console.log("Created Amit's Morning membership + PREFERRED seat 02, marked ABSENT on 2026-09-10:", amitMembership.id);

  console.log("\n--- SEED COMPLETE ---\n");
  console.log("Now verify against GET /availability. With the server running (npm run dev), try:\n");

  console.log("1) Full Day RESERVED blocks ALL shifts regardless of attendance (test any date in range, e.g. 2026-09-15):");
  console.log(`   Invoke-RestMethod "http://localhost:4000/availability?date=2026-09-15&shiftId=${fullDayShift.id}" | ConvertTo-Json -Depth 6`);
  console.log(`   -> expect seat ${seat1.id} (seatNumber 01) to show status RESERVED, NOT in availableSeatIds.\n`);

  console.log("2) PREFERRED blocks ONLY the Morning shift, on a date where Amit is present (e.g. 2026-09-15):");
  console.log(`   Invoke-RestMethod "http://localhost:4000/availability?date=2026-09-15&shiftId=${morningShift.id}" | ConvertTo-Json -Depth 6`);
  console.log(`   -> expect seat ${seat2.id} (seatNumber 02) to show status PREFERRED_OCCUPIED under the Morning shift.`);
  console.log(`   Then check the SAME date under a different shift:`);
  console.log(`   Invoke-RestMethod "http://localhost:4000/availability?date=2026-09-15&shiftId=${eveningShift.id}" | ConvertTo-Json -Depth 6`);
  console.log(`   -> expect seat 02 to show status AVAILABLE there.\n`);

  console.log("3) Absence frees the PREFERRED seat for THAT DATE ONLY (2026-09-10):");
  console.log(`   Invoke-RestMethod "http://localhost:4000/availability?date=2026-09-10&shiftId=${morningShift.id}" | ConvertTo-Json -Depth 6`);
  console.log(`   -> expect seat 02 AVAILABLE on 2026-09-10 (Amit marked ABSENT that day).`);
  console.log(`   Then check the day right after, 2026-09-11, same shift:`);
  console.log(`   Invoke-RestMethod "http://localhost:4000/availability?date=2026-09-11&shiftId=${morningShift.id}" | ConvertTo-Json -Depth 6`);
  console.log(`   -> expect seat 02 to be PREFERRED_OCCUPIED again.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });
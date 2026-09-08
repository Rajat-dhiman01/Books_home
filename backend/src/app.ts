import express from "express";
import cors from "cors";
import { db } from "./lib/db";
import { sql } from "drizzle-orm";
import librariesRouter from "./routes/libraries";
import shiftsRouter from "./routes/shifts";
import seatsRouter from "./routes/seats";
import membersRouter from "./routes/members";
import membershipPlansRouter from "./routes/membershipPlans";
import membershipsRouter from "./routes/memberships";
import seatAssignmentsRouter from "./routes/seatAssignments";
import availabilityRouter from "./routes/availability";
import attendanceRouter from "./routes/attendance";
import librarySettingsRouter from "./routes/librarySettings";
import memberPortalRouter from "./routes/memberPortal";
import staffRouter from "./routes/staff";
import { requireStaffAuth } from "./middleware/requireStaffAuth";

const app = express();

// CORS_ORIGIN is a comma-separated allowlist (e.g. the Vercel frontend
// URL). Falls back to allowing any origin when unset, which is fine for
// local dev but should always be set explicitly in production.
const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: (err as Error).message });
  }
});

// Staff login/session routes are mounted first and protect themselves
// internally (requireStaffAuth is applied inside staff.ts) since /staff/me
// is how the frontend checks "am I logged in" in the first place.
app.use("/staff", staffRouter);

// Every other admin/data route requires a valid staff session. Mounted
// with requireStaffAuth ahead of the actual router so nothing here is
// reachable without it.
app.use("/libraries", requireStaffAuth, librariesRouter);
app.use("/shifts", requireStaffAuth, shiftsRouter);
app.use("/seats", requireStaffAuth, seatsRouter);
app.use("/members", requireStaffAuth, membersRouter);
app.use("/membership_plans", requireStaffAuth, membershipPlansRouter);
app.use("/memberships", requireStaffAuth, membershipsRouter);
app.use("/seat_assignments", requireStaffAuth, seatAssignmentsRouter);
app.use("/availability", requireStaffAuth, availabilityRouter);
app.use("/attendance", requireStaffAuth, attendanceRouter);
app.use("/library_settings", requireStaffAuth, librarySettingsRouter);

// Member portal has its own auth (requireMemberAuth, applied inside the router).
app.use("/member", memberPortalRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

export default app;   
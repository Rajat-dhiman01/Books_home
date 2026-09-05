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

const app = express();
app.use(cors());
app.use(express.json());
app.use("/availability", availabilityRouter);

app.get("/health", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: (err as Error).message });
  }
});

app.use("/libraries", librariesRouter);
app.use("/shifts", shiftsRouter);
app.use("/seats", seatsRouter);
app.use("/members", membersRouter);
app.use("/membership_plans", membershipPlansRouter);
app.use("/memberships", membershipsRouter);
app.use("/seat_assignments", seatAssignmentsRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

export default app;
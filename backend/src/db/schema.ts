import { pgTable, uuid, varchar, text, boolean, timestamp, date, time, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const libraries = pgTable("libraries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Kolkata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  libraryId: uuid("library_id").notNull().references(() => libraries.id),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  crossesMidnight: boolean("crosses_midnight").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membershipPlans = pgTable("membership_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  libraryId: uuid("library_id").notNull().references(() => libraries.id),
  name: varchar("name", { length: 100 }).notNull(),
  shiftId: uuid("shift_id").notNull().references(() => shifts.id),
  seatReservationType: varchar("seat_reservation_type", { length: 30 }).notNull(),
  restrictCheckInToShift: boolean("restrict_check_in_to_shift").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  seatReservationCheck: check("seat_reservation_type_check", sql`${t.seatReservationType} IN ('REQUIRED','OPTIONAL','NONE')`),
}));

export const seats = pgTable("seats", {
  id: uuid("id").primaryKey().defaultRandom(),
  libraryId: uuid("library_id").notNull().references(() => libraries.id),
  seatNumber: varchar("seat_number", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }),
  floor: varchar("floor", { length: 50 }),
  section: varchar("section", { length: 50 }),
  status: varchar("status", { length: 30 }).notNull().default("ACTIVE"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusCheck: check("seat_status_check", sql`${t.status} IN ('ACTIVE','INACTIVE','MAINTENANCE')`),
}));

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  libraryId: uuid("library_id").notNull().references(() => libraries.id),
  memberCode: varchar("member_code", { length: 50 }),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  authUserId: uuid("auth_user_id").unique(),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusCheck: check("member_status_check", sql`${t.status} IN ('ACTIVE','INACTIVE')`),
}));

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id").notNull().references(() => members.id),
  membershipPlanId: uuid("membership_plan_id").notNull().references(() => membershipPlans.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("SCHEDULED"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusCheck: check("membership_status_check", sql`${t.status} IN ('SCHEDULED','ACTIVE','EXPIRED','CANCELLED')`),
  dateCheck: check("membership_date_check", sql`${t.endDate} >= ${t.startDate}`),
}));

export const seatAssignments = pgTable("seat_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id),
  seatId: uuid("seat_id").notNull().references(() => seats.id),
  assignmentType: varchar("assignment_type", { length: 30 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  typeCheck: check("assignment_type_check", sql`${t.assignmentType} IN ('RESERVED','PREFERRED')`),
  dateCheck: check("seat_assignment_date_check", sql`${t.endDate} >= ${t.startDate}`),
}));

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id),
  attendanceDate: date("attendance_date").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  checkInAt: timestamp("check_in_at", { withTimezone: true }),
  checkOutAt: timestamp("check_out_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusCheck: check("attendance_status_check", sql`${t.status} IN ('PRESENT','ABSENT')`),
}));
export const librarySettings = pgTable("library_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  libraryId: uuid("library_id").notNull().unique().references(() => libraries.id),
  openTime: time("open_time").notNull(),
  closeTime: time("close_time").notNull(),
  attendanceRequired: boolean("attendance_required").notNull().default(true),
  allowFutureMemberships: boolean("allow_future_memberships").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
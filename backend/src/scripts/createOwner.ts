import { db } from "../lib/db";
import { staffUsers } from "../db/schema";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { eq } from "drizzle-orm";

/**
 * ONE-OFF BOOTSTRAP SCRIPT — creates the first OWNER staff account.
 *
 * Every other staff account is created through POST /staff by an existing
 * owner, but the very first owner has no one to invite them — this script
 * is that one-time exception. Safe to re-run: if a staff_users row already
 * exists for the given email, it aborts instead of creating a duplicate.
 *
 * Run from backend/ with:
 *   npx tsx src/scripts/createOwner.ts "you@example.com" "a-strong-password" "Rajat Dhiman"
 */
async function main() {
  const [email, password, fullName] = process.argv.slice(2);

  if (!email || !password || !fullName) {
    console.error('Usage: npx tsx src/scripts/createOwner.ts "email" "password" "Full Name"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ABORTED: password must be at least 8 characters.");
    process.exit(1);
  }

  const library = await getDefaultLibrary();

  const existing = await db.select().from(staffUsers).where(eq(staffUsers.email, email));
  if (existing.length > 0) {
    console.error(`ABORTED: a staff account for ${email} already exists (id: ${existing[0].id}).`);
    process.exit(1);
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error("ABORTED: could not create the Supabase Auth user:", error?.message);
    process.exit(1);
  }

  const [staff] = await db
    .insert(staffUsers)
    .values({ libraryId: library.id, authUserId: data.user.id, email, fullName, role: "OWNER" })
    .returning();

  console.log("Owner account created:");
  console.log("  staff_users id:", staff.id);
  console.log("  email:", staff.email);
  console.log("  role:", staff.role);
  console.log("\nYou can now log in at /staff/login with this email and password.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
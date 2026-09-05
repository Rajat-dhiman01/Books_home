import { db } from "./db";
import { libraries } from "../db/schema";

/**
 * Resolves the single library row for this single-branch deployment.
 * Throws if zero or more than one library exists, so a real error
 * surfaces immediately rather than silently picking the wrong one.
 */
export async function getDefaultLibrary() {
  const rows = await db.select().from(libraries);

  if (rows.length === 0) {
    throw new Error(
      "No library exists yet. Create a library row before creating shifts, seats, members, or plans."
    );
  }

  if (rows.length > 1) {
    throw new Error(
      "Multiple libraries exist, but this backend assumes a single library. " +
        "Explicit library_id handling is required before adding a second branch."
    );
  }

  return rows[0];
}
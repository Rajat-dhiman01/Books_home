import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { librarySettings } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDefaultLibrary } from "../lib/getDefaultLibrary";
import { isUniqueViolation } from "../lib/errors";

const router = Router();

const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const settingsSchema = z.object({
  openTime: z.string().regex(timeRegex, "Expected HH:MM or HH:MM:SS"),
  closeTime: z.string().regex(timeRegex, "Expected HH:MM or HH:MM:SS"),
  attendanceRequired: z.boolean(),
  allowFutureMemberships: z.boolean(),
});

const updateSettingsSchema = settingsSchema.partial();

const DEFAULTS = {
  openTime: "08:00",
  closeTime: "21:00",
  attendanceRequired: true,
  allowFutureMemberships: true,
};

// Looks up the settings row for a library, creating it with defaults if it
// doesn't exist yet. Handles the race where two requests both find no row
// and both try to insert (unique constraint on libraryId) by falling back
// to a re-select on conflict, rather than erroring.
async function getOrCreateSettings(libraryId: string) {
  const existing = await db
    .select()
    .from(librarySettings)
    .where(eq(librarySettings.libraryId, libraryId));

  if (existing.length > 0) return existing[0];

  try {
    const [created] = await db
      .insert(librarySettings)
      .values({ libraryId, ...DEFAULTS })
      .returning();
    return created;
  } catch (err) {
    if (isUniqueViolation(err)) {
      const rows = await db
        .select()
        .from(librarySettings)
        .where(eq(librarySettings.libraryId, libraryId));
      return rows[0];
    }
    throw err;
  }
}

// GET /library_settings
router.get("/", async (req, res) => {
  try {
    const library = await getDefaultLibrary();
    const settings = await getOrCreateSettings(library.id);
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /library_settings
router.patch("/", async (req, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const library = await getDefaultLibrary();
    await getOrCreateSettings(library.id); // ensure a row exists before updating

    const [updated] = await db
      .update(librarySettings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(librarySettings.libraryId, library.id))
      .returning();

    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
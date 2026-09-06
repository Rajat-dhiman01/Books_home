CREATE TABLE "library_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"library_id" uuid NOT NULL,
	"open_time" time NOT NULL,
	"close_time" time NOT NULL,
	"attendance_required" boolean DEFAULT true NOT NULL,
	"allow_future_memberships" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_settings_library_id_unique" UNIQUE("library_id")
);
--> statement-breakpoint
ALTER TABLE "library_settings" ADD CONSTRAINT "library_settings_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE no action ON UPDATE no action;
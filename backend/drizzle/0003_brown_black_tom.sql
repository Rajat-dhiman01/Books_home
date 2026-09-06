ALTER TABLE "members" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "membership_plans" ADD COLUMN "restrict_check_in_to_shift" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_auth_user_id_unique" UNIQUE("auth_user_id");
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"library_id" uuid NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"role" varchar(20) DEFAULT 'ADMIN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "staff_role_check" CHECK ("staff_users"."role" IN ('OWNER','ADMIN'))
);
--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_library_id_libraries_id_fk" FOREIGN KEY ("library_id") REFERENCES "public"."libraries"("id") ON DELETE no action ON UPDATE no action;
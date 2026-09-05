-- Custom SQL migration file, put your code below! --
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE seat_assignments
ADD CONSTRAINT no_overlapping_reserved_seat_assignments
EXCLUDE USING gist (
    seat_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
)
WHERE (assignment_type = 'RESERVED');
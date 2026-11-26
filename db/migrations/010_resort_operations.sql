-- Operational configuration only. Financial history and allocations are unchanged.
ALTER TABLE reservation_settings ADD COLUMN resort_name text NOT NULL DEFAULT '', ADD COLUMN resort_address text NOT NULL DEFAULT '', ADD COLUMN resort_phone text NOT NULL DEFAULT '', ADD COLUMN resort_email text NOT NULL DEFAULT '', ADD COLUMN operating_hours text NOT NULL DEFAULT '';
CREATE INDEX bookings_guest_email_history ON bookings(lower(guest_email),created_at DESC);

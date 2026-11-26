-- Additive: old reservation numbers, statuses, history and permissions stay intact.
-- Legacy rows receive a public reference only through authenticated guest/staff access.
ALTER TABLE bookings ADD COLUMN public_tracking_reference text;
ALTER TABLE bookings ADD CONSTRAINT bookings_public_tracking_format
 CHECK (public_tracking_reference ~ '^PDJT-[A-F0-9]{48}$');
CREATE UNIQUE INDEX bookings_public_tracking_unique ON bookings(public_tracking_reference)
 WHERE public_tracking_reference IS NOT NULL;

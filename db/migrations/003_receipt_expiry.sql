ALTER TABLE bookings ADD COLUMN receipt_expires_at timestamptz NOT NULL DEFAULT (now()+interval '1 day');

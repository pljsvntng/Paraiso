-- New requests are independent of the historical payment workflow.
-- Existing rows and financial records deliberately remain unchanged.
ALTER TABLE bookings
 ADD COLUMN reservation_only boolean NOT NULL DEFAULT false,
 ADD COLUMN guest_address text NOT NULL DEFAULT '',
 ADD COLUMN additional_phone text NOT NULL DEFAULT '',
 ADD COLUMN reservation_channel text NOT NULL DEFAULT 'WEBSITE'
   CHECK (reservation_channel IN ('WEBSITE','WALK_IN','TELEPHONE','STAFF')),
 ADD COLUMN decline_reason text,
 ADD COLUMN reviewed_by uuid REFERENCES users(id),
 ADD COLUMN reviewed_at timestamptz;
ALTER TABLE bookings ADD CONSTRAINT reservation_request_no_payment_hold
 CHECK (NOT reservation_only OR (hold_expires_at IS NULL AND
 COALESCE(workflow_status,'') NOT IN ('PENDING_PAYMENT','PENDING_VERIFICATION')));
CREATE INDEX bookings_request_review ON bookings(workflow_status,created_at)
 WHERE reservation_only;

ALTER TABLE booking_items ADD COLUMN special_requests text NOT NULL DEFAULT '';

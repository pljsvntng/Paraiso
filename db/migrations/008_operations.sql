-- Additive only. Existing financial history and booking snapshots are retained.
ALTER TABLE payments ADD COLUMN provider_paid_at timestamptz;
ALTER TABLE bookings DROP CONSTRAINT bookings_workflow_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_workflow_status_check CHECK(workflow_status IN ('PENDING_PAYMENT','PENDING_VERIFICATION','PENDING_APPROVAL','CONFIRMED','CANCELLED','DECLINED','EXPIRED','COMPLETED'));
-- Physical day-use inventory (e.g. owner-approved cottages) shares the existing unit table.
ALTER TABLE accommodation_types ADD COLUMN unit_inventory boolean NOT NULL DEFAULT false;
ALTER TABLE booking_units ADD COLUMN slot_start time;
ALTER TABLE booking_units ADD COLUMN duration_minutes integer CHECK(duration_minutes>0);
ALTER TABLE booking_units ADD CONSTRAINT unit_session_duration CHECK(slot_start IS NULL OR duration_minutes IS NOT NULL);
DO $$ DECLARE constraint_name text; BEGIN
 SELECT conname INTO constraint_name FROM pg_constraint WHERE conrelid='booking_units'::regclass AND contype='x';
 IF constraint_name IS NOT NULL THEN EXECUTE format('ALTER TABLE booking_units DROP CONSTRAINT %I',constraint_name); END IF;
END $$;
ALTER TABLE booking_units ADD CONSTRAINT booking_unit_time_exclusion EXCLUDE USING gist (
 unit_id WITH =,
 tsrange(check_in_date+COALESCE(slot_start,'00:00'::time),
 CASE WHEN slot_start IS NULL THEN check_out_date::timestamp ELSE check_in_date+slot_start+duration_minutes*interval '1 minute' END,'[)') WITH &&
) WHERE(active);
COMMENT ON COLUMN payments.received_at IS 'Actual independently verified transaction time; financial reporting date.';
COMMENT ON COLUMN payments.provider_paid_at IS 'Authoritative PayMongo paid_at; NULL for historical/unreconciled and manual receipts.';
COMMENT ON COLUMN payments.created_at IS 'Ledger ingestion time, not the financial receipt date.';
COMMENT ON COLUMN bookings.adult_count IS 'For carts, representative first-service count only. Use booking_items for per-service attendance; never infer unique visitors.';
CREATE INDEX payments_received_date ON payments(received_at);
ALTER TABLE reservation_settings ADD COLUMN privacy_policy text NOT NULL DEFAULT '';
ALTER TABLE reservation_settings ADD COLUMN rescheduling_policy text NOT NULL DEFAULT '';
ALTER TABLE reservation_settings ADD COLUMN policy_version integer NOT NULL DEFAULT 1;
ALTER TABLE reservation_settings ADD COLUMN policies_published_at timestamptz;
ALTER TABLE bookings ADD COLUMN balance_due_at timestamptz;
ALTER TABLE bookings ADD COLUMN balance_reminder_sent_at timestamptz;
ALTER TABLE reservation_settings ADD COLUMN balance_reminder_days integer CHECK(balance_reminder_days BETWEEN 1 AND 30);
CREATE TABLE booking_change_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id),
 request_key uuid NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('RESCHEDULE','CANCEL')),
 message text NOT NULL, proposed_items jsonb, state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','APPROVED','REJECTED')),
 response text, reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_pending_booking_change ON booking_change_requests(booking_id) WHERE state='PENDING';
CREATE TABLE service_rate_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES accommodation_types(id),
 name text NOT NULL, start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>start_date),
 weekdays integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6] CHECK(cardinality(weekdays)>0 AND weekdays <@ ARRAY[0,1,2,3,4,5,6]),
 price_centavos bigint NOT NULL CHECK(price_centavos BETWEEN 0 AND 1000000000),
 child_price_centavos bigint CHECK(child_price_centavos BETWEEN 0 AND 1000000000),
 priority integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, created_by uuid REFERENCES users(id)
);
CREATE INDEX service_rates_lookup ON service_rate_periods(product_id,start_date,end_date,priority DESC) WHERE active;
CREATE TABLE operational_worker_runs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz, state text NOT NULL DEFAULT 'RUNNING' CHECK(state IN ('RUNNING','DONE','FAILED')),
 processed integer NOT NULL DEFAULT 0, error_code text
);
CREATE TABLE booking_staff_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id),
 request_key uuid NOT NULL UNIQUE, note text NOT NULL, created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_staff_notes_booking ON booking_staff_notes(booking_id,created_at);

-- An explicitly free reservation has no outstanding payment requirement.
CREATE OR REPLACE VIEW booking_financials AS
WITH balances AS (
 SELECT b.id booking_id,
  CASE WHEN b.is_cart THEN b.total_centavos ELSE (b.total_amount*100)::bigint END total,
  CASE WHEN b.is_cart THEN b.deposit_centavos ELSE 0 END required_deposit,
  COALESCE(p.paid,0)::bigint paid, COALESCE(p.refunds,0)::bigint refunds,
  COALESCE(p.paid,0)::bigint-COALESCE(p.refunds,0)::bigint net,
  claim.state claim_state, attempt.state attempt_state, attempt.last_error
 FROM bookings b
 LEFT JOIN LATERAL (SELECT sum(amount*100) FILTER(WHERE kind='PAYMENT') paid,sum(amount*100) FILTER(WHERE kind='REFUND') refunds FROM payments WHERE booking_id=b.id) p ON true
 LEFT JOIN LATERAL (SELECT state FROM payment_claims WHERE booking_id=b.id ORDER BY created_at DESC LIMIT 1) claim ON true
 LEFT JOIN LATERAL (SELECT state,last_error FROM checkout_attempts WHERE booking_id=b.id ORDER BY created_at DESC LIMIT 1) attempt ON true
)
SELECT booking_id,total,required_deposit,paid,refunds,net,
 CASE WHEN total IS NULL THEN NULL ELSE GREATEST(0,total-net) END remaining,
 CASE WHEN required_deposit IS NULL THEN NULL ELSE GREATEST(0,required_deposit-net) END deposit_remaining,
 CASE WHEN refunds>0 THEN CASE WHEN net=0 THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END
 WHEN paid>0 THEN CASE WHEN total IS NOT NULL AND net>=total THEN 'PAID' ELSE 'PARTIALLY_PAID' END
 WHEN total=0 AND net=0 THEN 'NOT_REQUIRED'
 WHEN claim_state='UNDER_VERIFICATION' THEN 'UNDER_VERIFICATION'
 WHEN last_error='PAYMENT_ATTEMPT_FAILED' OR attempt_state='FAILED' THEN 'FAILED'
 WHEN attempt_state IN ('OPEN','CREATING','UNCERTAIN') THEN 'PENDING'
 WHEN claim_state='REJECTED' THEN 'REJECTED' ELSE 'UNPAID' END payment_status
FROM balances;

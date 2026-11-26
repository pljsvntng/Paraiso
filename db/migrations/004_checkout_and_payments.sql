ALTER TABLE accommodation_types DROP CONSTRAINT accommodation_types_category_check;
ALTER TABLE accommodation_types ADD CONSTRAINT accommodation_types_category_check CHECK(category IN ('ACCOMMODATION','SWIMMING','ACTIVITY','DINING','DAY_TOUR','PACKAGE'));
ALTER TABLE accommodation_types ADD COLUMN deposit_mode text NOT NULL DEFAULT 'UNCONFIGURED' CHECK(deposit_mode IN ('UNCONFIGURED','NONE','PERCENT','FIXED','FULL'));
ALTER TABLE accommodation_types ADD COLUMN deposit_value integer CHECK(deposit_value>=0);
ALTER TABLE accommodation_types ADD COLUMN amenities jsonb NOT NULL DEFAULT '[]';
ALTER TABLE accommodation_types ADD COLUMN restrictions text NOT NULL DEFAULT '';
ALTER TABLE accommodation_types ADD COLUMN duration_minutes integer CHECK(duration_minutes>0);
ALTER TABLE accommodation_types ADD COLUMN equipment_count integer CHECK(equipment_count>0);
ALTER TABLE accommodation_types ADD COLUMN min_age integer CHECK(min_age>=0);
ALTER TABLE accommodation_types ADD COLUMN child_price numeric(12,2) CHECK(child_price>=0);
ALTER TABLE accommodation_types ADD COLUMN resource_group text NOT NULL DEFAULT '';
ALTER TABLE accommodation_types ADD COLUMN exclusive boolean NOT NULL DEFAULT false;
ALTER TABLE accommodation_types ADD COLUMN photos jsonb NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN can_verify_payments boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN is_cart boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN workflow_status text CHECK(workflow_status IN ('PENDING_PAYMENT','PENDING_VERIFICATION','PENDING_APPROVAL','CONFIRMED','CANCELLED','EXPIRED','COMPLETED'));
ALTER TABLE bookings ADD COLUMN total_centavos bigint CHECK(total_centavos>=0 AND total_centavos<=1000000000000);
ALTER TABLE bookings ADD COLUMN deposit_centavos bigint CHECK(deposit_centavos>=0 AND deposit_centavos<=1000000000000);
ALTER TABLE bookings ADD COLUMN hold_expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN reconciliation_required boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN policy_snapshot jsonb;
ALTER TABLE bookings ADD COLUMN reminder_sent_at timestamptz;
CREATE INDEX booking_holds_due ON bookings(hold_expires_at) WHERE hold_expires_at IS NOT NULL;
CREATE TABLE booking_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES accommodation_types(id), name text NOT NULL, category text NOT NULL, overnight boolean NOT NULL,
 check_in_date date NOT NULL, check_out_date date NOT NULL CHECK(check_out_date>check_in_date), slot text NOT NULL DEFAULT '',
 adult_count integer NOT NULL CHECK(adult_count>0), child_count integer NOT NULL CHECK(child_count>=0), units_count integer NOT NULL CHECK(units_count>0),
 total_centavos bigint CHECK(total_centavos>=0), deposit_centavos bigint CHECK(deposit_centavos>=0),
 price_snapshot jsonb NOT NULL, exclusive boolean NOT NULL DEFAULT false, resource_group text NOT NULL DEFAULT '',
 allocated boolean NOT NULL DEFAULT false
);
CREATE INDEX booking_items_capacity ON booking_items(product_id,check_in_date,check_out_date,slot) WHERE allocated;
ALTER TABLE booking_units DROP CONSTRAINT booking_units_pkey;
ALTER TABLE booking_units ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE booking_units ADD COLUMN item_id uuid REFERENCES booking_items(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX booking_units_legacy_unique ON booking_units(booking_id,unit_id) WHERE item_id IS NULL;
CREATE UNIQUE INDEX booking_units_item_unique ON booking_units(item_id,unit_id) WHERE item_id IS NOT NULL;
CREATE TABLE booking_reference_counters(year integer PRIMARY KEY, value bigint NOT NULL);
CREATE TABLE reservation_settings (
 id integer PRIMARY KEY CHECK(id=1), hold_minutes integer CHECK(hold_minutes BETWEEN 5 AND 1440),
 auto_confirm boolean NOT NULL DEFAULT false, terms text NOT NULL DEFAULT '', cancellation_policy text NOT NULL DEFAULT '',
 gateway_enabled boolean NOT NULL DEFAULT false, gateway_methods jsonb NOT NULL DEFAULT '[]', reminder_days integer CHECK(reminder_days BETWEEN 1 AND 30)
);
INSERT INTO reservation_settings(id) VALUES(1);
CREATE TABLE receiving_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), method text NOT NULL CHECK(method IN ('GCASH','MAYA')),
 account_name text NOT NULL, account_number text NOT NULL, instructions text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT false,
 qr_image bytea, qr_mime text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id),
 account_id uuid NOT NULL REFERENCES receiving_accounts(id), method text NOT NULL CHECK(method IN ('GCASH','MAYA')),
 transaction_reference text NOT NULL, normalized_reference text NOT NULL, claimed_centavos bigint NOT NULL CHECK(claimed_centavos>0),
 transferred_at timestamptz NOT NULL, state text NOT NULL DEFAULT 'UNDER_VERIFICATION' CHECK(state IN ('UNDER_VERIFICATION','VERIFIED','REJECTED')),
 proof_image bytea, proof_mime text, verification_note text, verified_by uuid REFERENCES users(id), verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX verified_transfer_unique ON payment_claims(method,normalized_reference) WHERE state='VERIFIED';
CREATE INDEX claims_review ON payment_claims(state,created_at);
CREATE TABLE checkout_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id),
 expected_centavos bigint NOT NULL CHECK(expected_centavos>0), provider_session_id text UNIQUE,
 checkout_url text, mode text NOT NULL CHECK(mode IN ('test','live')), state text NOT NULL CHECK(state IN ('CREATING','OPEN','UNCERTAIN','PAID','EXPIRED','FAILED')),
 last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_checkout ON checkout_attempts(booking_id) WHERE state IN ('CREATING','OPEN','UNCERTAIN');
ALTER TABLE payments ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE payments ADD COLUMN external_key text UNIQUE;
ALTER TABLE payments ADD COLUMN method text;
ALTER TABLE payments ADD COLUMN transaction_reference text;
ALTER TABLE payments ADD COLUMN claim_id uuid UNIQUE REFERENCES payment_claims(id);
ALTER TABLE payments ADD COLUMN checkout_attempt_id uuid REFERENCES checkout_attempts(id);
ALTER TABLE payments ADD COLUMN received_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE provider_events (
 event_key text PRIMARY KEY, session_id text NOT NULL, event_type text NOT NULL, result text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE guest_access_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL, token_encrypted text NOT NULL, expires_at timestamptz NOT NULL,
 consumed_at timestamptz, sent_at timestamptz, attempts integer NOT NULL DEFAULT 0, last_error text
);
CREATE TABLE guest_booking_sessions (
 token_hash text PRIMARY KEY, booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE TABLE booking_charges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id),
 item_id uuid REFERENCES booking_items(id), source text NOT NULL DEFAULT 'RESERVATION',
 external_key text UNIQUE NOT NULL, description text NOT NULL, amount_centavos bigint NOT NULL CHECK(amount_centavos>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);

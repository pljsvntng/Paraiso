CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, email text UNIQUE NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('ADMIN','STAFF')), active boolean NOT NULL DEFAULT true,
 can_approve boolean NOT NULL DEFAULT false, can_export boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE accommodation_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, name text NOT NULL, description text NOT NULL DEFAULT '',
 category text NOT NULL CHECK(category IN ('ACCOMMODATION','DAY_TOUR','ACTIVITY','PACKAGE')), overnight boolean NOT NULL,
 min_guests integer NOT NULL DEFAULT 1 CHECK(min_guests>0), max_guests integer CHECK(max_guests>=min_guests),
 day_capacity integer CHECK(day_capacity>0), price numeric(12,2) CHECK(price>=0), price_basis text NOT NULL DEFAULT 'UNIT' CHECK(price_basis IN ('UNIT','PERSON')),
 image text, slots jsonb NOT NULL DEFAULT '[]', active boolean NOT NULL DEFAULT false
);
CREATE TABLE accommodation_units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), accommodation_type_id uuid NOT NULL REFERENCES accommodation_types(id),
 unit_identifier text NOT NULL, active boolean NOT NULL DEFAULT true, UNIQUE(accommodation_type_id,unit_identifier)
);
CREATE TABLE addons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, price numeric(12,2) CHECK(price>=0), active boolean NOT NULL DEFAULT true);
CREATE TABLE bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference_number text UNIQUE NOT NULL, receipt_hash text NOT NULL,
 request_key uuid UNIQUE NOT NULL, request_hash text NOT NULL, guest_name text NOT NULL, guest_email text NOT NULL, guest_phone text NOT NULL,
 product_id uuid NOT NULL REFERENCES accommodation_types(id), product_name text NOT NULL, booking_category text NOT NULL,
 check_in_date date NOT NULL, check_out_date date NOT NULL CHECK(check_out_date>check_in_date), slot text NOT NULL DEFAULT '',
 adult_count integer NOT NULL CHECK(adult_count>0), child_count integer NOT NULL CHECK(child_count>=0), units_count integer NOT NULL CHECK(units_count>0),
 total_amount numeric(12,2) CHECK(total_amount>=0), status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','DECLINED','CANCELLED','CHECKED_IN','CHECKED_OUT')),
 special_requests text NOT NULL DEFAULT '', source text NOT NULL CHECK(source IN ('WEBSITE','MANUAL')), consent_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_dates_status ON bookings(status,check_in_date,check_out_date);
CREATE INDEX bookings_product ON bookings(product_id,check_in_date,check_out_date);
CREATE INDEX bookings_created ON bookings(created_at DESC);
CREATE TABLE booking_units (
 booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE, unit_id uuid NOT NULL REFERENCES accommodation_units(id),
 check_in_date date NOT NULL, check_out_date date NOT NULL CHECK(check_out_date>check_in_date), active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(booking_id,unit_id),
 EXCLUDE USING gist (unit_id WITH =, daterange(check_in_date,check_out_date,'[)') WITH &&) WHERE (active)
);
CREATE TABLE booking_addons (booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE, addon_id uuid REFERENCES addons(id), name text NOT NULL, price numeric(12,2), PRIMARY KEY(booking_id,addon_id));
CREATE TABLE blocked_dates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES accommodation_types(id), unit_id uuid REFERENCES accommodation_units(id),
 start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>start_date), slot text NOT NULL DEFAULT '', reason text NOT NULL DEFAULT '', created_by uuid REFERENCES users(id)
);
CREATE INDEX blocked_dates_product ON blocked_dates(product_id,start_date,end_date);
CREATE TABLE booking_activity_logs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
 action text NOT NULL, previous_status text, new_status text, performed_by uuid REFERENCES users(id), timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 amount numeric(12,2) NOT NULL CHECK(amount>0), kind text NOT NULL CHECK(kind IN ('PAYMENT','REFUND')), note text NOT NULL DEFAULT '', recorded_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notification_reads (user_id uuid REFERENCES users(id) ON DELETE CASCADE, notification_id bigint REFERENCES notifications(id) ON DELETE CASCADE, PRIMARY KEY(user_id,notification_id));
CREATE TABLE integration_settings (id integer PRIMARY KEY CHECK(id=1), drive_id text NOT NULL DEFAULT '', workbook_id text NOT NULL DEFAULT '', table_name text NOT NULL DEFAULT '', token_encrypted text, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO integration_settings(id) VALUES(1);
CREATE TABLE integration_jobs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('EXCEL','GUEST_EMAIL','STAFF_EMAIL')), event_version integer NOT NULL, event_status text NOT NULL,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','DONE','FAILED','NOT_CONFIGURED')), attempts integer NOT NULL DEFAULT 0,
 last_error text, next_attempt_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(booking_id,kind,event_version)
);
CREATE INDEX integration_jobs_due ON integration_jobs(state,next_attempt_at);

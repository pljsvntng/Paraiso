CREATE INDEX booking_items_booking ON booking_items(booking_id);
CREATE INDEX payments_booking ON payments(booking_id);
CREATE INDEX claims_booking_latest ON payment_claims(booking_id,created_at DESC);
CREATE INDEX attempts_booking_latest ON checkout_attempts(booking_id,created_at DESC);
CREATE INDEX guest_sessions_expiry ON guest_booking_sessions(expires_at);
CREATE INDEX service_resource_group ON accommodation_types(resource_group) WHERE resource_group<>'';
CREATE VIEW booking_financials AS
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
 WHEN claim_state='UNDER_VERIFICATION' THEN 'UNDER_VERIFICATION'
 WHEN last_error='PAYMENT_ATTEMPT_FAILED' OR attempt_state='FAILED' THEN 'FAILED'
 WHEN attempt_state IN ('OPEN','CREATING','UNCERTAIN') THEN 'PENDING'
 WHEN claim_state='REJECTED' THEN 'REJECTED' ELSE 'UNPAID' END payment_status
FROM balances;

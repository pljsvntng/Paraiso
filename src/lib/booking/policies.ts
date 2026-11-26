import { db } from "./db";
export const policyPages = {
  privacy: { title: "Privacy Policy", column: "privacy_policy" },
  terms: { title: "Terms and Conditions", column: "terms" },
  cancellation: {
    title: "Cancellation and Refund Policy",
    column: "cancellation_policy",
  },
  rescheduling: {
    title: "Reservation and Rescheduling Policy",
    column: "rescheduling_policy",
  },
} as const;
export async function publishedPolicies() {
  if (!process.env.DATABASE_URL) return null;
  try {
    return (
      (
        await db().query(
          "SELECT terms,cancellation_policy,privacy_policy,rescheduling_policy,policy_version,policies_published_at FROM reservation_settings WHERE id=1",
        )
      ).rows[0] || null
    );
  } catch {
    return null;
  }
}

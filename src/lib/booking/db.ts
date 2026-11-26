import { Pool, types, type PoolClient } from "pg";
import { demoConfiguration, demoRequested } from "./demo-mode";
types.setTypeParser(1082, (value) => value);
types.setTypeParser(1700, Number);
const globalDb = globalThis as unknown as { bookingPool?: Pool };
export function db() {
  if (demoRequested()) demoConfiguration();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  return (globalDb.bookingPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
  }));
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='30s'; SET LOCAL idle_in_transaction_session_timeout='60s'",
    );
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  overnight: boolean;
  active: boolean;
  min_guests: number;
  max_guests: number | null;
  day_capacity: number | null;
  price: number | null;
  price_basis: "UNIT" | "PERSON";
  slots: string[];
  image: string | null;
  deposit_mode: "UNCONFIGURED" | "NONE" | "PERCENT" | "FIXED" | "FULL";
  deposit_value: number | null;
  child_price: number | null;
  amenities: string[];
  restrictions: string;
  photos: string[];
  duration_minutes: number | null;
  equipment_count: number | null;
  min_age: number | null;
  resource_group: string;
  exclusive: boolean;
  unit_inventory?: boolean;
};
export type Staff = {
  id: string;
  full_name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  can_approve: boolean;
  can_export: boolean;
  can_verify_payments?: boolean;
};

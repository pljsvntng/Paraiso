import { randomUUID } from "node:crypto";
import { db, transaction, type Staff } from "../../src/lib/booking/db";
import { assertDemoTarget } from "../../src/lib/booking/demo-mode";
import { saveProduct, saveUnit } from "../../src/lib/booking/inventory";
import { hashPassword } from "../../src/lib/booking/security";
import {
  operationalSettings,
  saveOperationalSettings,
} from "../../src/lib/booking/operations";
import { createCart, type CartItem } from "../../src/lib/booking/cart";
import { updateBooking } from "../../src/lib/booking/service";
import { manilaDate } from "../../src/lib/dates";
import { demoCatalog } from "./catalog";
import { migrate } from "../booking-admin";

async function own(kind: string, key: string, id: string) {
  await db().query(
    "INSERT INTO paraiso_demo.records(kind,key,id) VALUES($1,$2,$3) ON CONFLICT(kind,key) DO UPDATE SET id=EXCLUDED.id",
    [kind, key, id],
  );
}
export async function setupDemo() {
  await assertDemoTarget(db());
  await migrate();
  for (const [role, email, password] of [
    ["ADMIN", process.env.DEMO_ADMIN_EMAIL, process.env.DEMO_ADMIN_PASSWORD],
    ["STAFF", process.env.DEMO_STAFF_EMAIL, process.env.DEMO_STAFF_PASSWORD],
  ]) {
    if (!email?.endsWith("@example.test") || !password)
      throw new Error(
        "Configure separate DEMO_ADMIN and DEMO_STAFF credentials with @example.test emails.",
      );
    const prior = (
      await db().query("SELECT id FROM users WHERE email=$1", [email])
    ).rows[0];
    if (prior) {
      if (
        !(
          await db().query(
            "SELECT 1 FROM paraiso_demo.records WHERE kind='user' AND id=$1",
            [prior.id],
          )
        ).rowCount
      )
        throw new Error(
          "An unmarked account already uses that email. It was preserved.",
        );
    } else {
      const row = (
        await db().query(
          "INSERT INTO users(full_name,email,password_hash,role,can_approve,can_export) VALUES($1,$2,$3,$4,true,true) RETURNING id",
          [
            `DEMO ${role === "ADMIN" ? "Administrator" : "Resort Staff"}`,
            email,
            await hashPassword(password),
            role,
          ],
        )
      ).rows[0];
      await own("user", email, row.id);
    }
  }
  const admin = (
    await db().query<Staff>("SELECT * FROM users WHERE email=$1", [
      process.env.DEMO_ADMIN_EMAIL,
    ])
  ).rows[0];
  const settings = await operationalSettings();
  if (
    !(
      await db().query(
        "SELECT 1 FROM paraiso_demo.records WHERE kind='settings' AND id='1'",
      )
    ).rowCount
  ) {
    if (settings.terms || settings.privacy_policy)
      throw new Error(
        "Unmarked reservation policies were preserved. Refusing to replace them.",
      );
    await saveOperationalSettings(
      {
        version: settings.policy_version,
        resortName: "DEMO — Paraiso presentation",
        resortAddress:
          "DEMO DATA — use the existing public contact page for verified location",
        resortPhone: "",
        resortEmail: "demo-resort@example.test",
        operatingHours:
          "DEMO DATA: 09:00–19:00; sample check-in 14:00, check-out 12:00. Not approved operating hours.",
        terms:
          "DEMO DATA ONLY. Software presentation using fictional guests. No real visit, room, seat or payment is promised. All rates, capacities and schedules are illustrative, pending client approval.",
        cancellationPolicy:
          "DEMO DATA ONLY. Presentation records may be cancelled or reset. No money is collected. This is not the resort's approved cancellation policy.",
        privacyPolicy:
          "DEMO DATA ONLY. Enter fictional names starting DEMO and @example.test emails. Data stays in the isolated local presentation database. Emails and remote spreadsheet sync are disabled.",
        reschedulingPolicy:
          "DEMO DATA ONLY. Staff may move sample dates after checking demo inventory. This is not an approved resort policy.",
        reminderDays: null,
      },
      admin,
    );
    await own("settings", "1", "1");
  }
  const ids = new Map<string, string>();
  for (const entry of demoCatalog) {
    const prior = (
      await db().query("SELECT id FROM accommodation_types WHERE slug=$1", [
        entry.values.slug,
      ])
    ).rows[0];
    if (
      prior &&
      !(
        await db().query(
          "SELECT 1 FROM paraiso_demo.records WHERE kind='product' AND id=$1",
          [prior.id],
        )
      ).rowCount
    )
      throw new Error(
        "An unmarked catalog record was preserved. Demo setup cannot replace it.",
      );
    const product = await saveProduct(
      { ...entry.values, ...(prior ? { id: prior.id } : {}) },
      admin,
    );
    ids.set(entry.values.slug, product.id);
    await own("product", entry.values.slug, product.id);
    for (let i = 1; i <= entry.unitCount; i++) {
      const identifier = `DEMO-${entry.unitPrefix}-${String(i).padStart(2, "0")}`;
      const priorUnit = (
        await db().query(
          "SELECT id FROM accommodation_units WHERE accommodation_type_id=$1 AND unit_identifier=$2",
          [product.id, identifier],
        )
      ).rows[0];
      if (
        priorUnit &&
        !(
          await db().query(
            "SELECT 1 FROM paraiso_demo.records WHERE kind='unit' AND id=$1",
            [priorUnit.id],
          )
        ).rowCount
      )
        throw new Error(
          "Unmarked unit identity collision. Nothing was overwritten.",
        );
      await saveUnit(
        { productId: product.id, identifier, active: true },
        admin,
      );
      await own(
        "unit",
        identifier,
        (
          await db().query(
            "SELECT id FROM accommodation_units WHERE accommodation_type_id=$1 AND unit_identifier=$2",
            [product.id, identifier],
          )
        ).rows[0].id,
      );
    }
  }
  const day = new Date(Date.parse(manilaDate()) + 86400000)
    .toISOString()
    .slice(0, 10);
  const item = (slug: string, slot = ""): CartItem => ({
    productId: ids.get(slug)!,
    checkIn: day,
    checkOut: new Date(Date.parse(day) + 86400000).toISOString().slice(0, 10),
    adults: 2,
    children: 0,
    units: 1,
    slot,
    restrictionsAccepted: true,
    participantsMeetAge: true,
  });
  const scenarios = [
    {
      key: "accommodation",
      name: "Accommodation",
      items: [item("family-deluxe")],
      status: "PENDING",
    },
    {
      key: "swimming",
      name: "Swimming",
      items: [{ ...item("demo-day-swimming", "09:00"), children: 1 }],
      status: "CONFIRMED",
    },
    {
      key: "adventure",
      name: "Adventure",
      items: [item("atv", "10:30")],
      status: "DECLINED",
    },
    {
      key: "combined",
      name: "Combined Reservation",
      items: [
        item("family-deluxe"),
        item("demo-day-swimming", "13:00"),
        item("skywalk", "13:00"),
        item("demo-dining", "12:30"),
      ],
      status: "CONFIRMED",
    },
    {
      key: "dining",
      name: "Dining",
      items: [item("demo-dining", "17:00")],
      status: "PENDING",
    },
  ];
  for (const scenario of scenarios) {
    if (
      (
        await db().query(
          "SELECT 1 FROM paraiso_demo.records r JOIN bookings b ON b.id::text=r.id WHERE kind='scenario' AND key=$1",
          [scenario.key],
        )
      ).rowCount
    )
      continue;
    const created = await createCart(
      {
        items: scenario.items,
        guestName: `DEMO Guest — ${scenario.name}`,
        guestEmail: `demo-${scenario.key}@example.test`,
        guestPhone: "09170000000",
        notes: "DEMO DATA ONLY. Presentation scenario, not a real reservation.",
        consent: true,
        termsAccepted: true,
        cancellationAccepted: true,
        requestKey: randomUUID(),
        policyVersion: (await operationalSettings()).policy_version,
      },
      admin,
    );
    const b = (
      await db().query(
        "SELECT id,version FROM bookings WHERE reference_number=$1",
        [created.reference],
      )
    ).rows[0];
    if (scenario.status !== "PENDING")
      await updateBooking(
        b.id,
        {
          version: b.version,
          status: scenario.status,
          reason:
            scenario.status === "DECLINED"
              ? "DEMO DATA: Sample decline response for presentation purposes only."
              : "",
        },
        admin,
      );
    await own("scenario", scenario.key, b.id);
  }
}
export async function resetDemo() {
  await assertDemoTarget(db());
  await transaction(async (c) => {
    await assertDemoTarget(c);
    await c.query("SELECT pg_advisory_xact_lock(19766124)");
    const ids = (
      await c.query(
        "SELECT b.id FROM bookings b JOIN paraiso_demo.records r ON r.id=b.id::text WHERE r.kind='booking' FOR UPDATE OF b",
      )
    ).rows.map((r) => r.id);
    if (ids.length) {
      for (const table of [
        "payments",
        "payment_claims",
        "checkout_attempts",
        "booking_charges",
      ]) {
        if (
          (
            await c.query(
              `SELECT 1 FROM ${table} WHERE booking_id=ANY($1::uuid[]) LIMIT 1`,
              [ids],
            )
          ).rowCount
        )
          throw new Error(
            "Demo reset refused: historical financial data is attached. All records were preserved.",
          );
      }
      await c.query(
        "DELETE FROM booking_staff_notes WHERE booking_id=ANY($1::uuid[])",
        [ids],
      );
      await c.query(
        "DELETE FROM booking_change_requests WHERE booking_id=ANY($1::uuid[])",
        [ids],
      );
      await c.query("DELETE FROM bookings WHERE id=ANY($1::uuid[])", [ids]);
      await c.query(
        "DELETE FROM paraiso_demo.records WHERE kind IN ('booking','scenario') AND id=ANY($1::text[])",
        [ids],
      );
    }
  });
  await setupDemo();
}

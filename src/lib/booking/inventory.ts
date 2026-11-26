import { inventoryLock, slotsOverlap } from "./capacity";
import { z } from "zod";
import { db, transaction, type Staff } from "./db";
import { lockProduct } from "./service";
import {
  BookingError,
  productSchema,
  activeStatuses,
  dateSchema,
  text,
} from "./validation";
export async function saveProduct(raw: unknown, user: Staff) {
  if (user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const p = productSchema.parse(raw);
  return transaction(async (c) => {
    await inventoryLock(c);
    if (p.resourceGroup) {
      const peers = (
        await c.query(
          "SELECT category,day_capacity FROM accommodation_types WHERE resource_group=$1 AND ($2::uuid IS NULL OR id<>$2)",
          [p.resourceGroup, p.id || null],
        )
      ).rows;
      if (
        peers.some(
          (i) => i.category !== p.category || i.day_capacity !== p.dayCapacity,
        )
      )
        throw new BookingError(
          409,
          "Services sharing a resource group must use the same category and total guest capacity.",
        );
    }
    if (p.id) {
      const existing = await lockProduct(c, p.id);
      if (!Object.hasOwn(raw as object, "depositMode")) {
        p.depositMode = existing.deposit_mode;
        p.depositValue = existing.deposit_value;
      }
      const structuralChange =
        existing.category !== p.category ||
        existing.overnight !== p.overnight ||
        !!existing.unit_inventory !== p.unitInventory ||
        existing.min_guests !== p.minGuests ||
        existing.max_guests !== p.maxGuests ||
        existing.day_capacity !== p.dayCapacity ||
        existing.duration_minutes !== p.durationMinutes ||
        existing.equipment_count !== p.equipmentCount ||
        existing.resource_group !== p.resourceGroup ||
        existing.exclusive !== p.exclusive ||
        JSON.stringify(existing.slots) !==
          JSON.stringify([...new Set(p.slots)]);
      if (
        structuralChange &&
        (
          await c.query(
            "SELECT 1 FROM bookings b WHERE (b.product_id=$1 OR EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND i.product_id=$1)) AND (b.status=ANY($2) OR b.hold_expires_at>now() OR EXISTS(SELECT 1 FROM booking_items i WHERE i.booking_id=b.id AND i.allocated)) AND b.check_out_date>=(now() AT TIME ZONE 'Asia/Manila')::date LIMIT 1",
            [p.id, activeStatuses],
          )
        ).rowCount
      )
        throw new BookingError(
          409,
          "This option has active reservations. Complete or cancel them before changing capacity, slots or rates.",
        );
    }
    const result = await c.query(
      `INSERT INTO accommodation_types(id,name,slug,description,category,overnight,active,min_guests,max_guests,day_capacity,price,price_basis,slots,image) VALUES(COALESCE($1::uuid,gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(id) DO UPDATE SET name=$2,slug=$3,description=$4,category=$5,overnight=$6,active=$7,min_guests=$8,max_guests=$9,day_capacity=$10,price=$11,price_basis=$12,slots=$13,image=$14 RETURNING id`,
      [
        p.id,
        p.name,
        p.slug,
        p.description,
        p.category,
        p.overnight,
        p.active,
        p.minGuests,
        p.maxGuests,
        p.dayCapacity,
        p.price,
        p.priceBasis,
        JSON.stringify([...new Set(p.slots)]),
        p.image,
      ],
    );
    await c.query(
      "UPDATE accommodation_types SET deposit_mode=$2,deposit_value=$3,amenities=$4,restrictions=$5,duration_minutes=$6,equipment_count=$7,min_age=$8,child_price=$9,resource_group=$10,exclusive=$11,photos=$12 WHERE id=$1",
      [
        result.rows[0].id,
        p.depositMode,
        p.depositValue,
        JSON.stringify(p.amenities),
        p.restrictions,
        p.durationMinutes,
        p.equipmentCount,
        p.minAge,
        p.childPrice,
        p.resourceGroup,
        p.exclusive,
        JSON.stringify(p.photos),
      ],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by) VALUES('INVENTORY_CONFIGURATION_UPDATED',$1)",
      [user.id],
    );
    await c.query(
      "UPDATE accommodation_types SET unit_inventory=$2 WHERE id=$1",
      [result.rows[0].id, p.unitInventory],
    );
    return result.rows[0];
  });
}
export async function saveUnit(raw: unknown, user: Staff) {
  if (user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const v = z
    .object({
      productId: z.string().uuid(),
      identifier: text(80).min(1),
      active: z.boolean(),
    })
    .strict()
    .parse(raw);
  return transaction(async (c) => {
    const p = await lockProduct(c, v.productId);
    if (!p.overnight && !p.unit_inventory)
      throw new BookingError(
        400,
        "Units are used for overnight accommodations.",
      );
    const existing = (
      await c.query(
        "SELECT id FROM accommodation_units WHERE accommodation_type_id=$1 AND unit_identifier=$2",
        [v.productId, v.identifier],
      )
    ).rows[0];
    if (
      !v.active &&
      existing &&
      (
        await c.query(
          "SELECT 1 FROM booking_units WHERE unit_id=$1 AND active LIMIT 1",
          [existing.id],
        )
      ).rowCount
    )
      throw new BookingError(
        409,
        "This unit is allocated to an active reservation.",
      );
    await c.query(
      "INSERT INTO accommodation_units(accommodation_type_id,unit_identifier,active) VALUES($1,$2,$3) ON CONFLICT(accommodation_type_id,unit_identifier) DO UPDATE SET active=$3",
      [v.productId, v.identifier, v.active],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by) VALUES('UNIT_UPDATED',$1)",
      [user.id],
    );
  });
}
export async function saveBlock(raw: unknown, user: Staff) {
  if (user.role !== "ADMIN")
    throw new BookingError(403, "Administrator access required.");
  const v = z
    .object({
      productId: z.string().uuid(),
      unitId: z.string().uuid().nullable(),
      start: dateSchema,
      end: dateSchema,
      slot: text(80).default(""),
      reason: text(200).default(""),
    })
    .strict()
    .parse(raw);
  if (v.end <= v.start)
    throw new BookingError(
      400,
      "Block end must be after start; end date is excluded.",
    );
  return transaction(async (c) => {
    const p = await lockProduct(c, v.productId);
    if (v.slot && !p.slots.includes(v.slot))
      throw new BookingError(400, "Unknown time slot.");
    if (
      v.unitId &&
      !(
        await c.query(
          "SELECT 1 FROM accommodation_units WHERE id=$1 AND accommodation_type_id=$2",
          [v.unitId, p.id],
        )
      ).rowCount
    )
      throw new BookingError(
        400,
        "This unit belongs to a different accommodation.",
      );
    const occupied = v.unitId
      ? (
          await c.query(
            "SELECT to_char(slot_start,'HH24:MI') slot,duration_minutes FROM booking_units WHERE unit_id=$1 AND active AND check_in_date<$3 AND check_out_date>$2",
            [v.unitId, v.start, v.end],
          )
        ).rows
      : (
          await c.query(
            "SELECT i.slot,p.duration_minutes FROM booking_items i JOIN accommodation_types p ON p.id=i.product_id WHERE i.allocated AND (p.id=$1 OR ($4<>'' AND p.resource_group=$4)) AND i.check_in_date<$3 AND i.check_out_date>$2 UNION ALL SELECT b.slot,p.duration_minutes FROM bookings b JOIN accommodation_types p ON p.id=b.product_id WHERE NOT b.is_cart AND b.status IN ('CONFIRMED','CHECKED_IN') AND (p.id=$1 OR ($4<>'' AND p.resource_group=$4)) AND b.check_in_date<$3 AND b.check_out_date>$2",
            [p.id, v.start, v.end, p.resource_group || ""],
          )
        ).rows;
    if (
      occupied.some((row) =>
        slotsOverlap(
          v.slot,
          p.duration_minutes,
          row.slot,
          row.duration_minutes,
        ),
      )
    )
      throw new BookingError(
        409,
        "This block overlaps an active reservation or payment hold. Resolve it first.",
      );
    await c.query(
      "INSERT INTO blocked_dates(product_id,unit_id,start_date,end_date,slot,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [p.id, v.unitId, v.start, v.end, v.slot, v.reason, user.id],
    );
    await c.query(
      "INSERT INTO booking_activity_logs(action,performed_by) VALUES('DATES_BLOCKED',$1)",
      [user.id],
    );
  });
}
export async function inventory() {
  const [products, units, blocks, addons] = await Promise.all([
    db().query("SELECT * FROM accommodation_types ORDER BY name"),
    db().query("SELECT * FROM accommodation_units ORDER BY unit_identifier"),
    db().query("SELECT * FROM blocked_dates ORDER BY start_date"),
    db().query("SELECT * FROM addons ORDER BY name"),
  ]);
  return {
    products: products.rows,
    units: units.rows,
    blocks: blocks.rows,
    addons: addons.rows,
  };
}

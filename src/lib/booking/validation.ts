import { z } from "zod";
import { isCalendarDate, manilaDate } from "../dates";
import { centavos } from "./money";
const pesoRate = z
  .number()
  .min(0)
  .max(10000000)
  .refine((v) => {
    try {
      centavos(v);
      return true;
    } catch {
      return false;
    }
  }, "Use a peso amount with at most two decimal places.");
export const statuses = [
  "PENDING",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "CHECKED_IN",
  "CHECKED_OUT",
] as const;
export const transitions: Record<string, readonly string[]> = {
  PENDING: ["CONFIRMED", "DECLINED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  DECLINED: [],
  CANCELLED: [],
};
export const activeStatuses = ["CONFIRMED", "CHECKED_IN"];
export const dateSchema = z
  .string()
  .refine(isCalendarDate, "Enter a valid calendar date.");
export const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
      "Remove control characters.",
    );
export const philippinePhone = text(30).refine(
  (value) =>
    /^(?:\+63|0063|0)(?:9\d{9}|[2-8]\d{7,9})$/.test(
      value.replace(/[ ()-]/g, ""),
    ),
  "Enter a Philippine mobile or landline number, including 0 or +63.",
);
export const bookingSchema = z
  .object({
    productId: z.string().uuid(),
    checkIn: dateSchema,
    checkOut: dateSchema.optional(),
    adults: z.number().int().min(1).max(500),
    children: z.number().int().min(0).max(500),
    units: z.number().int().min(1).max(100),
    slot: text(80).default(""),
    guestName: text(120).min(2),
    guestEmail: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    guestPhone: text(30).regex(
      /^\+?[0-9 ()-]{7,30}$/,
      "Enter a valid contact number.",
    ),
    notes: text(2000).default(""),
    consent: z.literal(true),
    website: z.string().max(0).default(""),
    addons: z.array(z.string().uuid()).max(20).default([]),
    requestKey: z.string().uuid(),
  })
  .strict()
  .refine((v) => v.checkIn >= manilaDate(), {
    message: "Choose today or a future date.",
    path: ["checkIn"],
  });
export type BookingInput = z.infer<typeof bookingSchema>;
export const productSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: text(120).min(2),
    slug: text(100).regex(/^[a-z0-9-]+$/),
    description: text(2000).default(""),
    category: z.enum([
      "ACCOMMODATION",
      "SWIMMING",
      "ACTIVITY",
      "DINING",
      "DAY_TOUR",
      "PACKAGE",
    ]),
    depositMode: z
      .enum(["UNCONFIGURED", "NONE", "PERCENT", "FIXED", "FULL"])
      .default("UNCONFIGURED"),
    depositValue: z
      .number()
      .int()
      .min(0)
      .max(1000000000)
      .nullable()
      .default(null),
    amenities: z.array(text(160)).max(30).default([]),
    restrictions: text(4000).default(""),
    durationMinutes: z.number().int().min(1).max(1440).nullable().default(null),
    equipmentCount: z.number().int().min(1).max(10000).nullable().default(null),
    minAge: z.number().int().min(0).max(100).nullable().default(null),
    childPrice: pesoRate.nullable().default(null),
    resourceGroup: text(100).default(""),
    exclusive: z.boolean().default(false),
    photos: z
      .array(
        z
          .string()
          .max(300)
          .regex(/^\/images\/(?!.*\.\.)[a-zA-Z0-9_/. ()-]+$/),
      )
      .max(12)
      .default([]),
    overnight: z.boolean(),
    unitInventory: z.boolean().default(false),
    active: z.boolean(),
    minGuests: z.number().int().min(1).max(500),
    maxGuests: z.number().int().min(1).max(500).nullable(),
    dayCapacity: z.number().int().min(1).max(10000).nullable(),
    price: pesoRate.nullable(),
    priceBasis: z.enum(["UNIT", "PERSON"]),
    slots: z.array(text(80).min(1)).max(24),
    image: z
      .string()
      .max(300)
      .regex(/^\/images\/(?!.*\.\.)[a-zA-Z0-9_/. ()-]+$/)
      .nullable(),
  })
  .strict()
  .refine(
    (v) => !v.maxGuests || v.maxGuests >= v.minGuests,
    "Maximum guests must be at least the minimum.",
  )
  .refine(
    (v) =>
      v.depositMode !== "PERCENT" ||
      (v.depositValue !== null &&
        v.depositValue > 0 &&
        v.depositValue <= 10000),
    "Percentage deposits require 1–10000 basis points.",
  )
  .refine(
    (v) =>
      v.depositMode !== "FIXED" ||
      (v.depositValue !== null && v.depositValue > 0),
    "Fixed deposits require a positive amount in centavos.",
  )
  .refine(
    (v) =>
      !v.unitInventory ||
      (!v.resourceGroup &&
        v.slots.every((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s))),
    "Physical unit inventory uses independent resources and HH:mm sessions or full-day dates.",
  )
  .refine(
    (v) => !v.overnight || (!v.resourceGroup && !v.exclusive),
    "Overnight room inventory cannot share a day-service resource group.",
  )
  .refine(
    (v) =>
      !v.active ||
      !["ACTIVITY", "DINING"].includes(v.category) ||
      (v.slots.length > 0 && v.durationMinutes !== null),
    "Active activity and dining services require configured time slots and a duration.",
  )
  .refine(
    (v) =>
      !v.slots.some((s) => /^\d{2}:\d{2}$/.test(s)) ||
      v.durationMinutes !== null,
    "Time-based sessions require a duration.",
  )
  .refine(
    (v) =>
      !v.resourceGroup ||
      v.slots.every((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s)),
    "Shared-resource time slots must use HH:mm, or leave slots empty for a full-day service.",
  )
  .refine(
    (v) =>
      v.slots.every(
        (s) =>
          !/^\d{2}:\d{2}$/.test(s) ||
          Number(s.slice(0, 2)) * 60 +
            Number(s.slice(3)) +
            (v.durationMinutes || 1) <=
            1440,
      ),
    "A day session cannot cross midnight. Configure separate dated sessions for overnight opening periods.",
  );
export const availabilitySchema = z.object({
  productId: z.string().uuid(),
  checkIn: dateSchema,
  checkOut: dateSchema.optional(),
  units: z.coerce.number().int().min(1).max(100).default(1),
  adults: z.coerce.number().int().min(1).max(500).default(1),
  children: z.coerce.number().int().min(0).max(500).default(0),
  slot: text(80).default(""),
});
export class BookingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

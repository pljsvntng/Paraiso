import { accommodations } from "../../src/data/accommodations";
import { adventures } from "../../src/data/adventures";
import { photos } from "../../src/config/media";

const common = {
  active: true,
  minGuests: 1,
  maxGuests: 12,
  dayCapacity: 24,
  price: 300,
  childPrice: null,
  priceBasis: "PERSON",
  overnight: false,
  slots: ["09:00", "10:30", "13:00", "15:00"],
  durationMinutes: 60,
  depositMode: "NONE",
  depositValue: null,
  restrictions:
    "DEMO DATA ONLY. Illustrative availability and safety rules, not approved resort operations. Staff review is required. No payment or real visit is promised.",
};
const rates: Record<string, [number, number, number, string]> = {
  "family-deluxe": [3500, 6, 2, "SAMPLE: two double beds and two single beds"],
  igloo: [2500, 4, 2, "SAMPLE: two double beds"],
  "wooden-and-brick": [2800, 4, 2, "SAMPLE: two bunk beds"],
  "standard-cabin": [1800, 2, 3, "SAMPLE: one double bed"],
  bunkhouse: [4500, 10, 1, "SAMPLE: five bunk beds"],
};
export const demoCatalog = [
  ...accommodations.map((p) => {
    const [price, capacity, unitCount, beds] = rates[p.slug];
    return {
      unitCount,
      unitPrefix: p.slug.toUpperCase(),
      values: {
        ...common,
        slug: p.slug,
        name: p.name,
        category: "ACCOMMODATION",
        overnight: true,
        maxGuests: capacity,
        dayCapacity: null,
        price,
        priceBasis: "UNIT",
        slots: [],
        durationMinutes: null,
        description: `DEMO DATA — ${p.description} ${unitCount} sample units; nightly rate and total adult/child capacity are illustrative only.`,
        image: p.photos[0].src,
        photos: p.photos.map((i) => i.src),
        amenities: [
          beds,
          "SAMPLE check-in 14:00; check-out 12:00",
          `SAMPLE maximum ${capacity} adults and children combined; child places count toward this limit`,
          `SAMPLE group illustration: ${capacity > 2 ? capacity - 2 : capacity} adults and ${capacity > 2 ? 2 : 0} children. Separate adult/child limits require client approval; this demo enforces total guests.`,
          "SAMPLE: linens and guest seating; client approval required",
        ],
      },
    };
  }),
  {
    unitCount: 0,
    unitPrefix: "",
    values: {
      ...common,
      slug: "demo-day-swimming",
      name: "DEMO Day Swimming",
      category: "SWIMMING",
      price: 250,
      childPrice: 150,
      maxGuests: 20,
      dayCapacity: 40,
      slots: ["09:00", "13:00"],
      durationMinutes: 180,
      description:
        "DEMO DATA — Day swimming entrance, PHP 250 per adult and PHP 150 per child. Sample 40-guest session capacity; all values require client approval.",
      image: photos.pool.src,
      photos: [photos.pool.src],
      amenities: ["SAMPLE morning or afternoon swimming session"],
    },
  },
  {
    unitCount: 3,
    unitPrefix: "COTTAGE",
    values: {
      ...common,
      slug: "demo-cottage",
      name: "DEMO Cottage Reservation",
      category: "SWIMMING",
      price: 800,
      priceBasis: "UNIT",
      unitInventory: true,
      maxGuests: 6,
      dayCapacity: null,
      slots: ["09:00", "13:00"],
      durationMinutes: 180,
      description:
        "DEMO DATA — Illustrative cottage reservation at PHP 800 per session, up to 6 guests. The existing pool-area photo shows context only; it does not verify a specific cottage design or inventory.",
      image: photos.pool.src,
      photos: [],
      amenities: [
        "SAMPLE physical cottage allocation; entrance booked separately",
      ],
    },
  },
  ...adventures.map((p, index) => ({
    unitCount: 0,
    unitPrefix: "",
    values: {
      ...common,
      slug: p.slug,
      name: p.name,
      category: "ACTIVITY",
      price: [150, 500, 250, 250, 300, 350, 100, 200][index],
      maxGuests: 12,
      dayCapacity: 12,
      equipmentCount: 12,
      minAge: 10,
      description: `DEMO DATA — Demonstration offering only; current resort operation is unconfirmed. ${p.description} Illustrative 60-minute sessions and 12 participant/equipment places.`,
      image: p.image!,
      photos: [p.image!],
      amenities: [
        "SAMPLE session and equipment capacity; not verified operating or safety guidance",
      ],
    },
  })),
  {
    unitCount: 0,
    unitPrefix: "",
    values: {
      ...common,
      slug: "demo-dining",
      name: "DEMO Dining Reservation",
      category: "DINING",
      price: 0,
      maxGuests: 20,
      dayCapacity: 40,
      slots: ["11:00", "12:30", "14:00", "17:00", "18:30"],
      durationMinutes: 90,
      description:
        "DEMO DATA — Sample table/seat request only. Forty illustrative seating places per session. No menu, official package or food price is implied. No online payment.",
      image: photos.dining.src,
      photos: [photos.dining.src],
      amenities: ["SAMPLE seating and special-request recording"],
    },
  },
];

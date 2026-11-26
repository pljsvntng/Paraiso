import { accommodationPhotos as roomPhotos, type Photo } from "@/config/media";

export type StayHighlight = {
  icon: "trees" | "balcony" | "bed" | "bunks" | "tent" | "moon";
  label: string;
};
export type StayInformation = { label: string; value: string };
export type StayVariant = {
  name: string;
  description: string;
  photos: Photo[];
  information: StayInformation[];
};
export type Accommodation = {
  slug: string;
  name: string;
  category: string;
  description: string;
  photos: Photo[];
  highlights: StayHighlight[];
  information: StayInformation[];
  variants: StayVariant[];
  verifiedName: boolean;
  /** Publish only details confirmed by the resort, never inferred from photographs. */
  verified?: {
    capacity?: number;
    amenities?: string[];
    rate?: { amount: number; unit: string };
    houseRules?: string[];
  };
};

// Names/groupings follow the owner's room-labelled uploads. No capacity, bed
// sizes, bathroom, air-conditioning, rates or invented variants are published.
// Add a confirmed third photo to activate the large + two-stacked composition.
export const accommodations: Accommodation[] = [
  {
    slug: "family-deluxe",
    name: "Family Deluxe",
    category: "ROOMS & CABINS",
    description:
      "Warm timber, welcoming balconies and a calm bedroom setting. Discover Family Deluxe, from its softly lit exterior to the simple comforts inside.",
    photos: [roomPhotos.familyDeluxeExterior, roomPhotos.familyDeluxeInterior],
    highlights: [
      { icon: "balcony", label: "Balconies pictured" },
      { icon: "bed", label: "Bedroom interior" },
    ],
    information: [],
    variants: [],
    verifiedName: true,
  },
  {
    slug: "igloo",
    name: "Igloo",
    category: "A DIFFERENT KIND OF STAY",
    description:
      "A curved entrance, warm brickwork and a nature-inspired interior. Take a closer look at the distinctive shape and colourful details of the Igloo.",
    photos: [roomPhotos.iglooExterior, roomPhotos.iglooInterior],
    highlights: [
      { icon: "trees", label: "Nature mural" },
      { icon: "bed", label: "Sleeping space pictured" },
    ],
    information: [],
    variants: [],
    verifiedName: true,
  },
  {
    slug: "wooden-and-brick",
    name: "Wooden & Brick",
    category: "ROOMS & CABINS",
    description:
      "Natural timber meets warm brickwork, with a wooden bunk-bed arrangement inside. Explore the textures and details of this characterful resort stay.",
    photos: [roomPhotos.woodenBrickExterior, roomPhotos.woodenBrickInterior],
    highlights: [
      { icon: "balcony", label: "Timber & brick exterior" },
      { icon: "bunks", label: "Bunk beds pictured" },
    ],
    information: [],
    variants: [],
    verifiedName: true,
  },
  {
    slug: "standard-cabin",
    name: "Standard Cabin",
    category: "ROOMS & CABINS",
    description:
      "A warm wooden floor, fresh white bedding and a vivid forest mural. A relaxed bedroom setting to explore before planning your time at Paraiso.",
    photos: [roomPhotos.standardCabinInterior],
    highlights: [
      { icon: "bed", label: "Bedroom interior" },
      { icon: "trees", label: "Nature mural" },
    ],
    information: [],
    variants: [],
    verifiedName: true,
  },
  {
    slug: "bunkhouse",
    name: "Bunkhouse",
    category: "SHARED SLEEPING SPACE",
    description:
      "Wooden bunk beds and white bedding create a simple shared sleeping space. View the Bunkhouse interior and ask the resort about arrangements for your group.",
    photos: [roomPhotos.bunkhouseInterior],
    highlights: [{ icon: "bunks", label: "Bunk beds pictured" }],
    information: [],
    variants: [],
    verifiedName: true,
  },
];

export function accommodationPath(slug: string) {
  return `/accommodations/${slug}/`;
}

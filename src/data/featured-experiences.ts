import { accommodations } from "@/data/accommodations";
import { accommodationPhotos, photos, type Photo } from "@/config/media";
import type { BookingIntent } from "@/config/booking";

export type FeaturedExperience = {
  id: string;
  category: string;
  name: string;
  invitation: string;
  description: string;
  photo: Photo;
  href: string;
  intent: BookingIntent;
  bookingCategory: string;
  bookingNames: string[];
  bookingSlugs: string[];
};

// Editorial selections from the existing resort catalog, not popularity claims.
export const featuredExperiences: FeaturedExperience[] = [
  {
    id: "featured-stay",
    category: "Accommodations",
    name: accommodations.find((stay) => stay.slug === "family-deluxe")!.name,
    invitation: "Let the day linger.",
    description:
      "Warm timber, softly lit balconies, and a little time to slow down. Take a closer look at Family Deluxe and picture your next morning at Paraiso.",
    photo: accommodationPhotos.familyDeluxeExterior,
    href: "/accommodations/family-deluxe/",
    intent: "stay",
    bookingCategory: "ACCOMMODATION",
    bookingNames: ["Family Deluxe"],
    bookingSlugs: ["family-deluxe"],
  },
  {
    id: "featured-swimming",
    category: "Swimming",
    name: "Main Pool",
    invitation: "A refreshing change of pace.",
    description:
      "Blue water, a curved poolside deck, and trees all around. Make space in your day for a refreshing escape with your favourite people.",
    photo: photos.pool,
    href: "/pool-cottages/",
    intent: "cottage",
    bookingCategory: "SWIMMING",
    bookingNames: ["Main Pool", "Main Swimming Pool", "Swimming"],
    bookingSlugs: ["main-pool", "main-swimming-pool", "swimming"],
  },
  {
    id: "featured-adventure",
    category: "Adventures",
    name: "Cable Jeep",
    invitation: "A little out of the ordinary.",
    description:
      "A familiar Philippine icon, with an adventurous twist. Explore Paraiso’s Cable Jeep and ask the team about current operation and participation requirements.",
    photo: photos.cableJeep,
    href: "/adventures/#cable-jeep",
    intent: "adventure",
    bookingCategory: "ACTIVITY",
    bookingNames: ["Cable Jeep"],
    bookingSlugs: ["cable-jeep"],
  },
  {
    id: "featured-dining",
    category: "Dining",
    name: "Dining Pavilion",
    invitation: "Good company belongs at the table.",
    description:
      "An arched entrance, tropical greenery, and a welcoming place to gather. Leave time for a meal together, and ask about the current menu and dining arrangements.",
    photo: photos.dining,
    href: "/dining/",
    intent: "dining",
    bookingCategory: "DINING",
    bookingNames: [
      "Dining",
      "Dining Pavilion",
      "Dining Arrangements",
      "Restaurant",
    ],
    bookingSlugs: ["dining", "dining-pavilion", "restaurant"],
  },
];

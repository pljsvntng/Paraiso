import { googleReviewsConfig } from "./google-reviews";

export const site = {
  name: "Paraiso de June Quixote Ecofarm Resort",
  shortName: "Paraiso",
  description:
    "A little nature. A lot of adventure. Plan your visit to Paraiso de June Quixote Ecofarm Resort in Maragondon, Cavite.",
  region: "Maragondon, Cavite",
  country: "Philippines",
  facebook: "https://www.facebook.com/paraisodejunequixote.111",
  // Set the verified domain before enabling indexing. No environment variables required.
  url: null as string | null,
  allowIndexing: false,
  address: "Mabacao, Tulay B, Maragondon, Cavite, Philippines" as string | null,
  // Verified in Google Maps on 18 November 2026 against the address and official Facebook URL.
  // Listing feature ID: 0x33bd87b79eb8145d:0x941edcf562f67f66; plus code: 7QCF+HM.
  // This is Google's Share > Embed a map URL. Replace it here if the resort's listing changes.
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3866.6875848795685!2d120.7741382!3d14.271433099999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bd87b79eb8145d%3A0x941edcf562f67f66!2sParaiso%20de%20June%20Quixote%20Ecofarm%20Resort!5e0!3m2!1sen!2sph!4v1795002542798!5m2!1sen!2sph" as string | null,
  mapUrl: googleReviewsConfig.mapsUrl,
  // Google-generated directions URL with the same listing ID and an empty starting point.
  directionsUrl: "https://www.google.com/maps/dir//Paraiso+de+June+Quixote+Ecofarm+Resort,+Mabacao+tulay+b,+Maragondon,+Cavite/@14.2714331,120.7741382,17z/data=!4m20!1m10!3m9!1s0x33bd87b79eb8145d:0x941edcf562f67f66!2sParaiso+de+June+Quixote+Ecofarm+Resort!5m2!4m1!1i2!8m2!3d14.2714331!4d120.7741382!16s%2Fg%2F11rtl8x67w!4m8!1m0!1m5!1m1!1s0x33bd87b79eb8145d:0x941edcf562f67f66!2m2!1d120.7741382!2d14.2714331!3e0" as string | null,
  // A named-place fallback is used only when verified URLs are not configured.
  mapSearchUrl:
    "https://www.google.com/maps/search/?api=1&query=Paraiso+de+June+Quixote+Ecofarm+Resort+Maragondon+Cavite",
  // Existing Contact page details, centralized here; reconfirm when content changes.
  phone: "0977 625 6513" as string | null,
  email: "paraisodejunequixote@gmail.com" as string | null,
  hours: "Tuesday to Sunday, 8:00 am to 6:00 pm" as string | null,
  locationVerified: true,
  heroImage: null as string | null,
  heroAlt: "The natural surroundings of Paraiso de June Quixote Ecofarm Resort",
};
export const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about/" },
  { label: "Adventures", href: "/adventures/" },
  { label: "Accommodations", href: "/accommodations/" },
  { label: "Swimming", href: "/pool-cottages/" },
  { label: "Dining", href: "/dining/" },
  { label: "Gallery", href: "/gallery/" },
  { label: "Guest Reviews", href: "/guest-reviews/" },
  { label: "Contact", href: "/contact/" },
];

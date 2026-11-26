import type { Adventure } from "@/types/content";
import { photos } from "@/config/media";
// Client-supplied, publicly reported attractions. Inquiry topics, not current availability claims.
export const adventures: Adventure[] = [
  {
    slug: "skywalk",
    name: "Skywalk Hanging Bridge",
    category: "Up in the air",
    description:
      "Ask about the hanging bridge, access, and the views along the way.",
    confirmed: false,
    image: photos.skywalk.src,
  },
  {
    slug: "atv",
    name: "ATV Riding",
    category: "On the trail",
    description:
      "Ask the team about current riding options, routes, and participation guidelines.",
    confirmed: false,
    image: photos.trail.src,
  },
  {
    slug: "zipline",
    name: "Zipline",
    category: "Up in the air",
    description:
      "Check whether zipline sessions are operating during your planned visit.",
    confirmed: false,
    image: photos.zipline.src,
  },
  {
    slug: "zip-bike",
    name: "Zip Bike",
    category: "Up in the air",
    description:
      "Find out about this reported attraction and the requirements to take part.",
    confirmed: false,
    image: photos.zipBike.src,
  },
   {
  slug: "cable-jeep",
  name: "Cable Jeep",
  category: "Up in the air",
  description: "Ask about current operation and arrangements for your group.",
  confirmed: false,
  image: photos.cableJeep.src,
},
  {
    slug: "crystal-kayaking",
    name: "Crystal Kayaking",
    category: "On the water",
    description:
      "Contact the resort to check current kayaking options and water activity guidance.",
    confirmed: false,
    image: photos.kayaking.src,
  },

  {
  slug: "rainbow-bridge",
  name: "Rainbow Bridge",
  category: "Up in the air",
  description: "Explore the Rainbow Bridge and enjoy the surrounding views. Ask the team about access before your visit.",
  confirmed: false,
  image: photos.rainbowBridge.src,
},

{
  slug: "cavite-swing",
  name: "Cavite Swing",
  category: "Up in the air",
  description: "Experience the thrill of the Cavite Swing and enjoy the scenic views. Ask the team about access before your visit.",
  confirmed: false,
  image: photos.swing.src,

},
];

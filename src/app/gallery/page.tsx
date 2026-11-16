import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { ResortGallery } from "@/components/gallery/resort-gallery";
import { VisitNote } from "@/components/shared/visit-note";
export const metadata = pageMetadata(
  "Moments at Paraiso",
  "An editorial photo gallery for approved photographs of Paraiso’s surroundings and experiences.",
  "/gallery/",
);
export default function Gallery() {
  return (
    <>
      <PageIntro
        eyebrow="THE PARAISO ALBUM"
        title={
          <>
            Little moments.
            <br />
            Lovely <em>memories.</em>
          </>
        }
        description="A closer look at the place, the experiences, and the little details. Our approved resort photo collection is coming together."
      />
      <ResortGallery />
      <VisitNote title="Want a closer look before you come?">
        Ask the resort team for current photographs of the rooms, facilities, or
        experiences you are interested in.
      </VisitNote>
    </>
  );
}

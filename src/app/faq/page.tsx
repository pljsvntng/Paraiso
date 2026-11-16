import { pageMetadata } from "@/lib/metadata";
import { PageIntro } from "@/components/shared/page-intro";
import { VisitNote } from "@/components/shared/visit-note";
import { FaqList } from "@/components/shared/faq-list";
export const metadata = pageMetadata(
  "Good to know",
  "Useful information for planning a visit, making inquiries, and getting confirmed details from the resort.",
  "/faq/",
);
export default function Faq() {
  return (
    <>
      <PageIntro
        eyebrow="GOOD TO KNOW"
        title={
          <>
            A few things
            <br />
            before you <em>go.</em>
          </>
        }
        description="A little planning makes room for a better day. Start here, then ask the team about the details for your visit."
      />
      <FaqList />
      <VisitNote title="Still have something on your mind?">
        The resort team is the best source for current prices, schedules, guest
        guidelines, and arrangements for your group.
      </VisitNote>
    </>
  );
}

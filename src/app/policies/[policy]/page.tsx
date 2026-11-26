import { notFound } from "next/navigation";
import Link from "next/link";
import { policyPages, publishedPolicies } from "@/lib/booking/policies";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  const page = policyPages[policy as keyof typeof policyPages];
  return { title: page?.title || "Resort policies" };
}
export default async function Policy({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  const page = policyPages[policy as keyof typeof policyPages];
  if (!page) notFound();
  const settings = await publishedPolicies(),
    content = settings?.[page.column];
  return (
    <section
      className="container"
      style={{ paddingBlock: "7rem", maxWidth: 850 }}
    >
      <p className="eyebrow">PARAISO RESERVATION POLICIES</p>
      <h1>{page.title}</h1>
      {content ? (
        <>
          <p className="small-copy">
            Published policy version {settings.policy_version}
          </p>
          <div
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              lineHeight: 1.8,
            }}
          >
            {content}
          </div>
        </>
      ) : (
        <p role="status">
          This policy is awaiting resort-owner approval and publication. Contact
          the resort for verified arrangements before submitting a reservation
          request.
        </p>
      )}
      <nav
        aria-label="Resort policies"
        style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBlock: 32 }}
      >
        {Object.entries(policyPages).map(([slug, p]) => (
          <Link key={slug} href={`/policies/${slug}/`}>
            {p.title}
          </Link>
        ))}
      </nav>
      <Link className="text-link" href="/booking/">
        Plan your reservation
      </Link>
    </section>
  );
}

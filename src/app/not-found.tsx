import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="container not-found">
      <p className="eyebrow">A SMALL DETOUR · 404</p>
      <h1>
        Let’s take
        <br />
        the scenic way back.
      </h1>
      <p>That page isn’t here. There’s still plenty to explore.</p>
      <Button asChild>
        <Link href="/">Back to Paraiso</Link>
      </Button>
    </section>
  );
}

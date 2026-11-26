import Link from "next/link";
import { Media } from "@/components/media";
import { photos, type PhotoKey } from "@/config/media";

/** Photo subjects only: no inferred room inventory, capacities, or availability. */
export function PhotoCollection({ title, description, ids }: {
  title: string; description: string; ids: PhotoKey[];
}) {
  return <section className="container photo-collection">
    <div className="section-heading">
      <div><p className="eyebrow">A CLOSER LOOK</p><h2>{title}</h2></div>
      <p>{description}</p>
    </div>
    <div className={`photo-collection-grid ${ids.length === 2 ? "photo-pair" : ""}`}>
      {ids.map(id => <figure key={id}>
        <Media src={photos[id].src} alt={photos[id].alt} label={photos[id].title}
          sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1050px) 45vw, 30vw" />
        <figcaption>{photos[id].title}</figcaption>
      </figure>)}
    </div>
    <Link className="text-link" href="/gallery/">View the resort photo gallery <span aria-hidden="true">↗</span></Link>
  </section>;
}

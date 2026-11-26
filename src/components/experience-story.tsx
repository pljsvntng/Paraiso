import { ResponsiveImage } from "@/components/responsive-image";
import Link from "next/link";
import { photos, resortMedia } from "@/config/media";

const chapters = [
  { id: "pool", title: "Time to unwind.", name: "Swimming", text: "A little pool time. A little less hurry.", src: resortMedia.pool.src, alt: resortMedia.pool.alt },
  { id: "skywalk", title: "A different perspective.", name: "Skywalk", text: "See the adventurous side of Paraiso.", src: photos.skywalk.src, alt: photos.skywalk.alt },
  { id: "atv", title: "Follow your curiosity.", name: "ATV Riding", text: "Take a closer look at the trails.", src: photos.trail.src, alt: photos.trail.alt },
  { id: "cable-jeep", title: "Out of the ordinary.", name: "Cable Jeep", text: "Find your next adventure, together.", src: photos.cableJeep.src, alt: photos.cableJeep.alt },
].filter(chapter => chapter.src);

/** All chapters stay in normal document flow on every device. */
export function ExperienceStory() {
  if (chapters.length < 2) return null;
  return (
    <section className="experience-story" aria-labelledby="experience-story-title">
      <div className="container story-introduction">
        <p className="eyebrow">YOUR KIND OF PARAISO</p>
        <h2 id="experience-story-title">One destination.<br /><em>Endless experiences.</em></h2>
        <p>Find your calm. Follow your adventurous side.</p>
      </div>
      <div className="chapter-track">
        <div className="chapter-stage">
          {chapters.map((chapter, index) => (
            <article className="story-chapter" key={chapter.id} aria-label={chapter.name}>
              <div className="chapter-photograph">
                <ResponsiveImage src={chapter.src!} alt={chapter.alt} sizes="(max-width: 700px) 1400px, 100vw" />
              </div>
              <div className="chapter-shade" />
              <div className="chapter-copy container">
                <p className="eyebrow">0{index + 1} / {chapter.name}</p>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="container story-outro">
        <p>Ask the resort about current activity operation, swimming access, and participation requirements.</p>
        <Link className="text-link" href="/adventures/">Explore the adventures <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  );
}

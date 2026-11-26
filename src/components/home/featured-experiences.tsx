import { featuredExperiences } from "@/data/featured-experiences";
import { Reveal } from "@/components/reveal";
import { FeaturedBookingProvider } from "./featured-booking";
import { ExperienceShowcase } from "./experience-showcase";
import "./experience-showcase.css";

export function FeaturedExperiences() {
  return (
    <section
      id="featured-experiences"
      className="featured-experiences"
      aria-labelledby="featured-title"
    >
      <div className="container">
        <Reveal className="showcase-heading">
          <div>
            <p className="eyebrow">02 / THE PARAISO COLLECTION</p>
            <h2 id="featured-title">
              Experience the <em>Extraordinary</em>
            </h2>
          </div>
          <p>Four ways to discover the beauty of Paraiso.</p>
        </Reveal>
        <FeaturedBookingProvider>
          <ExperienceShowcase experiences={featuredExperiences} />
        </FeaturedBookingProvider>
      </div>
    </section>
  );
}

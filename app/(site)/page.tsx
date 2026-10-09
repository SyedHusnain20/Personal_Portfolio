import {
  About,
  Certifications,
  Contact,
  Experience,
  Hero,
  Manifesto,
  Marquee,
  Projects,
  Services,
} from "@/components/sections";
import { getContent } from "@/lib/api";
import { buildJsonLd, jsonLdString } from "@/lib/jsonld";

// Rendered on the server, cached, and refreshed every minute or instantly after an admin save.
export const revalidate = 60;

export default async function HomePage() {
  const content = await getContent();
  const liveCount = content.projects.filter((p) => p.live_url).length;

  return (
    <main id="main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(buildJsonLd(content)) }}
      />
      <Hero liveCount={liveCount} certCount={content.certificates.length} />
      <Marquee />
      <Manifesto />
      <Projects projects={content.projects} />
      <Services />
      <About />
      <Experience items={content.experience} />
      <Certifications items={content.certificates} />
      <Contact />
    </main>
  );
}

import { SITE, siteUrl } from "./content";
import type { Content } from "./types";

const AREA_SERVED = [
  { "@type": "City", name: "Hyderabad" },
  { "@type": "AdministrativeArea", name: "Sindh" },
  { "@type": "Country", name: "Pakistan" },
  { "@type": "Place", name: "Worldwide (remote)" },
];

const SERVICE_OFFERS = [
  [
    "RAG chatbots & knowledge assistants",
    "Assistants that answer from your documents with sources, using semantic retrieval and grounded responses.",
  ],
  [
    "LLM apps & AI chatbots",
    "Conversational products on WhatsApp, web and voice, from prompt design and guardrails to speech-to-text pipelines.",
  ],
  [
    "FastAPI backend APIs & deployment",
    "FastAPI services with authentication, validation and Docker deployment.",
  ],
];

/** schema.org graph. Credentials and the project list are generated from the database. */
export function buildJsonLd({ projects, certificates }: Content) {
  const url = siteUrl();
  const personId = `${url}/#person`;
  const modified = [...projects, ...certificates]
    .map((row) => row.updated_at)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: SITE.name,
        alternateName: ["Hasnain", "Syed Hasnain", "Sayyed Hasnain"],
        givenName: "Hasnain",
        familyName: "Zainulabdin",
        jobTitle: "AI Developer & Software Engineer",
        description:
          "AI developer and software engineer based in Hyderabad, Sindh, Pakistan, specializing in RAG chatbots, LLM applications, NLP pipelines and FastAPI backends.",
        url: `${url}/`,
        image: {
          "@type": "ImageObject",
          url: `${url}${SITE.portrait}`,
          caption: SITE.portraitAlt,
        },
        email: SITE.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Hyderabad",
          addressRegion: "Sindh",
          addressCountry: "PK",
        },
        knowsAbout: [
          "Artificial Intelligence",
          "Machine Learning",
          "Retrieval-Augmented Generation (RAG)",
          "Large Language Models",
          "Natural Language Processing",
          "Vector Search",
          "FastAPI",
          "Python",
          "Backend Development",
          "Software Engineering",
          "Chatbots",
        ],
        alumniOf: [
          { "@type": "CollegeOrUniversity", name: "University of Sindh" },
          { "@type": "EducationalOrganization", name: "Saylani Mass IT Training (SMIT)" },
        ],
        hasCredential: certificates.map((c) => ({
          "@type": "EducationalOccupationalCredential",
          name: c.title,
          ...(c.credly_url ? { url: c.credly_url } : {}),
          credentialCategory: "certification",
          recognizedBy: { "@type": "Organization", name: c.issuer },
        })),
        makesOffer: SERVICE_OFFERS.map(([name, description]) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name,
            description,
            provider: { "@id": personId },
            areaServed: AREA_SERVED,
          },
        })),
        mainEntityOfPage: { "@id": `${url}/#webpage` },
        sameAs: [SITE.linkedin, SITE.github],
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url: `${url}/`,
        name: SITE.name,
        alternateName: "Hasnain Zainulabdin Portfolio",
        description: SITE.description,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
      {
        "@type": "ProfilePage",
        "@id": `${url}/#webpage`,
        url: `${url}/`,
        name: SITE.title,
        description: SITE.description,
        inLanguage: "en",
        isPartOf: { "@id": `${url}/#website` },
        about: { "@id": personId },
        mainEntity: { "@id": personId },
        primaryImageOfPage: { "@type": "ImageObject", url: `${url}${SITE.portrait}` },
        ...(modified ? { dateModified: modified.slice(0, 10) } : {}),
      },
      {
        "@type": "ItemList",
        "@id": `${url}/#projects`,
        name: "Live AI projects by Hasnain Zainulabdin",
        itemListElement: projects.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "SoftwareApplication",
            name: p.title,
            description: p.description,
            ...(p.live_url ? { url: p.live_url } : {}),
            applicationCategory: "WebApplication",
            operatingSystem: "Web",
            author: { "@id": personId },
          },
        })),
      },
    ],
  };
}

/** Serialise for a <script type="application/ld+json"> tag without allowing "</script>" injection. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

import {
  ABOUT_CHECKS,
  ABOUT_PARAGRAPHS,
  MANIFESTO,
  MARQUEE_TECH,
  MARQUEE_SERVICES,
  PROCESS,
  SERVICES,
  SITE,
} from "@/lib/content";
import type { Certificate, Experience as ExperienceItem, Project } from "@/lib/types";

/* The markup and class names mirror the original static page, so app/globals.css
   (the original stylesheet) applies unchanged. Effects.tsx animates these nodes. */

function ArrowOut() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────── Hero ───────── */
export function Hero({ liveCount, certCount }: { liveCount: number; certCount: number }) {
  return (
    <section className="shell hero" aria-labelledby="hero-title">
      <link rel="preload" as="image" href={SITE.portrait} fetchPriority="high" />
      <div className="hero-left">
        <h1 id="hero-title">
          <span className="h1-role">
            Hasnain Zainulabdin &middot; AI Developer &amp; Software Engineer in Hyderabad, Sindh
          </span>
          I build AI systems that <em>actually ship.</em>
        </h1>
        <p className="hero-sub">
          I&apos;m <strong>Hasnain Zainulabdin</strong>, an{" "}
          <strong>AI developer and software engineer in Hyderabad, Sindh</strong>. I build{" "}
          <strong>RAG pipelines, LLM apps, and FastAPI backends</strong> that make it out of the notebook
          and into production. Don&apos;t take my word for it, every project below is live. Click one and
          poke around.
        </p>
        <div className="hero-actions">
          <a className="btn primary magnetic" href="#contact">
            Start a project
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a className="btn outline" href="#work">
            See live work
          </a>
          <a className="btn outline" href="/resume.pdf" download>
            Download CV
            <DownloadIcon />
          </a>
        </div>
        <p className="hero-email">
          Or email directly: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
        <div className="hero-proof">
          <div className="proof-item">
            <strong>
              <span className="count" data-target={liveCount}>
                {liveCount}
              </span>
            </strong>
            <span>Live AI products</span>
            <span className="proof-short" aria-hidden="true">Live</span>
          </div>
          <div className="proof-item">
            <strong>
              <span className="count" data-target="10" data-suffix="+">
                10+
              </span>
            </strong>
            <span>Projects delivered</span>
            <span className="proof-short" aria-hidden="true">Shipped</span>
          </div>
          <div className="proof-item">
            <strong>
              <span className="count" data-target={certCount}>
                {certCount}
              </span>
            </strong>
            <span>Cisco certifications</span>
            <span className="proof-short" aria-hidden="true">Certs</span>
          </div>
          <div className="proof-item">
            <strong>&lt;24h</strong>
            <span>Response time</span>
            <span className="proof-short" aria-hidden="true">Reply</span>
          </div>
        </div>
      </div>

      <div className="portrait-card">
        <div className="avatar-ring">
          <img
            src={SITE.portrait}
            alt={SITE.portraitAlt}
            id="portraitImg"
            fetchPriority="high"
            decoding="async"
          />
          <svg className="avatar-ribbon" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <path id="ribbonArc" d="M18.06 87.23 A50 50 0 0 0 101.94 87.23" />
            </defs>
            <circle className="ring" cx="60" cy="60" r="50" />
            <path className="band" d="M18.06 87.23 A50 50 0 0 0 101.94 87.23" />
            <text className="band-text">
              <textPath href="#ribbonArc" startOffset="50%" textAnchor="middle">
                OPEN TO WORK
              </textPath>
            </text>
          </svg>
        </div>
        <span className="portrait-badge">10+ PROJECTS SHIPPED</span>
        <div className="portrait-caption">
          <strong>Hasnain Zainulabdin</strong>
          <span>AI Developer &amp; Software Engineer · Hyderabad, Sindh · Remote worldwide</span>
        </div>
      </div>
    </section>
  );
}

/* ───────── Skills & Services marquee strips ───────── */
function MarqueeStrip({ items, reverse, label }: { items: string[]; reverse?: boolean; label: string }) {
  const repeatCount = items.length < 15 ? 4 : 2;
  return (
    <div className={`marquee-strip${reverse ? " marquee-strip--reverse" : ""}`} aria-label={label}>
      <div className="marquee-mask" aria-hidden="true">
        <div className={`marquee-track${reverse ? " marquee-track--reverse" : ""}`}>
          {Array.from({ length: repeatCount }).map((_, i) => (
            <div className="marquee-group" key={i}>
              {items.map((item, j) => (
                <span key={`${item}-${j}`}>{item}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Marquee() {
  return (
    <div className="marquee-strips">
      <MarqueeStrip items={MARQUEE_TECH} label="Technologies" />
      <MarqueeStrip items={MARQUEE_SERVICES} reverse label="Services" />
    </div>
  );
}

/* ───────── Manifesto ───────── */
export function Manifesto() {
  return (
    <section className="manifesto" aria-label="Who I am">
      <div className="shell">
        <p className="kicker">Who I am</p>
        {MANIFESTO.map((line, i) => (
          <p className="manifesto-line" key={i}>
            {/* Each word is its own .w node so Effects.tsx can light them up one by one as you scroll. */}
            {line.map(([text, emphasised], j) =>
              emphasised ? (
                <span key={j}>
                  <em className="w">{text}</em>{" "}
                </span>
              ) : (
                text
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word, k) => (
                    <span key={`${j}-${k}`}>
                      <span className="w">{word}</span>{" "}
                    </span>
                  ))
              ),
            )}
          </p>
        ))}
      </div>
    </section>
  );
}

/* ───────── Projects ───────── */
const FLOW_ICONS = [
  <>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v5h5" />
  </>,
  <path d="M4 12h16M12 4v16" />,
  <>
    <path d="M7 8h10M7 12h6M7 16h8" />
    <path d="M4 4h16v16H4z" />
  </>,
  <path d="M5 12l5 5L20 7" />,
];

function FlowLabel({ label }: { label: string }) {
  const words = label.split(" ");
  return words.length === 2 ? (
    <>
      {words[0]}
      <br />
      {words[1]}
    </>
  ) : (
    <>{label}</>
  );
}

function ProjectLinks({ project }: { project: Project; primary?: boolean }) {
  if (!project.live_url && !project.github_url) return null;
  return (
    <div className="project-cta" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {project.live_url && (
        <a
          className="btn primary small"
          href={project.live_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Try ${project.title} live (opens in new window)`}
        >
          Try {project.title} live
          <ArrowOut />
        </a>
      )}
      {project.github_url && (
        <a
          className="btn outline small"
          href={project.github_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${project.title} on GitHub (opens in new window)`}
        >
          GitHub
          <ArrowOut />
        </a>
      )}
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="tags">
      {tags.map((tag) => (
        <span className="tag" key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function FeaturedVisual({ project }: { project: Project }) {
  if (project.image_url) {
    return (
      <div className="featured-visual">
        <img
          src={project.image_url}
          alt={`${project.title} screenshot`}
          loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }
  const steps = project.flow_steps ?? [];
  return (
    <div className="featured-visual" aria-hidden="true">
      {steps.length > 0 ? (
        <>
          <div className="flow">
            {steps.map((step, i) => (
              <span key={`${step}-${i}`} style={{ display: "contents" }}>
                {i > 0 && <span className="flow-arrow" />}
                <div className="flow-node">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {FLOW_ICONS[i % FLOW_ICONS.length]}
                  </svg>
                  <FlowLabel label={step} />
                </div>
              </span>
            ))}
          </div>
          {project.flow_caption && <p className="flow-caption">{project.flow_caption}</p>}
        </>
      ) : (
        <p className="flow-caption" style={{ position: "static" }}>
          {project.title}
        </p>
      )}
    </div>
  );
}

export function Projects({ projects }: { projects: Project[] }) {
  const featured = projects.find((p) => p.is_featured) ?? projects[0];
  const rest = projects.filter((p) => p !== featured);

  return (
    <section id="work" aria-labelledby="work-title">
      <div className="shell">
        <div className="section-head">
          <div>
            <p className="kicker reveal">01 · Live work</p>
            <h2 id="work-title" className="section-title reveal">
              Don&apos;t read about it. <em>Try it.</em>
            </h2>
          </div>
          <p className="section-copy reveal">
            Everything here is deployed and public. Open one, ask it something hard, judge me on the answer.
          </p>
        </div>

        {featured ? (
          <article className="featured-project reveal">
            <div className="featured-copy">
              <p className="project-label">Featured · {featured.category}</p>
              <h3>{featured.title}</h3>
              <p>{featured.description}</p>
              <Tags tags={featured.tags} />
              <ProjectLinks project={featured} primary />
            </div>
            <FeaturedVisual project={featured} />
          </article>
        ) : (
          <p className="section-copy">Projects are on their way. Check back soon.</p>
        )}

        {rest.length > 0 && (
          <div className="project-grid">
            {rest.map((project) => (
              <article className="project-card reveal" key={project.id}>
                <p className="project-label">{project.category}</p>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <Tags tags={project.tags} />
                <ProjectLinks project={project} primary={false} />
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────── Services ───────── */
export function Services() {
  return (
    <section id="services" aria-labelledby="services-title">
      <div className="shell">
        <div className="section-head">
          <div>
            <p className="kicker reveal">02 · What I do</p>
            <h2 id="services-title" className="section-title reveal">
              Three things, done <em>properly.</em>
            </h2>
          </div>
          <p className="section-copy reveal">
            No forty-item agency menu. These are the AI and software engineering services I offer from
            Hyderabad, Sindh to clients worldwide, because I&apos;ve built them before.
          </p>
        </div>
        <div className="services-grid">
          {SERVICES.map((service) => (
            <article className="service-card reveal" key={service.num}>
              <p className="service-num">{service.num}</p>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
              <p className="service-tech">{service.tech}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── About + process ───────── */
export function About() {
  return (
    <section id="about" aria-labelledby="about-title">
      <div className="shell about-grid">
        <div className="about-copy">
          <p className="kicker reveal">03 · About</p>
          <h2 id="about-title" className="reveal">
            Backend-first, proof-driven.
          </h2>
          {ABOUT_PARAGRAPHS.map((text) => (
            <p className="reveal" key={text.slice(0, 24)}>
              {text}
            </p>
          ))}
          <ul className="check-list reveal">
            {ABOUT_CHECKS.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="kicker reveal" style={{ marginBottom: 20 }}>
            How I work
          </p>
          <div className="process">
            {PROCESS.map(([title, body], i) => (
              <div className="process-step reveal" key={title}>
                <span className="step-num">{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Experience & education ───────── */
export function Experience({ items }: { items: ExperienceItem[] }) {
  const jobs = items.filter((i) => i.kind === "experience");
  const education = items.filter((i) => i.kind === "education");

  return (
    <section id="experience" aria-labelledby="experience-title">
      <div className="shell">
        <p className="kicker reveal" style={{ marginBottom: 32 }}>
          04 · Track record
        </p>
        <div className="timeline-grid">
          <div className="timeline-col reveal">
            <h2 id="experience-title">Experience</h2>
            <div className="timeline">
              {jobs.map((job) => (
                <article className="timeline-item" key={job.id}>
                  {job.period && <p className="time">{job.period}</p>}
                  <h3>{job.title}</h3>
                  <span>{job.organization}</span>
                  {job.description && <p>{job.description}</p>}
                </article>
              ))}
            </div>
          </div>

          <div className="timeline-col reveal">
            <h2>Education</h2>
            <div className="timeline">
              {education.map((edu) => (
                <article className="timeline-item" key={edu.id}>
                  {edu.period && <p className="time">{edu.period}</p>}
                  <h3>{edu.title}</h3>
                  <span>{edu.organization}</span>
                  {edu.description && <p>{edu.description}</p>}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Certifications ───────── */
export function Certifications({ items }: { items: Certificate[] }) {
  return (
    <section id="certifications" aria-labelledby="certifications-title">
      <div className="shell">
        <div className="section-head cert-head">
          <div>
            <p className="kicker reveal">05 · Certifications</p>
            <h2 id="certifications-title" className="section-title reveal">
              Verified, not just <em>claimed.</em>
            </h2>
            <p className="section-copy reveal">Every badge links straight to Credly. Click Verify, check for yourself.</p>
          </div>
          <div className="cert-seal reveal" aria-hidden="true">
            <svg viewBox="0 0 100 100">
              <defs>
                <path id="sealCircle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
              </defs>
              <text fontSize="8.2" letterSpacing="1.8">
                <textPath href="#sealCircle">CISCO VERIFIED + CREDLY CHECKED + </textPath>
              </text>
              <path
                className="seal-check"
                d="M39 50l8 8 15-16"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className="cert-ledger">
          {items.map((cert, i) => (
            <div className="cert-row reveal" key={cert.id}>
              <span className="cert-index">{String(i + 1).padStart(2, "0")}</span>
              <div className="cert-info">
                <h3>{cert.title}</h3>
                <p>{cert.issuer}</p>
              </div>
              <div className="cert-actions">
                {cert.credly_url && (
                  <a
                    href={cert.credly_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Verify ${cert.title} on Credly (opens in new window)`}
                  >
                    Verify
                  </a>
                )}
                {cert.pdf_url &&
                  (cert.pdf_url.startsWith("/") ? (
                    <a href={cert.pdf_url} download>
                      PDF
                    </a>
                  ) : (
                    // Uploaded files live on another origin, where the download attribute is ignored.
                    <a href={cert.pdf_url} target="_blank" rel="noreferrer">
                      PDF
                    </a>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Contact ───────── */
export function Contact() {
  return (
    <section id="contact" className="contact-section" aria-labelledby="contact-title">
      <div className="shell">
        <div className="contact-panel reveal" id="contactPanel">
          <p className="kicker">06 · Contact</p>
          <h2 id="contact-title">
            Have an AI product in mind? <em>Let&apos;s talk.</em>
          </h2>
          <p>
            Tell me what you&apos;re building. Within 24 hours you&apos;ll get an honest answer: can I help,
            how long it takes, and what it costs.
          </p>
          <a className="contact-email" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          <div className="contact-actions">
            <a className="btn panel-solid magnetic" href={`mailto:${SITE.email}?subject=Project%20inquiry`}>
              Email me
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16v12H4z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </a>
            <a
              className="btn panel-outline"
              href={SITE.whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label="Message on WhatsApp (opens in new window)"
            >
              WhatsApp
            </a>
            <a className="btn panel-outline" href="/resume.pdf" download>
              Download CV
              <DownloadIcon />
            </a>
          </div>
          <p className="contact-note">USUALLY REPLIES WITHIN 24 HOURS · HYDERABAD, SINDH · REMOTE WORLDWIDE</p>
        </div>
      </div>
    </section>
  );
}

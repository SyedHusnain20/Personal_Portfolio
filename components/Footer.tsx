import { NAV_LINKS, SITE } from "@/lib/content";

export default function Footer() {
  return (
    <footer>
      <div className="shell footer-shell">
        <div className="footer-top">
          <div className="footer-brand">
            <a className="brand" href="#main">
              Hasnain<em>.</em>
            </a>
            <p>
              AI developer and software engineer in Hyderabad, Sindh, building RAG systems, LLM apps, and APIs
              that hold up in production.
            </p>
            <p className="footer-status">
              <span className="status-dot" aria-hidden="true" />
              Available for new projects
            </p>
          </div>
          <nav className="footer-col" aria-label="Footer: explore">
            <h3>Explore</h3>
            {NAV_LINKS.map(([id, label]) => (
              <a href={`#${id}`} key={id}>
                {label}
              </a>
            ))}
          </nav>
          <nav className="footer-col" aria-label="Footer: connect">
            <h3>Connect</h3>
            <a href={SITE.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href={SITE.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={SITE.whatsapp} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </nav>
          <div className="footer-col">
            <h3>Hire me</h3>
            <a href="#contact">Start a project</a>
            <a href="/resume.pdf" download>
              Download CV
            </a>
            <a href={`mailto:${SITE.email}`} className="footer-email">
              {SITE.email}
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Hasnain Zainulabdin · AI Developer &amp; Software Engineer ·
            Hyderabad, Sindh, Pakistan
          </span>
          <a className="back-top" href="#main">
            Back to top ↑
          </a>
        </div>
      </div>
      <div className="footer-watermark" aria-hidden="true">
        HASNAIN
      </div>
    </footer>
  );
}

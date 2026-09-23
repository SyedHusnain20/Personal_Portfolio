# Hasnain Zainulabdin — Portfolio

Personal portfolio website for Hasnain Zainulabdin, an AI & Machine Learning Engineer based in Hyderabad, Pakistan.

## Overview

A single-page, dark "luxury" themed portfolio built with plain HTML, CSS, and vanilla JavaScript — no frameworks or build steps required.

## Sections

- **Hero** — Name, title, availability status, and profile photo
- **About** — Background, education, and current focus
- **Skills** — Technical stack grouped by category (Core Language, Data Science, AI/ML, Backend, Tools & Platforms)
- **Projects** — Featured work: ShariahEase, Qanoon Daan, ResuFit, and Social Media API
- **Certifications** — Cisco-verified credentials with links to badges and PDFs
- **Contact** — Email, LinkedIn, GitHub, WhatsApp, and Instagram

## Design

- **Theme**: Dark, gold/cream "luxury" aesthetic with grain texture and twinkling star background
- **Fonts**: Cormorant Garamond (display), Outfit (body), JetBrains Mono (labels/tags)
- **Effects**: Custom cursor, scroll-reveal animations, floating particles, glowing photo frame

## Files

```
index.html      — Main portfolio page (self-contained, image embedded as base64)
resume.pdf      — Downloadable resume (add your own file)
Certificates/   — Folder for certification PDFs and badge images (add your own files)
```

## Setup / Deployment

1. Place `index.html` in your hosting root (GitHub Pages, Vercel, Netlify, etc.)
2. Add a `resume.pdf` file in the same directory for the "Download Resume" buttons
3. Create a `Certificates/` folder with the certificate PDFs and badge images referenced in the certifications section
4. Update social links and project URLs as needed (e.g. ShariahEase HF Spaces link once deployed)

## Customization Notes

- All colors are defined as CSS variables in `:root` — edit the `--gold`, `--bg`, `--text`, etc. values to retheme
- The profile photo is embedded directly as a base64 data URI inside `index.html`, so no separate image file is needed
- Project cards, skill pills, and certification cards can be duplicated/edited directly in the HTML — no templating engine involved

## Contact

**Engr. Hasnain Zainulabdin**
R&R Digital Solutions

Contact: 03126641281 | [HasnainZainulabdin@gmail.com](mailto:HasnainZainulabdin@gmail.com)
Website: https://hasnainzainulabdin.vercel.app/

---
Built with intention.

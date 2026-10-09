/* Describes each editable table once; ResourceManager builds the list, form and payloads from it.
   Field keys match backend/schemas.py exactly. */

export type FieldType = "text" | "textarea" | "url" | "upload" | "tags" | "lines" | "checkbox" | "date";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  maxLength?: number;
  accept?: string; // upload fields: file picker filter
};

export type ResourceConfig = {
  /** Endpoint under /api/admin/ */
  path: string;
  /** Only show rows of this kind (experience vs education share one table). */
  kind?: "experience" | "education";
  singular: string;
  plural: string;
  intro: string;
  title: (item: Record<string, unknown>) => string;
  subtitle: (item: Record<string, unknown>) => string;
  fields: Field[];
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

const timeline = (kind: "experience" | "education"): Field[] => [
  { key: "title", label: kind === "experience" ? "Role" : "Degree or programme", type: "text", required: true, maxLength: 200 },
  {
    key: "organization",
    label: kind === "experience" ? "Company or client" : "Institution",
    type: "text",
    required: true,
    maxLength: 200,
  },
  {
    key: "period",
    label: "Period",
    type: "text",
    maxLength: 60,
    placeholder: "2025 – Present",
    help: "Free text, shown above the title. Optional.",
  },
  { key: "description", label: "Description", type: "textarea", maxLength: 1000 },
  { key: "is_published", label: "Published (visible on the site)", type: "checkbox" },
];

export const RESOURCES = {
  projects: {
    path: "projects",
    singular: "project",
    plural: "Projects",
    intro:
      "The first card on the home page is the featured project. Everything else appears in the grid, in the order shown here.",
    title: (i) => str(i.title),
    subtitle: (i) => [str(i.category), str(i.live_url) || "no live link"].filter(Boolean).join(" · "),
    fields: [
      { key: "title", label: "Title", type: "text", required: true, maxLength: 160 },
      {
        key: "category",
        label: "Category label",
        type: "text",
        required: true,
        maxLength: 80,
        placeholder: "Legal AI",
        help: "Small label above the title.",
      },
      { key: "description", label: "Description", type: "textarea", required: true, maxLength: 2000 },
      { key: "tags", label: "Tags", type: "tags", help: "Comma separated, e.g. Python, FastAPI, FAISS (max 12)." },
      {
        key: "live_url",
        label: "Live link",
        type: "url",
        placeholder: "https://…",
        help: "Leave blank if it isn't deployed yet: the button is hidden instead of pointing nowhere.",
      },
      { key: "github_url", label: "GitHub link", type: "url", placeholder: "https://github.com/…" },
      {
        key: "image_url",
        label: "Screenshot",
        type: "upload",
        accept: "image/*",
        help: "Optional. On the featured project it replaces the pipeline diagram.",
      },
      {
        key: "flow_steps",
        label: "Pipeline steps (featured project only)",
        type: "lines",
        help: "One step per line, up to 6, for the diagram next to the featured project.",
      },
      { key: "flow_caption", label: "Diagram caption", type: "text", maxLength: 120 },
      {
        key: "slug",
        label: "URL slug",
        type: "text",
        maxLength: 120,
        placeholder: "auto-generated from the title",
        help: "Lowercase letters, numbers and hyphens. Leave blank to keep or generate it.",
      },
      {
        key: "is_featured",
        label: "Feature this project (only one at a time; featuring it un-features the previous one)",
        type: "checkbox",
      },
      { key: "is_published", label: "Published (visible on the site)", type: "checkbox" },
    ],
  },

  certificates: {
    path: "certificates",
    singular: "certificate",
    plural: "Certificates",
    intro: "Each row on the site shows a Verify button (Credly link) and a PDF button, whichever you fill in.",
    title: (i) => str(i.title),
    subtitle: (i) => [str(i.issuer), str(i.issued_on)].filter(Boolean).join(" · "),
    fields: [
      { key: "title", label: "Title", type: "text", required: true, maxLength: 200 },
      { key: "issuer", label: "Issuer", type: "text", required: true, maxLength: 160, placeholder: "Cisco Networking Academy" },
      { key: "credly_url", label: "Credly (or other verification) link", type: "url", placeholder: "https://www.credly.com/badges/…" },
      {
        key: "pdf_url",
        label: "Certificate PDF",
        type: "upload",
        accept: "application/pdf",
        help: "Upload a PDF, or paste a path like /Certificates/MyCert.pdf.",
      },
      { key: "issued_on", label: "Issue date", type: "date" },
      { key: "is_published", label: "Published (visible on the site)", type: "checkbox" },
    ],
  },

  experience: {
    path: "experience",
    kind: "experience",
    singular: "experience entry",
    plural: "Experience",
    intro: "Work history shown in the left column of the Track record section.",
    title: (i) => str(i.title),
    subtitle: (i) => [str(i.organization), str(i.period)].filter(Boolean).join(" · "),
    fields: timeline("experience"),
  },

  education: {
    path: "experience",
    kind: "education",
    singular: "education entry",
    plural: "Education",
    intro: "Shown in the right column of the Track record section.",
    title: (i) => str(i.title),
    subtitle: (i) => [str(i.organization), str(i.period)].filter(Boolean).join(" · "),
    fields: timeline("education"),
  },
} satisfies Record<string, ResourceConfig>;

export type ResourceKey = keyof typeof RESOURCES;

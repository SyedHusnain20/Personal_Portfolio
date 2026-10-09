export type Project = {
  id: number;
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  live_url: string | null;
  github_url: string | null;
  image_url: string | null;
  flow_steps: string[] | null;
  flow_caption: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  updated_at: string | null;
};

export type Certificate = {
  id: number;
  title: string;
  issuer: string;
  credly_url: string | null;
  pdf_url: string | null;
  issued_on: string | null;
  is_published: boolean;
  sort_order: number;
  updated_at: string | null;
};

export type Experience = {
  id: number;
  kind: "experience" | "education";
  title: string;
  organization: string;
  period: string | null;
  description: string | null;
  is_published: boolean;
  sort_order: number;
  updated_at: string | null;
};

export type Content = {
  projects: Project[];
  certificates: Certificate[];
  experience: Experience[];
};

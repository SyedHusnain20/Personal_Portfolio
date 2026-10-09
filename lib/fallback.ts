import seed from "@/data/seed.json";
import type { Content } from "./types";

// Same data the database is seeded with. Used when the API can't be reached
// (first build before the API exists, local dev without the API running).
const withMeta = <T extends object>(rows: T[]) =>
  rows.map((row, i) => ({ id: i + 1, sort_order: i, updated_at: null, ...row }));

export const fallbackContent = {
  projects: withMeta(seed.projects),
  certificates: withMeta(seed.certificates),
  experience: withMeta(seed.experience),
} as unknown as Content;

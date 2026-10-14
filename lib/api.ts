import { fallbackContent } from "./fallback";
import type { Certificate, Content, Experience, Project } from "./types";

/**
 * Where server components reach the FastAPI app. Locally that is the uvicorn server
 * (API_BASE_URL); on Vercel the API lives on the same domain as the site, so SITE_URL
 * (set it to https://hasnainzainulabdin.vercel.app) is used, then Vercel's own production URL.
 */
export function apiBase(): string {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, "");
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://127.0.0.1:8000";
}

const isBuild = () => process.env.NEXT_PHASE === "phase-production-build";
const isDev = () => process.env.NODE_ENV === "development";

async function load<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      next: { revalidate: 60, tags: ["content"] },
    });
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return (await res.json()) as T;
  } catch {
    // When API is not running locally or during build, use seed fallback data seamlessly
    return fallback;
  }
}

export async function getContent(): Promise<Content> {
  const [projects, certificates, experience] = await Promise.all([
    load<Project[]>("/api/projects", fallbackContent.projects),
    load<Certificate[]>("/api/certificates", fallbackContent.certificates),
    load<Experience[]>("/api/experience", fallbackContent.experience),
  ]);
  return { projects, certificates, experience };
}

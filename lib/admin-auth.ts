import { apiBase } from "./api";

/**
 * Ask the FastAPI app who the current admin is, forwarding the session cookie.
 * Returns the admin's email, or null when the cookie is missing, expired or invalid.
 * Keeping verification in one place (FastAPI) means Next.js never needs the JWT secret.
 */
export async function adminEmail(cookieHeader: string | null | undefined): Promise<string | null> {
  if (!cookieHeader) return null;
  try {
    const res = await fetch(`${apiBase()}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

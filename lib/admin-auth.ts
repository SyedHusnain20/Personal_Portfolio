import { apiBase } from "./api";

/**
 * Hosts this deployment is legitimately served from. The admin check must call the API of the
 * deployment the visitor is actually on: on a Vercel preview, apiBase() points at production
 * (or the old site), which has never seen this login cookie, so every check would fail.
 */
function trustedHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const v of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (v) hosts.add(v.toLowerCase());
  }
  if (process.env.SITE_URL) {
    try {
      hosts.add(new URL(process.env.SITE_URL).host.toLowerCase());
    } catch {
      /* ignore a malformed SITE_URL */
    }
  }
  return hosts;
}

/** Base URL of the API for the host the request came in on, or the default when that host isn't ours. */
export function apiBaseForHost(host: string | null | undefined): string {
  const h = host?.split(",")[0].trim().toLowerCase();
  if (h && trustedHosts().has(h)) return `https://${h}`;
  return apiBase();
}

/**
 * Ask the FastAPI app who the current admin is, forwarding the session cookie.
 * Returns the admin's email, or null when the cookie is missing, expired or invalid.
 * Keeping verification in one place (FastAPI) means Next.js never needs the JWT secret.
 *
 * `host` is the request's Host (x-forwarded-host) so previews check against themselves.
 */
export async function adminEmail(
  cookieHeader: string | null | undefined,
  host?: string | null,
): Promise<string | null> {
  if (!cookieHeader) {
    console.warn("[admin-auth] no cookies on the request");
    return null;
  }
  const url = `${apiBaseForHost(host)}/api/auth/me`;
  try {
    const res = await fetch(url, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) {
      // Status only, never cookie values. 401 = no/invalid admin_token; 401 with an HTML body = Vercel deployment protection.
      console.warn(`[admin-auth] ${url} responded ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch (err) {
    console.warn(`[admin-auth] ${url} failed: ${String(err)}`);
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type FastApiDetail = string | Array<{ loc?: Array<string | number>; msg?: string }>;

/** Turn FastAPI's error body into one readable line, e.g. "live_url: must be an http(s) URL…". */
function describe(detail: FastApiDetail | undefined, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = (d.loc ?? []).filter((part) => part !== "body").join(".");
        const msg = String(d.msg).replace(/^Value error, /, "");
        return field ? `${field}: ${msg}` : msg;
      })
      .join("; ");
  }
  return `Request failed (${status})`;
}

type Options = RequestInit & { redirectOn401?: boolean };

/** fetch() for the admin API: JSON in/out, same-origin cookie, readable errors. */
export async function adminFetch<T = unknown>(path: string, init: Options = {}): Promise<T> {
  const { redirectOn401 = true, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...rest.headers },
  });

  if (res.status === 401 && redirectOn401) {
    window.location.assign("/admin/login");
    throw new ApiError(401, "Your session expired. Redirecting to sign in…");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: FastApiDetail };
    throw new ApiError(res.status, describe(body.detail, res.status));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

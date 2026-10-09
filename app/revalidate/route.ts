import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * FastAPI calls this after every admin change so the public page updates immediately
 * instead of waiting for the 60-second cache window. Protected by a shared secret.
 */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;
  const given = request.headers.get("x-revalidate-secret") ?? "";
  if (!expected || !sameSecret(given, expected)) {
    return Response.json({ revalidated: false }, { status: 403 });
  }
  revalidateTag("content");
  revalidatePath("/");
  return Response.json({ revalidated: true });
}

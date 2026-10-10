import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { adminEmail } from "@/lib/admin-auth";

/**
 * Token endpoint for browser-direct uploads to Vercel Blob (certificate PDFs, project screenshots).
 * The file goes from the browser straight to Blob storage, so Vercel's 4.5 MB request-body
 * limit on functions doesn't apply. Only a logged-in admin can get an upload token.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await adminEmail(
            request.headers.get("cookie"),
            request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
          ))) {
          throw new Error("Not authenticated");
        }
        return {
          allowedContentTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "application/pdf"],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      // Nothing to record: the admin form receives the URL directly from the browser upload.
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return Response.json({ error: message }, { status: message === "Not authenticated" ? 401 : 400 });
  }
}

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import { adminEmail } from "@/lib/admin-auth";

// Everything under /admin except /admin/login requires a valid session cookie.
// The cookie is checked against the API on every request, so a sign-out or expiry takes effect at once.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const h = await headers();
  const email = await adminEmail(jar.toString(), h.get("x-forwarded-host") ?? h.get("host"));
  if (!email) redirect("/admin/login");

  return (
    <>
      <AdminNav email={email} />
      <main className="adm-main">{children}</main>
    </>
  );
}

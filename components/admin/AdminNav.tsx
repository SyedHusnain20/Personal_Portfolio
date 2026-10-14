"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "./client";

const LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/projects", "Projects"],
  ["/admin/certificates", "Certificates"],
  ["/admin/experience", "Experience"],
  ["/admin/education", "Education"],
  ["/admin/knowledge", "Naini"],
] as const;

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await adminFetch("/api/auth/logout", { method: "POST", redirectOn401: false }).catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="adm-bar">
      <span className="adm-brand">
        Hasnain<em>.</em> admin
      </span>
      <nav className="adm-links" aria-label="Admin">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
            {label}
          </Link>
        ))}
        <a href="/" target="_blank" rel="noreferrer">
          View site ↗
        </a>
      </nav>
      <div className="adm-who">
        <span>{email}</span>
        <button className="adm-btn small" type="button" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}

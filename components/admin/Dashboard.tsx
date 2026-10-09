"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, ApiError } from "./client";

type Row = { is_published: boolean; kind?: string };
type Counts = Record<"projects" | "certificates" | "experience", Row[]>;

function Stat({ label, rows, href }: { label: string; rows: Row[]; href: string }) {
  const live = rows.filter((r) => r.is_published).length;
  const drafts = rows.length - live;
  return (
    <div className="adm-card adm-stat">
      <strong>{live}</strong>
      <span>
        {label} published{drafts > 0 ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}
      </span>
      <Link href={href}>Manage →</Link>
    </div>
  );
}

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      adminFetch<Row[]>("/api/admin/projects"),
      adminFetch<Row[]>("/api/admin/certificates"),
      adminFetch<Row[]>("/api/admin/experience"),
    ])
      .then(([projects, certificates, experience]) => setCounts({ projects, certificates, experience }))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load."));
  }, []);

  async function refreshSite() {
    setBusy(true);
    setNote("");
    try {
      const res = await adminFetch<{ revalidated: boolean }>("/api/admin/revalidate", { method: "POST" });
      setNote(
        res.revalidated
          ? "Done. The public page now shows your latest changes."
          : "The site couldn't be reached right now. Changes still appear automatically within a minute.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">Dashboard</h1>
          <p className="adm-sub">
            Edit what appears on your portfolio. Every save updates the public page right away; drafts stay hidden
            until you publish them.
          </p>
        </div>
      </div>

      {error && (
        <p className="adm-error" role="alert" style={{ marginTop: 0, marginBottom: 14 }}>
          {error}
        </p>
      )}

      <div className="adm-stats">
        <Stat label="Projects" rows={counts?.projects ?? []} href="/admin/projects" />
        <Stat label="Certificates" rows={counts?.certificates ?? []} href="/admin/certificates" />
        <Stat
          label="Experience"
          rows={(counts?.experience ?? []).filter((r) => r.kind === "experience")}
          href="/admin/experience"
        />
        <Stat
          label="Education"
          rows={(counts?.experience ?? []).filter((r) => r.kind === "education")}
          href="/admin/education"
        />
      </div>

      <div className="adm-actions">
        <button className="adm-btn" type="button" onClick={refreshSite} disabled={busy}>
          {busy ? "Updating…" : "Update public site now"}
        </button>
        <a className="adm-btn" href="/" target="_blank" rel="noreferrer">
          Open site ↗
        </a>
      </div>
      {note && <p className="adm-ok">{note}</p>}
    </>
  );
}

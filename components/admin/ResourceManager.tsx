"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch, ApiError } from "./client";
import { RESOURCES, type Field, type ResourceKey } from "./resources";

type Item = Record<string, unknown> & { id: number; is_published: boolean };
type Values = Record<string, string | boolean>;

/* ── API row <-> form values ─────────────────────────────────────────────── */

function itemToValues(item: Item | null, fields: Field[]): Values {
  const values: Values = {};
  for (const f of fields) {
    const raw = item?.[f.key];
    if (f.type === "checkbox") values[f.key] = item ? Boolean(raw) : f.key === "is_published";
    else if (f.type === "tags") values[f.key] = Array.isArray(raw) ? raw.join(", ") : "";
    else if (f.type === "lines") values[f.key] = Array.isArray(raw) ? raw.join("\n") : "";
    else values[f.key] = typeof raw === "string" ? raw.slice(0, f.type === "date" ? 10 : undefined) : "";
  }
  return values;
}

function valuesToPayload(values: Values, fields: Field[], kind?: string): Record<string, unknown> {
  const payload: Record<string, unknown> = kind ? { kind } : {};
  for (const f of fields) {
    const v = values[f.key];
    if (f.type === "checkbox") payload[f.key] = Boolean(v);
    else if (f.type === "tags") {
      payload[f.key] = String(v).split(",").map((t) => t.trim()).filter(Boolean);
    } else if (f.type === "lines") {
      const lines = String(v).split("\n").map((t) => t.trim()).filter(Boolean);
      payload[f.key] = lines.length ? lines : null;
    } else {
      const text = String(v).trim();
      payload[f.key] = text === "" && !f.required ? null : text;
    }
  }
  return payload;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function ResourceManager({ resource }: { resource: ResourceKey }) {
  const config = RESOURCES[resource];
  const base = `/api/admin/${config.path}`;
  const kind = "kind" in config ? config.kind : undefined;

  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [values, setValues] = useState<Values>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await adminFetch<Item[]>(base));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load. Is the API running?");
      setItems((prev) => prev ?? []);
    }
  }, [base]);

  useEffect(() => {
    reload();
  }, [reload]);

  // The native <dialog> gives focus trapping and Esc-to-close for free.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (editing && !el.open) el.showModal();
    if (!editing && el.open) el.close();
  }, [editing]);

  const visible = (items ?? []).filter((i) => !kind || i.kind === kind);

  function openForm(target: Item | "new") {
    setValues(itemToValues(target === "new" ? null : target, config.fields));
    setFormError("");
    setEditing(target);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError("");
    try {
      const payload = valuesToPayload(values, config.fields, kind);
      if (editing === "new") await adminFetch(base, { method: "POST", body: JSON.stringify(payload) });
      else await adminFetch(`${base}/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      setEditing(null);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: Item) {
    setError("");
    try {
      const current = itemToValues(item, config.fields);
      const payload = valuesToPayload({ ...current, is_published: !item.is_published }, config.fields, kind);
      await adminFetch(`${base}/${item.id}`, { method: "PUT", body: JSON.stringify(payload) });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${config.title(item)}"? This can't be undone.`)) return;
    setError("");
    try {
      await adminFetch(`${base}/${item.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const a = visible[index];
    const b = visible[index + direction];
    if (!a || !b || !items) return;
    // Swap the two rows inside the full list so filtered views (experience vs education) stay consistent.
    const full = [...items];
    const ia = full.indexOf(a);
    const ib = full.indexOf(b);
    [full[ia], full[ib]] = [full[ib], full[ia]];
    setItems(full);
    try {
      await adminFetch(`${base}/reorder`, { method: "POST", body: JSON.stringify({ ids: full.map((i) => i.id) }) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reorder failed.");
      reload();
    }
  }

  async function onFile(field: Field, file: File | undefined) {
    if (!file) return;
    setUploading(field.key);
    setFormError("");
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/blob-upload" });
      setValues((v) => ({ ...v, [field.key]: blob.url }));
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      setFormError(
        `Upload failed (${reason}). Uploads need a Vercel Blob store (BLOB_READ_WRITE_TOKEN). You can paste a URL instead.`,
      );
    } finally {
      setUploading(null);
    }
  }

  const set = (key: string, value: string | boolean) => setValues((v) => ({ ...v, [key]: value }));

  function renderField(f: Field) {
    const id = `f-${f.key}`;
    const common = { id, required: f.required, maxLength: f.maxLength, placeholder: f.placeholder };

    if (f.type === "checkbox") {
      return (
        <label className="adm-check" key={f.key}>
          <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => set(f.key, e.target.checked)} />
          {f.label}
        </label>
      );
    }

    let control: React.ReactNode;
    if (f.type === "textarea" || f.type === "lines") {
      control = (
        <textarea
          {...common}
          className="adm-input"
          rows={f.type === "lines" ? 4 : 5}
          value={String(values[f.key] ?? "")}
          onChange={(e) => set(f.key, e.target.value)}
        />
      );
    } else if (f.type === "upload") {
      control = (
        <div className="adm-inline">
          <input
            {...common}
            className="adm-input"
            type="text"
            inputMode="url"
            value={String(values[f.key] ?? "")}
            onChange={(e) => set(f.key, e.target.value)}
          />
          <label className="adm-btn small" style={{ whiteSpace: "nowrap" }}>
            {uploading === f.key ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept={f.accept}
              hidden
              disabled={uploading !== null}
              onChange={(e) => {
                onFile(f, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      );
    } else {
      control = (
        <input
          {...common}
          className="adm-input"
          type={f.type === "date" ? "date" : "text"}
          inputMode={f.type === "url" ? "url" : undefined}
          value={String(values[f.key] ?? "")}
          onChange={(e) => set(f.key, e.target.value)}
        />
      );
    }

    return (
      <div className="adm-field" key={f.key}>
        <label htmlFor={id}>
          {f.label}
          {f.required && " *"}
        </label>
        {control}
        {f.help && <small>{f.help}</small>}
      </div>
    );
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1 className="adm-h1">{config.plural}</h1>
          <p className="adm-sub">{config.intro}</p>
        </div>
        <button className="adm-btn primary" type="button" onClick={() => openForm("new")}>
          + Add {config.singular}
        </button>
      </div>

      {error && (
        <p className="adm-error" role="alert" style={{ marginTop: 0, marginBottom: 14 }}>
          {error}
        </p>
      )}

      {items === null ? (
        <p className="adm-sub">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="adm-empty">Nothing here yet. Add your first {config.singular}.</div>
      ) : (
        <ul className="adm-list">
          {visible.map((item, i) => (
            <li className={`adm-row${item.is_published ? "" : " is-draft"}`} key={item.id}>
              <div>
                <div className="adm-row-title">
                  {config.title(item)}
                  {!item.is_published && <span className="adm-badge">Draft</span>}
                  {item.is_featured === true && <span className="adm-badge accent">Featured</span>}
                </div>
                <div className="adm-row-sub">{config.subtitle(item)}</div>
              </div>
              <div className="adm-row-tools">
                <button
                  className="adm-btn small"
                  type="button"
                  aria-label={`Move ${config.title(item)} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  className="adm-btn small"
                  type="button"
                  aria-label={`Move ${config.title(item)} down`}
                  disabled={i === visible.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button className="adm-btn small" type="button" onClick={() => togglePublished(item)}>
                  {item.is_published ? "Unpublish" : "Publish"}
                </button>
                <button className="adm-btn small" type="button" onClick={() => openForm(item)}>
                  Edit
                </button>
                <button className="adm-btn small danger" type="button" onClick={() => remove(item)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog ref={dialog} className="adm-dialog" onClose={() => setEditing(null)} aria-labelledby="adm-form-title">
        {editing && (
          <form className="adm-form" onSubmit={save}>
            <h2 id="adm-form-title">
              {editing === "new" ? `Add ${config.singular}` : `Edit ${config.singular}`}
            </h2>
            {config.fields.map(renderField)}
            {formError && (
              <p className="adm-error" role="alert" style={{ marginTop: 0 }}>
                {formError}
              </p>
            )}
            <div className="adm-form-actions">
              <button className="adm-btn" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="adm-btn primary" type="submit" disabled={saving || uploading !== null}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

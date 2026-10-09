"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, ApiError } from "@/components/admin/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        redirectOn401: false,
      });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="adm-login">
      <form onSubmit={onSubmit}>
        <div>
          <h1 className="adm-h1">Admin sign in</h1>
          <p className="adm-sub">Hasnain&apos;s portfolio. Content management only.</p>
        </div>
        <div className="adm-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="adm-input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="adm-input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="adm-error" role="alert" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}
        <button className="adm-btn primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

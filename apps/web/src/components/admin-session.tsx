"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminSession() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await fetch("/api/admin-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!r.ok) {
            const v = await r.json();
            setError(v.error);
          } else {
            setToken("");
            router.refresh();
          }
        } catch {
          setError("Connection failed. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Admin session</h2>
      <p>
        Use a short-lived Supabase access token for an account with the admin
        role. Tokens stay in an HTTP-only session cookie.
      </p>
      <label htmlFor="token">Access token</label>
      <input
        id="token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
        autoComplete="off"
        aria-describedby="session-error"
      />
      <div className="actions">
        <button disabled={busy}>
          {busy ? "Checking…" : "Start admin session"}
        </button>
      </div>
      <p id="session-error" className="error" role="status">
        {error}
      </p>
    </form>
  );
}

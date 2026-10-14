"use client";
import { requestError } from "@/lib/display";
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
            setError(requestError(r.status));
          } else {
            setToken("");
            router.refresh();
          }
        } catch {
          setError("Không kết nối được. Vui lòng thử lại.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Phiên đăng nhập quản trị</h2>
      <p>
        Dán mã truy cập Supabase còn hiệu lực của tài khoản quản trị để đăng nhập.
      </p>
      <label htmlFor="token">Mã truy cập (access token)</label>
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
          {busy ? "Đang kiểm tra…" : "Đăng nhập quản trị"}
        </button>
      </div>
      <p id="session-error" className="error" role="status">
        {error}
      </p>
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewItem } from "@invest/domain";
export function ReviewActions({ item }: { item: ReviewItem }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function decide(decision: "verified" | "rejected") {
    if (!note.trim()) {
      setError("Add a review note before deciding.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/v1/admin/mappings/${item.mapping.id}?type=${item.type}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, note }),
        },
      );
      if (!r.ok) {
        const v = await r.json();
        setError(v.error);
      } else router.refresh();
    } catch {
      setError("Connection failed. Your note has been retained.");
    } finally {
      setBusy(false);
    }
  }
  const id = `review-${item.mapping.id}`;
  return (
    <div>
      <label htmlFor={id}>Decision evidence and reasoning</label>
      <textarea
        id={id}
        maxLength={4000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-describedby={`${id}-error`}
      />
      <div className="actions">
        <button
          disabled={busy || item.mapping.resolution_method === "fuzzy_name"}
          onClick={() => decide("verified")}
        >
          {busy ? "Saving…" : "Verify mapping"}
        </button>
        <button disabled={busy} onClick={() => decide("rejected")}>
          Reject
        </button>
      </div>
      {item.mapping.resolution_method === "fuzzy_name" && (
        <p>
          Fuzzy proposals require a new proposal with documentary evidence
          before verification.
        </p>
      )}
      <p id={`${id}-error`} className="error" role="status">
        {error}
      </p>
    </div>
  );
}

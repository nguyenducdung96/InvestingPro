"use client";
import { requestError } from "@/lib/display";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewItem } from "@invest/domain";
export function ReviewActions({ item }: { item: ReviewItem }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const fuzzy = "resolution_method" in item.mapping && item.mapping.resolution_method === "fuzzy_name";
  async function decide(decision: "verified" | "rejected") {
    if (!note.trim()) {
      setError("Vui lòng ghi lý do trước khi duyệt.");
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
        setError(requestError(r.status, true));
      } else router.refresh();
    } catch {
      setError("Không kết nối được. Ghi chú của bạn vẫn được giữ lại.");
    } finally {
      setBusy(false);
    }
  }
  const id = `review-${item.mapping.id}`;
  return (
    <div>
      <label htmlFor={id}>Bằng chứng và lý do quyết định</label>
      <textarea
        id={id}
        maxLength={4000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-describedby={`${id}-error`}
      />
      <div className="actions">
        <button
          disabled={busy || fuzzy}
          onClick={() => decide("verified")}
        >
          {busy ? "Đang lưu…" : "Xác minh quan hệ"}
        </button>
        <button disabled={busy} onClick={() => decide("rejected")}>
          Từ chối
        </button>
      </div>
      {fuzzy && (
        <p>
          Đề xuất dựa trên tên gần giống cần được thay bằng đề xuất có bằng chứng
          tài liệu trước khi xác minh.
        </p>
      )}
      <p id={`${id}-error`} className="error" role="status">
        {error}
      </p>
    </div>
  );
}

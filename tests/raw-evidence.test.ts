import { it, expect, vi } from "vitest";
import { persistRawEvidence } from "../packages/db/src/raw-evidence";
it("writes raw evidence under a content-addressed immutable key", async () => {
  const put = vi.fn(async () => ({}));
  const result = await persistRawEvidence(
    { put, head: async () => null },
    new TextEncoder().encode("evidence"),
    "application/pdf",
  );
  expect(result.content_hash).toHaveLength(64);
  expect(result.raw_storage_key).toContain(result.content_hash);
  expect(put.mock.calls[0]).toHaveLength(3);
});
it("requires checksum metadata on an existing object", async () => {
  await expect(
    persistRawEvidence(
      {
        put: async () => null,
        head: async () => ({ customMetadata: { sha256: "wrong" } }),
      },
      new TextEncoder().encode("evidence"),
      "application/pdf",
    ),
  ).rejects.toThrow("checksum");
});

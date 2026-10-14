// R2 adapter used by trusted catalog imports before inserting source_records.
// No connector is enabled by Slice 1. Never send R2 credentials to a browser.
export interface EvidenceBucket {
  put(
    key: string,
    value: Uint8Array,
    options: {
      onlyIf: { etagDoesNotMatch: string };
      customMetadata: Record<string, string>;
      httpMetadata: { contentType: string };
    },
  ): Promise<unknown | null>;
  head(
    key: string,
  ): Promise<{ customMetadata?: Record<string, string> } | null>;
}
export async function persistRawEvidence(
  bucket: EvidenceBucket,
  bytes: Uint8Array,
  contentType: string,
) {
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  const key = `catalog-evidence/sha256/${hash}`;
  const written = await bucket.put(key, bytes, {
    onlyIf: { etagDoesNotMatch: "*" },
    customMetadata: { sha256: hash },
    httpMetadata: { contentType },
  });
  if (written === null) {
    const existing = await bucket.head(key);
    if (existing?.customMetadata?.sha256 !== hash)
      throw new Error("Existing raw evidence failed checksum verification");
  }
  return {
    content_hash: hash,
    raw_storage_key: key,
    content_type: contentType,
  };
}

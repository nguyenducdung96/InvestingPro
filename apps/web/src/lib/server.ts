import "server-only";
import { cookies } from "next/headers";
import { SupabaseCatalogRepository, supabaseTransport } from "@invest/db";
import { HttpError } from "./errors";
import {publishedCatalogTransport} from './published-catalog';
export { HttpError } from "./errors";
export function config() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new HttpError(503, "Catalog database is not configured");
  return { url, key };
}
export function publicRepository() {
  const { url, key } = config();
  return new SupabaseCatalogRepository(publishedCatalogTransport(supabaseTransport(url, key)));
}
export async function accessToken(request?: Request) {
  const header = request?.headers.get("Authorization");
  return header?.startsWith("Bearer ")
    ? header.slice(7)
    : (await cookies()).get("catalog_access_token")?.value;
}
export async function adminRepository(request?: Request) {
  const { url, key } = config();
  const token=await accessToken(request);
  if (!token) throw new HttpError(401, "Sign in with an admin account");
  // Verify with Supabase Auth; never authorize by decoding client-provided JWT claims.
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(401, "Invalid or expired session");
  const user = (await response.json()) as { app_metadata?: { role?: string } };
  if (user.app_metadata?.role !== "admin")
    throw new HttpError(403, "Admin role required");
  return new SupabaseCatalogRepository(
    supabaseTransport(url, key, token),
    true,
  );
}

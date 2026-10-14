import { cookies } from "next/headers";
import { adminRepository, HttpError } from "@/lib/server";
import { sameOrigin } from "@/lib/origin";
export async function POST(request: Request) {
  if (!sameOrigin(request, true))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 8192)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const { token } = JSON.parse(raw) as { token?: unknown };
    if (typeof token !== "string" || !token)
      return Response.json({ error: "Access token required" }, { status: 400 });
    await adminRepository(
      new Request(request.url, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    (await cookies()).set("catalog_access_token", token, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
    });
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof HttpError
            ? e.message
            : "Session could not be established",
      },
      { status: e instanceof HttpError ? e.status : 400 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request, true))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  (await cookies()).delete("catalog_access_token");
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

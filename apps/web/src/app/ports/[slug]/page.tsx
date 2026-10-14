import { DetailPage } from "@/components/detail-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <DetailPage kind="port" slug={(await params).slug} />;
}

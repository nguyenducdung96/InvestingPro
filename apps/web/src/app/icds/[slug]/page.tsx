import { DetailPage } from "@/components/detail-page";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DetailPage kind="icd" slug={slug} />;
}

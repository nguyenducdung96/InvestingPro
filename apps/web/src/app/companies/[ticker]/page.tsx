import { CompanyPage } from "@/components/company-page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <CompanyPage
      keyValue={(await params).ticker.toUpperCase()}
      query={await searchParams}
    />
  );
}

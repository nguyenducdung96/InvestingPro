import { CompanyPage } from "@/components/company-page";
import { PhpThroughput } from '@/components/php-throughput';
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const ticker=(await params).ticker.toUpperCase();
  const query=await searchParams;
  return (
    <>
    {ticker==='PHP'&&<PhpThroughput query={query}/>}
    <CompanyPage
      keyValue={ticker}
      query={query}
    />
    </>
  );
}

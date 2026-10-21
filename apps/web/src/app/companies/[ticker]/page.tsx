import { CompanyPage } from "@/components/company-page";
import {PhpBerthScope} from '@/components/php-berth-scope';
import { PhpThroughput } from '@/components/php-throughput';
import {PhpPlans} from '@/components/php-plans';
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
    {ticker==='PHP'&&<PhpBerthScope/>}
    {ticker==='PHP'&&<PhpPlans query={query}/>}
    {ticker==='PHP'&&<PhpThroughput query={query}/>}
    <CompanyPage
      keyValue={ticker}
      query={query}
    />
    </>
  );
}

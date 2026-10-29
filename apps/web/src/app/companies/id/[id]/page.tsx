import { CompanyPage } from "@/components/company-page";
import {notFound} from 'next/navigation';
import {isPublishedCompany} from '@/lib/published-catalog';
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const id=(await params).id;
  if(!isPublishedCompany(id))notFound();
  return (
    <CompanyPage keyValue={id} query={await searchParams} />
  );
}

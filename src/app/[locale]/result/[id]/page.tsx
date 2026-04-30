import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generateResultMetadata, ResultPageContent } from "@/components/pages/ResultPage";
import { isLocale, type Locale } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) notFound();
  return generateResultMetadata({ id: params.id, searchParams, requestedLocale: params.locale });
}

export default async function LocalizedResultPage({ params }: { params: { locale: string; id: string } }) {
  if (!isLocale(params.locale)) notFound();
  return ResultPageContent({ id: params.id, requestedLocale: params.locale as Locale });
}

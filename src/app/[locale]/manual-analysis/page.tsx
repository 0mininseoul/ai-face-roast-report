import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ManualAnalysisClient } from "@/components/manual-analysis/ManualAnalysisClient";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isLocale } from "@/lib/i18n/locales";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) notFound();
  const dictionary = getDictionary(params.locale);
  return {
    title: dictionary.metadata.manualTitle,
    description: dictionary.metadata.manualDescription,
  };
}

export default function LocalizedManualAnalysisPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  noStore();
  return <ManualAnalysisClient locale={params.locale} />;
}

import { notFound } from "next/navigation";
import { AnalyzePage } from "@/components/pages/AnalyzePage";
import { isLocale } from "@/lib/i18n/locales";

export default function LocalizedAnalyzePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return <AnalyzePage locale={params.locale} />;
}

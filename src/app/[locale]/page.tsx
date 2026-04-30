import { notFound } from "next/navigation";
import { EntryPage } from "@/components/pages/EntryPage";
import { isLocale } from "@/lib/i18n/locales";

export default function LocalizedEntryPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return <EntryPage locale={params.locale} />;
}

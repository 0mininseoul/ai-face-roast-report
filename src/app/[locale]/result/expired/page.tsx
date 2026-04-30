import { notFound } from "next/navigation";
import { ExpiredContent } from "@/components/pages/ExpiredPage";
import { isLocale } from "@/lib/i18n/locales";

export default function LocalizedExpiredPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return <ExpiredContent locale={params.locale} />;
}

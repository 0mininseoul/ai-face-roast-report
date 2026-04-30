import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MobileOnlyContent } from "@/components/pages/MobileOnlyPage";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isLocale } from "@/lib/i18n/locales";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) notFound();
  return { title: getDictionary(params.locale).metadata.mobileTitle };
}

export default function LocalizedMobileOnlyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  return <MobileOnlyContent locale={params.locale} />;
}

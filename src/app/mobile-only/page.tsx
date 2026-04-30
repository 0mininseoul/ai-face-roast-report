import { MobileOnlyContent } from "@/components/pages/MobileOnlyPage";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

export const metadata = { title: "PC에서 접속해 주세요 - AI 얼평보고서" };

export default function MobileOnlyPage() {
  return <MobileOnlyContent locale={DEFAULT_LOCALE} />;
}

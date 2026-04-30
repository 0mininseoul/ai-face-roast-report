import { EntryPage } from "@/components/pages/EntryPage";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

export default function EntryPageRoute() {
  return <EntryPage locale={DEFAULT_LOCALE} />;
}

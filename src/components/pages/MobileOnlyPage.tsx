import { PcUrlCopy } from "@/app/mobile-only/PcUrlCopy";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export default function MobileOnlyPage() {
  return <MobileOnlyContent locale={DEFAULT_LOCALE} />;
}

export function MobileOnlyContent({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <section className="glass-panel w-full max-w-md rounded-2xl px-4 py-7">
        <h1 className="whitespace-nowrap text-xl font-black leading-tight tracking-normal">
          {dictionary.mobile.title}
        </h1>
        <p className="mt-4 whitespace-nowrap text-[0.72rem] leading-5 text-text-muted">
          {dictionary.mobile.body}
        </p>
        <PcUrlCopy locale={locale} />
      </section>
    </main>
  );
}

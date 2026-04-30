import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export default function ExpiredPage() {
  return <ExpiredContent locale={DEFAULT_LOCALE} />;
}

export function ExpiredContent({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  return (
    <main className="grid min-h-screen place-items-center px-8">
      <section className="glass-panel max-w-xl rounded-2xl p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Logo locale={locale} />
        </div>
        <h1 className="text-3xl font-black">{dictionary.result.expiredTitle}</h1>
        <p className="mt-4 text-text-muted">{dictionary.result.expiredBody}</p>
        <Link className="mt-8 inline-block" href={`/${locale}`}>
          <Button>{dictionary.result.retryAnalysis}</Button>
        </Link>
      </section>
    </main>
  );
}

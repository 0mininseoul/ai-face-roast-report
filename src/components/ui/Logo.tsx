import Image from "next/image";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

export function Logo({ compact = false, locale = DEFAULT_LOCALE }: { compact?: boolean; locale?: Locale }) {
  const dictionary = getDictionary(locale);
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/logo.png"
        width={compact ? 36 : 44}
        height={compact ? 36 : 44}
        alt={`${dictionary.brand.title} logo`}
        priority
        className={[
          "rounded-lg border border-white/10 object-cover shadow-[0_10px_32px_rgb(0_0_0_/_0.36)]",
          compact ? "h-9 w-9" : "h-11 w-11",
        ].join(" ")}
      />
      {!compact && (
        <div className="leading-none drop-shadow-[0_1px_10px_rgb(0_0_0_/_0.9)]">
          <div className="text-lg font-extrabold tracking-normal text-white">{dictionary.brand.title}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[rgb(151_163_184_/_0.92)]">
            {dictionary.brand.tagline}
          </div>
        </div>
      )}
    </div>
  );
}

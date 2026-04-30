import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

const KST_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

export function FaceImage({ src, createdAt, fit = "cover", locale = DEFAULT_LOCALE }: { src: string; createdAt: string; fit?: "cover" | "contain"; locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const imageClassName =
    fit === "contain" ? "max-h-[74vh] w-full rounded-xl bg-black/40 object-contain" : "aspect-video w-full rounded-xl object-cover";

  return (
    <section className="mx-auto mb-10 max-w-6xl px-4 text-center sm:mb-16 sm:px-8">
      <div className="glass-panel mx-auto overflow-hidden rounded-2xl p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={dictionary.result.faceAlt} className={imageClassName} />
      </div>
      <p className="mt-4 text-xs text-text-faint">
        {formatKstTimestamp(createdAt)}
        <br />{dictionary.result.satireNote}
      </p>
    </section>
  );
}

export function formatKstTimestamp(value: string | Date): string {
  return KST_TIMESTAMP_FORMATTER.format(new Date(value));
}

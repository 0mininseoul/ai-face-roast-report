"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ImageUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { useCamera } from "@/hooks/useCamera";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { playSfx } from "@/lib/sound/sfx";
import type { AnalysisTone, Gender } from "@/types/analysis";

export function EntryPage({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const { videoRef, status, error, start, stop } = useCamera();
  const [gender, setGender] = useState<Gender | null>(null);
  const [analysisTone, setAnalysisTone] = useState<AnalysisTone>("roast");
  const [age, setAge] = useState(false);
  const [expires, setExpires] = useState(false);
  const [lawsuit, setLawsuit] = useState(false);

  useEffect(() => {
    void start();
  }, [start]);

  const canStart = status === "ready" && gender && age && expires && lawsuit;

  return (
    <main className="relative h-screen overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-90" muted playsInline />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0,transparent_30%,rgb(0_0_0_/_0.34)_68%,rgb(0_0_0_/_0.78)_100%)]" />
      <div className="absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[linear-gradient(180deg,rgb(6_7_11_/_0.94),rgb(10_12_17_/_0.86))] px-6 py-4 shadow-[0_18px_60px_rgb(0_0_0_/_0.46)] backdrop-blur-xl sm:px-8">
        <div className="flex w-full items-center justify-between gap-6">
          <Logo locale={locale} />
          <div className="ml-auto flex min-w-0 items-center justify-end gap-3">
            <div className="hidden text-xs font-bold uppercase tracking-[0.18em] text-text-muted drop-shadow-[0_1px_8px_rgb(0_0_0_/_0.85)] sm:block">
              {dictionary.entry.desktopOnly}
            </div>
            <LanguageSwitcher locale={locale} />
            <Link
              href={`/${locale}/manual-analysis`}
              aria-label={dictionary.entry.uploadAria}
              title={dictionary.entry.uploadAria}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-bg-card/70 px-3 text-sm font-semibold text-text-primary transition hover:border-border-bright hover:bg-bg-card-hover sm:px-4"
            >
              <ImageUp className="h-4 w-4" />
              <span className="hidden md:inline">{dictionary.entry.upload}</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="fixed bottom-8 right-8 z-20 max-h-[calc(100vh-7rem)] w-[min(520px,calc(100vw-4rem))] overflow-y-auto">
        <div className="glass-panel relative rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-muted">
              <Camera className="h-4 w-4 text-accent-info" />
              {dictionary.entry.cameraInput}
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-text-faint">{status}</div>
          </div>

          <div className="mb-5 rounded-lg border border-border bg-black/35 px-4 py-3">
            <p className="text-sm leading-6 text-text-muted">
              {dictionary.entry.guide}
              <br />
              {dictionary.entry.guideSub}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["male", "female"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setGender(value)}
                className={[
                  "h-16 rounded-lg border text-base font-bold transition",
                  gender === value
                    ? "border-accent-info bg-accent-info/12 text-text-primary shadow-[0_0_0_1px_rgb(125_216_255_/_.2)]"
                    : "border-border bg-bg-card text-text-muted hover:border-border-bright hover:bg-bg-card-hover",
                ].join(" ")}
              >
                {value === "male" ? dictionary.entry.genderMale : dictionary.entry.genderFemale}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <ToneButton active={analysisTone === "roast"} title={dictionary.entry.roastTitle} description={dictionary.entry.roastDescription} onClick={() => setAnalysisTone("roast")} />
            <ToneButton active={analysisTone === "balanced"} title={dictionary.entry.balancedTitle} description={dictionary.entry.balancedDescription} onClick={() => setAnalysisTone("balanced")} />
          </div>

          <div className="mt-6 space-y-3">
            <Consent checked={age} onChange={setAge} label={dictionary.entry.ageConsent} singleLine={locale === "ko"} />
            <Consent checked={expires} onChange={setExpires} label={dictionary.entry.expires24Consent} />
            <Consent checked={lawsuit} onChange={setLawsuit} label={dictionary.entry.lawsuitConsent} />
          </div>

          <Button
            className="mt-6 h-14 w-full text-base"
            disabled={!canStart}
            onClick={() => {
              if (!gender) return;
              playSfx("boot");
              stop();
              router.push(`/${locale}/analyze?gender=${gender}&tone=${analysisTone}`);
            }}
          >
            {dictionary.entry.start}
          </Button>

          <p className="mt-4 text-center text-xs leading-5 text-text-faint">
            {dictionary.entry.termsPrefix}{" "}
            <Link className="text-text-muted underline underline-offset-4" href={`/${locale}/terms`} target="_blank">
              {dictionary.entry.terms}
            </Link>
            {" / "}
            <Link className="text-text-muted underline underline-offset-4" href={`/${locale}/privacy`} target="_blank">
              {dictionary.entry.privacy}
            </Link>
            {dictionary.entry.termsSuffix ? ` ${dictionary.entry.termsSuffix}` : ""}
          </p>
        </div>
      </section>

      {status !== "ready" && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/45 px-6 text-center backdrop-blur-sm">
          <div className="glass-panel max-w-md rounded-2xl p-7">
            <Camera className="mx-auto h-8 w-8 text-accent-info" />
            <p className="mt-4 text-xl font-extrabold text-text-primary">{dictionary.entry.cameraPermissionTitle}</p>
            <p className="mt-2 text-sm leading-6 text-text-muted">{error ?? dictionary.entry.cameraPermissionDescription}</p>
            <Button className="mt-5" onClick={() => void start()} icon={<Camera className="h-4 w-4" />}>
              {dictionary.entry.retryPermission}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function ToneButton({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-16 rounded-lg border px-3 py-3 text-left transition",
        active
          ? "border-accent-info bg-accent-info/12 text-text-primary shadow-[0_0_0_1px_rgb(125_216_255_/_.2)]"
          : "border-border bg-bg-card text-text-muted hover:border-border-bright hover:bg-bg-card-hover",
      ].join(" ")}
    >
      <span className="block text-sm font-black">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-text-muted">{description}</span>
    </button>
  );
}

function Consent({ checked, onChange, label, singleLine = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; singleLine?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-card/70 p-4 text-sm text-text-muted transition hover:border-border-bright">
      <input className="mt-1 h-4 w-4 accent-[var(--accent-info)]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={`font-medium leading-6 ${singleLine ? "whitespace-nowrap" : ""}`}>{label}</span>
    </label>
  );
}

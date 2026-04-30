"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, ImageUp, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { getFaceImageLandmarker } from "@/lib/facemesh/faceLandmarker";
import { computeFaceMetrics } from "@/lib/facemesh/metricsCalculator";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, localizedResultPath, type Locale } from "@/lib/i18n/locales";
import { getClientDeviceId } from "@/lib/telemetry/client";
import type { AnalysisTone, FaceMetrics, Gender, Landmark } from "@/types/analysis";

const MAX_ORIGINAL_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.88;

interface PreparedManualImage {
  imageBase64: string;
  width: number;
  height: number;
  landmarks: Landmark[];
  metrics: FaceMetrics;
  detectedFaceCount: number;
}

interface CreatedManualReport {
  reportId: string;
  status: "queued" | "processing" | "retrying";
  publicResultUrl: string;
  adminResultUrl?: string;
}

type PreparationStatus = "idle" | "preparing" | "ready" | "error";
type ManualAnalysisMode = "public" | "admin";

export function ManualAnalysisClient({ mode = "public", locale = DEFAULT_LOCALE }: { mode?: ManualAnalysisMode; locale?: Locale }) {
  const router = useRouter();
  const [reportLocale, setReportLocale] = useState<Locale>(locale);
  const dictionary = getDictionary(reportLocale);
  const [gender, setGender] = useState<Gender>("male");
  const [analysisTone, setAnalysisTone] = useState<AnalysisTone>("roast");
  const [adminNote, setAdminNote] = useState("");
  const [age, setAge] = useState(false);
  const [expires, setExpires] = useState(false);
  const [lawsuit, setLawsuit] = useState(false);
  const [prepared, setPrepared] = useState<PreparedManualImage | null>(null);
  const [status, setStatus] = useState<PreparationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedManualReport | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const isAdmin = mode === "admin";
  const endpoint = isAdmin ? "/admindata/api/manual-analysis" : "/api/manual-analysis";
  const consentReady = isAdmin || (age && expires && lawsuit);
  const canSubmit = status === "ready" && Boolean(prepared) && consentReady && !submitting;
  const faceWarning = useMemo(() => {
    if (!prepared) return null;
    if (prepared.detectedFaceCount > 1) {
      if (reportLocale === "en") return `${prepared.detectedFaceCount} ${dictionary.manual.readyManySuffix}`;
      return `${dictionary.manual.readyManyPrefix} ${prepared.detectedFaceCount}${dictionary.manual.readyManySuffix}`;
    }
    return dictionary.manual.readyOne;
  }, [dictionary.manual.readyManyPrefix, dictionary.manual.readyManySuffix, dictionary.manual.readyOne, prepared, reportLocale]);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCreated(null);
    setPrepared(null);
    setError(null);

    if (!file) {
      setStatus("idle");
      return;
    }

    setStatus("preparing");
    try {
      const next = await prepareManualImage(file, dictionary.manual);
      setPrepared(next);
      setStatus("ready");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : dictionary.manual.requestFailed);
    } finally {
      event.target.value = "";
    }
  }, [dictionary.manual]);

  const submit = useCallback(async () => {
    if (!prepared) return;
    setSubmitting(true);
    setError(null);
    setCreated(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          analysisTone,
          locale: reportLocale,
          deviceId: getClientDeviceId(),
          imageBase64: prepared.imageBase64,
          metrics: prepared.metrics,
          landmarks: prepared.landmarks,
          manualDetectedFaceCount: prepared.detectedFaceCount,
          ...(isAdmin ? { adminNote: adminNote.trim() || null } : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as (CreatedManualReport & { error?: string; message?: string }) | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.message || payload?.error || dictionary.manual.requestCreateFailed);
      }
      setCreated(payload);
      if (!isAdmin) router.push(payload.publicResultUrl || localizedResultPath(payload.reportId, reportLocale));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dictionary.manual.requestFailed);
    } finally {
      setSubmitting(false);
    }
  }, [adminNote, analysisTone, dictionary.manual.requestCreateFailed, dictionary.manual.requestFailed, endpoint, gender, isAdmin, prepared, reportLocale, router]);

  const copy = useCallback(async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Logo locale={reportLocale} />
          <span className="w-fit text-xs font-black uppercase tracking-[0.16em] text-text-muted">
            {isAdmin ? dictionary.manual.adminBadge : dictionary.manual.publicBadge}
          </span>
        </header>

        <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="glass-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-info)]">
                {isAdmin ? dictionary.manual.adminEyebrow : dictionary.manual.publicEyebrow}
              </p>
              <h1 className="mt-2 text-2xl font-black text-text-primary sm:text-3xl">{dictionary.manual.title}</h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                {isAdmin
                  ? dictionary.manual.adminDescription
                  : dictionary.manual.publicDescription}
              </p>
            </div>

            <div className="space-y-5">
              {isAdmin && (
                <FieldBlock label="Locale">
                  <div className="grid grid-cols-3 gap-2">
                    {SUPPORTED_LOCALES.map((value) => (
                      <ChoiceButton key={value} active={reportLocale === value} title={value.toUpperCase()} onClick={() => setReportLocale(value)} />
                    ))}
                  </div>
                </FieldBlock>
              )}

              <FieldBlock label={dictionary.manual.gender}>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton active={gender === "male"} title={dictionary.entry.genderMale} onClick={() => setGender("male")} />
                  <ChoiceButton active={gender === "female"} title={dictionary.entry.genderFemale} onClick={() => setGender("female")} />
                </div>
              </FieldBlock>

              <FieldBlock label={dictionary.manual.tone}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <ChoiceButton active={analysisTone === "roast"} title={dictionary.entry.roastTitle} description={dictionary.entry.roastDescription} onClick={() => setAnalysisTone("roast")} />
                  <ChoiceButton active={analysisTone === "balanced"} title={dictionary.entry.balancedTitle} description={dictionary.entry.balancedDescription} onClick={() => setAnalysisTone("balanced")} />
                </div>
              </FieldBlock>

              <FieldBlock label={dictionary.manual.image}>
                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-bright bg-black/25 px-4 py-6 text-center transition hover:border-[var(--accent-info)] hover:bg-bg-card/70">
                  <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                  {status === "preparing" ? (
                    <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-info)]" />
                  ) : (
                    <ImageUp className="h-7 w-7 text-[var(--accent-info)]" />
                  )}
                  <span className="mt-3 text-sm font-bold text-text-primary">
                    {status === "preparing" ? dictionary.manual.uploadPreparing : dictionary.manual.uploadIdle}
                  </span>
                  <span className="mt-1 text-xs text-text-muted">{dictionary.manual.uploadLimit}</span>
                </label>
              </FieldBlock>

              {isAdmin && (
                <FieldBlock label={dictionary.manual.adminNote}>
                  <textarea
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value.slice(0, 500))}
                    className="min-h-24 w-full resize-y rounded-lg border border-border bg-black/30 px-3 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-[var(--accent-info)]"
                    placeholder={dictionary.manual.adminNotePlaceholder}
                  />
                </FieldBlock>
              )}

              {!isAdmin && (
                <div className="space-y-3">
                  <Consent checked={age} onChange={setAge} label={dictionary.entry.ageConsent} singleLine={reportLocale === "ko"} />
                  <Consent checked={expires} onChange={setExpires} label={dictionary.manual.expires7Consent} />
                  <Consent checked={lawsuit} onChange={setLawsuit} label={dictionary.entry.lawsuitConsent} />
                </div>
              )}

              {faceWarning && (
                <StatusBox tone={prepared?.detectedFaceCount && prepared.detectedFaceCount > 1 ? "warn" : "ok"}>{faceWarning}</StatusBox>
              )}
              {error && <StatusBox tone="error">{error}</StatusBox>}

              <Button
                type="button"
                className="w-full"
                disabled={!canSubmit}
                icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                onClick={submit}
              >
                {submitting ? dictionary.manual.submitting : dictionary.manual.submit}
              </Button>

              {!isAdmin && (
                <p className="text-center text-xs leading-5 text-text-faint">
                  {dictionary.manual.createTermsPrefix}{" "}
                  <Link className="text-text-muted underline underline-offset-4" href={`/${reportLocale}/terms`} target="_blank">
                    {dictionary.entry.terms}
                  </Link>
                  {" / "}
                  <Link className="text-text-muted underline underline-offset-4" href={`/${reportLocale}/privacy`} target="_blank">
                    {dictionary.entry.privacy}
                  </Link>
                  {dictionary.entry.termsSuffix ? ` ${dictionary.entry.termsSuffix}` : ""}
                </p>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-text-muted">{dictionary.manual.preview}</h2>
              <span className="rounded-md border border-border bg-black/30 px-2 py-1 text-xs font-semibold text-text-muted">
                {prepared ? `${prepared.width}x${prepared.height}` : status}
              </span>
            </div>

            <div className="grid min-h-[24rem] place-items-center overflow-hidden rounded-lg border border-border bg-black/35">
              {prepared ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prepared.imageBase64} alt={dictionary.manual.previewAlt} className="max-h-[70vh] w-full object-contain" />
              ) : (
                <p className="px-6 text-center text-sm text-text-muted">{dictionary.manual.previewEmpty}</p>
              )}
            </div>

            {created && (
              <div className="mt-5 border-t border-border pt-5">
                <div className="mb-4 flex items-center gap-2 text-[var(--accent-ok)]">
                  <CheckCircle2 className="h-5 w-5" />
                  <h2 className="text-lg font-black text-text-primary">{dictionary.manual.created}</h2>
                </div>
                {isAdmin ? (
                  <div className="space-y-3 text-sm">
                    <LinkRow label={dictionary.manual.publicResult} href={created.publicResultUrl} copied={copied === "public"} onCopy={() => copy("public", created.publicResultUrl)} copyLabel={dictionary.manual.copy} copiedLabel={dictionary.result.copied} openLabel={dictionary.manual.open} />
                    {created.adminResultUrl && <LinkRow label={dictionary.manual.adminResult} href={created.adminResultUrl} copied={copied === "admin"} onCopy={() => copy("admin", created.adminResultUrl!)} copyLabel={dictionary.manual.copy} copiedLabel={dictionary.result.copied} openLabel={dictionary.manual.open} />}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-text-muted">{dictionary.manual.redirecting}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-5"
                  icon={<RefreshCcw className="h-4 w-4" />}
                  onClick={() => {
                    setPrepared(null);
                    setCreated(null);
                    setStatus("idle");
                    setError(null);
                  }}
                >
                  {dictionary.manual.reset}
                </Button>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">{label}</label>
      </div>
      {children}
    </div>
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

function StatusBox({ tone, children }: { tone: "ok" | "warn" | "error"; children: ReactNode }) {
  const styles = {
    ok: "border-[rgb(134_239_172_/_0.34)] bg-[rgb(134_239_172_/_0.10)] text-[var(--accent-ok)]",
    warn: "border-[rgb(255_210_125_/_0.38)] bg-[rgb(255_210_125_/_0.10)] text-[var(--accent-warn)]",
    error: "border-[rgb(255_90_110_/_0.38)] bg-[rgb(255_90_110_/_0.10)] text-[var(--accent-bad)]",
  };
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-3 text-sm font-semibold leading-5 ${styles[tone]}`}>
      {tone === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}

function ChoiceButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded-lg border px-3 py-3 text-left transition",
        active
          ? "border-[var(--accent-info)] bg-[rgb(125_216_255_/_0.11)] text-text-primary"
          : "border-border bg-bg-card/70 text-text-muted hover:border-border-bright",
      ].join(" ")}
      onClick={onClick}
    >
      <span className="block text-sm font-black">{title}</span>
      {description && <span className="mt-1 block text-xs leading-5 text-text-muted">{description}</span>}
    </button>
  );
}

function LinkRow({
  label,
  href,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
  openLabel,
}: {
  label: string;
  href: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
  openLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-black/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-text-muted">{label}</span>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-bold text-text-primary transition hover:border-[var(--accent-info)]" type="button" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? copiedLabel : copyLabel}
          </button>
          <a className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-bold text-text-primary transition hover:border-[var(--accent-info)]" href={href} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            {openLabel}
          </a>
        </div>
      </div>
      <p className="break-all text-xs leading-5 text-text-muted">{href}</p>
    </div>
  );
}

async function prepareManualImage(file: File, messages: ReturnType<typeof getDictionary>["manual"]): Promise<PreparedManualImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error(messages.invalidType);
  }
  if (file.size <= 0 || file.size > MAX_ORIGINAL_BYTES) {
    throw new Error(messages.tooLarge);
  }

  const originalDataUrl = await readFileDataUrl(file, messages.readFailed);
  const sourceImage = await loadImage(originalDataUrl, messages.loadFailed);
  const normalized = normalizeToJpeg(sourceImage, messages.canvasFailed);
  const analysisImage = await loadImage(normalized.dataUrl, messages.loadFailed);
  const landmarker = await getFaceImageLandmarker("CPU");
  const result = landmarker.detect(analysisImage);
  const faceLandmarks = result.faceLandmarks ?? [];
  const firstFace = faceLandmarks[0];
  if (!firstFace) {
    throw new Error(messages.noFace);
  }

  const landmarks = firstFace.map((point) => ({ x: point.x, y: point.y, z: point.z ?? 0 }));
  const metrics = computeFaceMetrics(landmarks);
  return {
    imageBase64: normalized.dataUrl,
    width: normalized.width,
    height: normalized.height,
    landmarks,
    metrics,
    detectedFaceCount: faceLandmarks.length,
  };
}

function normalizeToJpeg(image: HTMLImageElement, canvasFailedMessage: string): { dataUrl: string; width: number; height: number } {
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(canvasFailedMessage);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), width, height };
}

function readFileDataUrl(file: File, readFailedMessage: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error(readFailedMessage)));
    reader.onerror = () => reject(new Error(readFailedMessage));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string, loadFailedMessage: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(loadFailedMessage));
    image.src = src;
  });
}

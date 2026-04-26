"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useCamera } from "@/hooks/useCamera";
import { playSfx } from "@/lib/sound/sfx";
import type { Gender } from "@/types/analysis";

export default function EntryPage() {
  const router = useRouter();
  const { videoRef, status, error, start, stop } = useCamera();
  const [gender, setGender] = useState<Gender | null>(null);
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

      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[linear-gradient(180deg,rgb(6_7_11_/_0.94),rgb(10_12_17_/_0.86))] px-8 py-4 shadow-[0_18px_60px_rgb(0_0_0_/_0.46)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between">
          <Logo />
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted drop-shadow-[0_1px_8px_rgb(0_0_0_/_0.85)]">Desktop webcam only</div>
        </div>
      </header>

      <section className="fixed bottom-8 right-8 z-20 max-h-[calc(100vh-7rem)] w-[min(520px,calc(100vw-4rem))] overflow-y-auto">
        <div className="glass-panel relative rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-muted">
              <Camera className="h-4 w-4 text-accent-info" />
              CAMERA INPUT
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-text-faint">{status}</div>
          </div>

          <div className="mb-5 rounded-lg border border-border bg-black/35 px-4 py-3">
            <p className="text-sm leading-6 text-text-muted">
              얼굴이 화면 중앙에 들어오게 맞춘 뒤 성별과 동의 항목을 선택하세요.
              <br />
              분석은 현재 카메라 프레임을 기준으로 시작됩니다.
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
                {value === "male" ? "남성" : "여성"}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <Consent checked={age} onChange={setAge} label="본인은 만 14세 이상이며 본인의 얼굴만 분석합니다" singleLine />
            <Consent checked={expires} onChange={setExpires} label="분석된 얼굴과 데이터는 24시간 뒤 삭제되어 더 이상 열람할 수 없습니다" />
            <Consent checked={lawsuit} onChange={setLawsuit} label="어떤 내용이 나오건 상처받지 않고 개발자를 고소하지 않겠습니다" />
          </div>

          <Button
            className="mt-6 h-14 w-full text-base"
            disabled={!canStart}
            onClick={() => {
              if (!gender) return;
              playSfx("boot");
              stop();
              router.push(`/analyze?gender=${gender}`);
            }}
          >
            분석 시작
          </Button>

          <p className="mt-4 text-center text-xs leading-5 text-text-faint">
            분석 시작 시{" "}
            <Link className="text-text-muted underline underline-offset-4" href="/terms" target="_blank">
              이용약관
            </Link>
            과{" "}
            <Link className="text-text-muted underline underline-offset-4" href="/privacy" target="_blank">
              개인정보처리방침
            </Link>
            에 동의한 것으로 간주됩니다.
          </p>
        </div>
      </section>

      {status !== "ready" && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/45 px-6 text-center backdrop-blur-sm">
          <div className="glass-panel max-w-md rounded-2xl p-7">
            <Camera className="mx-auto h-8 w-8 text-accent-info" />
            <p className="mt-4 text-xl font-extrabold text-text-primary">카메라 권한이 필요합니다</p>
            <p className="mt-2 text-sm leading-6 text-text-muted">{error ?? "브라우저 권한 요청을 허용해 주세요."}</p>
            <Button className="mt-5" onClick={() => void start()} icon={<Camera className="h-4 w-4" />}>
              권한 다시 요청
            </Button>
          </div>
        </div>
      )}
    </main>
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

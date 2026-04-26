import { PcUrlCopy } from "./PcUrlCopy";

export const metadata = { title: "PC에서 접속해 주세요 - AI 얼평보고서" };

export default function MobileOnlyPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <section className="glass-panel w-full max-w-md rounded-2xl px-4 py-7">
        <h1 className="whitespace-nowrap text-xl font-black leading-tight tracking-normal">
          PC 환경에서 접속해 주세요
        </h1>
        <p className="mt-4 whitespace-nowrap text-[0.72rem] leading-5 text-text-muted">
          본 서비스는 데스크톱 웹캠 환경에서만 작동합니다.
        </p>
        <PcUrlCopy />
      </section>
    </main>
  );
}

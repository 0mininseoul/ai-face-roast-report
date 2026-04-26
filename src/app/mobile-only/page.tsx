export const metadata = { title: "PC에서 접속해 주세요 - AI 얼평보고서" };

export default function MobileOnlyPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <section className="glass-panel max-w-md rounded-2xl p-8">
        <h1 className="text-3xl font-black">PC 환경에서 접속해 주세요</h1>
        <p className="mt-4 leading-7 text-text-muted">본 서비스는 데스크톱 웹캠 환경에서만 작동합니다.</p>
      </section>
    </main>
  );
}

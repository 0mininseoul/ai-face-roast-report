import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function ExpiredPage() {
  return (
    <main className="grid min-h-screen place-items-center px-8">
      <section className="glass-panel max-w-xl rounded-2xl p-8 text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-3xl font-black">이 보고서는 만료되었습니다</h1>
        <p className="mt-4 text-text-muted">생성 후 24시간이 지난 보고서는 더 이상 조회할 수 없습니다.</p>
        <Link className="mt-8 inline-block" href="/">
          <Button>다시 분석</Button>
        </Link>
      </section>
    </main>
  );
}

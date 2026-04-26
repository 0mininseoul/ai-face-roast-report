import Image from "next/image";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/logo.png"
        width={compact ? 36 : 44}
        height={compact ? 36 : 44}
        alt="AI 얼평보고서 로고"
        priority
        className={[
          "rounded-lg border border-white/10 object-cover shadow-[0_10px_32px_rgb(0_0_0_/_0.36)]",
          compact ? "h-9 w-9" : "h-11 w-11",
        ].join(" ")}
      />
      {!compact && (
        <div className="leading-none drop-shadow-[0_1px_10px_rgb(0_0_0_/_0.9)]">
          <div className="text-lg font-extrabold tracking-normal text-white">AI 얼평보고서</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[rgb(151_163_184_/_0.92)]">
            Forensic-grade facial diagnostics
          </div>
        </div>
      )}
    </div>
  );
}

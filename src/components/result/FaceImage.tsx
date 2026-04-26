export function FaceImage({ src, createdAt }: { src: string; createdAt: string }) {
  return (
    <section className="mx-auto mb-10 max-w-6xl px-4 text-center sm:mb-16 sm:px-8">
      <div className="glass-panel mx-auto overflow-hidden rounded-2xl p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="분석에 사용된 얼굴 캡쳐" className="aspect-video w-full rounded-xl object-cover" />
      </div>
      <p className="mt-4 text-xs text-text-faint">
        {new Date(createdAt).toLocaleString("ko-KR")}
        <br />본 분석은 풍자 및 유머 목적이며 사실 진술이 아닙니다.
      </p>
    </section>
  );
}

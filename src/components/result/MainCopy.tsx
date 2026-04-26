export function MainCopy({ text }: { text: string }) {
  return (
    <section className="mx-auto max-w-[1500px] px-8 pb-12 pt-16 text-center">
      <h1 className="mx-auto max-w-[1280px] text-balance text-[clamp(38px,4.8vw,76px)] font-black leading-[1.04] tracking-normal text-text-primary">
        {text}
      </h1>
    </section>
  );
}

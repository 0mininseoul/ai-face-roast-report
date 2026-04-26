export function MainCopy({ text }: { text: string }) {
  return (
    <section className="mx-auto max-w-6xl px-8 pb-12 pt-20 text-center">
      <h1 className="text-balance text-[clamp(48px,6vw,92px)] font-black leading-[0.98] tracking-normal text-text-primary">
        {text}
      </h1>
    </section>
  );
}

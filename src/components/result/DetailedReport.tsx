import type { ReportSections } from "@/types/analysis";
import { GaugeChart } from "./GaugeChart";

const PART_LABEL = {
  forehead: "이마",
  eyes: "눈",
  nose: "코",
  mouth: "입",
  jaw: "턱",
  skin: "피부",
} as const;

export function DetailedReport({ sections, reportId }: { sections: ReportSections; reportId: string }) {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-8 pb-24">
      <Panel title="§ 1. 안면 기하학">
        <Text label="대칭" value={sections.geometry.asymmetry} />
        <Text label="황금비" value={sections.geometry.phi} />
        <Text label="삼정" value={sections.geometry.thirds} />
        <Text label="오관" value={sections.geometry.fifths} />
        <Text label="안면비" value={sections.geometry.faceAspect} />
      </Panel>

      <Panel title="§ 2. 부위별 구조 분석">
        <div className="space-y-5">
          {(["forehead", "eyes", "nose", "mouth", "jaw", "skin"] as const).map((key) => {
            const part = sections.parts[key];
            const lead = "observation" in part ? part.observation : part.metricsText;
            return (
              <div key={key} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <h3 className="mb-2 text-base font-bold text-text-primary">{PART_LABEL[key]}</h3>
                <p className="text-sm leading-6 text-text-muted">{lead}</p>
                <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-text-primary">{part.comment}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="§ 3. 종합 미관 지표">
        <GaugeChart label="호감도" value={sections.scores.likability} comment={sections.scores.comments[0]} />
        <GaugeChart label="신뢰도" value={sections.scores.trust} comment={sections.scores.comments[1]} />
        <GaugeChart label="대칭성" value={sections.scores.symmetry} comment={sections.scores.comments[2]} />
        <GaugeChart label="균형감" value={sections.scores.balance} comment={sections.scores.comments[3]} />
        <GaugeChart label="매력도" value={sections.scores.attractiveness} comment={sections.scores.comments[4]} />
      </Panel>

      <Panel title="§ 4. 인상·관상 분석">
        <div className="mb-5 flex flex-wrap gap-2">
          {sections.impression.keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-border bg-bg-card-hover px-3 py-1 text-xs font-bold text-text-muted">
              {keyword}
            </span>
          ))}
        </div>
        <p className="mb-4 text-sm text-text-muted">
          추정 연령: <span className="font-black tabular-nums text-text-primary">{Math.round(sections.impression.estimatedAge)}세</span>
        </p>
        <p className="whitespace-pre-line text-base leading-8 text-text-primary">{sections.impression.physiognomy}</p>
      </Panel>

      <Panel title="§ 5. 종합 결론" wide>
        <p className="whitespace-pre-line text-lg font-semibold leading-9 text-text-primary">{sections.conclusion}</p>
      </Panel>

      <footer className="col-span-2 text-center text-xs text-text-faint">
        Analysis ID: {reportId} / {sections.meta.complianceText}
      </footer>
    </section>
  );
}

function Panel({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <article className={`glass-panel rounded-2xl p-6 ${wide ? "col-span-2" : ""}`}>
      <h2 className="mb-5 text-xs font-black uppercase tracking-[0.14em] text-text-muted">{title}</h2>
      {children}
    </article>
  );
}

function Text({ label, value }: { label: string; value: string }) {
  return (
    <p className="mb-3 text-base leading-7 text-text-primary last:mb-0">
      <span className="mr-2 text-sm font-bold text-text-muted">{label}</span>
      {value}
    </p>
  );
}

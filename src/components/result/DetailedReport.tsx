import type { ReportSections } from "@/types/analysis";
import { getDictionary } from "@/lib/i18n/dictionary";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { GaugeChart } from "./GaugeChart";

export function DetailedReport({ sections, locale = DEFAULT_LOCALE }: { sections: ReportSections; locale?: Locale }) {
  const report = getDictionary(locale).report;
  const partLabel = {
    forehead: report.forehead,
    eyes: report.eyes,
    nose: report.nose,
    mouth: report.mouth,
    jaw: report.jaw,
    skin: report.skin,
  } as const;

  return (
    <section className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-4 pb-16 md:grid-cols-2 md:gap-6 md:px-8 md:pb-24">
      <Panel title={report.geometryTitle}>
        <Text label={report.asymmetry} value={sections.geometry.asymmetry} />
        <Text label={report.phi} value={sections.geometry.phi} />
        <Text label={report.thirds} value={sections.geometry.thirds} />
        <Text label={report.fifths} value={sections.geometry.fifths} />
        <Text label={report.faceAspect} value={sections.geometry.faceAspect} />
      </Panel>

      <Panel title={report.partsTitle}>
        <div className="space-y-5">
          {(["forehead", "eyes", "nose", "mouth", "jaw", "skin"] as const).map((key) => {
            const part = sections.parts[key];
            const lead = "observation" in part ? part.observation : part.metricsText;
            return (
              <div key={key} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <h3 className="mb-2 text-base font-bold text-text-primary">{partLabel[key]}</h3>
                <p className="text-sm leading-6 text-text-muted">{lead}</p>
                <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-text-primary">{part.comment}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title={report.scoresTitle}>
        <GaugeChart label={report.likability} value={sections.scores.likability} comment={sections.scores.comments[0]} />
        <GaugeChart label={report.trust} value={sections.scores.trust} comment={sections.scores.comments[1]} />
        <GaugeChart label={report.symmetry} value={sections.scores.symmetry} comment={sections.scores.comments[2]} />
        <GaugeChart label={report.balance} value={sections.scores.balance} comment={sections.scores.comments[3]} />
        <GaugeChart label={report.attractiveness} value={sections.scores.attractiveness} comment={sections.scores.comments[4]} />
      </Panel>

      <Panel title={report.impressionTitle}>
        <div className="mb-5 flex flex-wrap gap-2">
          {sections.impression.keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-border bg-bg-card-hover px-3 py-1 text-xs font-bold text-text-muted">
              {keyword}
            </span>
          ))}
        </div>
        <p className="mb-4 text-sm text-text-muted">
          {report.estimatedAge}: <span className="font-black tabular-nums text-text-primary">{Math.round(sections.impression.estimatedAge)}{report.ageSuffix}</span>
        </p>
        <p className="whitespace-pre-line text-base leading-8 text-text-primary">{sections.impression.physiognomy}</p>
      </Panel>

      <Panel title={report.conclusionTitle} wide>
        <p className="whitespace-pre-line text-lg font-semibold leading-9 text-text-primary">{sections.conclusion}</p>
      </Panel>

      <footer className="space-y-1 pt-2 text-center text-xs leading-5 text-text-faint md:col-span-2">
        <p>{report.footer1}</p>
        <p>{report.footer2}</p>
      </footer>
    </section>
  );
}

function Panel({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <article className={`glass-panel rounded-2xl p-5 sm:p-6 ${wide ? "md:col-span-2" : ""}`}>
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

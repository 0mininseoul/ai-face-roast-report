import type { ReportSections } from "@/types/analysis";

export function postprocessReportSections(sections: ReportSections): ReportSections {
  return {
    ...sections,
    conclusion: ensureMockingLaugh(sections.conclusion),
  };
}

function ensureMockingLaugh(conclusion: string): string {
  if (conclusion.includes("ㅋㅋ")) return conclusion;
  return `${conclusion.trim()} ㅋㅋ 이 정도면 분석 결과가 아니라 공개 처형문에 가깝다.`;
}

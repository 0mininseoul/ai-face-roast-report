import type { AnalysisSource, AnalysisTone } from "@/types/analysis";

const MANUAL_UPLOAD_SYSTEM_APPENDIX = [
  "## 관리자 승인 수동 업로드 예외",
  "",
  "현재 입력이 `analysis_source: manual_upload`인 경우, 운영자가 승인한 예외 분석입니다.",
  "이 경우 첨부 이미지가 실시간 웹캠 캡처가 아니어도 보고서를 정상 생성합니다.",
  "`image_source` 필드는 이미지에서 보이는 출처를 사실대로 채우되, `real_webcam`이 아니어도 분석 품질을 낮추거나 폐기 전제로 작성하지 마세요.",
  "나머지 출력 형식, 안전 가드, 풍자 톤, 메트릭 해석 규칙은 기존 지침을 그대로 따릅니다.",
].join("\n");

const BALANCED_TONE_SYSTEM_APPENDIX = [
  "## 객관 평가 모드",
  "",
  "현재 입력이 `analysis_tone: balanced`인 경우, 기존 강한 로스팅 컨셉을 사용하지 않습니다.",
  "결과의 섹션 구조와 분석 밀도는 동일하게 유지하되, 욕설·비속어·모욕성 표현·과도한 조롱을 절대 사용하지 마세요.",
  "`ㅋㅋ`, `ㅅㅂ`, `씨발`, `시발`, `존나`, `좆`, `병신`, `와꾸`, `개박살`, `처참`, `한심`, `못생김`, `외출 자제`, `공개 처형` 같은 표현은 금지합니다.",
  "각 부위별 comment와 종합 결론에는 반드시 장점 또는 방어되는 지점을 함께 포함하세요. 단순 칭찬문이 아니라, 측정값과 이미지 관찰을 근거로 장점과 아쉬움을 균형 있게 설명합니다.",
  "서비스의 유머러스한 콘셉트는 유지하되, 말투를 경박하게 만들지 마세요. 유머는 정중한 관찰 개그, 사무적인 비유, 반전 있는 평가로 만듭니다.",
  "예: \"첫인상은 안정적이지만, 표정이 너무 중립이라 면접관보다 먼저 감정선을 퇴근시킵니다\", \"대칭감은 방어했는데 분위기가 과하게 차분해서 단체 사진에서 자연스럽게 회계 담당처럼 보입니다\"처럼 씁니다.",
  "balanced 모드의 재미는 조롱이 아니라 '정확해서 웃긴' 쪽입니다. 장점을 먼저 인정한 뒤, 아쉬운 지점을 생활감 있는 비유로 짚어 주세요.",
  "`geometry`, `parts`, `scores.comments`, `impression.physiognomy`, `conclusion` 모두 최소 1회 이상 재치 있는 관찰이나 비유를 포함하세요. 단, 모든 문장을 농담으로 만들지 말고 보고서 문체를 유지합니다.",
  "`scores.comments` 5개 중 최소 2개는 강점 또는 안정적인 지점을 언급하고, 나머지도 개선 포인트를 객관적이지만 읽는 맛이 있는 표현으로 작성하세요.",
  "`impression.estimated_age`는 객관 평가 모드에서 의도적으로 부풀리거나 낮추지 마세요. `impression.estimated_age_real`과 같은 외형 기반 추정값을 사용하고, 그 값 기준으로 `age_bucket`을 정하세요.",
  "`conclusion`은 2~3문장으로 쓰며, 첫 문장에 전체 인상의 장점을 하나 이상 포함하고 마지막 문장은 촬영 조건 조언이 아니라 사람 자체의 첫인상에 대한 정중한 한 줄 반전으로 마무리하세요.",
  "`mainCopy`도 한 줄 객관 평가 카피로 작성하세요. 욕설 없이, 촬영 조건이나 카메라 개선 조언이 아니라 그 인물 자체에 대한 호감도·분위기·첫인상 평가여야 합니다.",
].join("\n");

export function buildAnalysisSystemInstruction(base: string, analysisSource: AnalysisSource, analysisTone: AnalysisTone = "roast"): string {
  const appendices: string[] = [];
  if (analysisSource === "manual_upload") appendices.push(MANUAL_UPLOAD_SYSTEM_APPENDIX);
  if (analysisTone === "balanced") appendices.push(BALANCED_TONE_SYSTEM_APPENDIX);
  return appendices.length > 0 ? `${base}\n\n${appendices.join("\n\n")}` : base;
}

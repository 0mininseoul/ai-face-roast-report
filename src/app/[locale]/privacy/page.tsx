import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionary";
import { isLocale, type Locale } from "@/lib/i18n/locales";

const privacySections: Record<Locale, Array<{ title: string; body: string[] }>> = {
  ko: [
    {
      title: "1. 총칙",
      body: [
        "AI 얼평보고서 서비스(이하 '서비스')는 사용자의 카메라 프레임과 얼굴 관련 데이터를 처리하여 오락 목적의 분석 결과를 생성합니다. 본 개인정보처리방침은 서비스 이용 과정에서 어떤 정보가 처리될 수 있는지, 그 정보가 어떤 목적으로 이용되는지, 어느 범위에서 외부 서비스로 전송될 수 있는지, 보관 및 삭제가 어떻게 이루어지는지를 설명합니다.",
        "사용자는 서비스를 이용하기 전에 본 방침 전체를 읽어야 합니다. 본 방침은 짧은 고지문이 아니며, 얼굴 이미지와 얼굴 랜드마크라는 민감하게 받아들여질 수 있는 정보가 처리되는 서비스 특성상 여러 세부 사항을 포함합니다. 사용자가 동의 체크박스를 선택하고 분석을 시작한 경우, 사용자는 본 방침의 내용에 따른 처리에 동의한 것으로 봅니다.",
      ],
    },
    {
      title: "2. 처리되는 개인정보 항목",
      body: [
        "서비스는 분석 과정에서 사용자의 얼굴이 포함된 카메라 캡처 이미지, 얼굴 랜드마크 좌표, 얼굴 비율 및 거리 기반 산출 메트릭, 사용자가 선택한 성별 값, 분석 결과로부터 자동 추정된 연령대 분류 값, 결과 페이지 식별자, 분석 생성 시각, 만료 예정 시각, 생성된 텍스트 결과, 공유용 이미지 또는 결과 페이지 구성에 필요한 메타데이터를 처리할 수 있습니다.",
        "분석 화면에서 얼굴 감지 또는 랜드마크 수집이 지연되거나 실패하는 경우, 서비스는 장애 원인 확인을 위해 저해상도 진단용 카메라 프레임 1장과 브라우저의 카메라 상태, 영상 해상도, 감지 엔진 상태, 세션 식별자, 오류 발생 시각 등 운영 로그를 별도로 저장할 수 있습니다.",
        "사용자가 결과 페이지의 '의견 보내기' 기능을 통해 자발적으로 입력하여 전송한 텍스트 메시지가 처리될 수 있습니다. 해당 메시지는 사용자가 직접 작성하여 전송한 시점에 한해 수집되며, 메시지 본문, 메시지 작성 시각, 결과 페이지 식별자(연결 가능한 경우), User-Agent, IP 해시가 함께 보관됩니다. 사용자는 해당 입력란에 본인 또는 타인의 신원이 직접 식별 가능한 정보(실명, 연락처, 주소 등)를 기재하지 않아야 하며, 운영자는 해당 입력 내용에 대해 별도의 자동 마스킹을 보장하지 않습니다.",
        "서비스 운영 및 남용 방지를 위해 IP 주소 자체 또는 IP 주소에서 산출한 단방향 해시, User-Agent, 요청 시각, 요청 경로, rate limit 판단에 필요한 임시 카운터, 브라우저 오류 정보, API 응답 상태, 저장소 접근 로그, 배포 환경 로그가 처리될 수 있습니다. 이러한 정보는 개별 사용자를 항상 직접 식별하기 위한 것이 아니라 서비스 제공, 장애 대응 및 비정상 사용 방지 목적을 위해 사용됩니다.",
      ],
    },
    {
      title: "3. 카메라 프레임과 얼굴 랜드마크 처리 방식",
      body: [
        "서비스는 사용자의 브라우저에서 카메라 영상을 표시하고, 얼굴 감지 및 랜드마크 산출을 위해 MediaPipe FaceLandmarker를 사용할 수 있습니다. 일부 얼굴 좌표 계산은 브라우저 안에서 이루어지며, 최종 분석 요청 시점에는 얼굴 이미지와 산출된 메트릭이 서버 API로 전송될 수 있습니다.",
        "진단용 카메라 프레임은 분석 실패 또는 장시간 지연 원인 파악을 위해 최종 분석 요청 이미지와 별도로 저장될 수 있으며, 원칙적으로 Gemini 등 외부 AI 분석 API 입력으로 사용되지 않습니다. 최종 보고서 생성에는 기존 분석 흐름에서 정한 별도의 캡처 시점 이미지와 산출 메트릭이 사용됩니다.",
        "얼굴 랜드마크 좌표는 사용자의 얼굴 구조를 수치화한 데이터이므로 단순한 일반 로그보다 민감하게 느껴질 수 있습니다. 다만 서비스는 본인 인증, 신원 확인, 출입 통제, 금융 인증, 생체 인증, 범죄 수사, 고용 판단 또는 건강 진단 목적으로 해당 정보를 사용하지 않습니다.",
      ],
    },
    {
      title: "4. 개인정보 처리 목적",
      body: [
        "수집 및 처리되는 정보는 분석 결과 생성, 분석 화면 진행, 결과 페이지 저장 및 조회, 이미지 기반 보고서 구성, 공유 기능 제공, 서비스 오류 조사, 프롬프트 품질 개선, 모델 응답 안정화, 과도한 호출 제한, 악의적 사용 방지, 비용 관리 및 서비스 운영상 필요한 통계 확인 목적으로 사용될 수 있습니다.",
        "사용자가 '의견 보내기' 기능을 통해 자발적으로 전송한 메시지는 서비스 품질 개선, 버그 및 오류 신고 처리, 사용자 의견에 대한 운영자 검토, 향후 기능 우선순위 결정, 신고 및 분쟁 대응 목적으로 사용될 수 있습니다. 해당 메시지는 분석 결과 데이터와 별도로 보관되며, 작성자에게 별도 회신 또는 처리 결과 통지가 제공된다고 보장되지 않습니다.",
        "서비스는 사용자의 얼굴 데이터를 이용하여 사용자를 실제 인물로 식별하거나, 다른 서비스의 계정과 결합하거나, 장기적 프로파일을 구축하거나, 광고 타게팅을 수행하거나, 제3자에게 사용자의 외모 점수를 판매하는 방식으로 운영되지 않습니다. 다만 사용자가 결과 URL을 직접 공유하는 경우 그 결과를 열람한 제3자가 내용을 저장하거나 재공유할 가능성은 사용자가 부담해야 합니다.",
      ],
    },
    {
      title: "5. 외부 서비스 및 국외 이전 가능성",
      body: [
        "서비스는 외부 AI API를 통한 이미지 및 텍스트 분석, Supabase를 통한 데이터베이스 및 파일 저장, Vercel 또는 이에 준하는 플랫폼을 통한 배포와 서버리스 실행, Kakao 공유 기능 또는 브라우저 내 공유 기능을 사용할 수 있습니다. 이러한 외부 제공자는 각자의 인프라 위치와 정책에 따라 데이터를 국외에서 처리하거나 저장할 수 있습니다.",
        "외부 서비스로 전송되는 정보의 범위는 기능 제공에 필요한 수준으로 제한하려고 하나, AI 분석 요청에는 얼굴 이미지 또는 얼굴 관련 메트릭이 포함될 수 있고, Supabase에는 결과 조회를 위해 필요한 이미지, 결과 JSON, 생성 시각 및 만료 시각이 저장될 수 있습니다. 사용자는 이러한 외부 처리 구조를 원하지 않는 경우 서비스를 이용하지 않아야 합니다.",
      ],
    },
    {
      title: "6. 보유 기간",
      body: [
        "결과 페이지는 원칙적으로 생성 후 24시간 동안 접근 가능하도록 설계됩니다. 접근 가능 기간이 종료된 이후에는 결과 페이지가 만료 화면으로 전환될 수 있으며, 파일 또는 데이터베이스 레코드가 즉시 물리적으로 삭제된다는 의미는 아닐 수 있습니다.",
        "운영자는 서비스 품질 개선, 장애 조사, 남용 방지, 통계 확인, 비용 산정, 법적 분쟁 대응 또는 백업 정책상 필요한 범위에서 분석 메타데이터, 결과 데이터, 이미지 파일, 진단용 카메라 프레임 또는 로그를 추가 기간 보관할 수 있습니다. MVP 단계에서는 자동 삭제, 즉시 삭제, 백업 삭제, 외부 제공자 로그 삭제가 서로 다른 시점에 이루어질 수 있습니다.",
        "사용자가 '의견 보내기' 기능을 통해 전송한 메시지는 결과 페이지 만료 주기와 별개로, 서비스 운영 및 개선 목적에 필요한 기간 동안 보관될 수 있으며 별도의 자동 만료 시각이 설정되지 않습니다. 사용자가 본인이 전송한 메시지의 삭제를 요청하는 경우, 운영자는 메시지 작성 시각, 결과 페이지 식별자, 합리적으로 본인 확인이 가능한 정보를 기준으로 처리할 수 있습니다.",
      ],
    },
    {
      title: "7. 사용자 권리와 요청 방법",
      body: [
        "사용자는 본인의 개인정보에 관하여 열람, 정정, 삭제, 처리 정지 또는 동의 철회를 요청할 수 있습니다. 다만 서비스가 별도의 회원 계정이나 본인 인증 체계를 운영하지 않는 경우, 운영자는 요청자가 실제 데이터 주체인지 확인하기 위해 결과 URL, 생성 시각, 브라우저 정보, 기타 합리적으로 필요한 확인 정보를 요청할 수 있습니다.",
        "사용자가 결과 URL을 분실했거나 본인 확인에 필요한 정보를 제공하지 못하는 경우, 운영자는 특정 데이터를 정확히 찾거나 삭제하지 못할 수 있습니다. 또한 사용자가 이미 외부에 공유한 캡처 이미지, 메신저 전송본, 커뮤니티 게시물, 검색 엔진 캐시, 제3자의 저장본은 운영자의 통제 범위를 벗어나므로 삭제 요청의 대상이 되지 않을 수 있습니다.",
      ],
    },
    {
      title: "8. 자동화된 의사결정에 관한 고지",
      body: [
        "서비스는 자동화된 알고리즘과 생성형 AI 모델을 이용해 문장을 생성하지만, 해당 결과는 사용자의 법적 권리, 채용, 신용, 교육, 보험, 의료, 공공서비스 이용 가능성 등 중대한 영향을 주는 결정을 내리기 위한 것이 아닙니다.",
        "서비스의 점수, 키워드, 결론, 게이지, 분석 문구는 오락성 표현이며 정확성, 공정성, 일관성, 반복 가능성 또는 과학적 타당성이 보장되지 않습니다. 사용자는 분석 결과에 근거하여 본인 또는 타인의 외모, 성격, 직업, 건강, 인간관계, 사회적 가치에 관한 결정을 내려서는 안 됩니다.",
      ],
    },
    {
      title: "9. 안전조치",
      body: [
        "서비스는 가능한 범위에서 환경변수를 통한 키 관리, 서버 측 프롬프트 처리, 데이터베이스 접근 정책, 결과 만료 처리, rate limit, HTTPS 전송, 외부 공개 범위 제한 등 합리적인 기술적 조치를 사용할 수 있습니다. 그러나 MVP 또는 실험 서비스의 특성상 상용 서비스 수준의 모든 보안, 감사, 백업, 접근제어, 내부 권한 분리 또는 전담 모니터링이 제공된다고 보장하지 않습니다.",
        "사용자는 공개된 장소, 타인이 볼 수 있는 화면, 회사 또는 학교 기기, 공용 PC, 화면 녹화 중인 환경, 회의 공유 중인 브라우저, 민감한 배경이 노출된 공간에서 서비스를 이용할 때 본인의 얼굴과 주변 정보가 함께 캡처될 수 있음을 유의해야 합니다.",
      ],
    },
    {
      title: "10. 쿠키, 로컬 저장소 및 브라우저 권한",
      body: [
        "서비스는 필수 기능 제공, 세션 흐름 유지, 브라우저 상태 확인 또는 향후 공유 기능 개선을 위해 쿠키, 로컬 저장소, 세션 저장소 또는 브라우저 권한 상태를 사용할 수 있습니다. 현재 서비스는 광고 목적의 제3자 추적 쿠키를 핵심 기능으로 사용하지 않습니다.",
        "카메라 권한은 브라우저 또는 운영체제가 관리합니다. 사용자가 권한을 철회하거나 차단하려면 브라우저 설정, 사이트 권한 설정 또는 운영체제 개인정보 보호 설정에서 직접 변경해야 합니다.",
      ],
    },
    {
      title: "11. 아동의 개인정보",
      body: [
        "서비스는 만 14세 미만 사용자의 이용을 허용하지 않습니다. 사용자가 만 14세 이상 체크박스를 선택한 경우 운영자는 그 진술을 신뢰할 수 있으며, 허위 진술로 인해 발생하는 문제는 사용자 또는 법정대리인의 책임입니다.",
        "사용자는 타인의 얼굴이나 미성년자의 얼굴을 대신 촬영하거나 입력해서는 안 되며, 특히 만 14세 미만 아동의 얼굴은 본인 또는 보호자의 동의 여부와 관계없이 서비스에 입력할 수 없습니다.",
        "운영자가 만 14세 미만 사용자의 개인정보가 처리되었다는 사실을 합리적으로 확인한 경우, 관련 법령과 기술적 가능성의 범위 내에서 해당 데이터 삭제 또는 접근 제한을 진행할 수 있습니다.",
      ],
    },
    {
      title: "12. 방침 변경",
      body: [
        "본 개인정보처리방침은 서비스 구조, 외부 API, 저장 정책, 배포 환경, 법령, 운영 방식 또는 기능 변경에 따라 수시로 개정될 수 있습니다. 변경된 방침은 서비스 화면 또는 관련 문서에 게시된 시점부터 적용됩니다.",
        "사용자가 변경 후 서비스를 계속 이용하는 경우, 변경된 개인정보처리방침에 따른 처리에 동의한 것으로 봅니다. 중요한 변경이 있는 경우 운영자는 가능한 범위에서 서비스 화면을 통해 변경 사항을 알릴 수 있으나, 모든 변경에 대해 개별 통지를 보장하지 않습니다.",
      ],
    },
    {
      title: "13. 문의",
      body: [
        "개인정보 관련 문의, 삭제 요청, 오류 신고 또는 권리 행사 요청은 운영자가 별도로 안내하는 연락 수단을 통해 접수할 수 있습니다. 운영자는 요청의 내용, 본인 확인 가능성, 데이터 위치, 백업 상태 및 외부 제공자의 처리 정책을 검토한 뒤 합리적인 기간 내에 답변하거나 처리할 수 있습니다.",
        "본 방침은 2026년 4월 26일부터 적용됩니다.",
      ],
    },
  ],
  en: [
    { title: "1. Overview", body: ["The service may process your face image, facial landmarks, derived metrics, selected gender, generated result, result URL, and operational logs."] },
    { title: "2. Purposes", body: ["Data is used to generate analysis results, display result pages, compose share images, investigate errors, prevent abuse, manage cost, and improve service quality."] },
    { title: "3. External Services", body: ["The service may use AI analysis APIs, Supabase, Vercel, or similar infrastructure. Data is processed only as needed to provide the feature."] },
    { title: "4. Retention", body: ["Standard results are designed to remain accessible for 24 hours, while manual upload results remain accessible for 7 days. Operational logs and feedback may be retained separately."] },
    { title: "5. User Rights", body: ["You may request access, deletion, or restriction of processing. Because the service has no accounts, reasonable verification information such as the result URL may be required."] },
  ],
  ja: [
    { title: "1. 概要", body: ["本サービスは顔画像、顔ランドマーク、算出メトリック、選択された性別、生成結果、結果URL、運用ログを処理する場合があります。"] },
    { title: "2. 処理目的", body: ["データは分析結果生成、結果ページ表示、共有画像構成、エラー調査、悪用防止、費用管理、サービス品質改善のために使用されます。"] },
    { title: "3. 外部サービス", body: ["AI分析API、Supabase、Vercelまたは同等のインフラを使用する場合があります。機能提供に必要な範囲でデータが処理されます。"] },
    { title: "4. 保管期間", body: ["通常結果は24時間、手動アップロード結果は7日間アクセス可能に設計されています。運用ログとフィードバックは別期間保管される場合があります。"] },
    { title: "5. 利用者の権利", body: ["利用者は閲覧、削除、処理停止などを求めることができます。ただしアカウントのないサービスであるため、結果URLなど合理的な確認情報が必要になる場合があります。"] },
  ],
};

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  if (!isLocale(params.locale)) notFound();
  return { title: getDictionary(params.locale).metadata.privacyTitle };
}

export default function LocalizedPrivacyPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const dictionary = getDictionary(params.locale);
  const sections = privacySections[params.locale];
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <article className="border border-border bg-bg-card/55 p-8 shadow-panel">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-text-faint">AI FACE REPORT PRIVACY POLICY</p>
        <h1 className="mt-4 text-4xl font-black">{dictionary.entry.privacy}</h1>
        <p className="mt-5 text-sm leading-7 text-text-muted">{dictionary.legal.privacyIntro}</p>
        {dictionary.legal.translationNotice && <p className="mt-3 text-xs leading-6 text-text-faint">{dictionary.legal.translationNotice}</p>}
        <div className="mt-10 space-y-9 text-[13px] leading-7 text-text-muted">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-base font-extrabold text-text-primary">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3">{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}

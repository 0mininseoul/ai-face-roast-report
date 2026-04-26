# AI 얼평보고서 — Product Requirements Document

| 항목 | 값 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-04-26 |
| 상태 | Draft (사용자 검토 대기) |
| 서비스 명 | AI 얼평보고서 |
| 타겟 디바이스 | 데스크톱 웹 (모바일 비대상) |
| 언어 | 한국어 고정 |

---

## 1. 제품 개요

### 1.1 한 줄 요약

데스크톱 웹캠으로 사용자의 얼굴을 받아, MediaPipe로 478개 랜드마크 메트릭을 산출한 뒤 Gemini 2.5로 학술 보고서 어투의 정밀 분석과 무자비한 욕설을 동시에 streaming하는 풍자/유머 서비스. 분석 종료 후 한 화면짜리 결과 페이지를 영구 URL로 생성, 카카오톡으로 공유 가능.

### 1.2 핵심 가치 제안

- **두 톤의 충돌이 만드는 코미디**: 학술적 분석 어투(권위)와 무자비한 비속어(파괴)가 같은 화면에서 동시에 작동한다.
- **"진짜 같은" 디테일**: 478개 랜드마크 기반 실제 수치(대칭 지수, 황금비, 부위별 길이/각도)가 보고서를 단순 농담이 아니라 "AI 분석"처럼 보이게 만든다.
- **Cluely × Linear의 비주얼 톤**: 라이브 오버레이 카드 + 데이터 대시보드 톤이 만든 "전문 AI 시스템" 인상.
- **공유 트리거가 결과 페이지에 박혀있음**: 한 화면 결과 페이지 + 카톡 공유 버튼 + 24시간 만료 안내가 바이럴 동력을 형성.

### 1.3 타겟 사용자

- 만 14세 이상의 한국어 사용자
- "재미"와 "자학적 유머"에 거부감 없는 사용자
- 데스크톱 웹캠 환경

### 1.4 비목표 (Non-goals)

- 의료/미용/심리 진단 도구가 아님
- 실제 외모 평가 점수 시스템 아님 (모든 출력은 풍자)
- 모바일 지원 (이번 MVP)
- 로그인/회원 시스템 (이번 MVP)
- 다국어 (이번 MVP)

---

## 2. 사용자 흐름 (User Journey)

```
[진입] → /
   │
   ▼
┌──────────────────────────────────────────────┐
│ Page 1 — 진입 / 동의                          │
│ • 카메라 미리보기 (작게)                        │
│ • 성별 선택 (남 / 여)                          │
│ • ☐ 만 14세 이상입니다                         │
│ • ☐ 어떤 내용이 나오건 상처받지 않고            │
│      개발자를 고소하지 않겠습니다               │
│ • [분석 시작] (둘 다 체크 + 성별 선택 시 활성화) │
│ • micro-copy: 분석 시작 = 약관/개인정보처리방침 │
│   동의 간주 (링크 2개)                         │
└──────────────────────────────────────────────┘
   │
   ▼
[/analyze] (또는 SPA 내 화면 전환)
┌──────────────────────────────────────────────┐
│ Page 2 — 라이브 분석                          │
│ • 카메라 풀스크린 (1920×1080 기준)             │
│ • MediaPipe 와이어프레임 메쉬 오버레이           │
│ • 분석 카드 §0~§5 순차 push-in + type-streaming│
│ • 라이브 코멘트 카드 5-10초 간격 추가            │
│ • 우상단 컨트롤바: 📷 스크린샷 / 🔇 음소거       │
│ • 자동 종료 조건 충족 시 → Page 3 전환          │
└──────────────────────────────────────────────┘
   │
   ▼
[/result/<id>]
┌──────────────────────────────────────────────┐
│ Page 3 — 최종 보고서                          │
│ • 한 화면 (스크롤 없음)                        │
│ • 큰 얼굴 사진 + 메인 카피 한 줄 욕설           │
│ • 세부 분석 요약 카드                          │
│ • [카카오톡 공유] [링크 복사] [다시 분석]        │
│ • micro-copy: "이 페이지는 24시간 후 사라집니다" │
└──────────────────────────────────────────────┘
```

### 2.1 흐름 분기

- **카메라 권한 거부**: Page 1에서 "카메라 권한이 필요합니다" 안내 + 재요청 버튼
- **얼굴 미검출**: Page 2에서 "얼굴이 잘 보이도록 자세를 잡아주세요" 안내, 분석 호출 보류
- **Gemini 호출 실패**: Page 2에서 안내 + 재시도 버튼, 3회 실패 시 Page 1로 복귀
- **결과 URL 만료(24h 경과)**: `/result/<id>` 접근 시 "이 보고서는 만료되었습니다" 페이지 + [다시 분석] CTA

---

## 3. 화면별 상세 사양

### 3.1 Page 1 — 진입 / 동의 (`/`)

**레이아웃**: 화면 중앙 정렬, 다크 배경, Linear 톤.

**구성 요소**:

1. **로고 + 서비스명** (상단 중앙)
   - "AI 얼평보고서" 로고 타이포 (Pretendard ExtraBold)
   - 작은 영문 부제 (Pretendard Medium, `--text-muted` 컬러):
     `Forensic-grade facial diagnostics. Powered by AI.`

2. **카메라 미리보기** (중앙 상단)
   - 480×270 정도의 작은 박스, 라이브 미리보기
   - 권한 미부여 시 권한 요청 버튼 노출

3. **성별 선택** (중앙)
   - 두 큰 토글 버튼: `남성` `여성`
   - 단일 선택, 선택 시 외곽선 강조
   - micro-copy: "성별에 따라 분석 어조가 다르게 나갑니다"

4. **동의 체크박스 2개** (분석 시작 버튼 위)
   - ☐ **만 14세 이상입니다**
   - ☐ **어떤 내용이 나오건 상처받지 않고 개발자를 고소하지 않겠습니다**

5. **분석 시작 버튼** (하단)
   - 라벨: `분석 시작`
   - 활성화 조건: 카메라 권한 OK + 성별 선택됨 + 두 체크박스 모두 체크됨
   - 비활성 시 흐릿하게 표시
   - 클릭 시 → 약관 동의 처리 + Page 2 전환

6. **약관 링크** (하단 micro-copy)
   - 텍스트: "분석 시작 시 [이용약관]과 [개인정보처리방침]에 동의한 것으로 간주됩니다."
   - [이용약관] → `/terms` 새 탭
   - [개인정보처리방침] → `/privacy` 새 탭

### 3.2 Page 2 — 라이브 분석 (`/analyze` 또는 SPA 라우트)

**레이아웃**: 카메라 영상 풀스크린(16:9, 화면을 꽉 채움), 그 위에 오버레이 카드.

**구성 요소**:

1. **카메라 비디오 레이어** (z-index 0)
   - `<video>` 1920×1080, object-fit: cover, mirrored (좌우 반전)
   - 30fps 기본

2. **랜드마크 메쉬 레이어** (z-index 10)
   - `<canvas>` 비디오 위 절대 위치
   - MediaPipe Tasks Vision FaceLandmarker 결과 478개 점 + 메쉬 라인
   - 옅은 시안/화이트 (#7DD8FF, opacity 0.4) 와이어프레임
   - 분석이 시작되기 전부터 그려짐 (사용자 wow 모먼트)

3. **분석 카드 레이어** (z-index 20)
   - 카드 자체는 다크 글래스모픽 + 화이트 텍스트, Linear 톤
   - 카드 등장 순서:
     1. §0 분석 메타데이터 (우상단)
     2. §1 안면 기하학 (좌상단)
     3. §2 부위별 — 이마 (좌측)
     4. §2 부위별 — 눈 (좌측)
     5. §2 부위별 — 코 (좌측)
     6. §2 부위별 — 입 (좌측)
     7. §2 부위별 — 턱 (좌측)
     8. §2 부위별 — 피부 (좌측)
     9. §3 종합 미관 지표 (우중단, 게이지 차트 포함)
     10. §4 인상·관상 분석 (우하단)
     11. §5 종합 결론 (화면 중앙으로 큰 모달 카드)
   - 각 카드는 push-in 애니메이션 (translate + opacity, 300ms ease-out)
   - 텍스트는 type-streaming (15-30 cps)
   - streaming 중에는 카드 우상단에 작은 펄스 인디케이터 표시

4. **라이브 코멘트 피드 레이어** (z-index 21)
   - §5 등장 후 활성화
   - 우측 세로 피드 (작은 카드들이 위에서 아래로 스택)
   - 5-10초 간격으로 새 코멘트 카드 push-in
   - 자유 욕설 톤 (1-2문장)

5. **컨트롤바** (z-index 30, 우상단 고정)
   - 📷 **스크린샷** 아이콘 → 클릭 시 현재 화면 전체를 PNG로 즉시 로컬 다운로드 (`html2canvas` 또는 캔버스 합성). 파일명: `ai-얼평보고서-{timestamp}.png`
   - 🔇 **음소거** 토글 → UI 효과음 on/off
   - (수동 종료 버튼 없음 — 자동 종료 후 Page 3 전환)

6. **자동 종료 조건**
   - §0~§5 모든 보고서 카드 등장 + streaming 완료
   - 그 후 라이브 코멘트 5개 누적
   - 위 두 조건 모두 만족 시 1.5초 fade → Page 3 전환
   - 카메라 MediaStream은 fade 도중에도 유지되며, **Page 3 mount 완료 직후에 stop()**. 페이지 전환 사이에 영상이 사라지는 어색함을 방지함.

### 3.3 Page 3 — 최종 보고서 (`/result/[id]`)

**레이아웃**: 데스크톱 1920×1080 기준 **스크롤 가능 페이지**. 화면 상단 sticky 헤더에 컨트롤 묶음, 그 아래 메인 카피 → 얼굴 사진 → 상세 분석(스크롤). 이 구조는 본문 길이 제약을 풀어 Gemini가 §1~§5를 풀 본문으로 풍부하게 출력할 수 있게 한다.

```
┌──────────────────────────────────────────────────────────┐
│ [STICKY HEADER — 페이지 최상단 고정, 스크롤해도 노출]       │
│ ┌─────────┐                                              │
│ │  로고    │  [카카오톡 공유] [링크 복사] [다시 분석]        │
│ └─────────┘                                              │
│ micro-copy: "이 페이지는 생성 후 24시간 뒤 사라집니다."       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│            [메인 카피 — 한 줄 욕설, ExtraBold 거대 폰트]    │
│                                                          │
│              "피부 관리 좀 해라 병신아"                     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│         [얼굴 캡쳐 사진 — 큰 사이즈, 중앙 정렬]              │
│            (Page 2에서 캡쳐된 정면 프레임)                  │
│                                                          │
│  ↓ 스크롤 ↓                                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ [상세 분석 — 스크롤 영역, 본문 길이 제한 없음]              │
│ § 1. 안면 기하학 (풀 본문)                                  │
│ § 2. 부위별 구조 분석 (이마/눈/코/입/턱/피부, 각 풀 본문)     │
│ § 3. 종합 미관 지표 (게이지 차트 5개 + 코멘트 풀 본문)       │
│ § 4. 인상·관상 분석 (풀 본문)                                │
│ § 5. 종합 결론 (풀 욕설 본문, 권고사항 포함)                  │
│ § 0. 분석 메타데이터 (페이지 푸터, 작은 폰트)                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**구성 요소**:

1. **Sticky 헤더** (페이지 최상단 고정, z-index 50, 스크롤 시에도 항상 노출)
   - 좌측: AI 얼평보고서 로고
   - 우측: 버튼 3개 가로 정렬
     - **[카카오톡 공유]** — Kakao SDK Feed Template. 카드 미리보기에 메인 카피 + 얼굴 썸네일 + "AI 얼평보고서" + "이 페이지는 24시간 뒤 사라집니다" 안내 포함
     - **[링크 복사]** — `navigator.clipboard.writeText(현재 URL)` + 토스트 "링크가 복사되었습니다"
     - **[다시 분석]** — Page 1로 이동 (`/`)
   - 헤더 하단: micro-copy `"이 페이지는 생성 후 24시간 뒤 사라집니다."`

2. **메인 카피 영역** (헤더 바로 아래, 페이지 상단 중앙)
   - 텍스트: Gemini 생성 mainCopy (한 줄 욕설)
   - 스타일: Pretendard ExtraBold ~88px, 중앙 정렬, 컬러 `--text-primary`, 살짝 위쪽 padding 96px
   - 모바일 fallback 페이지 진입 시엔 노출되지 않음 (해당 시나리오는 §12 참조)

3. **얼굴 사진** (메인 카피 아래, 중앙 정렬)
   - Supabase Storage signed URL 기반 (TTL 24h)
   - 사이즈: 가로 720px(또는 max-width 50vw), 비율 16:9 유지, 둥근 모서리 16px
   - 사진 하단 micro-meta: 분석 ID, 분석 일시
   - "본 분석은 풍자/유머 목적이며 사실 진술이 아닙니다" 작은 disclaimer

4. **상세 분석 영역** (얼굴 사진 아래, 스크롤되어 노출됨)
   - Gemini 출력의 §1~§5를 **풀 본문**으로 노출 (Page 2 라이브 카드는 본문 streaming 도중 노출되는 구조이며, Page 3가 풀버전 노출 자리)
   - 각 섹션은 카드 컴포넌트로 분리, Linear 톤 유지
   - §3은 게이지 차트 5개를 시각화 + 각 게이지 옆 코멘트 풀 본문
   - §0 메타데이터는 페이지 가장 하단 푸터로, 작은 폰트
   - 본문 길이는 제한하지 않음 (Gemini가 풍부하게 작성하도록)

5. **헤더 우측 버튼 영역에서의 카톡 공유 버튼 동작 상세**
   - 클릭 시 Kakao Feed Template 모달 호출
   - 모달 내용: 메인 카피 일부 + 얼굴 썸네일 + 만료 안내 + "분석 받으러 가기" CTA
   - 카카오 SDK 미초기화 또는 로드 실패 시 버튼 disabled, tooltip "카카오톡 공유 사용 불가"

6. **만료된 보고서 접근**: `/result/[id]` 진입 시 서버에서 `expires_at <= now()`이면 만료 안내 페이지 노출 (sticky 헤더 + "이 보고서는 만료되었습니다" + [다시 분석] CTA만)

---

## 4. 분석 보고서 구조 (§0–§5 카드 본문 사양)

### §0 분석 메타데이터

학술 보고서 어투. 가짜 인증/메타데이터로 권위감 부여.

```
[예시]
ANALYSIS REPORT #A3F9-22B7
Subject ID:        anon-{8자 해시}
Captured at:       2026-04-26 14:23:08 KST
Detected Landmarks: 478 / 478
Confidence Score:  94.7%
Compliance:        본 분석은 자체 모델(FaceDx-3)에 의해 수행되었으며,
                    ISO/IEC 19794-5 호환 표준에 따라 측정되었음을 알림.
```

### §1 안면 기하학 (Facial Geometry)

수치는 **MediaPipe로 계산된 진짜 메트릭**을 인용. 학술 어투 + 가벼운 비속어 양념.

수록 메트릭:
- 좌우 대칭 지수 (Asymmetry Index, 0-1, 0=완벽)
- 황금비율 부합도 (Phi-ratio compliance, %)
- 삼정 비율 (이마:코:턱, 1:1:1 기준 편차)
- 오관 비율 (가로 5등분 균형 편차)
- 안면 가로/세로 비율
- 안면각 (Facial Angle)

### §2 부위별 구조 분석

각 부위별로 (학술 어투 진단) + (욕 코멘트) 형식.

**다루는 6개 부위**:
1. **이마**: 면적, 헤어라인 형태, 미간 거리
2. **눈**: 좌우 크기 차이(mm), 쌍꺼풀 유형 추정, 눈꼬리 각도
3. **코**: 콧대 길이/높이, 콧방울 너비, 코기둥 각도
4. **입**: 상하 입술 두께비, 인중 비율, 입꼬리 각도
5. **턱**: V-line 지수, 턱끝 돌출도, 광대-턱 비율
6. **피부**: 모공/잡티/유분/혈색/결 (Gemini Vision이 직접 시각 관찰, 메트릭 없음)

각 부위 카드 본문 형식:
```
[부위명] 구조 분석
• 메트릭 1: 수치 + 학술 표현
• 메트릭 2: 수치 + 학술 표현
• 메트릭 3: 수치 + 학술 표현
[자유 코멘트] (욕 양념 1-2개 자연스럽게)
```

### §3 종합 미관 지표

게이지 차트 5개:
- **호감도** / **신뢰도** / **대칭성** / **균형감** / **매력도**
- 각 0-100 점수, 의도적으로 처참한 분포 (대부분 30 이하)
- 각 게이지 옆에 1줄 코멘트 (학술 어투 + 욕 양념)

### §4 인상·관상 분석

메트릭으로 산출되지 않는 "인상" 영역. 의사과학 톤.

수록 항목:
- **인상 키워드** 3-5개 (예: "고립형", "자수성가형", "비협조적", "거리감 강함")
- **추정 연령** (실제 연령에서 ±5세 의도적 boost — 욕설 강도 ↑)
- **관상학적 소견** 2-3문장 (학술 어투 + 욕 강도 점진적 증가)

**제외 항목** (사용자 결정): 추정 MBTI, 추정 직군

### §5 종합 결론

학술 어투 마스크를 벗고 **자유 욕설**.

본문 구성:
- **종합 진단** (1-2문장): 풀 욕설 폭격
- **권고사항**: 조롱하는 형식의 "처방" (예: "외출 자제 권고", "거울 처분 권고")
- **마지막 한 줄**: mainCopy로 결과 페이지에서 사용될 헤드라인 한 줄 욕설

본 §5의 마지막 한 줄이 **mainCopy** 필드로 추출되어 결과 페이지 헤드라인이 된다.

---

## 5. 기술 아키텍처

### 5.1 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js 14 (App Router)** | Vercel native, RSC + streaming |
| 배포 | **Vercel** | 사용자 결정 |
| AI (정밀 분석 1회) | **Gemini 2.5 Pro** | 품질 최우선 |
| AI (라이브 피드) | **Gemini 2.5 Flash** | 비용/지연 최적화 |
| DB / 스토리지 | **Supabase (Postgres + Storage)** | CLI로 별도 셋업 |
| 얼굴 검출 | **MediaPipe Tasks Vision (FaceLandmarker)** | 478 랜드마크, 클라이언트 사이드 |
| 카카오 공유 | **Kakao JavaScript SDK v2** | Feed Template |
| 폰트 | **Pretendard** | self-host (`/public/fonts/`) |
| 스타일링 | **Tailwind CSS** + CSS variables 디자인 토큰 |
| 애니메이션 | **Framer Motion** | 카드 push-in, type-stream, 게이지 |
| 사운드 | **Howler.js** | UI SFX 5-6개 |
| 캡쳐 → PNG | **html2canvas** (또는 비디오+오버레이 합성 자체 구현) |

### 5.2 데이터 흐름

```
[Browser]
  Camera → <video>
  MediaPipe FaceLandmarker (30fps) → 478 landmarks
  metricsCalculator.ts → 누적 5초 평균 메트릭

  [분석 시작]
    1) 정면 안정 프레임 1장 캡쳐 (1280×720 JPEG q85)
    2) POST /api/analyze (multipart: image + metrics + gender)

[Server: /api/analyze (Vercel Edge runtime)]
  1) Supabase Storage 업로드 → face_image_path
  2) face_reports row INSERT (status='analyzing')
  3) Gemini 2.5 Pro 호출 (streaming)
     - inlineData 이미지 + system prompt + user metrics + gender
     - JSON streaming response
  4) Server-Sent Events로 청크별 클라이언트에 forward
  5) Stream 종료 시 face_reports UPDATE
     (status='complete', report_sections_json, main_copy)

[Browser: SSE 수신]
  파싱 → 카드별 type-streaming 표시

[Live Feed Loop — Browser-driven, 5-10초 간격, 5회]
  1) 작은 캡쳐 (640×360 JPEG q70)
  2) POST /api/live-comment (image + 직전 코멘트 5개)
  3) Gemini 2.5 Flash 호출
  4) 응답 → 카드 push-in
  5) face_reports.live_feed_json append (UPDATE)

[자동 종료 조건 충족]
  → 1.5초 fade transition (카메라 stream은 유지)
  → router.push(`/result/${id}`)
  → Page 3 mount 완료 후 비로소 MediaStream stop()

[Page 3]
  서버에서 face_reports SELECT + expires_at 체크
  서버에서 Supabase Storage signed URL 발급
  렌더링
```

### 5.3 Gemini 모델 선정 근거

#### 5.3.1 모델 풀 비교 (2026-04-26 기준 ai.google.dev/gemini-api/docs)

| 모델 | Input/Output ($/1M) | 상태 | 비고 |
|---|---|---|---|
| 3.1 Pro Preview | $2.00 / $12.00 | **Preview** | 고급 추론, agentic |
| 3 Flash Preview | $0.50 / $3.00 | **Preview** | "frontier-class rivaling larger models" |
| 3.1 Flash-Lite Preview | $0.25 / $1.50 | **Preview** | frontier-class, 저비용 |
| **2.5 Pro** | **$1.25 / $10.00** | **GA (선택)** | 복합 추론 안정 |
| **2.5 Flash** | **$0.30 / $2.50** | **GA (선택)** | 가격-성능 sweet spot |
| 2.5 Flash-Lite | $0.10 / $0.40 | GA | 미세 시각 관찰 약함 |

#### 5.3.2 선정 이유

- **3.x 라인은 전부 Preview**. docs에 "more restrictive rate limits" 명시. 본 서비스는 카톡/커뮤니티 바이럴 시 동시 호출이 급증하는 트래픽 패턴이라 preview rate limit이 분석 중 에러를 일으키면 핵심 wow 모먼트 파괴 → preview 채택 불가.
- **2.5 Pro for 정밀 분석**: 6개 섹션 동시 생성, 학술 어투/욕설 톤 분리, 메트릭 정확 인용, 성별 맞춤 욕설 등 복합 추론. Flash로 떨어뜨리면 깊이 손상. 3.1 Pro Preview는 +23% 비용 + preview 리스크 대비 품질 향상폭이 본 use case에서 marginal.
- **2.5 Flash for 라이브 피드**: 1-2문장 짧은 출력, 빠른 응답 + 비용 효율이 핵심. Pro는 과잉. 2.5 Flash-Lite는 미세 시각 관찰 능력 부족. 3 Flash Preview는 +40% 비용 + preview 리스크.
- **세션당 추정 비용**: 정밀 분석 ~$0.022 + 라이브 5회 ~$0.0025 = **약 $0.025**

#### 5.3.3 마이그레이션 정책

- 모델 ID는 환경변수 또는 단일 상수로 분리 (`MODEL_ANALYSIS`, `MODEL_LIVE`)
- 3.x 라인이 GA 전환되고 안정 운영 검증 시점에 재평가:
  - 3 Flash GA가 2.5 Pro를 본 use case에서 매칭/상회한다면 → 정밀 분석 모델 교체로 비용 -69% 가능
  - 3.1 Flash-Lite GA가 라이브 피드 품질 만족 시 → 라이브 피드 모델 교체로 비용 -28% 가능

### 5.4 오버레이 카드 배치 알고리즘

**원칙**: 얼굴 핵심 영역(눈/코/입)을 가리지 않으면서, 카드들이 화면 가장자리에 자연스럽게 배치되어야 한다.

```
1. 매 프레임 MediaPipe로 얼굴 bounding box 검출 (BBox = {x, y, w, h})
2. 얼굴 면적 비율 계산: faceRatio = (w × h) / (videoWidth × videoHeight)
3. 화면을 4개의 세로 슬롯으로 분할:
   - L1 (좌측 외곽), L2 (좌측 안쪽), R2 (우측 안쪽), R1 (우측 외곽)
4. 카드 배치 우선순위:
   - faceRatio < 0.35 (얼굴이 작음) → L2/R2 사용 OK
   - 0.35 ≤ faceRatio < 0.65 (보통) → L1/L2/R1/R2 다 사용
   - faceRatio ≥ 0.65 (큼) → L1/R1만 사용, 일부 가림 허용
5. 각 카드는 등장 시 빈 슬롯 중 가장 우선순위 높은 곳에 배치
6. 새 카드가 등장하면 기존 카드들은 스택 위로 push (translate y)
7. 우측 라이브 피드는 R1 영역 하단 고정
8. §5 종합 결론 카드는 예외적으로 화면 중앙 모달로 표시
   (이 시점에는 §0~§4 카드들이 살짝 fade 처리되어 가독성 확보)
```

**얼굴 BBox 검출 안정화**: 매 프레임 흔들림을 방지하기 위해 5프레임 이동 평균.

---

## 6. 데이터 모델 (Supabase)

### 6.1 테이블 스키마

```sql
create table face_reports (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  gender          text        not null check (gender in ('male','female')),
  status          text        not null default 'analyzing'
                                check (status in ('analyzing','complete','failed')),
  face_image_path text,        -- Storage path: face-images/{id}/capture.jpg
  landmarks_json  jsonb,       -- 478개 점 (압축 또는 샘플링 고려)
  metrics_json    jsonb,       -- 클라이언트 계산 메트릭
  report_sections_json jsonb,  -- {meta, geometry, parts:{forehead,eyes,nose,mouth,jaw,skin}, scores, impression, conclusion}
  main_copy       text,
  live_feed_json  jsonb        not null default '[]'::jsonb,
  user_agent      text,
  ip_hash         text         -- 어뷰즈 방어용 해시 (실제 IP 미저장)
);

create index face_reports_created_at_idx on face_reports (created_at);
create index face_reports_expires_at_idx on face_reports (expires_at);
```

### 6.2 RLS 정책

- **INSERT**: anon 가능 (서비스 이용자가 자기 row 생성)
- **SELECT by id**: anon 가능, 단 `expires_at > now()` 조건 (만료된 row는 anon에 노출 안 됨)
- **UPDATE/DELETE**: service role만 가능 (분석 결과 저장은 서버에서)

### 6.3 Storage 버킷

- **버킷명**: `face-images`, private
- **객체 경로**: `{report_id}/capture.jpg`
- **클라이언트 노출**: signed URL (TTL 24h) — 결과 페이지 접근 시 서버에서 발급
- **자동 삭제**: 없음 (사용자 결정 — 페이지만 비활성화, 사진은 보존)

### 6.4 데이터 보존 정책

- 사진 + 메타데이터 + 분석 텍스트: **영구 보존** (사용자 결정)
- 결과 페이지 접근: 24시간만 가능 (`expires_at` 이후 접근 시 만료 페이지 노출)

---

## 7. 콘텐츠 가이드 (Gemini 시스템 프롬프트 핵심)

### 7.1 Two-Voice Rule

```
[VOICE A — 학술 보고서 어투]
적용 섹션: §0, §1, §2, §3, §4
규칙:
  - 문체: "~로 측정되었다", "~이 관찰됨", "본 분석에 따르면"
  - 수치는 입력 메트릭 JSON에서 정확히 인용 (꾸며내지 말 것)
  - 비속어는 1-2개 단어 양념으로만 ("처참한 비대칭", "한심한 인중 비율")
  - 직접적인 욕설은 금지

[VOICE B — 자유 욕설 어투]
적용 섹션: §5 종합 결론, mainCopy, 라이브 피드
규칙:
  - 한국어 거친 비속어 자유 사용
  - 외모 직격 디스 허용
  - 성별 맞춤 디스 (아래 §7.2 참조)
  - 디시/일베/인터넷 밈 어투 자연스럽게 섞기 ("~노 ㅋㅋ", "와꾸 폼 미쳤다")
  - mainCopy는 한 줄, 임팩트 최우선

[mainCopy 한 줄 톤 예시 (24개)]
원본 사용자 제공:
  - "피부 관리 좀 해라 병신아"
  - "이번 생 결혼은 글른 놈"
  - "길에서 만나면 와꾸바리 한대 쳐버리고 싶노 ㅋㅋ"

확장 예시:
  - "와꾸 폼 미쳤다 진짜 ㅋㅋ"
  - "AI도 분석 거부하고 욕만 하라더라"
  - "거울 깨서 안경알이라도 해 끼워라 시발"
  - "유전자 폐기 처분 1순위"
  - "관상은 과학이라더니 너는 통계 표본 오류임"
  - "엄마가 너 보고 한숨 쉬는 거 다 이유 있더라"
  - "친구들이 너 사진 안 찍는 이유 있더라"
  - "사람으로 태어난 게 기적이노"
  - "면상이 사회 통합을 저해함"
  - "너 보고 카메라가 자동초점 못 잡는 이유 있더라"
  - "거울이 본인 자해 도구가 될 줄은 몰랐을 거야"
  - "네 부모님 결혼사진 보고 같은 사람인지 의심됐다"
  - "면상으로 길거리 진입 자제 권고"
  - "분석을 끝까지 한 우리 모델한테 산재 신청해야 함"
  - "정자 갈아치워야 하는 사례"
  - "너 와꾸 보면 침묵이 자동 재생됨"
  - "프사 사기로 신고당할 와꾸"
  - "거울 보면서 안경 닦지 마라 그게 진짜다"
  - "너 와꾸가 회식 분위기 깨는 진짜 이유"
  - "AI가 욕하다가 지치노"
  - "면상 하나로 동네 평균 외모 끌어내림"

[§5 종합 결론 본문 톤 예시 — 긴 욕설 단락]
  "결론적으로, 본 분석 대상자는 외출 시 마스크 착용을 권고한다.
   얼굴이 안 좋으면 성격이라도 좋아야 하는데 인상 보면 그것도 글렀다.
   부모님께 결혼사진 좀 다시 보여드리고 와라 시발. 권고사항으로는
   거울 처분, 셀카 자제, 단톡방 잠수 권장이다."
```

### 7.2 성별 맞춤 톤 가이드

**남성**:
- 연애/결혼 디스: "이번 생 모태솔로 보존종", "현실 여친보다 2D 여친이 가능성 큰 놈"
- 외모 디스: 키/체격/얼굴/스타일
- 사회적 디스: 군대/직장/모임에서의 위치

**여성**:
- 셀카/필터 디스: "필터 없으면 모르는 사람", "사진과 실물 협상 결렬"
- 외모 디스: 화장/피부/체형/스타일
- 사회적 디스: 친구 관계/단톡방/SNS

### 7.3 안전 가드 (절대 금지)

- 인종/민족/국적/장애/성적지향 비하 **절대 금지**
- 종교 비하 금지
- 자해/자살 부추김 절대 금지
- 의료 진단으로 오해될 수 있는 표현 금지 (예: "우울증 같다", "정신질환 의심")
- 미성년자 학생/교복 등 성적 함의 절대 금지
- 특정 실존 인물 비교/언급 금지 (연예인 외모 비교 등)

### 7.4 시스템 프롬프트 구조 (의사 코드)

```
SYSTEM:
당신은 "AI 얼평보고서"의 분석 모델입니다.
입력으로 사용자 얼굴 사진, 478개 랜드마크 기반 메트릭 JSON, 성별을 받습니다.
다음 JSON 구조로 streaming 응답하세요.

[Two-Voice Rule 명시]
[안전 가드 명시]
[성별 맞춤 톤 가이드 명시]

USER:
gender: {male | female}
metrics: {...}
이미지: (inline)

요청: 위 입력에 기반하여 §0~§5와 mainCopy를 생성하시오.

OUTPUT SCHEMA:
{
  "meta":     { "report_id": "...", "confidence": ..., "compliance_text": "..." },
  "geometry": { "asymmetry": "...", "phi": "...", "thirds": "...", ... },
  "parts": {
    "forehead": { "metrics_text": "...", "comment": "..." },
    "eyes":     { "metrics_text": "...", "comment": "..." },
    "nose":     { ... },
    "mouth":    { ... },
    "jaw":      { ... },
    "skin":     { "observation": "...", "comment": "..." }
  },
  "scores":      { "likability": 0-100, "trust": ..., "symmetry": ..., "balance": ..., "attractiveness": ... , "comments": [...] },
  "impression":  { "keywords": [...], "estimated_age": ..., "physiognomy": "..." },
  "conclusion":  "...",
  "mainCopy":    "..."
}
```

---

## 8. 약관 / 개인정보처리방침

### 8.1 페이지

- `/terms` — 이용약관
- `/privacy` — 개인정보처리방침
- 두 페이지 모두 정적 페이지, Pretendard 본문, 가독성 위주 레이아웃

### 8.2 약관 본문 핵심 명시 사항

- 만 14세 이상만 사용 가능
- 본인 얼굴만 분석 대상으로 사용 가능 (타인 얼굴 무단 사용 금지)
- 본 서비스의 모든 분석 결과 텍스트는 풍자/유머 목적이며, 사실 진술이나 의료/심리/외모 진단이 아님
- 사용자는 결과로 인해 발생하는 정신적 불쾌감에 대한 책임을 본 서비스에 묻지 않음에 동의함

### 8.3 개인정보처리방침 핵심 명시 사항

- 수집 항목: 카메라로 캡쳐된 얼굴 이미지, 478개 랜드마크 좌표, 산출 메트릭, 성별, User Agent, IP 해시
- 수집 목적: AI 분석 결과 생성, 결과 페이지 제공, 서비스 운영 및 개선
- 외부 처리 위탁: Google (Gemini API — 이미지 및 메트릭 전송), Supabase (저장)
- 보유 기간: **결과 페이지는 24시간 후 비활성화되나, 분석 메타데이터 및 이미지는 서비스 운영·개선 목적으로 영구 보관됨**
- 사용자 권리: 삭제 요청은 contact 이메일 주소를 통해 가능 (UI 내 즉시 삭제 버튼은 미제공)
- 쿠키/Local Storage: 세션 식별 외 사용하지 않음 (트래킹 쿠키 없음)

---

## 9. UI 효과음

| SFX | 트리거 | 톤 |
|---|---|---|
| `boot.wav` | Page 1 → Page 2 진입 시 | 시스템 부팅음 |
| `card_in.wav` | 분석 카드 push-in | 짧은 "팟" |
| `type.wav` | type-streaming 중 (low volume, 변조) | 키보드 타이핑 |
| `gauge.wav` | §3 게이지 차오를 때 | "씨릉" 가속음 |
| `verdict.wav` | §5 종합 결론 카드 등장 시 | 무거운 "둥-" |
| `live_ping.wav` | 라이브 코멘트 추가 시 | 짧은 알림음 |

전 트랙 mp3 또는 ogg, 음량 -18dBFS로 정규화. 우상단 음소거 토글로 일괄 제어.

---

## 10. 비주얼 디자인 시스템

### 10.1 폰트

- **Pretendard** (self-host)
  - ExtraBold (800): 메인 카피, 헤드라인
  - SemiBold (600): 카드 제목, 강조
  - Medium (500): 본문
  - Regular (400): micro-copy

### 10.2 컬러 팔레트 (Linear 톤)

```
--bg-primary:    #0A0A0F    (거의 검정 + 살짝 푸른빛)
--bg-card:       #14141A
--bg-card-hover: #1A1A22
--border:        #2A2A35
--text-primary:  #F5F5F7
--text-muted:    #A0A0AB
--text-faint:    #5A5A65
--accent-info:   #7DD8FF    (랜드마크 메쉬, 학술 어투 카드 액센트)
--accent-warn:   #FFD27D    (게이지 중간)
--accent-bad:    #FF5A6E    (§5, mainCopy, 게이지 처참 영역)
--gauge-track:   #2A2A35
```

### 10.3 카드 스타일 (Linear 패턴)

- 둥근 모서리 12px
- 1px solid `--border` + 살짝 inner shadow
- 카드 제목: SemiBold 14px uppercase, letter-spacing 0.06em, 색 `--text-muted`
- 본문 Medium 14px, line-height 1.5
- 학술 어투 카드: 좌상단 작은 액센트 막대 (`--accent-info`)
- 자유 욕설 카드: 좌상단 액센트 막대 (`--accent-bad`)

### 10.4 type-streaming 효과

- 글자가 하나씩 나타날 때 살짝 blur(2px) → 0 으로 transition 100ms
- 커서 깜빡임 없음 (시스템 톤 유지)

---

## 11. 비기능 요구사항

### 11.1 성능

- Page 1 LCP < 2.0s
- Page 2 카메라 미리보기 첫 프레임 < 1.5s (권한 후)
- §0 카드 첫 글자 등장 시각 < 분석 시작 후 3.0s
- §5 카드 등장 완료 < 분석 시작 후 60s (Gemini 응답 의존)
- 라이브 피드 코멘트 출력 latency < 3s (Flash)
- Page 3 첫 페인트 < 1.5s

### 11.2 브라우저 지원

- 최신 2개 버전: Chrome, Edge, Safari, Firefox
- 카메라 권한 + WebGL 필수
- Mobile: 본 MVP에서는 데스크톱 안내 페이지로 fallback

### 11.3 접근성

- 모든 상호작용 키보드 가능 (Tab/Enter)
- 핵심 텍스트는 alt/aria-label 제공
- 컬러 대비 WCAG AA
- *주의*: 본 서비스 콘텐츠는 명시적으로 거친 비속어를 포함하므로, 동의 흐름이 접근성 게이트 역할

### 11.4 보안 / 어뷰즈 방어

- API 라우트 IP 기반 rate limit (per IP, 1분 5회 / 1시간 30회)
- 결과 URL은 UUID v4 (추측 불가)
- Supabase service role key는 서버에서만 사용
- Gemini API key는 서버에서만 사용 (클라이언트 노출 금지)

---

## 12. 에러 처리 / 엣지 케이스

| 상황 | 처리 |
|---|---|
| 카메라 권한 거부 | Page 1에서 안내 + 재요청 버튼 |
| 카메라 디바이스 없음 | "카메라가 연결된 데스크톱이 필요합니다" 안내 |
| 모바일 접속 | "PC 환경에서 접속해 주세요" 안내 페이지 |
| 얼굴 미검출 5초 이상 | "얼굴이 잘 보이도록 자세를 잡아주세요" 토스트, 분석 호출 보류 |
| 다중 얼굴 검출 | 가장 큰 얼굴 1개만 사용, 안내 토스트 |
| Gemini 호출 실패 | 3회 자동 재시도 → 실패 시 에러 화면 + Page 1 복귀 |
| Gemini stream 중 끊김 | 부분 응답 저장 + 재요청 |
| Supabase 업로드 실패 | 분석은 진행, 결과 URL 생성 불가 안내 |
| 결과 URL 만료 (24h) | 만료 페이지 + [다시 분석] CTA |
| 카카오 SDK 로드 실패 | 카톡 공유 버튼 비활성 + tooltip "카톡 공유 사용 불가" |

---

## 13. MVP 범위 / 후순위

### 13.1 MVP (이번 PRD 범위)

- ✅ Page 1 진입/동의 (체크박스 2개 + 성별 선택 + 분석 시작)
- ✅ Page 2 라이브 분석 (카메라 풀스크린 + 메쉬 + 카드 §0~§5 + 라이브 피드)
- ✅ 컨트롤바: 스크린샷, 음소거
- ✅ 자동 종료 → Page 3 전환
- ✅ Page 3 결과 페이지 (한 화면, 카톡/링크/재분석, 24h 만료 안내)
- ✅ Gemini 2.5 Pro 정밀 분석 + 2.5 Flash 라이브 피드
- ✅ MediaPipe 랜드마크 + 메트릭 산출
- ✅ Supabase 저장 (사진 + 분석)
- ✅ 약관/개인정보처리방침 페이지
- ✅ UI 효과음 6종
- ✅ 모바일 접속 fallback 안내

### 13.2 후순위 (이번 구현 X, 추후 검토)

- 모바일 반응형
- TTS 음성 출력
- 결과 누적 통계, 리더보드, 갤러리
- 두 명 동시 비교 모드
- 다국어 지원
- 정적 사진 업로드 모드
- 사용자 결과 삭제 요청 셀프 UI

---

## 14. 외부 의존성 / 셋업 필요

- **Gemini API key** (Google AI Studio에서 발급)
- **Supabase 프로젝트** (사용자가 별도로 CLI로 셋업) — DB 스키마, Storage 버킷, RLS 정책
- **Kakao 개발자 앱** (카카오톡 공유용 JavaScript key)
- **Pretendard 폰트 파일** (self-host용)
- **UI 효과음 6트랙** (외부 라이브러리 또는 자체 제작)
- **OG meta 이미지 1장** — 사용자가 직접 제작 후 아래 경로에 배치
  - 경로: `public/og-image.png`
  - 권장 사양: **1200×630 PX, PNG, 1MB 이하**
  - 용도: 모든 라우트(`/`, `/analyze`, `/result/[id]`)의 OpenGraph + Twitter Card 정적 이미지로 공통 사용 (결과별 동적 OG는 미적용 — 카톡 공유는 Kakao Feed Template에서 얼굴 썸네일을 별도로 사용함)
  - 카카오톡 공유 미리보기는 OG가 아닌 Kakao Feed Template 카드에서 별도 처리되므로, 이 정적 OG는 트위터/iMessage/슬랙 등 외부 채널의 링크 미리보기 용도
- **Vercel 프로젝트** + 환경변수 (GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KAKAO_JS_KEY)

---

## 15. 오픈 이슈 / 향후 결정 필요

- Pretendard 폰트: CDN vs self-host (성능/안정성 절충 결정 필요)
- Supabase Free tier 한계 도달 시 업그레이드 정책
- Gemini 호출 실패 시 사용자 안내 카피
- 어뷰즈 방어 rate limit 임계치 튜닝

---

*문서 끝.*

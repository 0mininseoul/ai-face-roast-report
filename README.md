# AI 얼평보고서

데스크톱 전용 AI 풍자 얼굴 분석 서비스입니다. 웹캠 영상에서 MediaPipe FaceLandmarker로 얼굴 메트릭을 계산하고, Gemini 2.5 Pro/Flash로 보고서와 라이브 코멘트를 생성해 Supabase에 저장합니다.

## Setup

```bash
corepack pnpm install
cp .env.local.example .env.local
```

필수 환경변수:

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_KAKAO_JS_KEY`
- `NEXT_PUBLIC_BASE_URL`

프롬프트는 QA하면서 바로 수정할 수 있도록 코드와 분리되어 있습니다.

- `prompts/analyze-system.md`
- `prompts/live-comment.md`

## Supabase

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

마이그레이션은 `supabase/migrations/20260426000000_init.sql`에 있습니다.

## Scripts

```bash
corepack pnpm dev
corepack pnpm test
corepack pnpm build
```

## Assets

- `public/og-image.png`: 1200x630 OpenGraph 이미지
- `public/fonts/PretendardVariable.woff2`: self-host Pretendard
- `public/sfx/*.mp3`: 선택 효과음. 파일을 추가한 뒤 `NEXT_PUBLIC_ENABLE_SFX=true`로 켜면 재생됩니다.

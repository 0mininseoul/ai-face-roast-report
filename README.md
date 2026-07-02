# AI 얼평보고서

데스크톱 전용 AI 풍자 얼굴 분석 서비스입니다. 웹캠 영상에서 MediaPipe FaceLandmarker로 얼굴 메트릭을 계산하고, Gemini 2.5 Pro/Flash로 보고서와 라이브 코멘트를 생성해 Supabase에 저장합니다.

## Setup

```bash
corepack pnpm install
cp .env.local.example .env.local
```

필수 환경변수:

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `VERTEX_AI_MODEL`
- `GOOGLE_APPLICATION_CREDENTIALS` (local)
- `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` (Vercel)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_KAKAO_JS_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `ADMIN_DATA_USERNAME`
- `ADMIN_DATA_PASSWORD`

프롬프트는 QA하면서 바로 수정할 수 있도록 코드와 분리되어 있습니다.

- `prompts/analyze-system.md`
- `prompts/live-comment.md`

Gemini 호출은 Google Cloud Vertex AI 인증을 사용합니다. 로컬에서는 `.secrets/` 아래 서비스 계정 JSON 경로를 `GOOGLE_APPLICATION_CREDENTIALS`에 지정하고, Vercel에서는 같은 JSON을 base64로 인코딩해 `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`에 넣습니다.

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

- `public/brand/logo.png`: 512x512 OpenGraph 및 카카오톡 공유 이미지
- `public/og-image.jpg`, `public/og-image.png`: legacy 1200x630 공유 이미지 원본
- `public/fonts/PretendardVariable.woff2`: self-host Pretendard
- `public/sfx/*.mp3`: 선택 효과음. 파일을 추가한 뒤 `NEXT_PUBLIC_ENABLE_SFX=true`로 켜면 재생됩니다.

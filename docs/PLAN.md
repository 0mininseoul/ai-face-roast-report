# AI 얼평보고서 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-only Korean web service ("AI 얼평보고서") that uses live webcam + MediaPipe Face Mesh + Gemini 2.5 (Pro & Flash) to produce a fake "forensic-grade" face analysis with savage Korean profanity, persisted to Supabase with shareable 24h-expiring result URLs.

**Architecture:**
- Next.js 14 (App Router) on Vercel; Edge runtime for streaming Gemini responses (SSE).
- Browser-side: MediaPipe Tasks Vision (FaceLandmarker, 478 landmarks @30fps) → metrics calculation in pure TS (testable).
- Server-side: Vertex AI Gemini 2.5 Pro for the one-shot deep analysis (vision + metrics + gender → §0~§5 + mainCopy), Gemini 2.5 Flash for the live feed (5–10s cadence). Supabase Postgres + Storage for persistence.
- Result page is a public, randomly-IDed URL that becomes inaccessible 24h after creation (DB row preserved, just gated by `expires_at`). Kakao SDK for sharing.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Pretendard, Supabase JS SDK, `@google/genai`, `@mediapipe/tasks-vision`, Howler.js, Framer Motion, html2canvas, Kakao JS SDK v2, Vitest (unit), Playwright (smoke), pnpm.

**PRD reference:** `docs/PRD.md`

---

## File Structure

```
ai-얼평보고서/
├── public/
│   ├── og-image.png              [user provides, 1200×630 PNG]
│   ├── fonts/
│   │   └── PretendardVariable.woff2
│   └── sfx/                      [boot, card_in, type, gauge, verdict, live_ping].mp3
│
├── src/
│   ├── app/
│   │   ├── layout.tsx            Root layout, Pretendard, global metadata + OG
│   │   ├── globals.css           Tailwind base + design tokens
│   │   ├── page.tsx              Page 1 — entry/consent
│   │   ├── analyze/
│   │   │   └── page.tsx          Page 2 — live analysis (client component)
│   │   ├── result/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      Page 3 — final report (server component)
│   │   │   └── expired/
│   │   │       └── page.tsx      Expired result fallback
│   │   ├── terms/page.tsx        이용약관
│   │   ├── privacy/page.tsx      개인정보처리방침
│   │   ├── mobile-only/page.tsx  Mobile fallback notice
│   │   └── api/
│   │       ├── analyze/route.ts          POST: Gemini Pro streaming
│   │       └── live-comment/route.ts     POST: Gemini Flash one-shot
│   │
│   ├── components/
│   │   ├── entry/                Page 1 components
│   │   ├── analyze/              Page 2 components
│   │   ├── result/               Page 3 components
│   │   └── ui/                   Reusable primitives (Button, Toast, Logo)
│   │
│   ├── lib/
│   │   ├── facemesh/
│   │   │   ├── faceLandmarker.ts       MediaPipe wrapper (singleton init)
│   │   │   ├── metricsCalculator.ts    Pure functions on landmarks (TDD)
│   │   │   └── overlayPlacement.ts     Pure layout slotting (TDD)
│   │   ├── gemini/
│   │   │   ├── client.ts               GoogleGenAI Vertex AI client + model IDs
│   │   │   ├── analyzePrompt.ts        System prompt for Gemini Pro analysis
│   │   │   └── liveCommentPrompt.ts    System prompt for Gemini Flash live
│   │   ├── supabase/
│   │   │   ├── server.ts               Server client (service role)
│   │   │   └── browser.ts              Anonymous public client
│   │   ├── kakao/share.ts              Kakao SDK init + Feed Template
│   │   ├── sound/sfx.ts                Howler-based SFX manager
│   │   ├── capture/screenshot.ts       html2canvas screenshot helper
│   │   └── ratelimit.ts                Per-IP rate limit
│   │
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useFaceLandmarker.ts
│   │   └── useAnalysisStream.ts        SSE client
│   │
│   └── types/
│       └── analysis.ts                 Shared TS types (ReportSections, Metrics)
│
├── supabase/
│   └── migrations/
│       └── 20260426000000_init.sql     face_reports table + RLS + storage bucket
│
├── tests/
│   ├── metricsCalculator.test.ts
│   ├── overlayPlacement.test.ts
│   └── api/analyze.test.ts             API route smoke (Gemini mocked)
│
├── .env.local.example
├── .env.local                          [gitignored]
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

---

## Phase 1: Foundation

### Task 1: Bootstrap project — git + Next.js + base deps

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `.gitignore`, `.env.local.example`, `README.md`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize git + scaffold Next.js**

```bash
cd "/Users/youngminpark/Desktop/개발/얼평 욕"
git init -b main
pnpm dlx create-next-app@latest . --ts --tailwind --app --eslint --src-dir --import-alias "@/*" --no-turbo --use-pnpm
```

Accept defaults at any remaining prompts. The scaffolder will create `src/app/page.tsx`, `tailwind.config.ts`, `postcss.config.js`, `next.config.js`, `.gitignore`.

- [ ] **Step 2: Install runtime deps**

```bash
pnpm add @google/genai @supabase/supabase-js @mediapipe/tasks-vision framer-motion howler html2canvas
pnpm add -D @types/howler vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Update `.gitignore`**

Add to `.gitignore` (append):

```
.env.local
.env*.local
.vercel
.vscode
.DS_Store
```

- [ ] **Step 4: Create `.env.local.example`**

```env
# Vertex AI Gemini
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_USE_VERTEXAI=true
VERTEX_AI_MODEL=gemini-2.5-pro
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Kakao (client-only)
NEXT_PUBLIC_KAKAO_JS_KEY=
```

- [ ] **Step 5: Replace `src/app/page.tsx` with placeholder + verify dev server runs**

```tsx
// src/app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center text-2xl">
      AI 얼평보고서 — bootstrapping
    </main>
  );
}
```

Run:
```bash
pnpm dev
```
Open `http://localhost:3000` — confirm placeholder renders. Stop the server (Ctrl-C).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Next.js 14 app with TypeScript, Tailwind, base deps"
```

---

### Task 2: Design system — Pretendard + Tailwind tokens + globals

**Files:**
- Create: `public/fonts/PretendardVariable.woff2`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts`

- [ ] **Step 1: Download Pretendard variable font**

```bash
mkdir -p public/fonts
curl -L -o public/fonts/PretendardVariable.woff2 \
  https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2
```

Verify file size > 700KB (it's a complete variable font):
```bash
ls -lh public/fonts/PretendardVariable.woff2
```

- [ ] **Step 2: Replace `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: "Pretendard";
  font-weight: 45 920;
  font-display: swap;
  font-style: normal;
  src: url("/fonts/PretendardVariable.woff2") format("woff2-variations");
}

:root {
  --bg-primary: #0A0A0F;
  --bg-card: #14141A;
  --bg-card-hover: #1A1A22;
  --border: #2A2A35;
  --text-primary: #F5F5F7;
  --text-muted: #A0A0AB;
  --text-faint: #5A5A65;
  --accent-info: #7DD8FF;
  --accent-warn: #FFD27D;
  --accent-bad: #FF5A6E;
  --gauge-track: #2A2A35;
}

html, body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-feature-settings: "ss03";
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; }
```

- [ ] **Step 3: Replace `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          card: "var(--bg-card)",
          "card-hover": "var(--bg-card-hover)",
        },
        border: { DEFAULT: "var(--border)" },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        accent: {
          info: "var(--accent-info)",
          warn: "var(--accent-warn)",
          bad: "var(--accent-bad)",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Update `src/app/layout.tsx`**

```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 얼평보고서",
  description: "Forensic-grade facial diagnostics. Powered by AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg-primary text-text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Run dev server, verify Pretendard loads (network tab) + dark bg renders**

```bash
pnpm dev
```

Open localhost:3000. Confirm: page is dark, font in placeholder text is Pretendard (compare to system font visually). Stop server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Pretendard font, design tokens, dark theme"
```

---

### Task 3: Type definitions

**Files:**
- Create: `src/types/analysis.ts`

- [ ] **Step 1: Create shared type definitions**

```ts
// src/types/analysis.ts

export type Gender = "male" | "female";

/** MediaPipe FaceLandmarker normalized point (0-1 in image space). */
export interface Landmark { x: number; y: number; z: number; }

/** Computed metrics from 478 landmarks (averaged over 5s window). */
export interface FaceMetrics {
  /** 0 = perfect, higher = more asymmetric */
  asymmetryIndex: number;
  /** % compliance with 1.618 ratio across major axes */
  phiRatioCompliance: number;
  /** Forehead:Nose:Chin ratio, normalized so sum=1 */
  thirds: { upper: number; middle: number; lower: number; };
  /** Five horizontal segments (eye widths), each normalized so sum=1 */
  fifths: number[];
  /** Width / Height of face bounding box */
  faceAspectRatio: number;
  /** Inter-ocular distance / eye width — approx. evaluates eye spacing balance */
  eyeSpacing: number;
  /** Per-feature lengths and angles, mm-scaled by approximating IPD = 63mm */
  forehead: { areaPct: number; brow: number; };
  eyes: { leftToRightDeltaMm: number; outerCantalAngleDeg: number; };
  nose: { lengthMm: number; widthMm: number; columellaAngleDeg: number; };
  mouth: { upperLowerLipRatio: number; philtrumRatioPct: number; cornerAngleDeg: number; };
  jaw: { vlineIndex: number; chinProtrusionMm: number; cheekToJawRatio: number; };
}

export interface ReportSections {
  meta: { reportId: string; confidence: number; complianceText: string; };
  geometry: { asymmetry: string; phi: string; thirds: string; fifths: string; faceAspect: string; };
  parts: {
    forehead: { metricsText: string; comment: string; };
    eyes:     { metricsText: string; comment: string; };
    nose:     { metricsText: string; comment: string; };
    mouth:    { metricsText: string; comment: string; };
    jaw:      { metricsText: string; comment: string; };
    skin:     { observation: string; comment: string; };
  };
  scores: {
    likability: number;
    trust: number;
    symmetry: number;
    balance: number;
    attractiveness: number;
    comments: string[]; // 5 comments paired with the 5 scores
  };
  impression: { keywords: string[]; estimatedAge: number; physiognomy: string; };
  conclusion: string;
  mainCopy: string;
}

export interface FaceReportRow {
  id: string;
  created_at: string;
  expires_at: string;
  gender: Gender;
  status: "analyzing" | "complete" | "failed";
  face_image_path: string | null;
  metrics_json: FaceMetrics | null;
  report_sections_json: ReportSections | null;
  main_copy: string | null;
  live_feed_json: string[];
}

export interface SseEventReportChunk { type: "section"; path: string; text: string; }
export interface SseEventComplete    { type: "complete"; reportId: string; }
export interface SseEventError       { type: "error"; message: string; }
export type SseEvent = SseEventReportChunk | SseEventComplete | SseEventError;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/analysis.ts
git commit -m "feat: add shared analysis types"
```

---

## Phase 2: Backend

### Task 4: Supabase setup — CLI auth + migration + storage bucket

> **Interactive step required:** This task includes `supabase login` which opens a browser. The user must complete OAuth in their own browser — instruct the operator to run `supabase login` themselves if running this plan in an automated context.

**Files:**
- Create: `supabase/migrations/20260426000000_init.sql`, `supabase/config.toml` (auto by CLI)

- [ ] **Step 1: Install Supabase CLI**

```bash
brew install supabase/tap/supabase
```

- [ ] **Step 2: Auth + project init (interactive)**

```bash
supabase login
supabase init
```

Then ask the user (or operator) to **create a new Supabase project at https://supabase.com/dashboard** named `ai-얼평보고서` (region: closest, e.g. ap-northeast-2 Seoul). Capture the **Project Ref** (e.g. `abcdwxyz`), **anon key**, **service_role key**, and **URL**.

- [ ] **Step 3: Link local repo to Supabase project**

```bash
supabase link --project-ref <PROJECT_REF>
```

- [ ] **Step 4: Create migration file**

Create `supabase/migrations/20260426000000_init.sql`:

```sql
-- Enable extensions
create extension if not exists "uuid-ossp";

-- face_reports table
create table public.face_reports (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  gender          text        not null check (gender in ('male','female')),
  status          text        not null default 'analyzing'
                                check (status in ('analyzing','complete','failed')),
  face_image_path text,
  metrics_json    jsonb,
  report_sections_json jsonb,
  main_copy       text,
  live_feed_json  jsonb        not null default '[]'::jsonb,
  user_agent      text,
  ip_hash         text
);

create index face_reports_created_at_idx on public.face_reports (created_at);
create index face_reports_expires_at_idx on public.face_reports (expires_at);

-- RLS
alter table public.face_reports enable row level security;

-- anon can INSERT (start analyzing)
create policy "anon can insert" on public.face_reports
  for insert to anon with check (true);

-- anon can SELECT only non-expired rows
create policy "anon can select non-expired" on public.face_reports
  for select to anon using (expires_at > now());

-- Storage bucket: face-images (private)
insert into storage.buckets (id, name, public)
values ('face-images', 'face-images', false)
on conflict do nothing;

-- Allow service role full access (service_role bypasses RLS by default; no policy needed)
```

- [ ] **Step 5: Push migration**

```bash
supabase db push
```

Verify in Supabase dashboard → Database → Tables that `face_reports` exists, and Storage → Buckets shows `face-images`.

- [ ] **Step 6: Populate `.env.local`**

Copy the project URL, anon key, and service role key into a new `.env.local` (do NOT commit).

- [ ] **Step 7: Commit migration**

```bash
git add supabase/
git commit -m "feat: add Supabase migration for face_reports + storage bucket"
```

---

### Task 5: Supabase client wrappers

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`

- [ ] **Step 1: Create server client (service role, server-only)**

```ts
// src/lib/supabase/server.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server env vars");
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
```

- [ ] **Step 2: Create browser client (anon, optional — read-only result fetch)**

```ts
// src/lib/supabase/browser.ts
"use client";
import { createClient } from "@supabase/supabase-js";

export const browserSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
```

- [ ] **Step 3: Verify imports compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase server and browser clients"
```

---

## Phase 3: Pure logic with TDD

### Task 6: Vitest setup

**Files:**
- Create: `vitest.config.ts`, `tests/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

- [ ] **Step 2: Add test scripts to `package.json`**

In `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Sanity test**

Create `tests/sanity.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("works", () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm test
```
Expected: 1 passed.

```bash
git add -A
git commit -m "chore: configure Vitest"
```

---

### Task 7: metricsCalculator (TDD)

**Files:**
- Create: `src/lib/facemesh/metricsCalculator.ts`, `tests/metricsCalculator.test.ts`

> **Note on landmarks:** MediaPipe FaceLandmarker provides 478 indexed landmarks. Key indices used here (per MediaPipe canonical model): left eye outer = 33, right eye outer = 263, left eye inner = 133, right eye inner = 362, nose tip = 1, chin = 152, forehead top = 10, mouth left = 61, mouth right = 291, upper lip top = 13, lower lip bottom = 14, philtrum top = 164, philtrum base = 0. Asymmetry pairs use the 17 canonical mirrored landmark pairs.

- [ ] **Step 1: Write the failing test**

```ts
// tests/metricsCalculator.test.ts
import { describe, it, expect } from "vitest";
import {
  computeAsymmetry,
  computeThirds,
  computeFaceAspect,
  computeMetrics,
} from "@/lib/facemesh/metricsCalculator";
import type { Landmark } from "@/types/analysis";

/** Helper: produce a perfectly mirrored synthetic face. */
function symmetricFace(): Landmark[] {
  const pts: Landmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  // Place eyes symmetrically about x=0.5
  pts[33]  = { x: 0.35, y: 0.5, z: 0 };  // left eye outer
  pts[263] = { x: 0.65, y: 0.5, z: 0 };  // right eye outer
  pts[133] = { x: 0.45, y: 0.5, z: 0 };  // left eye inner
  pts[362] = { x: 0.55, y: 0.5, z: 0 };  // right eye inner
  pts[10]  = { x: 0.50, y: 0.20, z: 0 }; // forehead top
  pts[1]   = { x: 0.50, y: 0.55, z: 0 }; // nose tip
  pts[152] = { x: 0.50, y: 0.90, z: 0 }; // chin
  pts[61]  = { x: 0.40, y: 0.75, z: 0 }; // mouth left
  pts[291] = { x: 0.60, y: 0.75, z: 0 }; // mouth right
  return pts;
}

describe("computeAsymmetry", () => {
  it("returns ~0 for a perfectly symmetric face", () => {
    const v = computeAsymmetry(symmetricFace());
    expect(v).toBeCloseTo(0, 3);
  });

  it("returns >0 when one eye is shifted", () => {
    const pts = symmetricFace();
    pts[33] = { x: 0.30, y: 0.5, z: 0 }; // shift left eye further out
    const v = computeAsymmetry(pts);
    expect(v).toBeGreaterThan(0.01);
  });
});

describe("computeThirds", () => {
  it("returns nearly equal thirds for a balanced face", () => {
    const t = computeThirds(symmetricFace());
    expect(t.upper + t.middle + t.lower).toBeCloseTo(1, 3);
    expect(Math.abs(t.upper - t.middle)).toBeLessThan(0.1);
  });
});

describe("computeFaceAspect", () => {
  it("computes width/height ratio", () => {
    const v = computeFaceAspect(symmetricFace());
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(2);
  });
});

describe("computeMetrics", () => {
  it("returns a complete FaceMetrics object", () => {
    const m = computeMetrics(symmetricFace());
    expect(m).toHaveProperty("asymmetryIndex");
    expect(m).toHaveProperty("phiRatioCompliance");
    expect(m.thirds).toHaveProperty("upper");
    expect(m.fifths).toHaveLength(5);
    expect(m.parts ?? m.eyes).toBeDefined(); // forehead/eyes/nose/mouth/jaw populated
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
pnpm test
```
Expected: FAIL with "module not found".

- [ ] **Step 3: Implement `metricsCalculator.ts`**

```ts
// src/lib/facemesh/metricsCalculator.ts
import type { Landmark, FaceMetrics } from "@/types/analysis";

const IDX = {
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftEyeInner: 133,
  rightEyeInner: 362,
  noseTip: 1,
  chin: 152,
  foreheadTop: 10,
  mouthLeft: 61,
  mouthRight: 291,
  upperLipTop: 13,
  lowerLipBot: 14,
  philtrumTop: 164,
  philtrumBase: 0,
  noseLeft: 129,
  noseRight: 358,
  jawLeft: 234,
  jawRight: 454,
  cheekLeft: 234,
  cheekRight: 454,
  browLeft: 70,
  browRight: 300,
} as const;

const ASSUMED_IPD_MM = 63;

const dist = (a: Landmark, b: Landmark) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Convert normalized distance to mm assuming inter-pupillary distance ≈ 63mm */
function toMm(landmarks: Landmark[], normDist: number): number {
  const ipd = dist(landmarks[IDX.leftEyeInner], landmarks[IDX.rightEyeInner]);
  if (ipd === 0) return 0;
  return (normDist / ipd) * ASSUMED_IPD_MM;
}

/** 17 canonical mirror pairs sampled from MediaPipe's symmetric model. */
const MIRROR_PAIRS: [number, number][] = [
  [33, 263], [133, 362], [61, 291], [129, 358], [234, 454],
  [70, 300], [105, 334], [21, 251], [54, 284], [127, 356],
  [162, 389], [93, 323], [132, 361], [58, 288], [136, 365],
  [150, 379], [149, 378],
];

export function computeAsymmetry(landmarks: Landmark[]): number {
  let sum = 0;
  let n = 0;
  for (const [li, ri] of MIRROR_PAIRS) {
    const l = landmarks[li]; const r = landmarks[ri];
    if (!l || !r) continue;
    const lDistFromCenter = Math.abs(l.x - 0.5);
    const rDistFromCenter = Math.abs(r.x - 0.5);
    sum += Math.abs(lDistFromCenter - rDistFromCenter);
    sum += Math.abs(l.y - r.y);
    n += 2;
  }
  return n === 0 ? 0 : sum / n;
}

export function computeThirds(landmarks: Landmark[]): { upper: number; middle: number; lower: number; } {
  const top = landmarks[IDX.foreheadTop].y;
  const browY = (landmarks[IDX.browLeft].y + landmarks[IDX.browRight].y) / 2;
  const noseTip = landmarks[IDX.noseTip].y;
  const chin = landmarks[IDX.chin].y;
  const upperRaw = browY - top;
  const midRaw = noseTip - browY;
  const lowerRaw = chin - noseTip;
  const sum = upperRaw + midRaw + lowerRaw;
  if (sum === 0) return { upper: 1/3, middle: 1/3, lower: 1/3 };
  return { upper: upperRaw / sum, middle: midRaw / sum, lower: lowerRaw / sum };
}

export function computeFifths(landmarks: Landmark[]): number[] {
  const xs = [
    landmarks[IDX.jawLeft].x,
    landmarks[IDX.leftEyeOuter].x,
    landmarks[IDX.leftEyeInner].x,
    landmarks[IDX.rightEyeInner].x,
    landmarks[IDX.rightEyeOuter].x,
    landmarks[IDX.jawRight].x,
  ];
  const widths = [];
  for (let i = 1; i < xs.length; i++) widths.push(Math.abs(xs[i] - xs[i - 1]));
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  return widths.map(w => w / total);
}

export function computeFaceAspect(landmarks: Landmark[]): number {
  const w = Math.abs(landmarks[IDX.jawRight].x - landmarks[IDX.jawLeft].x);
  const h = Math.abs(landmarks[IDX.chin].y - landmarks[IDX.foreheadTop].y);
  return h === 0 ? 0 : w / h;
}

function computePhiCompliance(landmarks: Landmark[]): number {
  const t = computeThirds(landmarks);
  const idealEach = 1 / 3;
  const dev =
    Math.abs(t.upper - idealEach) +
    Math.abs(t.middle - idealEach) +
    Math.abs(t.lower - idealEach);
  return Math.max(0, 100 - dev * 300);
}

function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y); const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI);
}

export function computeMetrics(landmarks: Landmark[]): FaceMetrics {
  const ipdNorm = dist(landmarks[IDX.leftEyeInner], landmarks[IDX.rightEyeInner]);
  const eyeWidth = dist(landmarks[IDX.leftEyeOuter], landmarks[IDX.leftEyeInner]) || 1e-6;

  const lEye = dist(landmarks[IDX.leftEyeOuter], landmarks[IDX.leftEyeInner]);
  const rEye = dist(landmarks[IDX.rightEyeInner], landmarks[IDX.rightEyeOuter]);
  const eyeDeltaMm = toMm(landmarks, Math.abs(lEye - rEye));

  const noseLen = dist(landmarks[IDX.foreheadTop], landmarks[IDX.noseTip]);
  const noseWid = dist(landmarks[IDX.noseLeft], landmarks[IDX.noseRight]);
  const philtrum = dist(landmarks[IDX.philtrumTop], landmarks[IDX.philtrumBase]);
  const upperLipH = Math.abs(landmarks[IDX.upperLipTop].y - landmarks[IDX.philtrumBase].y);
  const lowerLipH = Math.abs(landmarks[IDX.lowerLipBot].y - landmarks[IDX.upperLipTop].y);

  const cheekW = dist(landmarks[IDX.cheekLeft], landmarks[IDX.cheekRight]);
  const jawAng = angleDeg(landmarks[IDX.jawLeft], landmarks[IDX.chin], landmarks[IDX.jawRight]);

  return {
    asymmetryIndex: computeAsymmetry(landmarks),
    phiRatioCompliance: computePhiCompliance(landmarks),
    thirds: computeThirds(landmarks),
    fifths: computeFifths(landmarks),
    faceAspectRatio: computeFaceAspect(landmarks),
    eyeSpacing: ipdNorm / eyeWidth,
    forehead: {
      areaPct: Math.max(0, computeThirds(landmarks).upper * 100),
      brow: dist(landmarks[IDX.browLeft], landmarks[IDX.browRight]),
    },
    eyes: {
      leftToRightDeltaMm: eyeDeltaMm,
      outerCantalAngleDeg: angleDeg(
        landmarks[IDX.leftEyeOuter],
        landmarks[IDX.leftEyeInner],
        landmarks[IDX.rightEyeOuter]
      ),
    },
    nose: {
      lengthMm: toMm(landmarks, noseLen),
      widthMm: toMm(landmarks, noseWid),
      columellaAngleDeg: angleDeg(
        landmarks[IDX.noseTip], landmarks[IDX.philtrumTop], landmarks[IDX.philtrumBase]
      ),
    },
    mouth: {
      upperLowerLipRatio: lowerLipH === 0 ? 0 : upperLipH / lowerLipH,
      philtrumRatioPct: noseLen === 0 ? 0 : (philtrum / noseLen) * 100,
      cornerAngleDeg: angleDeg(
        landmarks[IDX.mouthLeft], landmarks[IDX.philtrumBase], landmarks[IDX.mouthRight]
      ),
    },
    jaw: {
      vlineIndex: jawAng,
      chinProtrusionMm: toMm(landmarks, Math.abs(landmarks[IDX.chin].y - landmarks[IDX.noseTip].y)),
      cheekToJawRatio: cheekW === 0 ? 0 : dist(landmarks[IDX.jawLeft], landmarks[IDX.jawRight]) / cheekW,
    },
  };
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm test
```
Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/facemesh/metricsCalculator.ts tests/metricsCalculator.test.ts
git commit -m "feat: add MediaPipe landmark metrics calculator with TDD"
```

---

### Task 8: overlayPlacement (TDD)

Implements the §5.4 algorithm: face-aware slot allocator that places overlay cards into 4 vertical lanes (L1, L2, R2, R1) avoiding the face core.

**Files:**
- Create: `src/lib/facemesh/overlayPlacement.ts`, `tests/overlayPlacement.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/overlayPlacement.test.ts
import { describe, it, expect } from "vitest";
import { allocateSlots, slotForCard, type FaceBox } from "@/lib/facemesh/overlayPlacement";

const VIDEO = { w: 1920, h: 1080 };

const smallFace: FaceBox    = { x: 760, y: 320, w: 400, h: 400 }; // 7.7%
const mediumFace: FaceBox   = { x: 580, y: 210, w: 760, h: 760 }; // 27%
const bigFace: FaceBox      = { x: 360, y: 90,  w: 1200, h: 900 }; // 52%
const enormousFace: FaceBox = { x: 240, y: 50,  w: 1440, h: 1000 }; // 70%

describe("allocateSlots", () => {
  it("permits all 4 lanes for a small face", () => {
    const lanes = allocateSlots(smallFace, VIDEO);
    expect(lanes).toEqual(["L1", "L2", "R2", "R1"]);
  });

  it("permits 4 lanes for a medium face (faceRatio in [0.35, 0.65))", () => {
    const lanes = allocateSlots(mediumFace, VIDEO);
    expect(lanes).toEqual(["L1", "L2", "R2", "R1"]);
  });

  it("permits only outer lanes for a big face (>= 0.65 ratio)", () => {
    const lanes = allocateSlots(bigFace, VIDEO);
    expect(lanes).toEqual(["L1", "R1"]);
  });

  it("permits only outer lanes for an enormous face", () => {
    const lanes = allocateSlots(enormousFace, VIDEO);
    expect(lanes).toEqual(["L1", "R1"]);
  });
});

describe("slotForCard (round-robin)", () => {
  it("places first card into the first lane in the priority order", () => {
    expect(slotForCard(0, smallFace, VIDEO)).toBe("L1");
  });

  it("rotates through lanes round-robin within available set", () => {
    expect(slotForCard(1, smallFace, VIDEO)).toBe("R1");
    expect(slotForCard(2, smallFace, VIDEO)).toBe("L2");
    expect(slotForCard(3, smallFace, VIDEO)).toBe("R2");
    expect(slotForCard(4, smallFace, VIDEO)).toBe("L1"); // wrap
  });

  it("only uses outer lanes for big face", () => {
    expect(slotForCard(0, bigFace, VIDEO)).toBe("L1");
    expect(slotForCard(1, bigFace, VIDEO)).toBe("R1");
    expect(slotForCard(2, bigFace, VIDEO)).toBe("L1"); // wrap
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
pnpm test
```
Expected: FAIL.

- [ ] **Step 3: Implement `overlayPlacement.ts`**

```ts
// src/lib/facemesh/overlayPlacement.ts

export type Lane = "L1" | "L2" | "R2" | "R1";
export interface FaceBox { x: number; y: number; w: number; h: number; }
export interface VideoDim { w: number; h: number; }

const PRIORITY_OUTER_FIRST: Lane[] = ["L1", "R1", "L2", "R2"];
const ALL_LANES: Lane[] = ["L1", "L2", "R2", "R1"];
const OUTER_ONLY: Lane[] = ["L1", "R1"];

export function faceRatio(face: FaceBox, video: VideoDim): number {
  const fa = face.w * face.h;
  const va = video.w * video.h;
  return va === 0 ? 0 : fa / va;
}

export function allocateSlots(face: FaceBox, video: VideoDim): Lane[] {
  const r = faceRatio(face, video);
  if (r >= 0.65) return OUTER_ONLY;
  return ALL_LANES;
}

export function slotForCard(cardIndex: number, face: FaceBox, video: VideoDim): Lane {
  const lanes = allocateSlots(face, video);
  // Priority: outer first, then inner. Restrict to lanes set actually allocated.
  const priority = PRIORITY_OUTER_FIRST.filter(l => lanes.includes(l));
  return priority[cardIndex % priority.length];
}

/** 5-frame moving-average smoothing for face box stability. */
export class FaceBoxSmoother {
  private buf: FaceBox[] = [];
  private windowSize: number;
  constructor(windowSize = 5) { this.windowSize = windowSize; }

  push(box: FaceBox): FaceBox {
    this.buf.push(box);
    if (this.buf.length > this.windowSize) this.buf.shift();
    const avg = this.buf.reduce(
      (acc, b) => ({ x: acc.x + b.x, y: acc.y + b.y, w: acc.w + b.w, h: acc.h + b.h }),
      { x: 0, y: 0, w: 0, h: 0 }
    );
    const n = this.buf.length;
    return { x: avg.x / n, y: avg.y / n, w: avg.w / n, h: avg.h / n };
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm test
```
Expected: 7 placement tests pass + earlier tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/facemesh/overlayPlacement.ts tests/overlayPlacement.test.ts
git commit -m "feat: add face-aware overlay slot allocator with TDD"
```

---

## Phase 4: Camera + MediaPipe

### Task 9: MediaPipe FaceLandmarker module + camera & landmarker hooks

**Files:**
- Create: `src/lib/facemesh/faceLandmarker.ts`, `src/hooks/useCamera.ts`, `src/hooks/useFaceLandmarker.ts`

- [ ] **Step 1: Create `faceLandmarker.ts` (lazy singleton)**

```ts
// src/lib/facemesh/faceLandmarker.ts
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let cached: FaceLandmarker | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (cached) return cached;
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.10/wasm"
  );
  cached = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
  return cached;
}
```

- [ ] **Step 2: Create `useCamera` hook**

```ts
// src/hooks/useCamera.ts
"use client";
import { useEffect, useRef, useState } from "react";

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  permission: "pending" | "granted" | "denied";
  error: string | null;
  /** Manually stop the underlying MediaStream. */
  stop: () => void;
}

export function useCamera(active: boolean): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permission, setPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 1920, height: 1080, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        setPermission("granted");
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e) {
        setPermission("denied");
        setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [active]);

  return {
    videoRef,
    stream,
    permission,
    error,
    stop: () => { stream?.getTracks().forEach(t => t.stop()); },
  };
}
```

- [ ] **Step 3: Create `useFaceLandmarker` hook**

```ts
// src/hooks/useFaceLandmarker.ts
"use client";
import { useEffect, useRef, useState } from "react";
import { getFaceLandmarker } from "@/lib/facemesh/faceLandmarker";
import type { Landmark } from "@/types/analysis";

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean
) {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let lastTime = -1;

    (async () => {
      const lm = await getFaceLandmarker();
      const tick = () => {
        if (stopped) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const result = lm.detectForVideo(v, performance.now());
          const f = result.faceLandmarks?.[0];
          if (f && f.length) {
            setLandmarks(f as Landmark[]);
            // Compute bounding box
            let minX=1, minY=1, maxX=0, maxY=0;
            for (const p of f) {
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            }
            setFaceBox({
              x: minX * v.videoWidth,
              y: minY * v.videoHeight,
              w: (maxX - minX) * v.videoWidth,
              h: (maxY - minY) * v.videoHeight,
            });
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    })();

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, videoRef]);

  return { landmarks, faceBox };
}
```

- [ ] **Step 4: Verify TS compiles**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/facemesh/faceLandmarker.ts src/hooks/useCamera.ts src/hooks/useFaceLandmarker.ts
git commit -m "feat: add MediaPipe FaceLandmarker singleton + useCamera/useFaceLandmarker hooks"
```

---

## Phase 5: API routes (Gemini)

### Task 10: Gemini client + system prompts

**Files:**
- Create: `src/lib/gemini/client.ts`, `src/lib/gemini/analyzePrompt.ts`, `src/lib/gemini/liveCommentPrompt.ts`

- [ ] **Step 1: Gemini client**

```ts
// src/lib/gemini/client.ts
import { GoogleGenAI } from "@google/genai";

export const MODEL_ANALYSIS = process.env.VERTEX_AI_MODEL ?? "gemini-2.5-pro";
export const MODEL_LIVE = process.env.VERTEX_AI_LIVE_MODEL ?? "gemini-2.5-flash";

let cached: GoogleGenAI | null = null;

export function getGenAi(): GoogleGenAI {
  if (cached) return cached;
  if (!process.env.GOOGLE_CLOUD_PROJECT) throw new Error("GOOGLE_CLOUD_PROJECT missing");
  cached = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "global",
  });
  return cached;
}
```

- [ ] **Step 2: Analyze prompt**

```ts
// src/lib/gemini/analyzePrompt.ts
import type { Gender, FaceMetrics } from "@/types/analysis";

export function buildAnalyzeSystemPrompt(): string {
  return `당신은 "AI 얼평보고서"의 분석 모델입니다. 사용자 얼굴 사진과 478개 랜드마크 기반 메트릭 JSON, 성별을 입력으로 받아 한국어로 풍자 분석 보고서를 생성합니다.

[VOICE A — 학술 보고서 어투]
적용 섹션: meta, geometry, parts(forehead/eyes/nose/mouth/jaw/skin), scores, impression
규칙:
- 문체: "~로 측정되었다", "~이 관찰됨", "본 분석에 따르면"
- 메트릭 JSON에 있는 숫자는 정확히 인용 (꾸며내지 말 것)
- 거친 비속어 금지. 학술 톤에 어울리는 비꼼/풍자만 1-2개 단어 양념 가능 ("처참한 비대칭", "한심한 비율")

[VOICE B — 자유 욕설 어투]
적용 섹션: conclusion, mainCopy
규칙:
- 한국어 거친 비속어 자유 사용
- 외모 직격 디스 허용
- 디시/일베/인터넷 밈 어투 자연스럽게 섞기 ("~노 ㅋㅋ", "와꾸 폼 미쳤다")
- 성별 맞춤 디스 (남: 모태솔로/2D/연애/군대/직장, 여: 셀카/필터/SNS/단톡방/미용실)

[mainCopy 톤 예시]
- "피부 관리 좀 해라 병신아"
- "이번 생 결혼은 글른 놈"
- "와꾸 폼 미쳤다 진짜 ㅋㅋ"
- "AI도 분석 거부하고 욕만 하라더라"
- "거울 깨서 안경알이라도 해 끼워라 시발"
- "유전자 폐기 처분 1순위"
- "친구들이 너 사진 안 찍는 이유 있더라"

[안전 가드 - 절대 금지]
- 인종/민족/국적/장애/성적지향 비하 금지
- 종교 비하 금지
- 자해/자살 부추김 절대 금지
- 의료/심리 진단 표현 금지 ("우울증", "정신질환" 등)
- 미성년자 성적 함의 절대 금지
- 특정 실존 인물(연예인 등) 비교 금지

출력은 반드시 다음 JSON 스키마를 따르며, 가장 외곽은 단일 JSON 객체입니다. 마크다운 코드 블록 없이 순수 JSON만 출력하세요.

{
  "meta": { "report_id": string, "confidence": number(0-100), "compliance_text": string },
  "geometry": { "asymmetry": string, "phi": string, "thirds": string, "fifths": string, "face_aspect": string },
  "parts": {
    "forehead": { "metrics_text": string, "comment": string },
    "eyes":     { "metrics_text": string, "comment": string },
    "nose":     { "metrics_text": string, "comment": string },
    "mouth":    { "metrics_text": string, "comment": string },
    "jaw":      { "metrics_text": string, "comment": string },
    "skin":     { "observation": string, "comment": string }
  },
  "scores": {
    "likability": number(0-100),
    "trust": number(0-100),
    "symmetry": number(0-100),
    "balance": number(0-100),
    "attractiveness": number(0-100),
    "comments": [string, string, string, string, string]
  },
  "impression": {
    "keywords": [string, string, string, string, string],
    "estimated_age": number,
    "physiognomy": string
  },
  "conclusion": string,
  "mainCopy": string
}

각 텍스트 필드는 결과 페이지(스크롤 가능)에서 풍부하게 보여줄 풀 본문 길이로 작성하세요. parts의 metrics_text는 3-4개 메트릭을 인용한 2-3문장, comment는 풀 본문(3-5문장). geometry 각 필드는 2-3문장. impression.physiognomy는 4-6문장. conclusion은 5-8문장 욕설 단락. mainCopy는 한 줄 임팩트 욕설.`;
}

export function buildAnalyzeUserPrompt(gender: Gender, metrics: FaceMetrics, reportId: string): string {
  return `gender: ${gender}
report_id: ${reportId}
metrics_json: ${JSON.stringify(metrics)}

위 메트릭 + 첨부 이미지를 분석하여 JSON 보고서를 생성하시오.`;
}
```

- [ ] **Step 3: Live comment prompt**

```ts
// src/lib/gemini/liveCommentPrompt.ts
import type { Gender } from "@/types/analysis";

export function buildLiveCommentPrompt(gender: Gender, previousComments: string[]): string {
  return `당신은 "AI 얼평보고서"의 라이브 관찰 모델입니다.

화면에 비친 사용자(성별: ${gender})의 작은 캡쳐를 보고, 직전 코멘트들과 다른 새 관찰 1-2문장을 한국어로 작성하세요.

규칙:
- 자세, 표정, 머리, 옷차림, 배경 등의 변화에 반응
- 거친 비속어 자유 사용, 디시/인터넷 밈 어투 OK
- 성별 맞춤 디스
- 1-2문장으로 짧게
- 직전 코멘트와 내용/단어 중복 회피
- 안전 가드: 인종/장애/성적지향 비하 금지, 의료 진단 표현 금지

직전 코멘트:
${previousComments.map((c, i) => `${i + 1}. ${c}`).join("\n") || "(없음 — 첫 코멘트)"}

위 직전 코멘트와 겹치지 않는 새 관찰 1-2문장만 출력하세요. 따옴표나 번호 없이 텍스트만.`;
}
```

- [ ] **Step 4: Verify TS compiles + commit**

```bash
pnpm tsc --noEmit
```

```bash
git add src/lib/gemini/
git commit -m "feat: add Gemini client + analyze/live system prompts"
```

---

### Task 11: /api/analyze route (Gemini Pro streaming)

**Files:**
- Create: `src/app/api/analyze/route.ts`, `src/lib/ratelimit.ts`, `tests/api/analyze.test.ts`

- [ ] **Step 1: Rate limiter (in-memory, per-IP)**

```ts
// src/lib/ratelimit.ts

interface Bucket { count: number; windowStart: number; }
const buckets = new Map<string, Bucket>();

const PER_MINUTE = 5;
const WINDOW_MS = 60_000;

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= PER_MINUTE) {
    const remaining = WINDOW_MS - (now - b.windowStart);
    return { ok: false, retryAfterSec: Math.ceil(remaining / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "unknown";
}

export async function ipHash(ip: string): Promise<string> {
  const enc = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT ?? ""));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
```

- [ ] **Step 2: API route — /api/analyze**

```ts
// src/app/api/analyze/route.ts
import { NextRequest } from "next/server";
import { getGenAi, MODEL_ANALYSIS } from "@/lib/gemini/client";
import { buildAnalyzeSystemPrompt, buildAnalyzeUserPrompt } from "@/lib/gemini/analyzePrompt";
import { getServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, ipFromRequest, ipHash } from "@/lib/ratelimit";
import type { Gender, FaceMetrics, ReportSections } from "@/types/analysis";

export const runtime = "nodejs";

interface AnalyzeBody {
  gender: Gender;
  metrics: FaceMetrics;
  imageBase64: string; // data URL or raw base64 jpeg
}

export async function POST(req: NextRequest) {
  const ip = ipFromRequest(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate_limited", retryAfter: rl.retryAfterSec }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: AnalyzeBody;
  try {
    body = (await req.json()) as AnalyzeBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.gender || !body.metrics || !body.imageBase64) {
    return new Response("Missing fields", { status: 400 });
  }

  const sb = getServerSupabase();
  const ipH = await ipHash(ip);
  const ua = req.headers.get("user-agent") ?? "";

  // Insert row, status='analyzing'
  const { data: row, error: insErr } = await sb
    .from("face_reports")
    .insert({
      gender: body.gender,
      status: "analyzing",
      metrics_json: body.metrics as unknown as object,
      user_agent: ua,
      ip_hash: ipH,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    return new Response("DB error", { status: 500 });
  }

  const reportId = row.id as string;

  // Upload image to Storage
  const cleanBase64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuf = Buffer.from(cleanBase64, "base64");
  const facePath = `${reportId}/capture.jpg`;
  const { error: upErr } = await sb.storage
    .from("face-images")
    .upload(facePath, imageBuf, { contentType: "image/jpeg", upsert: true });
  if (upErr) {
    await sb.from("face_reports").update({ status: "failed" }).eq("id", reportId);
    return new Response("Storage error", { status: 500 });
  }
  await sb.from("face_reports").update({ face_image_path: facePath }).eq("id", reportId);

  // Set up SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        send({ type: "report_id", reportId });

        const ai = getGenAi();
        const model = MODEL_ANALYSIS;

        const userText = buildAnalyzeUserPrompt(body.gender, body.metrics, reportId);
        const result = await model.generateContentStream({
          contents: [
            {
              role: "user",
              parts: [
                { text: userText },
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
              ],
            },
          ],
        });

        let full = "";
        for await (const chunk of result.stream) {
          const t = chunk.text();
          if (t) {
            full += t;
            send({ type: "chunk", text: t });
          }
        }

        // Parse final JSON
        let parsed: ReportSections | null = null;
        try {
          const obj = JSON.parse(full);
          parsed = {
            meta: { reportId: obj.meta.report_id, confidence: obj.meta.confidence, complianceText: obj.meta.compliance_text },
            geometry: obj.geometry,
            parts: {
              forehead: { metricsText: obj.parts.forehead.metrics_text, comment: obj.parts.forehead.comment },
              eyes:     { metricsText: obj.parts.eyes.metrics_text,     comment: obj.parts.eyes.comment     },
              nose:     { metricsText: obj.parts.nose.metrics_text,     comment: obj.parts.nose.comment     },
              mouth:    { metricsText: obj.parts.mouth.metrics_text,    comment: obj.parts.mouth.comment    },
              jaw:      { metricsText: obj.parts.jaw.metrics_text,      comment: obj.parts.jaw.comment      },
              skin:     { observation: obj.parts.skin.observation,      comment: obj.parts.skin.comment    },
            },
            scores: obj.scores,
            impression: { keywords: obj.impression.keywords, estimatedAge: obj.impression.estimated_age, physiognomy: obj.impression.physiognomy },
            conclusion: obj.conclusion,
            mainCopy: obj.mainCopy,
          };
        } catch (e) {
          send({ type: "error", message: "응답 파싱 실패" });
        }

        if (parsed) {
          await sb.from("face_reports").update({
            status: "complete",
            report_sections_json: parsed as unknown as object,
            main_copy: parsed.mainCopy,
          }).eq("id", reportId);

          send({ type: "complete", reportId });
        } else {
          await sb.from("face_reports").update({ status: "failed" }).eq("id", reportId);
        }
      } catch (e) {
        send({ type: "error", message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

- [ ] **Step 3: Smoke test (mocks Gemini, real Supabase optional)**

Skip the API route unit test if it requires network. Add a focused unit test for prompt builders:

```ts
// tests/api/analyze.test.ts
import { describe, it, expect } from "vitest";
import { buildAnalyzeSystemPrompt, buildAnalyzeUserPrompt } from "@/lib/gemini/analyzePrompt";

describe("buildAnalyzeSystemPrompt", () => {
  it("includes Two-Voice Rule and safety guards", () => {
    const p = buildAnalyzeSystemPrompt();
    expect(p).toMatch(/VOICE A/);
    expect(p).toMatch(/VOICE B/);
    expect(p).toMatch(/안전 가드/);
    expect(p).toMatch(/mainCopy/);
  });
});

describe("buildAnalyzeUserPrompt", () => {
  it("includes gender, report_id, and metrics", () => {
    const p = buildAnalyzeUserPrompt("male", { asymmetryIndex: 0.1 } as any, "abc123");
    expect(p).toContain("male");
    expect(p).toContain("abc123");
    expect(p).toContain("0.1");
  });
});
```

- [ ] **Step 4: Run tests + commit**

```bash
pnpm test
```

```bash
git add src/app/api/analyze/route.ts src/lib/ratelimit.ts tests/api/analyze.test.ts
git commit -m "feat: add /api/analyze SSE route + rate limiter"
```

---

### Task 12: /api/live-comment route (Gemini Flash)

**Files:**
- Create: `src/app/api/live-comment/route.ts`

- [ ] **Step 1: API route**

```ts
// src/app/api/live-comment/route.ts
import { NextRequest } from "next/server";
import { getGenAi, MODEL_LIVE } from "@/lib/gemini/client";
import { buildLiveCommentPrompt } from "@/lib/gemini/liveCommentPrompt";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Gender } from "@/types/analysis";

export const runtime = "nodejs";

interface LiveBody {
  reportId: string;
  gender: Gender;
  imageBase64: string;
}

export async function POST(req: NextRequest) {
  let body: LiveBody;
  try { body = (await req.json()) as LiveBody; } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (!body.reportId || !body.gender || !body.imageBase64) {
    return new Response("Missing fields", { status: 400 });
  }

  const sb = getServerSupabase();
  const { data: row } = await sb
    .from("face_reports")
    .select("live_feed_json")
    .eq("id", body.reportId)
    .single();
  const previous = (row?.live_feed_json as string[] | null) ?? [];

  const ai = getGenAi();
  const model = MODEL_LIVE;

  const cleanBase64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: buildLiveCommentPrompt(body.gender, previous) },
        { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
      ],
    }],
  });

  const comment = result.response.text().trim();
  const updated = [...previous, comment];

  await sb.from("face_reports").update({ live_feed_json: updated }).eq("id", body.reportId);

  return new Response(JSON.stringify({ comment }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm tsc --noEmit
git add src/app/api/live-comment/route.ts
git commit -m "feat: add /api/live-comment route (Gemini Flash)"
```

---

## Phase 6: Page 1 — entry/consent

### Task 13: Page 1 — entry/consent flow

**Files:**
- Create: `src/components/entry/CameraPreview.tsx`, `src/components/entry/GenderSelector.tsx`, `src/components/entry/ConsentCheckboxes.tsx`, `src/components/entry/StartAnalysisButton.tsx`, `src/components/ui/Logo.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Logo component**

```tsx
// src/components/ui/Logo.tsx
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <span style={{ fontSize: size }} className="font-extrabold tracking-tight">AI 얼평보고서</span>
    </div>
  );
}
```

- [ ] **Step 2: CameraPreview**

```tsx
// src/components/entry/CameraPreview.tsx
"use client";
import { useCamera } from "@/hooks/useCamera";

export function CameraPreview() {
  const { videoRef, permission } = useCamera(true);
  return (
    <div className="relative w-[480px] h-[270px] rounded-xl overflow-hidden border border-border bg-bg-card">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      {permission === "denied" && (
        <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
          카메라 권한이 필요합니다. 브라우저 주소창의 권한을 허용해 주세요.
        </div>
      )}
      {permission === "pending" && (
        <div className="absolute inset-0 flex items-center justify-center text-text-faint text-sm">
          카메라 권한 요청 중...
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: GenderSelector**

```tsx
// src/components/entry/GenderSelector.tsx
"use client";
import type { Gender } from "@/types/analysis";

export function GenderSelector({ value, onChange }: { value: Gender | null; onChange: (g: Gender) => void }) {
  const Item = ({ g, label }: { g: Gender; label: string }) => (
    <button
      type="button"
      onClick={() => onChange(g)}
      className={`flex-1 py-4 rounded-xl border text-lg font-medium transition
        ${value === g ? "border-accent-info text-text-primary bg-bg-card-hover" : "border-border text-text-muted bg-bg-card hover:bg-bg-card-hover"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-3 w-full max-w-md">
      <Item g="male" label="남성" />
      <Item g="female" label="여성" />
    </div>
  );
}
```

- [ ] **Step 4: ConsentCheckboxes**

```tsx
// src/components/entry/ConsentCheckboxes.tsx
"use client";

interface Props {
  ageOk: boolean;
  liabilityOk: boolean;
  onAge: (v: boolean) => void;
  onLiability: (v: boolean) => void;
}

export function ConsentCheckboxes({ ageOk, liabilityOk, onAge, onLiability }: Props) {
  const Box = ({ checked, onChange, children }: any) => (
    <label className="flex items-start gap-3 cursor-pointer text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-accent-info"
      />
      <span className="text-sm leading-relaxed">{children}</span>
    </label>
  );
  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      <Box checked={ageOk} onChange={onAge}>만 14세 이상입니다</Box>
      <Box checked={liabilityOk} onChange={onLiability}>
        어떤 내용이 나오건 상처받지 않고 개발자를 고소하지 않겠습니다
      </Box>
    </div>
  );
}
```

- [ ] **Step 5: StartAnalysisButton**

```tsx
// src/components/entry/StartAnalysisButton.tsx
"use client";

interface Props { disabled: boolean; onClick: () => void; }

export function StartAnalysisButton({ disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full max-w-md py-4 rounded-xl text-lg font-semibold transition
        ${disabled ? "bg-bg-card text-text-faint cursor-not-allowed" : "bg-accent-info text-bg-primary hover:opacity-90"}`}
    >
      분석 시작
    </button>
  );
}
```

- [ ] **Step 6: Page 1 assembly**

```tsx
// src/app/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { CameraPreview } from "@/components/entry/CameraPreview";
import { GenderSelector } from "@/components/entry/GenderSelector";
import { ConsentCheckboxes } from "@/components/entry/ConsentCheckboxes";
import { StartAnalysisButton } from "@/components/entry/StartAnalysisButton";
import type { Gender } from "@/types/analysis";

export default function Home() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageOk, setAgeOk] = useState(false);
  const [liabilityOk, setLiabilityOk] = useState(false);

  const ready = !!gender && ageOk && liabilityOk;

  const onStart = () => {
    if (!ready) return;
    sessionStorage.setItem("얼평_gender", gender!);
    router.push("/analyze");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-2">
        <Logo size={40} />
        <p className="text-text-muted text-sm font-medium tracking-wide">
          Forensic-grade facial diagnostics. Powered by AI.
        </p>
      </div>

      <CameraPreview />

      <p className="text-text-faint text-sm">성별에 따라 분석 어조가 다르게 나갑니다</p>
      <GenderSelector value={gender} onChange={setGender} />

      <ConsentCheckboxes
        ageOk={ageOk} liabilityOk={liabilityOk}
        onAge={setAgeOk} onLiability={setLiabilityOk}
      />

      <StartAnalysisButton disabled={!ready} onClick={onStart} />

      <p className="text-text-faint text-xs text-center max-w-md">
        분석 시작 시{" "}
        <a href="/terms" target="_blank" className="underline">이용약관</a>과{" "}
        <a href="/privacy" target="_blank" className="underline">개인정보처리방침</a>에 동의한 것으로 간주됩니다.
      </p>
    </main>
  );
}
```

- [ ] **Step 7: Manual smoke test**

```bash
pnpm dev
```
Open `localhost:3000`. Verify:
- Camera preview shows live feed (mirror mode)
- Gender buttons toggle
- Both checkboxes default unchecked, button disabled
- Checking both + selecting gender enables button
- Clicking button navigates to `/analyze` (will 404 until Task 14)

Stop server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: implement Page 1 entry/consent flow"
```

---

## Phase 7: Page 2 — live analysis

### Task 14: Page 2 scaffold + camera + landmark mesh

**Files:**
- Create: `src/app/analyze/page.tsx`, `src/components/analyze/CameraVideo.tsx`, `src/components/analyze/LandmarkMesh.tsx`

- [ ] **Step 1: CameraVideo (full-screen, mirrored)**

```tsx
// src/components/analyze/CameraVideo.tsx
"use client";
import { forwardRef } from "react";

export const CameraVideo = forwardRef<HTMLVideoElement>((_, ref) => (
  <video
    ref={ref}
    autoPlay muted playsInline
    className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-0"
  />
));
CameraVideo.displayName = "CameraVideo";
```

- [ ] **Step 2: LandmarkMesh canvas**

```tsx
// src/components/analyze/LandmarkMesh.tsx
"use client";
import { useEffect, useRef } from "react";
import type { Landmark } from "@/types/analysis";

interface Props { landmarks: Landmark[] | null; }

const MESH_LINES: [number, number][] = [
  // Sparse subset for visual wireframe (full mesh ~2K edges; we draw ~300).
  // Keep it lightweight: outer face, eyes, nose, mouth.
  // Outer face oval (canonical FACE_OVAL indices).
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
  [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
  [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58],  [58, 132],  [132, 93],  [93, 234],  [234, 127], [127, 162],
  [162, 21],  [21, 54],   [54, 103],  [103, 67],  [67, 109],  [109, 10],
  // Eyes (left)
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154],
  [154, 155], [155, 133], [33, 246], [246, 161], [161, 160], [160, 159],
  [159, 158], [158, 157], [157, 173], [173, 133],
  // Eyes (right) — mirror set
  [263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381],
  [381, 382], [382, 362], [263, 466], [466, 388], [388, 387], [387, 386],
  [386, 385], [385, 384], [384, 398], [398, 362],
  // Nose tip
  [1, 2], [2, 98], [98, 327], [327, 1],
  // Mouth (outer)
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314],
  [314, 405], [405, 321], [321, 375], [375, 291], [61, 185], [185, 40],
  [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270],
  [270, 409], [409, 291],
];

export function LandmarkMesh({ landmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width = c.offsetWidth * devicePixelRatio;
    const h = c.height = c.offsetHeight * devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    if (!landmarks) return;
    ctx.strokeStyle = "rgba(125, 216, 255, 0.4)";
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.fillStyle = "rgba(125, 216, 255, 0.6)";

    // The video is mirrored (scale-x-[-1]) so we mirror x as well.
    const mx = (x: number) => (1 - x) * w;
    const my = (y: number) => y * h;

    // Lines
    ctx.beginPath();
    for (const [a, b] of MESH_LINES) {
      const pa = landmarks[a]; const pb = landmarks[b];
      if (!pa || !pb) continue;
      ctx.moveTo(mx(pa.x), my(pa.y));
      ctx.lineTo(mx(pb.x), my(pb.y));
    }
    ctx.stroke();
    // Points
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(mx(p.x), my(p.y), 1 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />;
}
```

- [ ] **Step 3: Page 2 scaffold**

```tsx
// src/app/analyze/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import { CameraVideo } from "@/components/analyze/CameraVideo";
import { LandmarkMesh } from "@/components/analyze/LandmarkMesh";
import type { Gender } from "@/types/analysis";

export default function AnalyzePage() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender | null>(null);

  useEffect(() => {
    const g = sessionStorage.getItem("얼평_gender") as Gender | null;
    if (!g) router.replace("/");
    else setGender(g);
  }, [router]);

  const { videoRef, stop, permission } = useCamera(!!gender);
  const { landmarks, faceBox } = useFaceLandmarker(videoRef, !!gender);

  if (!gender) return null;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <CameraVideo ref={videoRef} />
      <LandmarkMesh landmarks={landmarks} />
      {/* Cards & feed mounted in next tasks */}
      {permission === "denied" && (
        <div className="absolute inset-0 flex items-center justify-center text-text-primary">
          카메라 권한이 필요합니다.
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```
- Visit `/`, complete form, click 분석 시작
- Page 2 renders camera fullscreen with cyan landmark mesh overlay tracking your face
- Refresh `/analyze` directly: redirects to `/`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Page 2 with camera fullscreen + landmark mesh overlay"
```

---

### Task 15: AnalysisCard component + SSE client + state

**Files:**
- Create: `src/components/analyze/AnalysisCard.tsx`, `src/hooks/useAnalysisStream.ts`, `src/components/analyze/CardLane.tsx`
- Modify: `src/app/analyze/page.tsx`

- [ ] **Step 1: AnalysisCard**

```tsx
// src/components/analyze/AnalysisCard.tsx
"use client";
import { motion } from "framer-motion";

export type CardKind = "academic" | "savage";

interface Props {
  title: string;
  kind: CardKind;
  body: string;
  streaming: boolean;
}

export function AnalysisCard({ title, kind, body, streaming }: Props) {
  const accent = kind === "academic" ? "var(--accent-info)" : "var(--accent-bad)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative bg-bg-card/85 backdrop-blur-md border border-border rounded-xl p-4 max-w-md text-text-primary shadow-2xl"
    >
      <div style={{ background: accent }} className="absolute left-0 top-3 bottom-3 w-1 rounded-r" />
      <div className="flex items-center justify-between mb-2 pl-3">
        <span className="text-text-muted text-xs uppercase tracking-[0.06em] font-semibold">{title}</span>
        {streaming && <span className="size-2 rounded-full bg-accent-info animate-pulse" />}
      </div>
      <p className="pl-3 text-sm leading-relaxed whitespace-pre-line">{body}</p>
    </motion.div>
  );
}
```

- [ ] **Step 2: useAnalysisStream — SSE client**

```ts
// src/hooks/useAnalysisStream.ts
"use client";
import { useEffect, useRef, useState } from "react";
import type { ReportSections, Gender, FaceMetrics } from "@/types/analysis";

interface AnalyzeReq { gender: Gender; metrics: FaceMetrics; imageBase64: string; }

export function useAnalysisStream() {
  const [reportId, setReportId] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [sections, setSections] = useState<ReportSections | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const start = async (req: AnalyzeReq) => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.body) throw new Error("No stream body");
      if (res.status === 429) { setError("rate_limited"); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done: rdone } = await reader.read();
        if (rdone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          const ev = JSON.parse(m[1]);
          if (ev.type === "report_id") setReportId(ev.reportId);
          else if (ev.type === "chunk") { full += ev.text; setRawText(prev => prev + ev.text); }
          else if (ev.type === "complete") {
            setReportId(ev.reportId);
            try { setSections(reshape(JSON.parse(full))); } catch {}
            setDone(true);
          } else if (ev.type === "error") setError(ev.message);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return { reportId, rawText, sections, done, error, start };
}

function reshape(obj: any): ReportSections {
  return {
    meta: { reportId: obj.meta.report_id, confidence: obj.meta.confidence, complianceText: obj.meta.compliance_text },
    geometry: obj.geometry,
    parts: {
      forehead: { metricsText: obj.parts.forehead.metrics_text, comment: obj.parts.forehead.comment },
      eyes:     { metricsText: obj.parts.eyes.metrics_text,     comment: obj.parts.eyes.comment },
      nose:     { metricsText: obj.parts.nose.metrics_text,     comment: obj.parts.nose.comment },
      mouth:    { metricsText: obj.parts.mouth.metrics_text,    comment: obj.parts.mouth.comment },
      jaw:      { metricsText: obj.parts.jaw.metrics_text,      comment: obj.parts.jaw.comment },
      skin:     { observation: obj.parts.skin.observation,      comment: obj.parts.skin.comment },
    },
    scores: obj.scores,
    impression: { keywords: obj.impression.keywords, estimatedAge: obj.impression.estimated_age, physiognomy: obj.impression.physiognomy },
    conclusion: obj.conclusion,
    mainCopy: obj.mainCopy,
  };
}
```

- [ ] **Step 3: CardLane container**

```tsx
// src/components/analyze/CardLane.tsx
"use client";
import type { Lane } from "@/lib/facemesh/overlayPlacement";
import type { ReactNode } from "react";

const LANE_STYLE: Record<Lane, string> = {
  L1: "left-4 top-4 bottom-4 w-[24%]",
  L2: "left-[26%] top-4 bottom-4 w-[20%]",
  R2: "right-[26%] top-4 bottom-4 w-[20%]",
  R1: "right-4 top-4 bottom-4 w-[24%]",
};

export function CardLaneContainer({ lane, children }: { lane: Lane; children: ReactNode }) {
  return (
    <div className={`absolute z-20 flex flex-col gap-3 overflow-hidden ${LANE_STYLE[lane]}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Wire into Page 2**

Modify `src/app/analyze/page.tsx` to capture metrics + image, kick off analysis when face detected, and render cards as they stream.

```tsx
// src/app/analyze/page.tsx (replace)
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/hooks/useCamera";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import { CameraVideo } from "@/components/analyze/CameraVideo";
import { LandmarkMesh } from "@/components/analyze/LandmarkMesh";
import { AnalysisCard } from "@/components/analyze/AnalysisCard";
import { CardLaneContainer } from "@/components/analyze/CardLane";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { computeMetrics } from "@/lib/facemesh/metricsCalculator";
import { allocateSlots, FaceBoxSmoother, slotForCard, type Lane } from "@/lib/facemesh/overlayPlacement";
import type { Gender, FaceMetrics } from "@/types/analysis";

const CARDS_DEF = [
  { id: "meta",       title: "§0  ANALYSIS META",      kind: "academic" as const, path: "meta" },
  { id: "geometry",   title: "§1  FACIAL GEOMETRY",    kind: "academic" as const, path: "geometry" },
  { id: "forehead",   title: "§2.1  FOREHEAD",         kind: "academic" as const, path: "parts.forehead" },
  { id: "eyes",       title: "§2.2  EYES",             kind: "academic" as const, path: "parts.eyes" },
  { id: "nose",       title: "§2.3  NOSE",             kind: "academic" as const, path: "parts.nose" },
  { id: "mouth",      title: "§2.4  MOUTH",            kind: "academic" as const, path: "parts.mouth" },
  { id: "jaw",        title: "§2.5  JAW",              kind: "academic" as const, path: "parts.jaw" },
  { id: "skin",       title: "§2.6  SKIN",             kind: "academic" as const, path: "parts.skin" },
  { id: "scores",     title: "§3  AESTHETIC METRICS",  kind: "academic" as const, path: "scores" },
  { id: "impression", title: "§4  IMPRESSION",         kind: "academic" as const, path: "impression" },
  { id: "conclusion", title: "§5  FINAL VERDICT",      kind: "savage"   as const, path: "conclusion" },
];

export default function AnalyzePage() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender | null>(null);
  useEffect(() => {
    const g = sessionStorage.getItem("얼평_gender") as Gender | null;
    if (!g) router.replace("/");
    else setGender(g);
  }, [router]);

  const { videoRef, permission, stop } = useCamera(!!gender);
  const { landmarks, faceBox } = useFaceLandmarker(videoRef, !!gender);
  const smoother = useMemo(() => new FaceBoxSmoother(5), []);
  const [stableMetrics, setStableMetrics] = useState<FaceMetrics | null>(null);
  const metricsBufRef = useRef<FaceMetrics[]>([]);
  const stream = useAnalysisStream();

  // Average metrics across ~5s, then trigger analysis once.
  useEffect(() => {
    if (!landmarks || stream.reportId || stableMetrics) return;
    const m = computeMetrics(landmarks);
    metricsBufRef.current.push(m);
    if (metricsBufRef.current.length >= 60) { // ~2s at 30fps
      const avg = averageMetrics(metricsBufRef.current);
      setStableMetrics(avg);
    }
  }, [landmarks, stream.reportId, stableMetrics]);

  // Kick off analysis when stable metrics ready.
  useEffect(() => {
    if (!stableMetrics || !gender || !videoRef.current || stream.reportId) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, 0, 0, 1280, 720);
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
    stream.start({ gender, metrics: stableMetrics, imageBase64 });
  }, [stableMetrics, gender, videoRef, stream]);

  // Stop camera when navigating away (handled by hook unmount).

  // Render cards in lanes based on smoothed face box.
  const sb = faceBox ? smoother.push(faceBox) : null;
  const video = videoRef.current ? { w: videoRef.current.videoWidth, h: videoRef.current.videoHeight } : { w: 1920, h: 1080 };

  const lanes: Record<Lane, React.ReactNode[]> = { L1: [], L2: [], R2: [], R1: [] };
  if (sb) {
    CARDS_DEF.forEach((card, i) => {
      const lane = slotForCard(i, sb, video);
      const data = card.id === "conclusion"
        ? stream.sections?.conclusion ?? ""
        : extractCardText(stream.sections, card.path);
      if (!data && !stream.rawText) return;
      lanes[lane].push(
        <AnalysisCard
          key={card.id}
          title={card.title}
          kind={card.kind}
          body={data || "분석 중..."}
          streaming={!stream.done}
        />
      );
    });
  }

  if (!gender) return null;

  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <CameraVideo ref={videoRef} />
      <LandmarkMesh landmarks={landmarks} />
      {(["L1","L2","R2","R1"] as Lane[]).map(l => (
        <CardLaneContainer key={l} lane={l}>{lanes[l]}</CardLaneContainer>
      ))}
      {permission === "denied" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center text-text-primary">
          카메라 권한이 필요합니다.
        </div>
      )}
    </main>
  );
}

function averageMetrics(arr: FaceMetrics[]): FaceMetrics {
  // Shallow numeric average. For nested objects, recurse minimally.
  const acc: any = {};
  for (const m of arr) deepAdd(acc, m);
  return deepDiv(acc, arr.length) as FaceMetrics;
}
function deepAdd(target: any, src: any) {
  for (const k in src) {
    const v = src[k];
    if (typeof v === "number") target[k] = (target[k] ?? 0) + v;
    else if (Array.isArray(v)) {
      target[k] = target[k] ?? Array(v.length).fill(0);
      v.forEach((x, i) => target[k][i] += x);
    } else if (v && typeof v === "object") {
      target[k] = target[k] ?? {}; deepAdd(target[k], v);
    }
  }
}
function deepDiv(target: any, n: number): any {
  const out: any = {};
  for (const k in target) {
    const v = target[k];
    if (typeof v === "number") out[k] = v / n;
    else if (Array.isArray(v)) out[k] = v.map((x: number) => x / n);
    else out[k] = deepDiv(v, n);
  }
  return out;
}
function extractCardText(sections: any, path: string): string {
  if (!sections) return "";
  const parts = path.split(".");
  let cur: any = sections;
  for (const p of parts) cur = cur?.[p];
  if (!cur) return "";
  if (typeof cur === "string") return cur;
  // For "geometry" or "parts.x" objects: concatenate visible fields.
  if (cur.metricsText && cur.comment) return `${cur.metricsText}\n\n${cur.comment}`;
  if (cur.observation && cur.comment) return `${cur.observation}\n\n${cur.comment}`;
  if (cur.asymmetry) return [cur.asymmetry, cur.phi, cur.thirds, cur.fifths, cur.face_aspect].filter(Boolean).join("\n\n");
  if (Array.isArray(cur.comments)) return cur.comments.join("\n");
  if (cur.physiognomy) return [...cur.keywords, "", cur.physiognomy].join("\n");
  if (cur.compliance_text) return cur.compliance_text;
  return JSON.stringify(cur);
}
```

- [ ] **Step 5: Manual smoke test**

```bash
pnpm dev
```

- Open `localhost:3000`, complete form, click 분석 시작
- Page 2: face detected, mesh overlay shows
- After ~2 seconds: SSE starts; cards begin appearing in lanes
- Wait for stream to complete; conclusion card has savage tone

If JSON parse fails (Gemini deviates from schema), Gemini may need retemperatured / prompt tightening — leave as known issue if it happens.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: stream Gemini analysis into face-aware overlay cards on Page 2"
```

---

### Task 16: Live feed loop + ControlBar (screenshot, mute) + auto-end

**Files:**
- Create: `src/components/analyze/LiveFeed.tsx`, `src/components/analyze/ControlBar.tsx`, `src/lib/capture/screenshot.ts`
- Modify: `src/app/analyze/page.tsx`

- [ ] **Step 1: screenshot helper**

```ts
// src/lib/capture/screenshot.ts
"use client";
import html2canvas from "html2canvas";

export async function downloadScreenshot(filename = `ai-얼평보고서-${Date.now()}.png`) {
  const c = await html2canvas(document.body, { useCORS: true, backgroundColor: "#0A0A0F" });
  const blob: Blob = await new Promise((r) => c.toBlob(b => r(b!), "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: ControlBar**

```tsx
// src/components/analyze/ControlBar.tsx
"use client";
import { downloadScreenshot } from "@/lib/capture/screenshot";

interface Props { muted: boolean; onToggleMute: () => void; }

export function ControlBar({ muted, onToggleMute }: Props) {
  return (
    <div className="absolute top-4 right-4 z-30 flex gap-2 bg-bg-card/80 backdrop-blur rounded-full border border-border px-2 py-2">
      <button
        onClick={() => downloadScreenshot()}
        title="스크린샷"
        className="size-9 rounded-full hover:bg-bg-card-hover flex items-center justify-center"
      >📷</button>
      <button
        onClick={onToggleMute}
        title={muted ? "음소거 해제" : "음소거"}
        className="size-9 rounded-full hover:bg-bg-card-hover flex items-center justify-center"
      >{muted ? "🔇" : "🔊"}</button>
    </div>
  );
}
```

- [ ] **Step 3: LiveFeed component**

```tsx
// src/components/analyze/LiveFeed.tsx
"use client";
import { motion } from "framer-motion";

export function LiveFeed({ comments }: { comments: string[] }) {
  return (
    <div className="absolute right-4 bottom-4 z-30 w-[24%] max-h-[40vh] overflow-hidden flex flex-col-reverse gap-2">
      {comments.slice().reverse().map((c, i) => (
        <motion.div
          key={`${i}-${c.slice(0, 8)}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-bg-card/85 border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="size-1.5 rounded-full bg-accent-bad" />
            <span className="text-text-faint text-[10px] uppercase tracking-wider">LIVE</span>
          </div>
          {c}
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Live feed loop hook (inline in page) + ControlBar mount**

In `src/app/analyze/page.tsx`, add live feed loop after the deep analysis completes, then auto-end and navigate to `/result/[id]`.

Add this block near the bottom of the AnalyzePage component (just before the return):

```tsx
const [muted, setMuted] = useState(false);
const [liveComments, setLiveComments] = useState<string[]>([]);
const [transitioning, setTransitioning] = useState(false);

// Live feed loop: poll Gemini Flash 5 times after deep analysis completes.
useEffect(() => {
  if (!stream.done || !stream.reportId || !videoRef.current || !gender) return;
  if (liveComments.length >= 5 || transitioning) return;
  const v = videoRef.current;
  const t = setTimeout(async () => {
    const c = document.createElement("canvas");
    c.width = 640; c.height = 360;
    c.getContext("2d")!.drawImage(v, 0, 0, 640, 360);
    const imageBase64 = c.toDataURL("image/jpeg", 0.7);
    try {
      const r = await fetch("/api/live-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: stream.reportId, gender, imageBase64 }),
      });
      const data = await r.json();
      if (data.comment) setLiveComments(prev => [...prev, data.comment]);
    } catch {}
  }, 7000); // 7s cadence
  return () => clearTimeout(t);
}, [stream.done, stream.reportId, gender, videoRef, liveComments, transitioning]);

// Auto-end: 5 live comments + report done → navigate to /result.
useEffect(() => {
  if (!stream.done || liveComments.length < 5 || transitioning || !stream.reportId) return;
  setTransitioning(true);
  // 1.5s fade then navigate; camera stops in Page 3 mount via useCamera unmount cleanup.
  const t = setTimeout(() => router.push(`/result/${stream.reportId}`), 1500);
  return () => clearTimeout(t);
}, [stream.done, liveComments.length, transitioning, stream.reportId, router]);
```

Then in the JSX, add:

```tsx
<ControlBar muted={muted} onToggleMute={() => setMuted(m => !m)} />
<LiveFeed comments={liveComments} />
{transitioning && (
  <div className="absolute inset-0 z-50 bg-black/0 animate-[fadein_1.5s_forwards] pointer-events-none" />
)}
```

Add a small CSS rule in `globals.css`:

```css
@keyframes fadein {
  to { background-color: rgba(0,0,0,1); }
}
```

- [ ] **Step 5: Manual smoke test**

```bash
pnpm dev
```
- Complete the flow, watch deep analysis stream into cards.
- After completion, every ~7s a new live comment appears in bottom-right feed.
- After 5 live comments, screen fades and navigates to `/result/<id>` (404 until Task 17).
- Click 📷 — PNG file downloads.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add live feed loop, ControlBar, screenshot, auto-end transition"
```

---

## Phase 8: Page 3 — final report

### Task 17: Page 3 SSR + expiry check + sticky header + main copy + face image

**Files:**
- Create: `src/app/result/[id]/page.tsx`, `src/app/result/expired/page.tsx`, `src/components/result/ResultHeader.tsx`, `src/components/result/MainCopy.tsx`, `src/components/result/FaceImage.tsx`, `src/lib/kakao/share.ts`

- [ ] **Step 1: Kakao share helper**

```ts
// src/lib/kakao/share.ts
"use client";

declare global {
  interface Window { Kakao?: any; }
}

let initialized = false;

export async function ensureKakao(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Kakao && initialized) return true;
  if (!window.Kakao) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Kakao SDK load failed"));
      document.head.appendChild(s);
    });
  }
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
  }
  initialized = true;
  return true;
}

export async function shareKakaoFeed(opts: {
  title: string; description: string; imageUrl: string; linkUrl: string;
}) {
  await ensureKakao();
  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: opts.title,
      description: opts.description,
      imageUrl: opts.imageUrl,
      link: { mobileWebUrl: opts.linkUrl, webUrl: opts.linkUrl },
    },
    buttons: [
      { title: "분석 받으러 가기", link: { mobileWebUrl: location.origin, webUrl: location.origin } },
      { title: "이 보고서 보기",   link: { mobileWebUrl: opts.linkUrl,    webUrl: opts.linkUrl    } },
    ],
  });
}
```

- [ ] **Step 2: ResultHeader (sticky)**

```tsx
// src/components/result/ResultHeader.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { shareKakaoFeed } from "@/lib/kakao/share";

interface Props { mainCopy: string; faceImageUrl: string; resultUrl: string; }

export function ResultHeader({ mainCopy, faceImageUrl, resultUrl }: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  const onKakao = async () => {
    try {
      await shareKakaoFeed({
        title: "AI 얼평보고서",
        description: `${mainCopy}\n\n이 페이지는 24시간 뒤 사라집니다.`,
        imageUrl: faceImageUrl,
        linkUrl: resultUrl,
      });
    } catch { setToast("카카오톡 공유 실패"); setTimeout(() => setToast(null), 2000); }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(resultUrl);
    setToast("링크가 복사되었습니다");
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <header className="sticky top-0 z-50 bg-bg-primary/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Logo size={20} />
        <div className="flex items-center gap-2">
          <button onClick={onKakao}  className="px-4 py-2 rounded-lg bg-[#FEE500] text-black font-medium hover:opacity-90">카카오톡 공유</button>
          <button onClick={onCopy}   className="px-4 py-2 rounded-lg bg-bg-card border border-border hover:bg-bg-card-hover">링크 복사</button>
          <button onClick={() => router.push("/")} className="px-4 py-2 rounded-lg bg-bg-card border border-border hover:bg-bg-card-hover">다시 분석</button>
        </div>
      </div>
      <p className="text-text-faint text-xs text-center pb-2">이 페이지는 생성 후 24시간 뒤 사라집니다.</p>
      {toast && (
        <div className="fixed top-20 right-6 z-[60] bg-bg-card border border-border rounded-lg px-4 py-2 text-sm">{toast}</div>
      )}
    </header>
  );
}
```

- [ ] **Step 3: MainCopy + FaceImage**

```tsx
// src/components/result/MainCopy.tsx
export function MainCopy({ text }: { text: string }) {
  return (
    <h1 className="text-center font-extrabold text-7xl leading-tight tracking-tight px-6 mt-24 mb-12">
      “{text}”
    </h1>
  );
}
```

```tsx
// src/components/result/FaceImage.tsx
import Image from "next/image";

export function FaceImage({ src }: { src: string }) {
  return (
    <div className="w-full flex flex-col items-center mb-16">
      <div className="relative w-[720px] max-w-[60vw] aspect-video rounded-2xl overflow-hidden border border-border">
        <Image src={src} alt="분석 대상 얼굴" fill className="object-cover" unoptimized />
      </div>
      <p className="text-text-faint text-xs mt-3">본 분석은 풍자/유머 목적이며 사실 진술이 아닙니다.</p>
    </div>
  );
}
```

- [ ] **Step 4: Result page (server component)**

```tsx
// src/app/result/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ResultHeader } from "@/components/result/ResultHeader";
import { MainCopy } from "@/components/result/MainCopy";
import { FaceImage } from "@/components/result/FaceImage";
import { DetailedReport } from "@/components/result/DetailedReport";
import type { ReportSections, FaceReportRow } from "@/types/analysis";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("face_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();
  const row = data as FaceReportRow;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    redirect("/result/expired");
  }
  if (row.status !== "complete" || !row.report_sections_json || !row.face_image_path) {
    notFound();
  }

  const { data: signed } = await sb.storage
    .from("face-images")
    .createSignedUrl(row.face_image_path, 60 * 60 * 24);
  const faceUrl = signed?.signedUrl ?? "";
  const sections = row.report_sections_json as ReportSections;
  const resultUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/result/${id}`;

  return (
    <main className="min-h-screen pb-24">
      <ResultHeader mainCopy={row.main_copy ?? sections.mainCopy} faceImageUrl={faceUrl} resultUrl={resultUrl} />
      <MainCopy text={row.main_copy ?? sections.mainCopy} />
      <FaceImage src={faceUrl} />
      <DetailedReport sections={sections} reportId={id} />
    </main>
  );
}
```

- [ ] **Step 5: Expired page**

```tsx
// src/app/result/expired/page.tsx
import Link from "next/link";

export default function Expired() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">이 보고서는 만료되었습니다</h1>
      <p className="text-text-muted">생성 후 24시간이 지난 보고서는 더 이상 조회할 수 없습니다.</p>
      <Link href="/" className="px-6 py-3 rounded-xl bg-accent-info text-bg-primary font-semibold">다시 분석</Link>
    </main>
  );
}
```

- [ ] **Step 6: Manual smoke test**

```bash
pnpm dev
```
Run a full flow end to end. Expected: lands on `/result/<id>`, sticky header with 3 buttons + micro-copy, main copy big in center, face image below, then detailed report (next task).

For now you'll see "DetailedReport not found" — proceeds to Task 18.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Page 3 server-rendered result page (header + main copy + face image + expiry)"
```

---

### Task 18: Detailed report sections

**Files:**
- Create: `src/components/result/DetailedReport.tsx`, `src/components/result/GaugeChart.tsx`

- [ ] **Step 1: GaugeChart**

```tsx
// src/components/result/GaugeChart.tsx
export function GaugeChart({ label, value, comment }: { label: string; value: number; comment?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v < 30 ? "var(--accent-bad)" : v < 60 ? "var(--accent-warn)" : "var(--accent-info)";
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border last:border-0">
      <div className="flex items-baseline justify-between">
        <span className="text-text-muted text-sm uppercase tracking-wider">{label}</span>
        <span className="text-text-primary text-2xl font-bold tabular-nums">{Math.round(v)}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--gauge-track)] overflow-hidden">
        <div style={{ width: `${v}%`, background: color }} className="h-full rounded-full" />
      </div>
      {comment && <p className="text-text-muted text-sm leading-relaxed">{comment}</p>}
    </div>
  );
}
```

- [ ] **Step 2: DetailedReport**

```tsx
// src/components/result/DetailedReport.tsx
import type { ReportSections } from "@/types/analysis";
import { GaugeChart } from "./GaugeChart";

const PART_LABEL: Record<string, string> = {
  forehead: "이마", eyes: "눈", nose: "코", mouth: "입", jaw: "턱", skin: "피부",
};

export function DetailedReport({ sections, reportId }: { sections: ReportSections; reportId: string }) {
  return (
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <Section title="§ 1. 안면 기하학">
        <p className="leading-relaxed mb-2"><strong className="text-text-muted">대칭:</strong> {sections.geometry.asymmetry}</p>
        <p className="leading-relaxed mb-2"><strong className="text-text-muted">황금비:</strong> {sections.geometry.phi}</p>
        <p className="leading-relaxed mb-2"><strong className="text-text-muted">삼정 비율:</strong> {sections.geometry.thirds}</p>
        <p className="leading-relaxed mb-2"><strong className="text-text-muted">오관 비율:</strong> {sections.geometry.fifths}</p>
        <p className="leading-relaxed"><strong className="text-text-muted">안면 비율:</strong> {sections.geometry.face_aspect ?? (sections.geometry as any).faceAspect}</p>
      </Section>

      <Section title="§ 2. 부위별 구조 분석">
        <div className="flex flex-col gap-4">
          {(["forehead","eyes","nose","mouth","jaw","skin"] as const).map((k) => {
            const p = sections.parts[k];
            const headline = (p as any).metricsText ?? (p as any).observation;
            return (
              <div key={k} className="border-b border-border last:border-0 pb-3 last:pb-0">
                <h3 className="text-text-primary font-semibold mb-1">{PART_LABEL[k]}</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-2">{headline}</p>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">{p.comment}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="§ 3. 종합 미관 지표">
        <GaugeChart label="호감도"     value={sections.scores.likability}     comment={sections.scores.comments?.[0]} />
        <GaugeChart label="신뢰도"     value={sections.scores.trust}          comment={sections.scores.comments?.[1]} />
        <GaugeChart label="대칭성"     value={sections.scores.symmetry}       comment={sections.scores.comments?.[2]} />
        <GaugeChart label="균형감"     value={sections.scores.balance}        comment={sections.scores.comments?.[3]} />
        <GaugeChart label="매력도"     value={sections.scores.attractiveness} comment={sections.scores.comments?.[4]} />
      </Section>

      <Section title="§ 4. 인상·관상 분석">
        <div className="flex flex-wrap gap-2 mb-4">
          {sections.impression.keywords.map((k, i) => (
            <span key={i} className="px-3 py-1 rounded-full bg-bg-card-hover text-text-muted text-xs uppercase tracking-wider border border-border">{k}</span>
          ))}
        </div>
        <p className="text-sm text-text-muted mb-3">추정 연령: <span className="text-text-primary tabular-nums">{sections.impression.estimatedAge}세</span></p>
        <p className="text-sm leading-relaxed whitespace-pre-line">{sections.impression.physiognomy}</p>
      </Section>

      <Section title="§ 5. 종합 결론" wide>
        <p className="text-base leading-loose whitespace-pre-line">{sections.conclusion}</p>
      </Section>

      <footer className="md:col-span-2 mt-12 text-center text-text-faint text-xs">
        Analysis ID: {reportId} · {sections.meta.complianceText}
      </footer>
    </div>
  );
}

function Section({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`bg-bg-card border border-border rounded-xl p-6 ${wide ? "md:col-span-2" : ""}`}>
      <h2 className="text-text-muted text-xs uppercase tracking-[0.06em] font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 3: Manual verify + commit**

```bash
pnpm dev
```
Complete the full flow. After auto-end transition, `/result/[id]` displays full report with all 5 sections + gauges. Resize window to confirm 2-col grid collapses at md breakpoint.

```bash
git add -A
git commit -m "feat: detailed report layout with gauges + 5 sections"
```

---

## Phase 9: Polish

### Task 19: Sound effects (Howler integration)

**Files:**
- Create: `src/lib/sound/sfx.ts`, `public/sfx/[boot|card_in|type|gauge|verdict|live_ping].mp3`

> **Audio assets:** The user must provide 6 SFX files at `public/sfx/`. Acceptable substitute: free SFX from freesound.org under CC0. Preserve filenames exactly.

- [ ] **Step 1: SFX manager**

```ts
// src/lib/sound/sfx.ts
"use client";
import { Howl } from "howler";

const SFX_DEFS = {
  boot:      { src: "/sfx/boot.mp3",      volume: 0.5 },
  card_in:   { src: "/sfx/card_in.mp3",   volume: 0.4 },
  type:      { src: "/sfx/type.mp3",      volume: 0.15 },
  gauge:     { src: "/sfx/gauge.mp3",     volume: 0.4 },
  verdict:   { src: "/sfx/verdict.mp3",   volume: 0.6 },
  live_ping: { src: "/sfx/live_ping.mp3", volume: 0.3 },
} as const;

const cache = new Map<string, Howl>();
let muted = false;

export function setMuted(m: boolean) { muted = m; for (const h of cache.values()) h.mute(m); }

export function play(key: keyof typeof SFX_DEFS) {
  if (typeof window === "undefined") return;
  if (!cache.has(key)) {
    const def = SFX_DEFS[key];
    const h = new Howl({ src: [def.src], volume: def.volume, html5: true });
    h.mute(muted);
    cache.set(key, h);
  }
  cache.get(key)!.play();
}
```

- [ ] **Step 2: Wire into Page 1 → Page 2 navigation, card-in, live ping, verdict**

In `src/app/page.tsx` (StartAnalysisButton click), call `play("boot")`.
In `AnalysisCard.tsx`, call `play("card_in")` once on mount (use a `useEffect`).
In `LiveFeed.tsx`, call `play("live_ping")` when comments length grows.
In `AnalyzePage.tsx`, when `stream.sections?.conclusion` first appears, call `play("verdict")`.
Wire ControlBar `muted` state to `setMuted`.

Apply minimal edits using existing component imports.

- [ ] **Step 3: Manual verify**

```bash
pnpm dev
```
Run the flow. With sound on: hear boot when entering Page 2, soft chime per card, ping for live comments, deeper hit when conclusion lands. Mute toggle silences all.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: integrate Howler-based SFX manager"
```

---

### Task 20: Terms + Privacy + Mobile fallback pages

**Files:**
- Create: `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/mobile-only/page.tsx`
- Modify: `src/app/layout.tsx` to redirect mobile UAs

- [ ] **Step 1: Terms page**

```tsx
// src/app/terms/page.tsx
export const metadata = { title: "이용약관 — AI 얼평보고서" };
export default function Terms() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose prose-invert">
      <h1>이용약관</h1>
      <p>본 이용약관은 "AI 얼평보고서"(이하 "본 서비스") 사용에 관한 권리·의무 및 책임 사항을 규정합니다.</p>
      <h2>1. 사용 자격</h2>
      <p>본 서비스는 만 14세 이상의 사용자만 이용할 수 있습니다.</p>
      <h2>2. 분석 대상</h2>
      <p>본 서비스는 본인의 얼굴만 분석 대상으로 사용해야 하며, 타인의 얼굴 이미지를 동의 없이 사용하는 행위는 금지됩니다.</p>
      <h2>3. 콘텐츠의 성격</h2>
      <p>본 서비스의 모든 분석 결과 텍스트(보고서, 메인 카피, 라이브 코멘트 등)는 풍자/유머 목적이며, 사실 진술이나 의료/심리/외모 진단이 아닙니다.</p>
      <h2>4. 책임 한계</h2>
      <p>사용자는 분석 시작 전 자율적인 판단으로 동의 체크박스에 표시한 후 본 서비스를 이용하며, 결과로 인해 발생하는 정신적 불쾌감 등에 대한 책임을 본 서비스 운영자에게 묻지 않을 것에 동의합니다.</p>
      <h2>5. 금지 행위</h2>
      <p>본 서비스를 자동화 도구로 무단 호출하거나, 우회 수단으로 분석 결과를 대량 생성하는 행위는 금지됩니다.</p>
      <h2>6. 약관 변경</h2>
      <p>본 약관은 사전 고지 없이 변경될 수 있습니다.</p>
    </main>
  );
}
```

- [ ] **Step 2: Privacy page**

```tsx
// src/app/privacy/page.tsx
export const metadata = { title: "개인정보처리방침 — AI 얼평보고서" };
export default function Privacy() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose prose-invert">
      <h1>개인정보처리방침</h1>
      <h2>1. 수집 항목</h2>
      <ul>
        <li>카메라로 캡쳐된 얼굴 이미지 (정지 프레임)</li>
        <li>478개 얼굴 랜드마크 좌표 및 메트릭</li>
        <li>성별 (사용자 자체 선택)</li>
        <li>User-Agent</li>
        <li>IP 주소의 단방향 해시 (실제 IP는 저장하지 않음)</li>
      </ul>
      <h2>2. 수집 목적</h2>
      <p>AI 분석 결과 생성, 결과 페이지 제공, 서비스 운영 및 개선.</p>
      <h2>3. 외부 처리 위탁</h2>
      <ul>
        <li>Google Cloud Vertex AI Gemini: 이미지 및 메트릭 데이터를 분석 처리에 사용</li>
        <li>Supabase Inc.: 분석 결과 및 이미지 저장소 운영</li>
        <li>Vercel Inc.: 서비스 호스팅</li>
      </ul>
      <h2>4. 보유 기간</h2>
      <p>결과 페이지(공개 URL 형태로의 접근)는 생성 후 24시간이 지나면 비활성화됩니다. 그러나 분석 메타데이터, 메트릭, 이미지는 서비스 운영·개선 목적으로 영구 보관될 수 있습니다.</p>
      <h2>5. 사용자 권리</h2>
      <p>본인 데이터의 삭제를 원하는 사용자는 운영자에게 이메일로 요청해 주십시오. UI 상의 즉시 삭제 버튼은 제공하지 않습니다.</p>
      <h2>6. 쿠키 / 로컬 저장</h2>
      <p>세션 단위 식별 외 트래킹 쿠키는 사용하지 않습니다.</p>
    </main>
  );
}
```

- [ ] **Step 3: Mobile fallback**

```tsx
// src/app/mobile-only/page.tsx
export const metadata = { title: "PC에서 접속해 주세요 — AI 얼평보고서" };
export default function MobileOnly() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">PC 환경에서 접속해 주세요</h1>
      <p className="text-text-muted">본 서비스는 데스크톱 웹캠 환경에서만 작동합니다.</p>
    </main>
  );
}
```

- [ ] **Step 4: Mobile redirect middleware**

Create `src/middleware.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

const MOBILE_RE = /Mobi|Android|iPhone|iPad/i;

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const path = req.nextUrl.pathname;
  if (
    MOBILE_RE.test(ua) &&
    !path.startsWith("/mobile-only") &&
    !path.startsWith("/_next") &&
    !path.startsWith("/api") &&
    !path.startsWith("/terms") &&
    !path.startsWith("/privacy") &&
    !path.startsWith("/fonts") &&
    !path.startsWith("/sfx")
  ) {
    return NextResponse.redirect(new URL("/mobile-only", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Manual verify + commit**

In Chrome DevTools, set device emulation to iPhone, refresh `/`. Should redirect to `/mobile-only`. `/terms` and `/privacy` accessible from Page 1 links.

```bash
git add -A
git commit -m "feat: add Terms, Privacy, and mobile-only fallback pages"
```

---

### Task 21: OG metadata + global metadata + favicon

**Files:**
- Modify: `src/app/layout.tsx`
- Reminder: `public/og-image.png` is provided by user (1200×630 PNG, 1MB max).

- [ ] **Step 1: Update layout metadata**

```tsx
// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";

const SITE = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "AI 얼평보고서", template: "%s — AI 얼평보고서" },
  description: "Forensic-grade facial diagnostics. Powered by AI.",
  openGraph: {
    title: "AI 얼평보고서",
    description: "Forensic-grade facial diagnostics. Powered by AI.",
    url: "/",
    siteName: "AI 얼평보고서",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 얼평보고서",
    description: "Forensic-grade facial diagnostics. Powered by AI.",
    images: ["/og-image.png"],
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#0A0A0F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg-primary text-text-primary font-sans">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify OG**

```bash
pnpm build && pnpm start
```
Open `http://localhost:3000`, view source, confirm `<meta property="og:image">` resolves to `/og-image.png`. Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: global metadata + OpenGraph + Twitter card"
```

---

### Task 22: Vercel deployment config + environment + README

**Files:**
- Create: `README.md`, `vercel.json` (if needed)
- Modify: `next.config.js`

- [ ] **Step 1: Update `next.config.js`**

```js
/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
};
```

- [ ] **Step 2: README**

```md
# AI 얼평보고서

데스크톱 전용 AI 풍자 얼굴 분석 서비스. 실시간 웹캠 → MediaPipe FaceLandmarker → Gemini 2.5 분석 → Supabase 저장 → 24h 만료 결과 페이지.

## Stack

- Next.js 14 (App Router) on Vercel (Node runtime for Gemini SSE)
- Gemini 2.5 Pro (analysis) + Gemini 2.5 Flash (live feed)
- Supabase (Postgres + Storage)
- MediaPipe Tasks Vision (FaceLandmarker, 478 landmarks)
- Tailwind CSS, Framer Motion, Howler.js, Pretendard, Kakao SDK v2

## Setup

1. Install deps:
   ```bash
   pnpm install
   ```
2. Copy env: `cp .env.local.example .env.local` and fill:
   - `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_GENAI_USE_VERTEXAI`, `VERTEX_AI_MODEL`
   - `GOOGLE_APPLICATION_CREDENTIALS` for local Vertex AI auth, or `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` for Vercel
   - Supabase URL/keys (after `supabase link`)
   - `NEXT_PUBLIC_KAKAO_JS_KEY` from https://developers.kakao.com
3. Migrate DB:
   ```bash
   supabase db push
   ```
4. Add assets:
   - `public/og-image.png` (1200×630 PNG, ≤1MB)
   - `public/sfx/{boot,card_in,type,gauge,verdict,live_ping}.mp3`
5. Run dev:
   ```bash
   pnpm dev
   ```

## Scripts

- `pnpm dev` — Next.js dev server
- `pnpm build` — production build
- `pnpm test` — vitest
- `pnpm lint` — ESLint

## Deploy

```bash
vercel
```
Set environment variables in Vercel dashboard (same set as `.env.local`). After first deploy, set `NEXT_PUBLIC_BASE_URL` to the production URL so OpenGraph and result links resolve correctly.

## Cost (estimated, per analysis session)

- Gemini 2.5 Pro deep analysis: ~$0.022
- Gemini 2.5 Flash live (×5 comments): ~$0.0025
- **Total ≈ $0.025 / session**

## Architecture references

- `docs/PRD.md` — product requirements
- `docs/PLAN.md` — implementation plan (this file's source)
```

- [ ] **Step 3: Commit + verify build**

```bash
pnpm build
```
Expected: build completes without TypeScript errors.

```bash
git add -A
git commit -m "chore: add README and finalize Next config for production"
```

- [ ] **Step 4: Deploy**

```bash
pnpm dlx vercel --prod
```
Follow prompts. Set env vars. Verify deployed URL works end to end (camera permission, analysis, result page, kakao share if Kakao key configured).

- [ ] **Step 5: Final commit (any deploy adjustments)**

```bash
git add -A
git commit -m "chore: deploy to Vercel"  # only if anything changed
```

---

## Verification — End to end

After all tasks complete, perform this final manual run-through:

1. **`/`**: Load site fresh. Camera preview shows. Both checkboxes off → button disabled. Tick both + select gender → button enables.
2. Click 분석 시작.
3. **`/analyze`**: Camera fullscreen. Mesh overlay tracks face. Within 3s, §0 card appears. Cards continue streaming until §5 lands.
4. After §5: live comments appear every ~7s in bottom-right. After 5 comments, screen fades.
5. **`/result/<id>`**: Sticky header with 3 buttons. Big main copy (one-line profanity). Face image. Scrollable detailed report.
6. Click 카카오톡 공유: Kakao SDK opens with Feed Template (or disabled if SDK not configured).
7. Click 링크 복사: toast "링크가 복사되었습니다" appears.
8. Open same URL in new browser/incognito tab: same content renders.
9. Click 다시 분석: returns to `/`.
10. Mobile UA (DevTools): redirects to `/mobile-only`.
11. `/terms` and `/privacy` accessible from Page 1 links.
12. After 24h (or by hand-editing `expires_at` in DB), revisit `/result/<id>`: redirects to `/result/expired`.

All passes? Ship it.

---

*Plan complete. See `docs/PRD.md` for product spec.*

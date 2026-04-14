# BabyGPT — Cursor context

Generated: 2026-04-13T22:10:01.145Z

Repository root: `C:/Users/mckel/postforge`

## 1. Project overview

- Name: **babygpt** v0.1.0
- Stack: Next.js App Router, React 19, Tailwind 4, Stripe, jose (JWT), z-ai-web-dev-sdk + OpenAI fallback.
- Scripts: `npm run dev` | `build` | `lint` | `test` | `verify:billing` | `finish:billing`

## 2. Architecture

Entry: `src/app/page.tsx` renders BabyGPTClient. Gated deploy: middleware protects routes except /login, /api/auth/*, /api/stripe/webhook; session cookie `babygpt_token`.

## 3. API routes

- POST /api/auth/login
- POST /api/auth/logout
- POST /api/chat
- POST /api/chat/agent
- POST /api/chat/schrodinger
- GET/POST /api/community
- POST /api/community/debate
- GET/POST /api/credits
- POST /api/stripe/checkout
- POST /api/stripe/portal
- POST /api/stripe/finalize
- POST /api/stripe/webhook
- POST /api/billing/copilot
- POST /api/billing/support
- POST /api/billing/translate

## 4. Component map (summary)

Main shell: BabyGPTClient orchestrates Sidebar, ChatArea (WelcomeScreen when empty), ChatInput, QuantumControls, CommunityPanel, SkillsPanel, SearchOverlay, SubscriptionModal, ProactiveToast, billing banner.

## 5. Button & interaction map

```text
BabyGPTClient.tsx
- Billing alert (amber): "Manage billing" → POST /api/stripe/portal then redirect; "Dismiss" → sessionStorage + local hide.
- Header "Plans" → opens SubscriptionModal (plans, Stripe, AI billing help).
- "Sign out" (server mode) → POST /api/auth/logout, /login.
- "Skills" → SkillsPanel.
- "Community" → CommunityPanel.
- Banner row: "Stop" aborts stream; "Regenerate" resends last turn.
- Subscription flow: openStripeCheckout / openStripePortal via fetch to Stripe routes.

SubscriptionModal.tsx
- "Manage billing" / "Close"; per-plan "Subscribe with Stripe" / "Use this plan" / portal for Free downgrade.
- Billing & subscription FAQ chips + suggested prompts (Stripe/credits only — src/lib/billing-faq.ts).
- AI billing: Ask copilot → POST /api/billing/copilot; Search billing FAQ → POST /api/billing/support; Translate → POST /api/billing/translate.

Sidebar.tsx
- Tabs Chats / Memory; "New chat"; select conversation; delete conversation.

ChatInput.tsx
- "Use skill" (if hint); Send → onSend / submit.

CommunityPanel.tsx
- Close; "Run debate" → POST /api/community/debate; "Create post" → POST /api/community.

SearchOverlay.tsx
- Close; pick conversation → onPick.

WelcomeScreen.tsx (empty chat — first visit)
- Companion card: intro 7 + journey 7 questions (Use in chat → composer); five mode prefixes (Fact search, Clarity, Discover, Precision, Perspective) from src/lib/companion-onboarding.ts.
- Open plans, open search, jump to quantum bar; Power templates; quantum showcase below.

QuantumControls.tsx
- Model / thinking / Schrödinger / agent / quantum toggles; upgrade → onRequestUpgrade.

SkillsPanel.tsx
- Close; activate/delete custom skills; create skill.

ProactiveToast.tsx
- Dismiss; "Ask" → sends draft as message.

MessageBubble.tsx
- Copy assistant content.

SmartActions.tsx
- Action chips → onAction(prompt).

PostCard.tsx
- Expand / reply actions.

InstantTemplates.tsx
- Template pick → onPick.

SettingsPanel.tsx
- Close; font scale / appearance / notifications; time capsule list + add/remove.
```
## 6. Storage & data model

```text
localStorage prefix: babygpt_ (see src/lib/storage.ts lsKey)

Resolved keys in shipped code:
- babygpt_conversations — Conversation[] (BabyGPTClient)
- babygpt_active_conversation_id — string | null
- babygpt_credits_v1 — CreditsStateV1 (credits-store.ts)
- babygpt_agent_memory_v1 — agent memory blob (agent-memory.ts)
- babygpt_skills_v1 — custom skills (skills.ts)
- babygpt_reminders_v1 — reminders list (reminders.ts)
- babygpt_ui_prefs_v1 — UiPreferences: fontScale, appearance, notificationsEnabled (ui-preferences.ts)
- babygpt_time_capsule_v1 — scheduled messages (time-capsule.ts; UI in SettingsPanel)

Cookie (not localStorage): babygpt_token — session JWT when gate enabled.

Server files (not localStorage): .data/wallet.json, .data/billing.json when gate + Stripe features are used.
```
## 7. Path / feature configuration

Plans & models: src/lib/plans.ts, model-tier.ts, usage-cost.ts. Stripe: stripe-config, stripe-sync, server-billing. Billing FAQ only: src/lib/billing-faq.ts. Life-coach / companion onboarding: src/lib/companion-onboarding.ts + WelcomeScreen (empty chat). Quantum/skills: QuantumControls, skills.ts, built-in-skills.ts.

## 8. Known issues & follow-ups

```text
Verified for this repository (BabyGPT / postforge):

• Community API (GET/POST /api/community) is in-memory only — data is lost on server restart.
• Server wallet and billing JSON under .data/ are single-tenant — not suitable for multi-user production without redesign.
• Next.js may warn that "middleware" file convention is deprecated in favor of "proxy" — follow Next.js upgrade guidance when upgrading.
• Stripe webhook must include events the handler uses (e.g. invoice.paid, invoice.payment_failed) for billing alerts.
• Chat / API routes have no built-in per-IP rate limiting — add if exposing publicly.

UI notes: Font scale is applied via CSS variable --babygpt-font-scale on document root (see globals.css + ui-preferences applyUiPreferencesToDom). SettingsPanel includes time-capsule CRUD. Life-coach copy lives in companion-onboarding.ts + WelcomeScreen; billing FAQ is Stripe-only (billing-faq.ts). Full Clarity Engine / realignment product notes: docs/BabyGPT-Onboarding-Paths-Spec.md.
```
## 9. Cursor handoff & continuity

```text
CURRENT STATE — Quality gates (run before release)
• TypeScript: next build runs tsc (npm run build).
• ESLint: npm run lint
• Tests: npm run test (vitest)
• Dev: npm run dev (port 3000)
• Billing env: npm run verify:billing | npm run finish:billing

ARCHITECTURE SNAPSHOT — Complete tree and every source file appear in Sections 10–11 of this document. Types: src/lib/types.ts and feature modules (plans, skills, credits, etc.). Storage keys: Section 6 above.

RECENT FIXES & QA (examples — extend in your tracker)
• SubscriptionModal: static billing FAQ + search available without server wallet; life-coach content removed from Plans — moved to WelcomeScreen.
• src/lib/companion-onboarding.ts: intro 7, journey 7, MESSAGE_MODE_PREFIXES; billing-faq.ts is Stripe/subscription only.
• API: /api/billing/support and /translate optional auth when BABYGPT_APP_PASSWORD unset; support prompt is billing-only.
• SettingsPanel: refresh-on-open uses startTransition for ESLint react-hooks rule.
• cursor-context-generator: removed unused h3 helper.
(Document additional PR-level bug list in your changelog if you keep one.)

TEN IMPROVEMENTS (product — see docs for detail)
Verified as documented in docs/BabyGPT-Onboarding-Paths-Spec.md + docs/FINAL-LAUNCH-COPY.md: sharper opener, question reorder, micro-reactions, skip+letter, Quick Fire path, Daily Anchor ideas, Future Self ritual spec, Clarity 4-card spread, Life Mirror safety, 90-day realignment. Implementation in UI varies by item — see docs/BabyGPT-App-Diagnostic.md for code vs spec.

KEY TECHNICAL DETAILS
• localStorage: full key list in Section 6 (includes ui_prefs_v1, time_capsule_v1).
• CSS: --babygpt-font-scale applied on :root; globals.css uses calc(14px * var(--babygpt-font-scale, 1)).
• AI SDK: z-ai-web-dev-sdk used from server Route Handlers only (chat, agent, schrodinger, billing LLM helpers); OpenAI fallback where configured.
• Time capsule: src/lib/time-capsule.ts (list/add/remove); SettingsPanel surfaces list + form.
• Companion onboarding: src/lib/companion-onboarding.ts + WelcomeScreen. Clarity / realignment as full product: docs/BabyGPT-Onboarding-Paths-Spec.md — not a separate route yet.

KNOWN WARNINGS (non-blocking)
• Middleware → "proxy" migration warning from Next.js 16.
• Dependency on LLM provider availability; no request queue.
• Stripe / gate misconfiguration shows degraded Plans modal — use finish:billing.

SUGGESTED NEXT STEPS (priority)
High: Stripe live keys on Vercel Production (docs/FINAL-LAUNCH-COPY.md); webhook URL correctness.
Medium: Welcome screen already surfaces questions + mode prefixes; optional dedicated Fact search / mode toggles in header; rate limiting on /api/chat.
Nice: Multi-tenant wallet; durable community store; embeddings for billing FAQ search.

QUICK REFERENCE COMMANDS
npm run dev          # local dev (localhost:3000)
npm run build        # production build + TypeScript
npm run lint         # eslint
npm run test         # vitest
npm run context:docx # regenerate this document
npm run verify:billing
npm run finish:billing
```
## 10. File structure (trimmed, no _archive)

```text
[dir] _archive
[dir] .cursor
  [dir] rules
    [file] vercel-powershell-env.mdc
[file] .cursorrules
[dir] .data
  [file] wallet.json
[file] .env
[file] .env.local
[file] .env.local.example
[dir] .github
  [dir] workflows
    [file] ci.yml
[file] .gitignore
[file] .gitmessage-template
[file] .nvmrc
[dir] .vercel
  [file] project.json
  [file] README.txt
[dir] .vscode
  [file] settings.json
[file] AGENTS.md
[file] CLAUDE.md
[dir] docs
  [file] BabyGPT-App-Diagnostic.md
  [file] BabyGPT-Cursor-Context.docx
  [file] BabyGPT-Cursor-Context.md
  [file] BABYGPT-LAUNCH-HANDOFF.md
  [file] BabyGPT-Onboarding-Paths-Spec.md
  [file] babygpt-system.manifest.json
  [file] BILLING-AND-NAMING.md
  [file] CURSOR-BABYGPT-HANDOFF.md
  [file] cursor-context-meta.json
  [file] cursor-review-snapshot.json
  [file] FINAL-LAUNCH-COPY.md
  [file] HANDOFF-AI-NEXT-REVIEW.md
[file] eslint.config.mjs
[dir] games
  [dir] enchanted_forest
    [dir] __pycache__
      [file] engine.cpython-313.pyc
      [file] story_data.cpython-313.pyc
    [file] engine.py
    [file] play.py
    [file] story_data.py
[file] next-env.d.ts
[file] next.config.ts
[file] package-lock.json
[file] package.json
[file] postcss.config.mjs
[dir] public
  [file] babygpt-logo.png
[file] README.md
[dir] scripts
  [file] billing-env-keys.cjs
  [file] check-billing-env.cjs
  [file] cursor-context-generator.mjs
  [file] finish-billing-setup.cjs
  [file] generate-review.cjs
  [file] load-env-files.cjs
  [file] prepare-server-install-usb.ps1
  [file] scan-usb-peers.ps1
  [file] set-babygpt-vercel-prod-env.ps1
  [file] usb-add-linklocal-secondary.ps1
  [file] usb-direct-nic-apply-once.ps1
  [file] usb-direct-nic-setup-ELEVATE.cmd
  [file] usb-direct-nic-setup.ps1
  [file] usb-direct-peer-linux.sh
  [file] vercel-env-add-one.ps1
[dir] src
  [dir] app
    [dir] api
      [dir] auth
        [dir] login
          [file] route.ts
        [dir] logout
          [file] route.ts
      [dir] billing
        [dir] copilot
          [file] route.ts
        [dir] support
          [file] route.ts
        [dir] translate
          [file] route.ts
      [dir] chat
        [dir] agent
          [file] route.ts
        [file] route.ts
        [dir] schrodinger
          [file] route.ts
      [dir] community
        [dir] debate
          [file] route.ts
        [file] route.ts
      [dir] credits
        [file] route.ts
      [dir] stripe
        [dir] checkout
          [file] route.ts
        [dir] finalize
          [file] route.ts
        [dir] portal
          [file] route.ts
        [dir] webhook
          [file] route.ts
    [dir] checkout
      [dir] return
        [file] CheckoutReturnClient.tsx
        [file] page.tsx
    [file] globals.css
    [file] layout.tsx
    [dir] login
      [file] page.tsx
    [file] page.tsx
  [dir] components
    [file] BabyGPTClient.tsx
    [file] BlochSphere.tsx
    [file] ChatArea.tsx
    [file] ChatInput.tsx
    [file] CommunityPanel.tsx
    [file] ConversationTopology.tsx
    [file] CostPreview.tsx
    [file] InstantTemplates.tsx
    [file] MessageBubble.tsx
    [file] PostCard.tsx
    [file] ProactiveToast.tsx
    [file] QuantumControls.tsx
    [file] SearchOverlay.tsx
    [file] SettingsPanel.tsx
    [file] Sidebar.tsx
    [file] SkillsPanel.tsx
    [file] SmartActions.tsx
    [file] SubscriptionModal.tsx
    [file] ThinkingCanvas.tsx
    [file] TimeCapsuleReveal.tsx
    [file] WelcomeScreen.tsx
  [dir] hooks
    [file] useDialogA11y.ts
  [file] instrumentation.ts
  [dir] lib
    [file] adiabatic-prompt.ts
    [file] agent-loop.ts
    [file] agent-memory.ts
    [file] app-version.ts
    [file] billing-faq.ts
    [file] billing-llm.ts
    [file] billing-usage-hints.ts
    [file] built-in-skills.ts
    [file] chat-route-guard.test.ts
    [file] chat-route-guard.ts
    [file] comment-analysis.ts
    [file] community.ts
    [file] companion-onboarding.ts
    [file] credits-store.ts
    [file] entanglement.ts
    [file] fetch-chat.test.ts
    [file] fetch-chat.ts
    [file] heartbeat.ts
    [file] holographic-context.ts
    [file] instant-templates.ts
    [file] kolmogorov-router.ts
    [file] llm-resolve.ts
    [file] model-tier.test.ts
    [file] model-tier.ts
    [file] mood-engine.ts
    [file] openai-api.ts
    [file] plan-pricing-display.test.ts
    [file] plan-pricing-display.ts
    [file] plans.ts
    [file] quantum-error-correction.ts
    [file] reminders.ts
    [file] request-origin.ts
    [file] resonance.ts
    [file] retrocausal-prediction.ts
    [file] schrodinger-pair.test.ts
    [file] schrodinger-pair.ts
    [file] server-billing.ts
    [file] server-config.ts
    [file] server-wallet.ts
    [file] session-server.ts
    [file] skill-model.ts
    [file] skills.ts
    [file] storage.ts
    [file] stream-parse.test.ts
    [file] stream-parse.ts
    [file] stripe-billing-context.ts
    [file] stripe-client.ts
    [file] stripe-config.test.ts
    [file] stripe-config.ts
    [file] stripe-sync.test.ts
    [file] stripe-sync.ts
    [file] time-capsule.ts
    [dir] tools
      [file] calculator.ts
      [file] code-executor.ts
      [file] index.ts
      [file] types.ts
      [file] web-reader.ts
      [file] web-search.ts
    [file] types.ts
    [file] ui-preferences.ts
    [file] usage-cost.ts
    [file] user-dna.ts
    [file] zai.ts
  [file] middleware.ts
  [dir] types
    [file] z-ai-web-dev-sdk.d.ts
[file] tsconfig.json
[file] tsconfig.tsbuildinfo
[file] vitest.config.ts
```
## 11. Complete source listing

### eslint.config.mjs

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy / non-app trees — not part of the Next app (see AGENTS.md)
    "_archive/**",
    "games/**",
  ]),
]);

export default eslintConfig;

```
### next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

```
### package.json

```json
{
  "name": "babygpt",
  "version": "0.1.0",
  "private": true,
  "packageManager": "npm@10.9.2",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "kill-port 3000 && next dev --hostname localhost --port 3000",
    "dev:raw": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "verify:billing": "node scripts/check-billing-env.cjs",
    "finish:billing": "node scripts/finish-billing-setup.cjs",
    "context:docx": "node scripts/cursor-context-generator.mjs",
    "context:review": "node scripts/generate-review.cjs",
    "vercel:env:prod": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/set-babygpt-vercel-prod-env.ps1"
  },
  "dependencies": {
    "highlight.js": "^11.11.1",
    "jose": "^6.2.2",
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-markdown": "^10.1.0",
    "rehype-highlight": "^7.0.2",
    "rehype-sanitize": "^6.0.0",
    "remark-gfm": "^4.0.1",
    "stripe": "^17.7.0",
    "uuid": "^11.1.0",
    "z-ai-web-dev-sdk": "^0.0.17"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/uuid": "^10.0.0",
    "docx": "^9.6.1",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "kill-port": "^2.0.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^3.2.4"
  }
}

```
### postcss.config.mjs

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```
### src/app/api/auth/login/route.ts

```typescript
import { SignJWT } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { getAppPassword, getSessionSecret } from "@/lib/server-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const expected = getAppPassword();
  if (!expected) {
    return NextResponse.json({ error: "BABYGPT_APP_PASSWORD is not configured." }, { status: 400 });
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const submitted = String(body.password ?? "").trim();
  if (submitted !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const secret = getSessionSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Set BABYGPT_SESSION_SECRET (long random string) when using BABYGPT_APP_PASSWORD." },
      { status: 500 },
    );
  }

  const key = new TextEncoder().encode(secret);
  const token = await new SignJWT({ sub: "default" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("babygpt_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

```
### src/app/api/auth/logout/route.ts

```typescript
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("babygpt_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

```
### src/app/api/billing/copilot/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { completeBillingText } from "@/lib/billing-llm";
import { readServerBilling } from "@/lib/server-billing";
import { buildStripeBillingFacts } from "@/lib/stripe-billing-context";
import { isStripeConfigured } from "@/lib/stripe-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.json({ error: "Billing assistant requires the app gate." }, { status: 400 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  let body: { question?: string };
  try {
    body = (await req.json()) as { question?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question || question.length > 2000) {
    return NextResponse.json({ error: "question required (max 2000 chars)" }, { status: 400 });
  }

  const billing = readServerBilling();
  const { facts, error } = await buildStripeBillingFacts(billing);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const system = [
    "You are BabyGPT's billing helper.",
    "Answer ONLY using the FACTS block below plus general knowledge of how Stripe subscriptions and the Customer Portal work.",
    "Never invent invoice amounts, dates, or card details. If FACTS are insufficient, tell the user to open Plans → Manage billing (Stripe Customer Portal).",
    "Keep answers under 180 words, plain language.",
    "",
    "FACTS:",
    facts || "(none)",
  ].join("\n");

  const res = await completeBillingText({ system, user: question });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 503 });
  }
  return NextResponse.json({ answer: res.text });
}

```
### src/app/api/billing/support/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { completeBillingText } from "@/lib/billing-llm";
import { matchBillingFaq } from "@/lib/billing-faq";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (isGateEnabled()) {
    const denied = await assertAuthorized(req);
    if (denied) {
      return denied;
    }
  }

  let body: { query?: string };
  try {
    body = (await req.json()) as { query?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query || query.length > 2000) {
    return NextResponse.json({ error: "query required (max 2000 chars)" }, { status: 400 });
  }

  const matches = matchBillingFaq(query, 5);
  if (matches.length === 0) {
    return NextResponse.json({
      answer:
        "No matching FAQ entry. Open Plans → Manage billing to use Stripe's Customer Portal (payment methods, invoices, cancellation), or contact the operator running this deployment.",
      sources: [] as string[],
    });
  }

  const faqBlock = matches.map((e) => `## ${e.title}\n${e.body}`).join("\n\n");
  const system = [
    "You help BabyGPT users with billing and subscription questions (Stripe, plans, credits, invoices, cancellation).",
    "Ground your answer in the FAQ excerpts below. Do not contradict them.",
    "If the excerpts do not fully answer the question, say what is known from them. For account-specific Stripe actions, suggest Manage billing in the app.",
    "Under 160 words. Plain language.",
    "",
    "FAQ EXCERPTS:",
    faqBlock,
  ].join("\n");

  const res = await completeBillingText({ system, user: query });
  if ("error" in res) {
    const fallback = matches.map((e) => `${e.title}: ${e.body}`).join("\n\n");
    return NextResponse.json({
      answer: fallback,
      sources: matches.map((e) => e.id),
      degraded: true,
    });
  }

  return NextResponse.json({
    answer: res.text,
    sources: matches.map((e) => e.id),
  });
}

```
### src/app/api/billing/translate/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { completeBillingText } from "@/lib/billing-llm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (isGateEnabled()) {
    const denied = await assertAuthorized(req);
    if (denied) {
      return denied;
    }
  }

  let body: { text?: string; targetLocale?: string };
  try {
    body = (await req.json()) as { text?: string; targetLocale?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  const targetLocale = body.targetLocale?.trim() || "Spanish";
  if (!text || text.length > 4000) {
    return NextResponse.json({ error: "text required (max 4000 chars)" }, { status: 400 });
  }

  const system = [
    `Translate the user's string to ${targetLocale} for a billing/subscription UI.`,
    "Keep product names: BabyGPT, Stripe, OpenAI unchanged unless a locale convention requires transliteration.",
    "Output only the translation text — no quotes or preamble.",
  ].join(" ");

  const res = await completeBillingText({
    system,
    user: text,
  });

  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 503 });
  }
  return NextResponse.json({ translation: res.text });
}

```
### src/app/api/chat/agent/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { adiabaticSystemPrompt } from "@/lib/adiabatic-prompt";
import { runReactAgentLoop } from "@/lib/agent-loop";
import { guardChatSend } from "@/lib/chat-route-guard";
import { buildHolographicMessages } from "@/lib/holographic-context";
import { parseModelTierBody } from "@/lib/model-tier";
import type { ChatMessage, ModelTier } from "@/lib/types";
import { extractStyleDNA } from "@/lib/user-dna";
import { resolveLlm } from "@/lib/llm-resolve";

export const runtime = "nodejs";

type Body = {
  messages: Pick<ChatMessage, "role" | "content">[];
  model: ModelTier;
  thinking?: "on" | "off";
  quantum?: {
    kolmogorov?: boolean;
    holographic?: boolean;
    dna?: boolean;
    adiabatic?: number;
  };
  memoryPrompt?: string;
  skillPrompt?: string;
};

function sseData(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, thinking, quantum, memoryPrompt, skillPrompt } = body;
  const model = parseModelTierBody(body);
  if (!Array.isArray(messages) || !model) {
    return NextResponse.json({ error: "messages[] and a valid model tier are required" }, { status: 400 });
  }

  const llm = resolveLlm();
  if (llm.provider === "none") {
    return NextResponse.json({ error: llm.message }, { status: 503 });
  }

  const gated = await guardChatSend(req, {
    model,
    thinking: thinking === "on",
    mode: "agent",
  });
  if (gated) {
    return gated;
  }

  const folded = buildHolographicMessages(messages, { enabled: quantum?.holographic });
  const extraParts = [memoryPrompt, skillPrompt].filter(Boolean);
  if (quantum?.dna) {
    const dna = extractStyleDNA(messages as ChatMessage[]);
    if (dna) extraParts.push(dna);
  }
  let extra = extraParts.join("\n\n");
  if (quantum?.adiabatic != null) {
    extra = adiabaticSystemPrompt(extra, quantum.adiabatic);
  }

  const agentMessages = folded.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  try {
    const result = await runReactAgentLoop(
      llm.provider === "zai"
        ? {
            zai: llm.zai,
            messages: agentMessages,
            preferredModel: model,
            kolmogorov: Boolean(quantum?.kolmogorov),
            thinking: thinking === "on",
            extraSystem: extra || undefined,
          }
        : {
            openaiApiKey: llm.apiKey,
            messages: agentMessages,
            preferredModel: model,
            kolmogorov: Boolean(quantum?.kolmogorov),
            thinking: thinking === "on",
            extraSystem: extra || undefined,
          },
    );

    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          enc.encode(
            sseData({
              choices: [{ delta: { content: "" } }],
              babygpt_agent: {
                toolCalls: result.toolCalls,
                errorCorrectionLog: result.errorCorrectionLog,
                routingReason: result.routingReason,
              },
            }),
          ),
        );
        const text = result.finalText;
        const step = 48;
        for (let i = 0; i < text.length; i += step) {
          const part = text.slice(i, i + step);
          controller.enqueue(
            enc.encode(
              sseData({
                choices: [{ delta: { content: part } }],
              }),
            ),
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-BabyGPT-Model": result.plannerModel,
        "X-BabyGPT-Routing-Reason": encodeURIComponent(result.routingReason),
        "X-BabyGPT-Provider": llm.provider,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Agent failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

```
### src/app/api/chat/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { buildHolographicMessages } from "@/lib/holographic-context";
import { resolveLlm } from "@/lib/llm-resolve";
import { mapTierToOpenAIModel, streamOpenAIChat } from "@/lib/openai-api";
import { routeWithKolmogorovDetailed } from "@/lib/kolmogorov-router";
import { extractStyleDNA } from "@/lib/user-dna";
import { adiabaticSystemPrompt } from "@/lib/adiabatic-prompt";
import { guardChatSend } from "@/lib/chat-route-guard";
import { parseModelTierBody } from "@/lib/model-tier";
import type { ChatMessage, ModelTier } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  messages: Pick<ChatMessage, "role" | "content">[];
  model: ModelTier;
  thinking?: "on" | "off";
  memoryPrompt?: string;
  skillPrompt?: string;
  quantum?: {
    kolmogorov?: boolean;
    holographic?: boolean;
    dna?: boolean;
    adiabatic?: number;
    qec?: boolean;
  };
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, thinking, quantum, memoryPrompt, skillPrompt } = body;
  const model = parseModelTierBody(body);
  if (!Array.isArray(messages) || !model) {
    return NextResponse.json({ error: "messages[] and a valid model tier are required" }, { status: 400 });
  }

  const llm = resolveLlm();
  if (llm.provider === "none") {
    return NextResponse.json({ error: llm.message }, { status: 503 });
  }

  const gated = await guardChatSend(req, {
    model,
    thinking: thinking === "on",
    mode: "chat",
  });
  if (gated) {
    return gated;
  }

  const { model: routed, reason: routingReason } = routeWithKolmogorovDetailed(
    model,
    messages,
    quantum?.kolmogorov,
  );
  let msgs = buildHolographicMessages(messages, { enabled: quantum?.holographic });

  const memorySkill = [memoryPrompt, skillPrompt].filter(Boolean).join("\n\n");
  if (memorySkill) {
    msgs = [{ role: "system", content: memorySkill }, ...msgs];
  }

  if (quantum?.dna) {
    const dna = extractStyleDNA(messages as ChatMessage[]);
    if (dna) {
      msgs = [{ role: "system", content: dna }, ...msgs];
    }
  }

  if (quantum?.adiabatic != null) {
    const sys = msgs.find((m) => m.role === "system")?.content ?? "";
    const merged = adiabaticSystemPrompt(sys, quantum.adiabatic);
    msgs = msgs.some((m) => m.role === "system")
      ? msgs.map((m) => (m.role === "system" ? { ...m, content: merged } : m))
      : [{ role: "system", content: merged }, ...msgs];
  }

  const commonHeaders = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive" as const,
    "X-BabyGPT-Model": routed,
    "X-BabyGPT-Routing-Reason": encodeURIComponent(routingReason),
  };

  try {
    if (llm.provider === "zai") {
      const thinkingMode =
        thinking === "on" ? { type: "enabled" as const } : { type: "disabled" as const };
      const result = await llm.zai.chat.completions.create({
        model: routed,
        messages: msgs,
        stream: true,
        thinking: thinkingMode,
      });

      if (result instanceof ReadableStream) {
        return new Response(result, {
          headers: {
            ...commonHeaders,
            "X-BabyGPT-Provider": "zai",
          },
        });
      }
      return NextResponse.json(result);
    }

    const omodel = mapTierToOpenAIModel(routed);
    const stream = await streamOpenAIChat({
      apiKey: llm.apiKey,
      model: omodel,
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
    });

    return new Response(stream, {
      headers: {
        ...commonHeaders,
        "X-BabyGPT-Provider": "openai",
        "X-BabyGPT-OpenAI-Model": omodel,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

```
### src/app/api/chat/schrodinger/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { guardChatSend } from "@/lib/chat-route-guard";
import { isModelTier } from "@/lib/model-tier";
import type { ChatMessage, ModelTier } from "@/lib/types";
import { resolveLlm } from "@/lib/llm-resolve";
import { mapTierToOpenAIModel, streamOpenAIChat } from "@/lib/openai-api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: {
    messages: Pick<ChatMessage, "role" | "content">[];
    modelA?: ModelTier;
    modelB?: ModelTier;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const modelA = body.modelA ?? "glm-4-flash";
  const modelB = body.modelB ?? "glm-4-air";
  if (!isModelTier(modelA) || !isModelTier(modelB)) {
    return NextResponse.json({ error: "modelA and modelB must be valid GLM tier ids" }, { status: 400 });
  }

  const llm = resolveLlm();
  if (llm.provider === "none") {
    return NextResponse.json({ error: llm.message }, { status: 503 });
  }

  const gated = await guardChatSend(req, {
    model: modelA,
    thinking: false,
    mode: "schrodinger",
  });
  if (gated) {
    return gated;
  }

  try {
    if (llm.provider === "openai") {
      const [s1, s2] = await Promise.all([
        streamOpenAIChat({
          apiKey: llm.apiKey,
          model: mapTierToOpenAIModel(modelA),
          messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
        streamOpenAIChat({
          apiKey: llm.apiKey,
          model: mapTierToOpenAIModel(modelB),
          messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      ]);
      return mergeSchrodingerStreams(s1, s2, modelA, modelB, "openai");
    }

    const zai = llm.zai;
    const [r1, r2] = await Promise.all([
      zai.chat.completions.create({
        model: modelA,
        messages: body.messages,
        stream: true,
        thinking: { type: "disabled" },
      }),
      zai.chat.completions.create({
        model: modelB,
        messages: body.messages,
        stream: true,
        thinking: { type: "disabled" },
      }),
    ]);

    const s1 = r1 as ReadableStream<Uint8Array>;
    const s2 = r2 as ReadableStream<Uint8Array>;
    return mergeSchrodingerStreams(s1, s2, modelA, modelB, "zai");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Schrodinger failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

function mergeSchrodingerStreams(
  s1: ReadableStream<Uint8Array>,
  s2: ReadableStream<Uint8Array>,
  modelA: string,
  modelB: string,
  provider: string,
) {
  const merged = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const reader1 = s1.getReader();
      const reader2 = s2.getReader();

      const first = await Promise.race([
        reader1.read().then((chunk) => ({ n: 1 as const, chunk })),
        reader2.read().then((chunk) => ({ n: 2 as const, chunk })),
      ]);

      const winner = first.n === 1 ? modelA : modelB;
      controller.enqueue(
        enc.encode(`data: ${JSON.stringify({ schrodinger: true, winner })}\n\n`),
      );

      const primary = first.n === 1 ? reader1 : reader2;
      const secondary = first.n === 1 ? reader2 : reader1;

      if (!first.chunk.done && first.chunk.value) {
        controller.enqueue(first.chunk.value);
      }

      while (true) {
        const { done, value } = await primary.read();
        if (done) break;
        if (value) controller.enqueue(value);
      }
      await secondary.cancel();
      controller.close();
    },
  });

  return new Response(merged, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-BabyGPT-Schrodinger": "1",
      "X-BabyGPT-Provider": provider,
    },
  });
}

```
### src/app/api/community/debate/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { guardDebate } from "@/lib/chat-route-guard";
import { resolveLlm } from "@/lib/llm-resolve";
import { openaiChatCompletionJson, pickChatTextFromCompletion } from "@/lib/openai-api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { topic } = (await req.json()) as { topic?: string };
  if (!topic?.trim()) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const gated = await guardDebate(req);
  if (gated) {
    return gated;
  }

  const llm = resolveLlm();
  if (llm.provider === "none") {
    return NextResponse.json({ error: llm.message }, { status: 503 });
  }

  const system = (side: string) =>
    `You are ${side} in a short, good-faith debate (max ~120 words). Topic: ${topic}`;

  try {
    if (llm.provider === "openai") {
      const [a, b] = await Promise.all([
        openaiChatCompletionJson({
          apiKey: llm.apiKey,
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system("FOR the motion") },
            { role: "user", content: "Open with your strongest argument." },
          ],
        }),
        openaiChatCompletionJson({
          apiKey: llm.apiKey,
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system("AGAINST the motion") },
            { role: "user", content: "Open with your strongest argument." },
          ],
        }),
      ]);
      return NextResponse.json({
        topic: topic.trim(),
        for: pickChatTextFromCompletion(a),
        against: pickChatTextFromCompletion(b),
      });
    }

    const zai = llm.zai;
    const [a, b] = await Promise.all([
      zai.chat.completions.create({
        model: "glm-4-air",
        messages: [
          { role: "system", content: system("FOR the motion") },
          { role: "user", content: "Open with your strongest argument." },
        ],
        stream: false,
        thinking: { type: "disabled" },
      }),
      zai.chat.completions.create({
        model: "glm-4-flash",
        messages: [
          { role: "system", content: system("AGAINST the motion") },
          { role: "user", content: "Open with your strongest argument." },
        ],
        stream: false,
        thinking: { type: "disabled" },
      }),
    ]);

    return NextResponse.json({
      topic: topic.trim(),
      for: pickChatTextFromCompletion(a),
      against: pickChatTextFromCompletion(b),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Debate failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

```
### src/app/api/community/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { guardApi } from "@/lib/chat-route-guard";
import { analyzeCommentSentiment } from "@/lib/comment-analysis";
import { resonanceScore } from "@/lib/resonance";
import {
  addComment,
  addPost,
  listPosts,
  updateResonance,
  type CommunityPost,
} from "@/lib/community";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = await guardApi(req);
  if (denied) {
    return denied;
  }
  return NextResponse.json({ posts: listPosts() as CommunityPost[] });
}

export async function POST(req: NextRequest) {
  const denied = await guardApi(req);
  if (denied) {
    return denied;
  }

  const body = (await req.json()) as {
    action: "post" | "comment";
    title?: string;
    body?: string;
    postId?: string;
    author?: string;
  };

  if (body.action === "post" && body.title && body.body) {
    const post = addPost(body.title, body.body);
    return NextResponse.json({ post });
  }

  if (body.action === "comment" && body.postId && body.body) {
    const c = addComment(body.postId, body.author ?? "you", body.body);
    if (!c) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    c.sentiment = analyzeCommentSentiment(c.body);
    const posts = listPosts();
    const p = posts.find((x) => x.id === body.postId);
    if (p) {
      const ghostBodies = p.comments.map((x) => x.ghostReply).filter(Boolean) as string[];
      const score = resonanceScore(p.body, ghostBodies);
      updateResonance(p.id, score);
    }
    return NextResponse.json({ comment: c });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

```
### src/app/api/credits/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { computeUsageHints } from "@/lib/billing-usage-hints";
import { formatBillingAlertForClient, readServerBilling } from "@/lib/server-billing";
import { readServerWallet, setServerPlan } from "@/lib/server-wallet";
import { isStripeConfigured } from "@/lib/stripe-config";
import { PLANS, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const stripePayload = () => {
    const b = readServerBilling();
    return {
      configured: isStripeConfigured(),
      customerId: b.customerId,
      subscriptionStatus: b.status,
    };
  };

  if (!isGateEnabled()) {
    return NextResponse.json({ source: "client" as const, stripe: stripePayload() });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  const w = readServerWallet();
  const billing = readServerBilling();
  const usageHints = [
    ...computeUsageHints(w),
    ...(billing.paymentAlert
      ? [
          {
            kind: "payment_retry",
            message:
              "Stripe retries failed renewals per your Dashboard settings. Updating your card in Manage billing fixes most issues.",
          },
        ]
      : []),
  ];
  return NextResponse.json({
    source: "server" as const,
    planId: w.planId,
    balance: w.balance,
    accrualMonth: w.accrualMonth,
    welcomeApplied: w.welcomeApplied,
    version: w.version,
    stripe: stripePayload(),
    billingAlert: formatBillingAlertForClient(billing),
    usageHints,
  });
}

export async function POST(req: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.json(
      { error: "Server plan sync is only available when BABYGPT_APP_PASSWORD is set." },
      { status: 400 },
    );
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  if (isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Plans are billed through Stripe. Use Subscribe in the app or Manage billing to change or cancel.",
      },
      { status: 403 },
    );
  }

  let body: { planId?: string };
  try {
    body = (await req.json()) as { planId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId as PlanId | undefined;
  if (!planId || !(planId in PLANS)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  const w = setServerPlan(planId);
  return NextResponse.json({
    source: "server" as const,
    planId: w.planId,
    balance: w.balance,
    accrualMonth: w.accrualMonth,
    welcomeApplied: w.welcomeApplied,
    version: w.version,
  });
}

```
### src/app/api/stripe/checkout/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerBilling } from "@/lib/server-billing";
import { requestAppOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe-client";
import { isStripeConfigured, stripePriceIdForPlan } from "@/lib/stripe-config";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }
  if (!isGateEnabled()) {
    return NextResponse.json(
      { error: "Paid checkout requires the app gate (set BABYGPT_APP_PASSWORD)." },
      { status: 400 },
    );
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  let body: { planId?: PlanId };
  try {
    body = (await req.json()) as { planId?: PlanId };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId;
  if (!planId || planId === "free") {
    return NextResponse.json(
      {
        error:
          "Choose Starter, Pro, or Team. To cancel or downgrade to Free, use Manage billing (Stripe Customer Portal).",
      },
      { status: 400 },
    );
  }

  const priceId = stripePriceIdForPlan(planId);
  if (!priceId) {
    const envName =
      planId === "starter"
        ? "STRIPE_PRICE_STARTER"
        : planId === "pro"
          ? "STRIPE_PRICE_PRO"
          : planId === "team"
            ? "STRIPE_PRICE_TEAM"
            : "STRIPE_PRICE_*";
    return NextResponse.json(
      {
        error: `Missing Stripe Price for ${planId}. Set ${envName} to the Price ID from the Stripe Dashboard.`,
      },
      { status: 500 },
    );
  }

  const origin = requestAppOrigin(req);
  const billing = readServerBilling();

  const stripe = getStripe();
  const autoTax = process.env.STRIPE_CHECKOUT_AUTO_TAX?.trim() === "1";
  const trialDaysRaw = process.env.STRIPE_CHECKOUT_TRIAL_DAYS?.trim();
  const trialDays = trialDaysRaw ? Math.min(90, Math.max(0, Number.parseInt(trialDaysRaw, 10))) : 0;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: billing.customerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=canceled`,
    metadata: { planId },
    subscription_data: {
      metadata: { planId },
      ...(trialDays > 0 && !Number.isNaN(trialDays) ? { trial_period_days: trialDays } : {}),
    },
    allow_promotion_codes: true,
    payment_method_types: ["card", "link"],
    ...(autoTax
      ? {
          automatic_tax: { enabled: true },
          customer_update: { address: "auto", name: "auto" },
        }
      : {}),
    custom_text: {
      submit: {
        message:
          "Recurring billing. You can update payment methods, invoices, and cancellation in Manage billing after checkout.",
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}

```
### src/app/api/stripe/finalize/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { getStripe } from "@/lib/stripe-client";
import { isStripeConfigured } from "@/lib/stripe-config";
import { applyStripeSubscription } from "@/lib/stripe-sync";

export const runtime = "nodejs";

/** Idempotent sync after redirect (webhook may have already run). */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }
  if (!isGateEnabled()) {
    return NextResponse.json({ error: "Gate not enabled." }, { status: 400 });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  let body: { sessionId?: string };
  try {
    body = (await req.json()) as { sessionId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

  if (session.status !== "complete") {
    return NextResponse.json({ error: "Checkout session not complete." }, { status: 400 });
  }

  const subRaw = session.subscription;
  if (!subRaw) {
    return NextResponse.json({ error: "No subscription on session." }, { status: 400 });
  }

  const subId = typeof subRaw === "string" ? subRaw : subRaw.id;
  const sub = await stripe.subscriptions.retrieve(subId);
  applyStripeSubscription(sub);

  return NextResponse.json({ ok: true });
}

```
### src/app/api/stripe/portal/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerBilling } from "@/lib/server-billing";
import { requestAppOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe-client";
import { isStripeConfigured } from "@/lib/stripe-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  void req;
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }
  if (!isGateEnabled()) {
    return NextResponse.json({ error: "Billing portal requires the app gate (BABYGPT_APP_PASSWORD)." }, { status: 400 });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  const billing = readServerBilling();
  if (!billing.customerId) {
    return NextResponse.json(
      { error: "No Stripe customer yet. Subscribe to a paid plan first (Checkout)." },
      { status: 400 },
    );
  }

  const origin = requestAppOrigin(req);
  const stripe = getStripe();
  const portalConfig = process.env.STRIPE_PORTAL_CONFIGURATION?.trim();
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.customerId,
    return_url: `${origin}/`,
    ...(portalConfig ? { configuration: portalConfig } : {}),
  });

  return NextResponse.json({ url: session.url });
}

```
### src/app/api/stripe/webhook/route.ts

```typescript
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe-client";
import { getStripeWebhookSecret } from "@/lib/stripe-config";
import { clearPaymentAlert, recordPaymentFailure } from "@/lib/server-billing";
import { applyStripeSubscription, clearStripeSubscriptionToFree } from "@/lib/stripe-sync";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const whsec = getStripeWebhookSecret();
  if (!whsec) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const raw = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whsec);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          applyStripeSubscription(sub);
          clearPaymentAlert();
        }
        break;
      }
      case "invoice.paid": {
        clearPaymentAlert();
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        applyStripeSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const cid =
          typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null);
        clearStripeSubscriptionToFree(cid);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.subscription;
        const subId =
          subRef == null ? null : typeof subRef === "string" ? subRef : subRef.id;
        const customerId =
          typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
        console.warn("[stripe webhook] invoice.payment_failed", {
          invoiceId: inv.id,
          customerId,
          subscriptionId: subId,
          attemptCount: inv.attempt_count,
        });
        recordPaymentFailure({
          at: new Date().toISOString(),
          invoiceId: inv.id ?? null,
          attemptCount: inv.attempt_count ?? null,
        });
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          applyStripeSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler error";
    console.error("[stripe webhook]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

```
### src/app/checkout/return/CheckoutReturnClient.tsx

```typescript
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim();
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/stripe/finalize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as { error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setFinalizeError(data.error ?? "Could not confirm your subscription.");
        return;
      }
      try {
        await fetch("/api/credits", { credentials: "include", cache: "no-store" });
      } catch {
        /* best-effort refresh before landing in app */
      }
      router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  if (!sessionId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center">
        <p className="text-sm text-red-400">Missing checkout session. Return to the app and try again.</p>
        <Link href="/" className="text-sm text-cyan-400 underline">
          Back to BabyGPT
        </Link>
      </div>
    );
  }

  if (finalizeError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center">
        <p className="text-sm text-red-400">{finalizeError}</p>
        <Link href="/" className="text-sm text-cyan-400 underline">
          Back to BabyGPT
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center">
      <p className="text-sm text-zinc-400">Confirming your subscription…</p>
    </div>
  );
}

```
### src/app/checkout/return/page.tsx

```typescript
import { Suspense } from "react";
import CheckoutReturnClient from "./CheckoutReturnClient";

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
          Loading…
        </div>
      }
    >
      <CheckoutReturnClient />
    </Suspense>
  );
}

```
### src/app/globals.css

```css
@import "tailwindcss";
/* Skip large non-app trees so Tailwind scans less (faster dev/build, smaller CSS input scan). */
@source not "../../_archive";
@source not "../../games";
@import "highlight.js/styles/github-dark.css";

:root {
  color-scheme: dark;
}

html,
body {
  height: 100%;
}

body {
  @apply bg-zinc-950 text-zinc-100 antialiased;
}

html {
  font-size: calc(14px * var(--babygpt-font-scale, 1));
}

html.babygpt-appearance-light body {
  @apply bg-zinc-100 text-zinc-900;
}

html.babygpt-appearance-oled body {
  @apply bg-black text-zinc-100;
}

/* Header icon buttons: light shell */
html.babygpt-appearance-light .babygpt-app-root header .babygpt-header-btn {
  @apply bg-white text-zinc-900 ring-zinc-300 hover:bg-zinc-100;
}

.babygpt-markdown pre {
  @apply overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 text-sm;
}

.babygpt-markdown code {
  @apply rounded bg-zinc-800 px-1 py-0.5 text-[0.9em];
}

.babygpt-markdown pre code {
  @apply bg-transparent p-0;
}

```
### src/app/layout.tsx

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BabyGPT — AI Chat Assistant",
  description:
    "BabyGPT — a dark conversational assistant with quantum-inspired controls. Not affiliated with OpenAI.",
  icons: { icon: "/babygpt-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

```
### src/app/login/page.tsx

```typescript
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Login failed (${res.status})`);
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl ring-1 ring-white/5">
        <h1 className="text-center text-lg font-semibold text-zinc-100">BabyGPT</h1>
        <p className="mt-2 text-center text-xs text-zinc-500">
          Sign in with the app password from <code className="text-zinc-400">BABYGPT_APP_PASSWORD</code>. Use the same host
          you use for the app (e.g. only <code className="text-zinc-400">127.0.0.1</code> or only{" "}
          <code className="text-zinc-400">localhost</code>) so the session cookie applies.
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <label className="block text-xs text-zinc-400">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/40"
              required
            />
          </label>
          {error ? <p className="text-xs text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-white disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

```
### src/app/page.tsx

```typescript
import BabyGPTClient from "@/components/BabyGPTClient";

export default function Home() {
  return <BabyGPTClient />;
}

```
### src/components/BabyGPTClient.tsx

```typescript
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  generateMemoryPrompt,
  loadMemory,
  saveMemory,
  updateMemoryFromConversation,
} from "@/lib/agent-memory";
import { startHeartbeat } from "@/lib/heartbeat";
import { addReminder, parseReminderFromMessage } from "@/lib/reminders";
import {
  extractSseTextDelta,
  extractSseThinkingDelta,
  parseSseAgentMeta,
} from "@/lib/stream-parse";
import type { Skill } from "@/lib/skill-model";
import { lsKey } from "@/lib/storage";
import { skillSystemPrompt, suggestSkillForMessage } from "@/lib/skills";
import type { ChatMessage, Conversation, ModelTier } from "@/lib/types";
import {
  adjustBalance,
  creditMonthKey,
  hydrateCredits,
  loadCreditsState,
  saveCreditsState,
  setPlan,
  type CreditsStateV1,
} from "@/lib/credits-store";
import { fetchChatWithRetry, formatChatError } from "@/lib/fetch-chat";
import { planRank, type PowerTemplate } from "@/lib/instant-templates";
import { inferMood } from "@/lib/mood-engine";
import type { BillingAlertPayload, UsageHint } from "@/lib/billing-usage-hints";
import { APP_VERSION } from "@/lib/app-version";
import { markCapsuleOpened, nextDueTimeCapsule, type TimeCapsule } from "@/lib/time-capsule";
import {
  applyUiPreferences,
  footerShellClass,
  headerShellClass,
  loadUiPreferences,
  mainChatShellClass,
  subBannerClass,
  appRootBgClass,
  type UiPreferences,
} from "@/lib/ui-preferences";
import { PLANS, planAllowsModel, type PlanId, type PlanDefinition } from "@/lib/plans";
import { schrodingerPair } from "@/lib/schrodinger-pair";
import {
  describeCost,
  estimateSendCredits,
  planPermitsSend,
  type SendMode,
} from "@/lib/usage-cost";
import { ProactiveToast } from "./ProactiveToast";
import { ChatArea } from "./ChatArea";
import { ChatInput } from "./ChatInput";
import { CostPreview } from "./CostPreview";
import { SmartActions } from "./SmartActions";
import { CommunityPanel } from "./CommunityPanel";
import { QuantumControls, type QuantumFlags } from "./QuantumControls";
import { SearchOverlay } from "./SearchOverlay";
import { Sidebar } from "./Sidebar";
import { SkillsPanel } from "./SkillsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { SubscriptionModal, type StripeBillingInfo } from "./SubscriptionModal";
import { TimeCapsuleReveal } from "./TimeCapsuleReveal";

const CONV_KEY = lsKey("conversations");
const ACTIVE_KEY = lsKey("active_conversation_id");

function pickModelForPlan(preferred: ModelTier, plan: PlanDefinition): ModelTier {
  if (planAllowsModel(plan, preferred)) return preferred;
  const order: ModelTier[] = ["glm-4", "glm-4-long", "glm-4-plus", "glm-4-air", "glm-4-flash"];
  for (const m of order) {
    if (planAllowsModel(plan, m)) return m;
  }
  return plan.allowedModels[0]!;
}

function loadConvos(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONV_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

export default function BabyGPTClient() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState<ModelTier>("glm-4-flash");
  const [thinking, setThinking] = useState(false);
  const [schrodinger, setSchrodinger] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [quantum, setQuantum] = useState<QuantumFlags>({
    kolmogorov: false,
    holographic: false,
    dna: false,
    adiabatic: 0.5,
  });
  const [communityOpen, setCommunityOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [routingReason, setRoutingReason] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);
  const [skillHint, setSkillHint] = useState<Skill | null>(null);
  /** Composer text — drives skills, mood, and templates */
  const [chatDraft, setChatDraft] = useState("");
  const [streamingAssistantId, setStreamingAssistantId] = useState<string | null>(null);
  /** Aborts in-flight chat SSE when starting a new send or clicking Stop. */
  const streamAbortRef = useRef<AbortController | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; body: string; draft: string; open: boolean }>>([]);
  const [credits, setCredits] = useState<CreditsStateV1 | null>(null);
  /** Server wallet + login gate (when BABYGPT_APP_PASSWORD is set). */
  const [serverCredits, setServerCredits] = useState(false);
  /** Stripe linkage from GET /api/credits (when gate on, or env-only flags when gate off). */
  const [stripeBilling, setStripeBilling] = useState<StripeBillingInfo | null>(null);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [billingAlert, setBillingAlert] = useState<BillingAlertPayload | null>(null);
  const [usageHints, setUsageHints] = useState<UsageHint[]>([]);
  const [billingAlertLocalDismiss, setBillingAlertLocalDismiss] = useState(false);
  const [uiPrefs, setUiPrefs] = useState<UiPreferences | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeCapsuleReveal, setTimeCapsuleReveal] = useState<TimeCapsule | null>(null);
  const notifEnabledRef = useRef(false);

  useEffect(() => {
    const p = loadUiPreferences();
    applyUiPreferences(p);
    setUiPrefs(p);
  }, []);

  useEffect(() => {
    notifEnabledRef.current = Boolean(uiPrefs?.notificationsEnabled);
  }, [uiPrefs?.notificationsEnabled]);

  useEffect(() => {
    function tick() {
      setTimeCapsuleReveal((cur) => {
        if (cur) return cur;
        return nextDueTimeCapsule();
      });
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setBillingAlertLocalDismiss(false);
  }, [billingAlert?.at]);

  const showBillingBanner = useMemo(() => {
    if (!billingAlert || billingAlertLocalDismiss) return false;
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(`babygpt_dismiss_billing_${billingAlert.at}`) === "1") return false;
    }
    return true;
  }, [billingAlert, billingAlertLocalDismiss]);

  const dismissBillingAlert = useCallback(() => {
    if (!billingAlert) return;
    sessionStorage.setItem(`babygpt_dismiss_billing_${billingAlert.at}`, "1");
    setBillingAlertLocalDismiss(true);
  }, [billingAlert]);

  useEffect(() => {
    setConversations(loadConvos());
    setActiveId(localStorage.getItem(ACTIVE_KEY));
  }, []);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const res = await fetch("/api/credits", { credentials: "include" });
        const data = (await res.json()) as {
          source?: string;
          planId?: PlanId;
          balance?: number;
          accrualMonth?: string;
          welcomeApplied?: boolean;
          billingAlert?: BillingAlertPayload | null;
          usageHints?: UsageHint[];
          stripe?: {
            configured?: boolean;
            customerId?: string | null;
            subscriptionStatus?: string | null;
          };
        };
        if (cancelled) return;
        if (data.stripe && typeof data.stripe.configured === "boolean") {
          setStripeBilling({
            configured: data.stripe.configured,
            customerId: data.stripe.customerId ?? null,
            subscriptionStatus: data.stripe.subscriptionStatus ?? null,
          });
        }
        if (data.billingAlert?.kind === "payment_failed") {
          setBillingAlert(data.billingAlert);
        } else {
          setBillingAlert(null);
        }
        if (Array.isArray(data.usageHints)) {
          setUsageHints(data.usageHints);
        } else {
          setUsageHints([]);
        }
        if (data.source === "server" && typeof data.balance === "number" && data.planId) {
          setServerCredits(true);
          setCredits({
            version: 1,
            planId: data.planId,
            balance: data.balance,
            accrualMonth: data.accrualMonth ?? creditMonthKey(),
            welcomeApplied: Boolean(data.welcomeApplied),
          });
          return;
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      setBillingAlert(null);
      setUsageHints([]);
      const raw = loadCreditsState();
      const h = hydrateCredits(raw, PLANS[raw.planId].monthlyCredits);
      saveCreditsState(h);
      setCredits(h);
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const openStripeCheckout = useCallback(async (planId: Exclude<PlanId, "free">) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = (await res.json()) as { error?: string; url?: string };
    if (!res.ok) {
      setBanner(data.error ?? "Checkout could not start.");
      setSubscriptionOpen(false);
      return;
    }
    if (!data.url) {
      setBanner("Checkout did not return a redirect URL. Check Stripe keys and server logs.");
      setSubscriptionOpen(false);
      return;
    }
    window.location.href = data.url;
  }, []);

  const openStripePortal = useCallback(async () => {
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json()) as { error?: string; url?: string };
    if (!res.ok) {
      setBanner(data.error ?? "Could not open the billing portal.");
      return;
    }
    if (!data.url) {
      setBanner("Portal did not return a URL. Ensure you have an active Stripe customer (subscribe once first).");
      return;
    }
    window.location.href = data.url;
  }, []);

  const scrollToQuantumBar = useCallback(() => {
    document.getElementById("babygpt-quantum-bar")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const activePlanId = credits?.planId;
  useEffect(() => {
    if (!activePlanId) return;
    const p = PLANS[activePlanId];
    setModel((cur) => (planAllowsModel(p, cur) ? cur : p.allowedModels[0]));
    setAgentMode((a) => (p.features.agent ? a : false));
    setSchrodinger((s) => (p.features.schrodinger ? s : false));
    setQuantum((q) => ({
      kolmogorov: p.features.kolmogorov ? q.kolmogorov : false,
      holographic: p.features.holographic ? q.holographic : false,
      dna: p.features.dna ? q.dna : false,
      adiabatic: p.features.dna ? q.adiabatic : 0.5,
    }));
  }, [activePlanId]);

  useEffect(() => {
    try {
      localStorage.setItem(CONV_KEY, JSON.stringify(conversations));
    } catch {
      // ignore quota
    }
  }, [conversations]);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const convRef = useRef(conversations);
  const activeRef = useRef(activeId);
  useEffect(() => {
    convRef.current = conversations;
  }, [conversations]);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const stop = startHeartbeat({
      getLastUserMessage: () => {
        const c = convRef.current.find((x) => x.id === activeRef.current);
        const last = [...(c?.messages ?? [])].reverse().find((m) => m.role === "user");
        return last?.content ?? null;
      },
      onSuggest: (s) => {
        setToasts((prev) => [...prev, { ...s, open: true }]);
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          notifEnabledRef.current &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(s.title, { body: s.body.slice(0, 240) });
          } catch {
            /* ignore */
          }
        }
      },
    });
    return stop;
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const lastUserBubble = useMemo(() => {
    const msgs = active?.messages ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === "user") return msgs[i]!.content;
    }
    return "";
  }, [active?.messages]);

  const lastAssistantText = useMemo(() => {
    const msgs = active?.messages ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.role === "assistant" && msgs[i]!.content.trim()) return msgs[i]!.content;
    }
    return "";
  }, [active?.messages]);

  const mood = useMemo(
    () => inferMood(`${chatDraft}\n${lastUserBubble}`),
    [chatDraft, lastUserBubble],
  );

  const applyPowerTemplate = useCallback(
    (t: PowerTemplate) => {
      if (!credits) {
        setBanner("Loading credits…");
        return;
      }
      const plan = PLANS[credits.planId];
      if (planRank(plan.id) < planRank(t.minPlan)) {
        setBanner(`That template needs ${t.minPlan}+ — open Plans to upgrade.`);
        setSubscriptionOpen(true);
        return;
      }
      const a = t.apply;
      setModel(pickModelForPlan(a.model, plan));
      setThinking(a.thinking && plan.features.thinking);
      setAgentMode(a.agentMode && plan.features.agent);
      setSchrodinger(a.schrodinger && plan.features.schrodinger);
      setQuantum(() => ({
        kolmogorov: plan.features.kolmogorov ? a.quantum.kolmogorov : false,
        holographic: plan.features.holographic ? a.quantum.holographic : false,
        dna: plan.features.dna ? a.quantum.dna : false,
        adiabatic: a.quantum.adiabatic,
      }));
      setChatDraft(a.draft);
      setBanner(null);
    },
    [credits],
  );

  const upsertConversation = useCallback((next: Conversation) => {
    setConversations((prev) => {
      const i = prev.findIndex((c) => c.id === next.id);
      if (i === -1) return [next, ...prev];
      const copy = [...prev];
      copy[i] = next;
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  const newChat = useCallback(() => {
    const id = uuidv4();
    const conv: Conversation = {
      id,
      title: "New chat",
      updatedAt: Date.now(),
      messages: [],
    };
    upsertConversation(conv);
    setActiveId(id);
  }, [upsertConversation]);

  const onDelete = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  useEffect(() => {
    setSkillHint(suggestSkillForMessage(chatDraft));
  }, [chatDraft]);

  const sendMessage = useCallback(
    async (text: string, options?: { regenerate?: boolean }) => {
      const regenerate = options?.regenerate === true;
      const trimmed = text.trim();
      if (!regenerate && !trimmed) return;

      if (!credits) {
        setBanner("Loading credits… try again in a moment.");
        return;
      }

      const planDef = PLANS[credits.planId];
      const useSchrodinger = schrodinger && !agentMode;
      const mode: SendMode = agentMode ? "agent" : useSchrodinger ? "schrodinger" : "chat";
      const costInput = { model, thinking, mode };
      if (!planPermitsSend(planDef, costInput)) {
        setBanner(
          `Not included on ${planDef.label}: adjust model or modes, or open Plans to upgrade.`,
        );
        return;
      }
      const cost = estimateSendCredits(costInput);
      if (credits.balance < cost) {
        setBanner(
          `Need ${cost} credits for this send (${describeCost(costInput, cost)}). Balance: ${credits.balance}. Open Plans.`,
        );
        return;
      }

      let reminderForBanner: ReturnType<typeof parseReminderFromMessage> = null;
      if (!regenerate) {
        reminderForBanner = parseReminderFromMessage(trimmed);
        if (reminderForBanner) {
          addReminder({
            id: uuidv4(),
            text: reminderForBanner.reminderText,
            triggerAt: reminderForBanner.at,
            createdAt: Date.now(),
          });
          setBanner(`Reminder set for ${new Date(reminderForBanner.at).toLocaleString()}`);
        }
      }

      streamAbortRef.current?.abort();
      const ac = new AbortController();
      streamAbortRef.current = ac;

      setBusy(true);
      if (regenerate) {
        setBanner(null);
      } else if (!reminderForBanner) {
        setBanner(null);
      }
      setRoutingReason(null);

      let convId: string;
      let withUser: Conversation;
      let assistantId: string;

      if (regenerate) {
        if (!activeId) {
          setBanner("Open a chat to regenerate the last reply.");
          setBusy(false);
          streamAbortRef.current = null;
          return;
        }
        const prev = conversations.find((c) => c.id === activeId);
        if (!prev?.messages.length) {
          setBusy(false);
          streamAbortRef.current = null;
          return;
        }
        const last = prev.messages[prev.messages.length - 1];
        if (last.role !== "assistant") {
          setBanner("Regenerate replaces the last assistant message — send a message first.");
          setBusy(false);
          streamAbortRef.current = null;
          return;
        }
        convId = activeId;
        const trimmedMsgs = prev.messages.slice(0, -1);
        withUser = {
          ...prev,
          messages: trimmedMsgs,
          updatedAt: Date.now(),
        };
        upsertConversation(withUser);
        setActiveId(convId);
        const mem = updateMemoryFromConversation(withUser);
        saveMemory(mem);
        assistantId = uuidv4();
        const assistantShell: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          toolCalls: [],
          errorCorrectionLog: [],
        };
        upsertConversation({
          ...withUser,
          updatedAt: Date.now(),
          messages: [...withUser.messages, assistantShell],
        });
      } else {
        convId = activeId ?? uuidv4();
        const prev = conversations.find((c) => c.id === convId);
        const userMsg: ChatMessage = {
          id: uuidv4(),
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        };

        const base: Conversation =
          prev ??
          ({
            id: convId,
            title: trimmed.slice(0, 72) || "New chat",
            updatedAt: Date.now(),
            messages: [],
          } satisfies Conversation);

        withUser = {
          ...base,
          title: base.title === "New chat" ? trimmed.slice(0, 72) : base.title,
          updatedAt: Date.now(),
          messages: [...base.messages, userMsg],
        };

        upsertConversation(withUser);
        setActiveId(convId);

        const mem = updateMemoryFromConversation(withUser);
        saveMemory(mem);

        assistantId = uuidv4();
        const assistantShell: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          toolCalls: [],
          errorCorrectionLog: [],
        };

        upsertConversation({
          ...withUser,
          updatedAt: Date.now(),
          messages: [...withUser.messages, assistantShell],
        });
      }

      const memoryPrompt = generateMemoryPrompt(loadMemory());
      const skillPrompt = skillSystemPrompt(activeSkill);

      const payloadMessages = withUser.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const endpoint = useSchrodinger
        ? "/api/chat/schrodinger"
        : agentMode
          ? "/api/chat/agent"
          : "/api/chat";

      const schPair = schrodingerPair(model, PLANS[credits.planId].allowedModels);
      const body = useSchrodinger
        ? JSON.stringify({
            messages: payloadMessages,
            modelA: schPair.modelA,
            modelB: schPair.modelB,
          })
        : JSON.stringify({
            messages: payloadMessages,
            model,
            thinking: thinking ? "on" : "off",
            memoryPrompt,
            skillPrompt: skillPrompt || undefined,
            quantum: {
              kolmogorov: quantum.kolmogorov,
              holographic: quantum.holographic,
              dna: quantum.dna,
              adiabatic: quantum.adiabatic,
            },
          });

      let res: Response;
      try {
        res = await fetchChatWithRetry(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: ac.signal,
        });
      } catch (e) {
        setBusy(false);
        setStreamingAssistantId(null);
        streamAbortRef.current = null;
        if (e instanceof DOMException && e.name === "AbortError") {
          setBanner("Generation stopped.");
          return;
        }
        setBanner("Network error — check your connection and try again.");
        return;
      }

      const rr = res.headers.get("X-BabyGPT-Routing-Reason");
      if (rr) setRoutingReason(decodeURIComponent(rr));

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setBanner(formatChatError(res.status, err.error));
        setBusy(false);
        streamAbortRef.current = null;
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setBanner("No response stream");
        setBusy(false);
        streamAbortRef.current = null;
        return;
      }

      setStreamingAssistantId(assistantId);

      const dec = new TextDecoder();
      let buffer = "";
      let acc = "";
      let thinkingAcc = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const line of parts) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const payload = trimmedLine.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const j = JSON.parse(payload) as { schrodinger?: boolean; winner?: string };
              if (j.schrodinger && j.winner) {
                setBanner(`Schrödinger winner: ${j.winner}`);
              }
            } catch {
              // ignore
            }

            const meta = parseSseAgentMeta(trimmedLine);
            if (meta) {
              setConversations((prev) => {
                const c = prev.find((x) => x.id === convId);
                if (!c) return prev;
                const msgs = c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: meta.toolCalls,
                        errorCorrectionLog: meta.errorCorrectionLog,
                      }
                    : m,
                );
                return prev
                  .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
                  .sort((a, b) => b.updatedAt - a.updatedAt);
              });
              continue;
            }

            acc += extractSseTextDelta(trimmedLine);
            thinkingAcc += extractSseThinkingDelta(trimmedLine);
          }

          setConversations((prev) => {
            const c = prev.find((x) => x.id === convId);
            if (!c) return prev;
            const msgs = c.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: acc,
                    thinking: thinkingAcc.trim() || undefined,
                  }
                : m,
            );
            return prev
              .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
              .sort((a, b) => b.updatedAt - a.updatedAt);
          });
        }

        buffer += dec.decode();
        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const meta = parseSseAgentMeta(trimmedLine);
            if (meta) {
              setConversations((prev) => {
                const c = prev.find((x) => x.id === convId);
                if (!c) return prev;
                const msgs = c.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: meta.toolCalls,
                        errorCorrectionLog: meta.errorCorrectionLog,
                      }
                    : m,
                );
                return prev
                  .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
                  .sort((a, b) => b.updatedAt - a.updatedAt);
              });
              continue;
            }
            acc += extractSseTextDelta(trimmedLine);
            thinkingAcc += extractSseThinkingDelta(trimmedLine);
          }
          setConversations((prev) => {
            const c = prev.find((x) => x.id === convId);
            if (!c) return prev;
            const msgs = c.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: acc,
                    thinking: thinkingAcc.trim() || undefined,
                  }
                : m,
            );
            return prev
              .map((x) => (x.id === convId ? { ...x, messages: msgs, updatedAt: Date.now() } : x))
              .sort((a, b) => b.updatedAt - a.updatedAt);
          });
        }

        if (!serverCredits) {
          setCredits((prev) => {
            if (!prev) return prev;
            const next = adjustBalance(prev, -cost);
            saveCreditsState(next);
            return next;
          });
        } else {
          void (async () => {
            const r = await fetch("/api/credits", { credentials: "include" });
            if (!r.ok) return;
            const d = (await r.json()) as {
              source?: string;
              planId?: PlanId;
              balance?: number;
              accrualMonth?: string;
              welcomeApplied?: boolean;
            };
            if (d.source !== "server" || typeof d.balance !== "number" || !d.planId) return;
            setCredits({
              version: 1,
              planId: d.planId,
              balance: d.balance,
              accrualMonth: d.accrualMonth ?? creditMonthKey(),
              welcomeApplied: Boolean(d.welcomeApplied),
            });
          })();
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setBanner("Generation stopped.");
        } else {
          setBanner("Stream interrupted — try again.");
        }
      } finally {
        setBusy(false);
        setStreamingAssistantId(null);
        streamAbortRef.current = null;
      }
    },
    [
      activeId,
      activeSkill,
      agentMode,
      conversations,
      credits,
      model,
      quantum,
      schrodinger,
      serverCredits,
      thinking,
      upsertConversation,
    ],
  );

  const regenerateLastResponse = useCallback(() => {
    void sendMessage("", { regenerate: true });
  }, [sendMessage]);

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const canRegenerateLast = useMemo(() => {
    if (!active?.messages.length || busy) return false;
    return active.messages[active.messages.length - 1]!.role === "assistant";
  }, [active?.messages, busy]);

  const runSmartAction = useCallback(
    (prompt: string) => {
      void sendMessage(prompt);
    },
    [sendMessage],
  );

  const previewMode: SendMode = agentMode ? "agent" : schrodinger && !agentMode ? "schrodinger" : "chat";
  const appearance = uiPrefs?.appearance ?? "dark";

  return (
    <div className={`babygpt-app-root flex h-[100dvh] w-full flex-col ${appRootBgClass(appearance)}`}>
      {showBillingBanner && billingAlert ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/45 bg-amber-950/35 px-4 py-2">
          <p className="min-w-0 text-xs text-amber-100/95">{billingAlert.message}</p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void openStripePortal()}
              className="rounded-full bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-50 ring-1 ring-amber-500/40 hover:bg-amber-500/30"
            >
              Manage billing
            </button>
            <button
              type="button"
              onClick={dismissBillingAlert}
              className="rounded-full px-3 py-1.5 text-[11px] text-amber-200/90 ring-1 ring-amber-800/80 hover:bg-amber-950/50"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <header className={headerShellClass(appearance)}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className={`truncate text-sm font-semibold ${appearance === "light" ? "text-zinc-900" : "text-zinc-100"}`}
            >
              BabyGPT
            </div>
            <span
              className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ring-1 sm:inline-flex ${mood.accentClass}`}
              title="Inferred from your draft and last message"
            >
              <span aria-hidden>{mood.emoji}</span>
              {mood.label}
            </span>
            <span
              className={`inline-flex max-w-[min(420px,40vw)] cursor-help truncate rounded-full px-2 py-0.5 text-[10px] ring-1 ${
                appearance === "light"
                  ? "bg-zinc-200 text-zinc-700 ring-zinc-300"
                  : "bg-zinc-900 text-zinc-500 ring-zinc-800"
              }`}
              title={routingReason ?? "Model routing appears after each reply when Kolmogorov routing is on."}
            >
              {routingReason ? routingReason : "Model reason"}
            </span>
          </div>
          <div
            className={`truncate text-[11px] ${appearance === "light" ? "text-zinc-600" : "text-zinc-600"}`}
          >
            Plans gate models · credits per send · memory · Cmd/Ctrl+K search
          </div>
        </div>
        <QuantumControls
          id="babygpt-quantum-bar"
          plan={credits ? PLANS[credits.planId] : PLANS.free}
          model={model}
          onModel={setModel}
          thinking={thinking}
          onThinking={setThinking}
          schrodinger={schrodinger}
          onSchrodinger={setSchrodinger}
          agentMode={agentMode}
          onAgentMode={setAgentMode}
          quantum={quantum}
          onQuantum={setQuantum}
          onRequestUpgrade={() => setSubscriptionOpen(true)}
        />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
            title="Font size, theme, notifications, time capsule"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setSubscriptionOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
            title="Subscription tiers, model access, and credit balance"
          >
            Plans
          </button>
          <span
            className={`hidden rounded-full px-2 py-1 font-mono text-[10px] ring-1 sm:inline ${
              appearance === "light"
                ? "bg-cyan-100/90 text-cyan-900 ring-cyan-300"
                : "bg-zinc-900/80 text-cyan-200 ring-zinc-800"
            }`}
            title={
              serverCredits
                ? "Credits stored on the server (enforced when app password is enabled)."
                : "Local credit balance in this browser. Enable BABYGPT_APP_PASSWORD for server wallet."
            }
          >
            {credits ? `${credits.balance} cr` : "…"}
          </span>
          {serverCredits ? (
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                router.push("/login");
                router.refresh();
              }}
              className="babygpt-header-btn hidden rounded-full bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800 sm:inline"
            >
              Sign out
            </button>
          ) : null}
          {activeSkill ? (
            <span className="hidden max-w-[160px] truncate rounded-full bg-cyan-950/40 px-2 py-1 text-[10px] text-cyan-200 ring-1 ring-cyan-900 sm:inline">
              Skill: {activeSkill.name}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setSkillsOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
          >
            Skills
          </button>
          <button
            type="button"
            onClick={() => setCommunityOpen(true)}
            className="babygpt-header-btn rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
          >
            Community
          </button>
        </div>
      </header>

      {banner || busy || canRegenerateLast ? (
        <div className={subBannerClass(appearance)}>
          <div className="min-w-0 text-xs text-zinc-300">
            {banner ?? (busy ? <span className="text-zinc-400">Generating…</span> : null)}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {busy ? (
              <button
                type="button"
                onClick={stopStreaming}
                className="rounded-full bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700"
              >
                Stop
              </button>
            ) : null}
            {canRegenerateLast ? (
              <button
                type="button"
                onClick={regenerateLastResponse}
                className="rounded-full bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 ring-1 ring-zinc-700 hover:bg-zinc-700"
              >
                Regenerate
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onNew={newChat}
          onSelect={setActiveId}
          onDelete={onDelete}
          appearance={appearance}
        />
        <div className={mainChatShellClass(appearance, mood.shellClass)}>
          <ChatArea
            messages={active?.messages ?? []}
            empty={!active || active.messages.length === 0}
            onOpenPlans={() => setSubscriptionOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
            onJumpToQuantum={scrollToQuantumBar}
            busy={busy}
            streamingAssistantId={streamingAssistantId}
            plan={credits ? PLANS[credits.planId] : PLANS.free}
            onPickTemplate={applyPowerTemplate}
            onInsertComposerText={(text, how) => {
              if (how === "prefixFirst") {
                setChatDraft((d) => {
                  const cur = d.trim();
                  return cur ? `${text}${cur}` : text;
                });
              } else {
                setChatDraft(text);
              }
            }}
          />
          {active && active.messages.length > 0 && lastAssistantText && !busy ? (
            <SmartActions
              assistantText={lastAssistantText}
              lastUserText={lastUserBubble}
              onAction={runSmartAction}
              disabled={busy || !credits}
            />
          ) : null}
          <ChatInput
            disabled={busy || !credits}
            value={chatDraft}
            onValueChange={setChatDraft}
            onSend={sendMessage}
            skillSuggestion={skillHint}
            onUseSkill={() => {
              if (skillHint) setActiveSkill(skillHint);
            }}
          >
            {credits ? (
              <CostPreview
                balance={credits.balance}
                model={model}
                thinking={thinking}
                mode={previewMode}
              />
            ) : null}
          </ChatInput>
        </div>
      </div>

      <SearchOverlay
        key={searchOpen ? "open" : "closed"}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        conversations={conversations}
        onPick={(id) => setActiveId(id)}
      />
      <CommunityPanel
        open={communityOpen}
        onClose={() => setCommunityOpen(false)}
        creditsBalance={credits?.balance ?? 0}
        serverCredits={serverCredits}
        onAfterServerDebate={async () => {
          const r = await fetch("/api/credits", { credentials: "include" });
          if (!r.ok) return;
          const d = (await r.json()) as {
            source?: string;
            planId?: PlanId;
            balance?: number;
            accrualMonth?: string;
            welcomeApplied?: boolean;
            billingAlert?: BillingAlertPayload | null;
            usageHints?: UsageHint[];
            stripe?: {
              configured?: boolean;
              customerId?: string | null;
              subscriptionStatus?: string | null;
            };
          };
          if (d.source !== "server" || typeof d.balance !== "number" || !d.planId) return;
          if (d.stripe && typeof d.stripe.configured === "boolean") {
            setStripeBilling({
              configured: d.stripe.configured,
              customerId: d.stripe.customerId ?? null,
              subscriptionStatus: d.stripe.subscriptionStatus ?? null,
            });
          }
          if (d.billingAlert?.kind === "payment_failed") {
            setBillingAlert(d.billingAlert);
          } else {
            setBillingAlert(null);
          }
          if (Array.isArray(d.usageHints)) {
            setUsageHints(d.usageHints);
          }
          setCredits({
            version: 1,
            planId: d.planId,
            balance: d.balance,
            accrualMonth: d.accrualMonth ?? creditMonthKey(),
            welcomeApplied: Boolean(d.welcomeApplied),
          });
        }}
        onSpendCredits={(amount) => {
          let ok = false;
          flushSync(() => {
            setCredits((prev) => {
              if (!prev || prev.balance < amount) return prev;
              ok = true;
              const next = adjustBalance(prev, -amount);
              saveCreditsState(next);
              return next;
            });
          });
          return ok;
        }}
      />
      <SkillsPanel
        open={skillsOpen}
        onClose={() => setSkillsOpen(false)}
        onActivateSkill={(s) => setActiveSkill(s)}
      />
      <SubscriptionModal
        open={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
        currentPlanId={credits?.planId ?? "free"}
        balance={credits?.balance ?? 0}
        serverCredits={serverCredits}
        stripeBilling={stripeBilling}
        usageHints={usageHints}
        onCheckout={openStripeCheckout}
        onManageBilling={openStripePortal}
        onSelectPlan={async (id: PlanId) => {
          if (!credits) {
            setSubscriptionOpen(false);
            return;
          }
          if (serverCredits) {
            const res = await fetch("/api/credits", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ planId: id }),
            });
            const data = (await res.json()) as {
              source?: string;
              planId?: PlanId;
              balance?: number;
              accrualMonth?: string;
              welcomeApplied?: boolean;
              error?: string;
            };
            if (!res.ok) {
              setBanner(data.error ?? "Could not update plan on server.");
              setSubscriptionOpen(false);
              return;
            }
            if (data.source === "server" && data.planId) {
              setCredits({
                version: 1,
                planId: data.planId,
                balance: data.balance ?? 0,
                accrualMonth: data.accrualMonth ?? creditMonthKey(),
                welcomeApplied: Boolean(data.welcomeApplied),
              });
            }
            setSubscriptionOpen(false);
            return;
          }
          setCredits((prev) => {
            if (!prev) return prev;
            const next = setPlan(prev, id);
            saveCreditsState(next);
            return next;
          });
          setSubscriptionOpen(false);
        }}
      />
      <ProactiveToast
        items={toasts}
        onDismiss={(id) => setToasts((t) => t.map((x) => (x.id === id ? { ...x, open: false } : x)))}
        onAsk={(draft) => void sendMessage(draft)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onPreferencesSaved={(p) => {
          applyUiPreferences(p);
          setUiPrefs(p);
        }}
      />
      {timeCapsuleReveal ? (
        <TimeCapsuleReveal
          capsule={timeCapsuleReveal}
          onDismiss={() => {
            markCapsuleOpened(timeCapsuleReveal.id);
            setTimeCapsuleReveal(null);
            const next = nextDueTimeCapsule();
            if (next) setTimeCapsuleReveal(next);
          }}
        />
      ) : null}
      <footer className={footerShellClass(appearance)}>
        <span className="text-zinc-500">v{APP_VERSION}</span>
        {" · "}
        BabyGPT is not affiliated with or endorsed by OpenAI. &quot;ChatGPT&quot; is a trademark of OpenAI.
      </footer>
    </div>
  );
}

```
### src/components/BlochSphere.tsx

```typescript
"use client";

export function BlochSphere({ theta = 0.35 }: { theta?: number }) {
  return (
    <div className="relative h-28 w-28" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/30 via-fuchsia-500/20 to-indigo-500/30 blur-md" />
      <div
        className="absolute inset-2 rounded-full bg-gradient-to-br from-zinc-900 to-zinc-950 ring-1 ring-zinc-800"
        style={{ transform: `rotate(${theta}rad)` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium tracking-wide text-zinc-500">
        |ψ⟩
      </div>
    </div>
  );
}

```
### src/components/ChatArea.tsx

```typescript
"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import type { PlanDefinition } from "@/lib/plans";
import type { PowerTemplate } from "@/lib/instant-templates";

export function ChatArea({
  messages,
  empty,
  onOpenPlans,
  onOpenSearch,
  onJumpToQuantum,
  busy,
  streamingAssistantId,
  plan,
  onPickTemplate,
  onInsertComposerText,
}: {
  messages: ChatMessage[];
  empty: boolean;
  onOpenPlans: () => void;
  onOpenSearch: () => void;
  onJumpToQuantum: () => void;
  busy?: boolean;
  streamingAssistantId?: string | null;
  plan: PlanDefinition;
  onPickTemplate: (t: PowerTemplate) => void;
  /** replace = set draft; prefixFirst = put text at start of composer (for mode prefixes). */
  onInsertComposerText: (text: string, how?: "replace" | "prefixFirst") => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastContent = messages.at(-1)?.content ?? "";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastContent]);

  if (empty) {
    return (
      <div className="flex-1 overflow-auto">
        <WelcomeScreen
          onOpenPlans={onOpenPlans}
          onOpenSearch={onOpenSearch}
          onJumpToQuantum={onJumpToQuantum}
          plan={plan}
          onPickTemplate={onPickTemplate}
          onInsertComposerText={onInsertComposerText}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isStreamingThinking={Boolean(busy && streamingAssistantId === m.id && m.role === "assistant")}
            showGeneratingPlaceholder={Boolean(
              busy &&
                streamingAssistantId === m.id &&
                m.role === "assistant" &&
                !m.content.trim() &&
                !(m.thinking && m.thinking.trim()),
            )}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

```
### src/components/ChatInput.tsx

```typescript
"use client";

import { useState, type ReactNode } from "react";

export function ChatInput({
  disabled,
  onSend,
  skillSuggestion,
  onUseSkill,
  onDraftChange,
  value: controlledValue,
  onValueChange,
  children,
}: {
  disabled?: boolean;
  onSend: (text: string) => void | Promise<void>;
  skillSuggestion?: { name: string } | null;
  onUseSkill?: () => void;
  onDraftChange?: (text: string) => void;
  /** Controlled input (templates, sync with parent mood/cost preview) */
  value?: string;
  onValueChange?: (text: string) => void;
  /** e.g. CostPreview above the textarea */
  children?: ReactNode;
}) {
  const [internal, setInternal] = useState("");
  const controlled = controlledValue !== undefined;
  const value = controlled ? controlledValue! : internal;

  function setValue(next: string) {
    if (controlled) onValueChange?.(next);
    else setInternal(next);
    onDraftChange?.(next);
  }

  async function submit() {
    const t = value.trim();
    if (!t || disabled) return;
    setValue("");
    await onSend(t);
  }

  return (
    <div className="border-t border-zinc-900 bg-zinc-950/40 p-3">
      {children}
      {skillSuggestion ? (
        <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
          <span>
            Use skill: <span className="text-zinc-200">{skillSuggestion.name}</span>?
          </span>
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-cyan-300 ring-1 ring-zinc-800 hover:bg-zinc-800"
            onClick={() => onUseSkill?.()}
          >
            Activate
          </button>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-3xl gap-2">
        <textarea
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={3}
          placeholder="Message BabyGPT…"
          className="min-h-[52px] flex-1 resize-none rounded-2xl bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-cyan-500/30 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={() => void submit()}
          className="h-[52px] shrink-0 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <div className="mx-auto mt-2 max-w-3xl text-[11px] text-zinc-600">
        Enter sends · Shift+Enter newline
      </div>
    </div>
  );
}

```
### src/components/CommunityPanel.tsx

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { fetchChatWithRetry } from "@/lib/fetch-chat";
import type { CommunityPost } from "@/lib/community";
import { COMMUNITY_DEBATE_COST } from "@/lib/usage-cost";
import { PostCard } from "./PostCard";

export function CommunityPanel({
  open,
  onClose,
  creditsBalance,
  onSpendCredits,
  serverCredits,
  onAfterServerDebate,
}: {
  open: boolean;
  onClose: () => void;
  creditsBalance: number;
  onSpendCredits: (amount: number) => boolean;
  /** When true, debate cost is debited on the server — skip local wallet deduction. */
  serverCredits?: boolean;
  /** Refresh parent wallet after a server-side debate debit. */
  onAfterServerDebate?: () => void | Promise<void>;
}) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [debateTopic, setDebateTopic] = useState("");
  const [debate, setDebate] = useState<{ for: string; against: string } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, panelRef, onClose);

  async function refresh() {
    const res = await fetchChatWithRetry("/api/community", { method: "GET" });
    const data = (await res.json()) as { posts: CommunityPost[] };
    setPosts(data.posts ?? []);
  }

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- load posts when panel opens */
    void refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  async function createPost() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    await fetchChatWithRetry("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "post", title: t, body: b }),
    });
    setTitle("");
    setBody("");
    await refresh();
  }

  async function addComment(postId: string, text: string) {
    await fetchChatWithRetry("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", postId, body: text, author: "you" }),
    });
    await refresh();
  }

  async function runDebate() {
    const topic = debateTopic.trim();
    if (!topic) return;
    if (creditsBalance < COMMUNITY_DEBATE_COST) {
      setDebate({
        for: `Not enough credits (debate costs ${COMMUNITY_DEBATE_COST}). Open Plans to review balance and tiers.`,
        against: "",
      });
      return;
    }
    const res = await fetchChatWithRetry("/api/community/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    });
    const data = (await res.json()) as { for?: string; against?: string; error?: string };
    if (data.error) {
      setDebate({ for: `Error: ${data.error}`, against: "" });
      return;
    }
    if (!serverCredits) {
      if (!onSpendCredits(COMMUNITY_DEBATE_COST)) {
        setDebate({ for: "Could not deduct credits.", against: "" });
        return;
      }
    }
    setDebate({ for: data.for ?? "", against: data.against ?? "" });
    if (serverCredits && onAfterServerDebate) {
      void onAfterServerDebate();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="h-[min(92vh,860px)] w-full max-w-lg overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="babygpt-community-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur">
          <div id="babygpt-community-title" className="text-sm font-semibold text-zinc-100">
            Community
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-medium text-zinc-300">AI debate</div>
            <input
              value={debateTopic}
              onChange={(e) => setDebateTopic(e.target.value)}
              placeholder="Topic…"
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <button
              type="button"
              onClick={() => void runDebate()}
              className="mt-2 rounded-xl bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
              title={`Costs ${COMMUNITY_DEBATE_COST} credits when successful`}
            >
              Run debate ({COMMUNITY_DEBATE_COST} cr)
            </button>
            {debate ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="rounded-xl bg-zinc-900/50 p-2 text-zinc-200 ring-1 ring-zinc-800">
                  <div className="text-[11px] text-emerald-400">FOR</div>
                  <div className="mt-1 whitespace-pre-wrap text-zinc-300">{debate.for}</div>
                </div>
                <div className="rounded-xl bg-zinc-900/50 p-2 text-zinc-200 ring-1 ring-zinc-800">
                  <div className="text-[11px] text-rose-400">AGAINST</div>
                  <div className="mt-1 whitespace-pre-wrap text-zinc-300">{debate.against}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-medium text-zinc-300">New post</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body"
              rows={4}
              className="mt-2 w-full resize-none rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <button
              type="button"
              onClick={() => void createPost()}
              className="mt-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950"
            >
              Publish
            </button>
          </div>

          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onComment={(id, t) => void addComment(id, t)} />
            ))}
            {!posts.length ? (
              <div className="text-sm text-zinc-600">No posts yet — add one above.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

```
### src/components/ConversationTopology.tsx

```typescript
"use client";

export function ConversationTopology({ active = 3 }: { active?: number }) {
  const nodes = Array.from({ length: 7 }, (_, i) => i);
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="mb-2 text-xs font-medium text-zinc-400">Topology</div>
      <svg viewBox="0 0 240 90" className="h-20 w-full text-zinc-600" aria-hidden>
        {nodes.map((i) => (
          <circle
            key={i}
            cx={30 + i * 30}
            cy={40 + (i % 3) * 8}
            r={i === active ? 6 : 4}
            className={i === active ? "fill-cyan-400/70" : "fill-zinc-700"}
          />
        ))}
        {nodes.slice(0, -1).map((i) => (
          <line
            key={`e-${i}`}
            x1={30 + i * 30}
            y1={40 + (i % 3) * 8}
            x2={30 + (i + 1) * 30}
            y2={40 + ((i + 1) % 3) * 8}
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}

```
### src/components/CostPreview.tsx

```typescript
"use client";

import { estimateSendCreditsBreakdown } from "@/lib/usage-cost";
import type { SendMode } from "@/lib/usage-cost";
import type { ModelTier } from "@/lib/types";

export function CostPreview({
  balance,
  model,
  thinking,
  mode,
}: {
  balance: number;
  model: ModelTier;
  thinking: boolean;
  mode: SendMode;
}) {
  const { lines, total } = estimateSendCreditsBreakdown({ model, thinking, mode });
  const after = Math.max(0, balance - total);
  const ratio = balance > 0 ? Math.min(1, after / balance) : 0;
  const low = balance > 0 && after / balance < 0.2;
  const blocked = balance < total;

  const barColor = blocked
    ? "bg-rose-500"
    : low
      ? "bg-amber-400"
      : "bg-gradient-to-r from-cyan-500 to-emerald-500";

  return (
    <div className="mx-auto mb-2 w-full max-w-3xl rounded-2xl border border-zinc-800/90 bg-zinc-950/60 px-4 py-3 ring-1 ring-white/5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            This send
          </div>
          <div className="mt-1 font-mono text-lg font-semibold text-zinc-100">{total} cr</div>
        </div>
        <div className="text-right text-[11px] text-zinc-500">
          Balance <span className="font-mono text-zinc-300">{balance}</span>
          {blocked ? (
            <span className="ml-2 text-rose-400">Not enough credits</span>
          ) : (
            <span className="ml-2 text-zinc-400">
              → <span className="font-mono text-emerald-300/90">{after}</span> left
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800/90">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <ul className="mt-2 space-y-0.5 text-[10px] text-zinc-500">
        {lines.map((row) => (
          <li key={row.label} className="flex justify-between gap-2">
            <span>{row.label}</span>
            <span className="font-mono text-zinc-400">+{row.credits}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-zinc-600">
        This is the in-app <span className="text-zinc-500">credit</span> cost for one successful reply. Stripe
        subscription pricing (USD/month) for your plan tier is in{" "}
        <span className="text-zinc-500">Plans</span> — separate from per-message credits.
      </p>
    </div>
  );
}

```
### src/components/InstantTemplates.tsx

```typescript
"use client";

import type { PlanDefinition } from "@/lib/plans";
import { POWER_TEMPLATES, planRank, type PowerTemplate } from "@/lib/instant-templates";

export function InstantTemplates({
  plan,
  onPick,
}: {
  plan: PlanDefinition;
  onPick: (t: PowerTemplate) => void;
}) {
  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-200">Power templates</div>
      <p className="mb-3 text-xs text-zinc-500">
        One tap configures model, thinking, and quantum options — then focus on your prompt.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {POWER_TEMPLATES.map((t) => {
          const ok = planRank(plan.id) >= planRank(t.minPlan);
          return (
            <button
              key={t.id}
              type="button"
              disabled={!ok}
              title={!ok ? `Requires ${t.minPlan}+ plan` : t.description}
              onClick={() => onPick(t)}
              className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                ok
                  ? "border-zinc-800 bg-zinc-900/50 text-zinc-200 ring-1 ring-transparent hover:border-cyan-500/30 hover:ring-cyan-500/20"
                  : "cursor-not-allowed border-zinc-800/50 bg-zinc-950/40 text-zinc-600"
              }`}
            >
              <span className="flex items-center gap-2 font-semibold text-zinc-100">
                <span aria-hidden>{t.emoji}</span>
                {t.title}
                {!ok ? (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-normal uppercase text-zinc-500">
                    {t.minPlan}+
                  </span>
                ) : null}
              </span>
              <span className="mt-1 text-[11px] text-zinc-500">{t.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

```
### src/components/MessageBubble.tsx

```typescript
"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage } from "@/lib/types";
import { ThinkingCanvas } from "./ThinkingCanvas";

export function MessageBubble({
  message,
  isStreamingThinking,
  showGeneratingPlaceholder,
}: {
  message: ChatMessage;
  /** True while SSE is still filling this assistant message */
  isStreamingThinking?: boolean;
  /** Pulse line when assistant shell is still empty */
  showGeneratingPlaceholder?: boolean;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copyAssistant = useCallback(async () => {
    if (!message.content.trim()) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [message.content]);

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(720px,92vw)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-emerald-600/25 text-zinc-100 ring-1 ring-emerald-500/30"
            : "bg-zinc-900/80 text-zinc-100 ring-1 ring-zinc-800"
        }`}
      >
        {message.thinking ? (
          <>
            <ThinkingCanvas text={message.thinking} active={Boolean(isStreamingThinking)} />
            <details className="mb-2 rounded-lg bg-zinc-950/40 p-2 text-xs text-zinc-500 ring-1 ring-zinc-800">
              <summary className="cursor-pointer select-none text-zinc-400">Raw reasoning</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[11px] text-zinc-500">
                {message.thinking}
              </pre>
            </details>
          </>
        ) : null}

        {message.toolCalls?.length ? (
          <details className="mb-2 rounded-lg bg-zinc-950/60 p-2 text-xs ring-1 ring-zinc-800" open>
            <summary className="cursor-pointer select-none text-zinc-300">Tool calls</summary>
            <div className="mt-2 space-y-2">
              {message.toolCalls.map((t) => (
                <div key={t.id} className="rounded-lg bg-black/30 p-2">
                  <div className="font-mono text-[11px] text-cyan-300">{t.name}</div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-zinc-500">
                    {JSON.stringify(t.arguments, null, 2)}
                  </pre>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-zinc-400">
                    {t.result}
                  </pre>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {message.errorCorrectionLog?.length ? (
          <details className="mb-2 rounded-lg bg-zinc-950/40 p-2 text-xs text-zinc-500 ring-1 ring-zinc-800">
            <summary className="cursor-pointer select-none text-zinc-400">Corrections</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {message.errorCorrectionLog.map((e, i) => (
                <li key={`${e.at}-${i}`}>
                  <span className="text-zinc-600">[{e.kind}]</span> {e.detail}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {!isUser && message.content.trim() ? (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => void copyAssistant()}
              className="rounded-lg bg-zinc-950/60 px-2 py-1 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}

        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : showGeneratingPlaceholder ? (
          <p className="animate-pulse text-zinc-500">Generating…</p>
        ) : (
          <div className="babygpt-markdown prose prose-invert max-w-none prose-p:my-2 prose-headings:my-3">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

```
### src/components/PostCard.tsx

```typescript
"use client";

import { useState } from "react";
import type { CommunityPost } from "@/lib/community";

export function PostCard({
  post,
  onComment,
}: {
  post: CommunityPost;
  onComment: (postId: string, body: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{post.title}</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">{post.body}</div>
        </div>
        <div className="shrink-0 text-[11px] text-zinc-600">
          resonance {Math.round(post.resonance)}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {post.comments.map((c) => (
          <div
            key={c.id}
            className="rounded-xl bg-zinc-900/40 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800"
          >
            <div className="text-[11px] text-zinc-500">
              {c.author}
              {c.sentiment ? (
                <span className="ml-2 text-zinc-600">· {c.sentiment}</span>
              ) : null}
            </div>
            <div className="mt-1">{c.body}</div>
            {c.ghostReply ? (
              <div className="mt-2 rounded-lg bg-zinc-950/60 p-2 text-xs text-zinc-500 ring-1 ring-zinc-800">
                Ghost: {c.ghostReply}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3">
        {!open ? (
          <button
            type="button"
            className="text-xs text-cyan-400 hover:text-cyan-300"
            onClick={() => setOpen(true)}
          >
            Add comment
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            />
            <button
              type="button"
              className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-950"
              onClick={() => {
                const t = draft.trim();
                if (!t) return;
                onComment(post.id, t);
                setDraft("");
                setOpen(false);
              }}
            >
              Post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

```
### src/components/ProactiveToast.tsx

```typescript
"use client";

import type { HeartbeatSuggestion } from "@/lib/heartbeat";

export function ProactiveToast({
  items,
  onDismiss,
  onAsk,
}: {
  items: (HeartbeatSuggestion & { open: boolean })[];
  onDismiss: (id: string) => void;
  onAsk: (draft: string) => void;
}) {
  const visible = items.filter((i) => i.open);
  if (!visible.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(420px,92vw)] flex-col gap-2">
      {visible.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl ring-1 ring-white/5 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-zinc-200">{t.title}</div>
              <div className="mt-1 text-sm text-zinc-400">{t.body}</div>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
              onClick={() => onDismiss(t.id)}
            >
              ×
            </button>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={() => {
                const d = t.draft?.trim();
                if (d) onAsk(d);
              }}
            >
              Ask now
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

```
### src/components/QuantumControls.tsx

```typescript
"use client";

import type { PlanDefinition } from "@/lib/plans";
import { planAllowsModel } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";

export type QuantumFlags = {
  kolmogorov: boolean;
  holographic: boolean;
  dna: boolean;
  adiabatic: number;
};

const MODELS: ModelTier[] = [
  "glm-4-flash",
  "glm-4-air",
  "glm-4-plus",
  "glm-4-long",
  "glm-4",
];

export function QuantumControls({
  id,
  plan,
  model,
  onModel,
  thinking,
  onThinking,
  schrodinger,
  onSchrodinger,
  agentMode,
  onAgentMode,
  quantum,
  onQuantum,
  onRequestUpgrade,
}: {
  /** Anchor for scroll-into-view (e.g. welcome screen “jump to controls”). */
  id?: string;
  plan: PlanDefinition;
  model: ModelTier;
  onModel: (m: ModelTier) => void;
  thinking: boolean;
  onThinking: (v: boolean) => void;
  schrodinger: boolean;
  onSchrodinger: (v: boolean) => void;
  agentMode: boolean;
  onAgentMode: (v: boolean) => void;
  quantum: QuantumFlags;
  onQuantum: (next: QuantumFlags) => void;
  /** When a control is locked, open subscription / plans. */
  onRequestUpgrade: () => void;
}) {
  const canThinking = plan.features.thinking;
  const canAgent = plan.features.agent;
  const canSchrodinger = plan.features.schrodinger;
  const canK = plan.features.kolmogorov;
  const canH = plan.features.holographic;
  const canDna = plan.features.dna;

  return (
    <div id={id} className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        Model
        <select
          value={model}
          title={plan.modelHighlights[model]}
          onChange={(e) => {
            const v = e.target.value as ModelTier;
            if (!planAllowsModel(plan, v)) {
              onRequestUpgrade();
              return;
            }
            onModel(v);
          }}
          className="max-w-[140px] rounded-lg bg-zinc-900 px-2 py-1 text-xs text-zinc-100 ring-1 ring-zinc-800"
        >
          {MODELS.map((m) => {
            const allowed = planAllowsModel(plan, m);
            return (
              <option key={m} value={m} disabled={!allowed}>
                {m}
                {!allowed ? " (plan)" : ""}
              </option>
            );
          })}
        </select>
      </label>

      <button
        type="button"
        disabled={!canThinking}
        title={
          canThinking
            ? "Use chain-of-thought style reasoning when the provider supports it"
            : "Upgrade your plan to enable Thinking"
        }
        onClick={() => {
          if (!canThinking) {
            onRequestUpgrade();
            return;
          }
          onThinking(!thinking);
        }}
        className={`rounded-full px-3 py-1 text-xs ring-1 ${
          !canThinking
            ? "cursor-not-allowed opacity-40"
            : thinking
              ? "bg-cyan-500/15 text-cyan-200 ring-cyan-500/30"
              : "bg-zinc-900 text-zinc-400 ring-zinc-800"
        }`}
      >
        Thinking
      </button>

      <button
        type="button"
        disabled={agentMode || !canSchrodinger}
        title={
          !canSchrodinger
            ? "Schrödinger (dual-stream) requires Pro or Team"
            : agentMode
              ? "Turn off Agent first — then you can enable Schrödinger dual-stream"
              : "Run two models in parallel and keep the stronger reply"
        }
        onClick={() => {
          if (!canSchrodinger) {
            onRequestUpgrade();
            return;
          }
          if (agentMode) return;
          onSchrodinger(!schrodinger);
        }}
        className={`rounded-full px-3 py-1 text-xs ring-1 ${
          agentMode || !canSchrodinger
            ? "cursor-not-allowed opacity-40"
            : schrodinger
              ? "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-500/30"
              : "bg-zinc-900 text-zinc-400 ring-zinc-800"
        }`}
      >
        Schrödinger
      </button>

      <button
        type="button"
        disabled={!canAgent}
        title={
          canAgent
            ? "Tool-using agent loop (web, calculator, …)"
            : "Upgrade to Starter or higher for Agent mode"
        }
        onClick={() => {
          if (!canAgent) {
            onRequestUpgrade();
            return;
          }
          const next = !agentMode;
          onAgentMode(next);
          if (next) onSchrodinger(false);
        }}
        className={`rounded-full px-3 py-1 text-xs ring-1 ${
          !canAgent
            ? "cursor-not-allowed opacity-40"
            : agentMode
              ? "bg-amber-500/15 text-amber-200 ring-amber-500/30"
              : "bg-zinc-900 text-zinc-400 ring-zinc-800"
        }`}
      >
        Agent
      </button>

      <details className="relative">
        <summary className="cursor-pointer list-none rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800">
          Quantum
        </summary>
        <div className="absolute right-0 z-40 mt-2 w-[280px] rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 shadow-xl ring-1 ring-white/5">
          <label className="flex items-center justify-between gap-2 py-1">
            <span title="Auto-pick model tier from prompt complexity">Kolmogorov router</span>
            <input
              type="checkbox"
              disabled={!canK}
              checked={canK && quantum.kolmogorov}
              onChange={(e) => {
                if (!canK) {
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, kolmogorov: e.target.checked });
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-1">
            <span title="Fold long context for leaner prompts">Holographic context</span>
            <input
              type="checkbox"
              disabled={!canH}
              checked={canH && quantum.holographic}
              onChange={(e) => {
                if (!canH) {
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, holographic: e.target.checked });
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-2 py-1">
            <span title="Lock style from recent turns">Eigenresponse / DNA</span>
            <input
              type="checkbox"
              disabled={!canDna}
              checked={canDna && quantum.dna}
              onChange={(e) => {
                if (!canDna) {
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, dna: e.target.checked });
              }}
            />
          </label>
          <label className="mt-2 block text-zinc-500">
            Adiabatic morph
            <input
              type="range"
              min={0}
              max={100}
              disabled={!canDna}
              title={canDna ? "Blend strength for adiabatic prompt morph" : "Unlock with Pro (DNA feature)"}
              value={canDna ? Math.round(quantum.adiabatic * 100) : 50}
              onChange={(e) => {
                if (!canDna) {
                  onRequestUpgrade();
                  return;
                }
                onQuantum({ ...quantum, adiabatic: Number(e.target.value) / 100 });
              }}
              className="mt-1 w-full disabled:opacity-40"
            />
          </label>
          {!canK || !canH || !canDna ? (
            <button
              type="button"
              className="mt-2 w-full rounded-lg bg-zinc-900 py-1.5 text-[11px] text-cyan-300 ring-1 ring-zinc-800 hover:bg-zinc-800"
              onClick={onRequestUpgrade}
            >
              View plans for full quantum stack
            </button>
          ) : null}
        </div>
      </details>
    </div>
  );
}

```
### src/components/SearchOverlay.tsx

```typescript
"use client";

import { useMemo, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { Conversation } from "@/lib/types";

export function SearchOverlay({
  open,
  onClose,
  conversations,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, dialogRef, onClose);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return conversations.slice(0, 8);
    return conversations
      .filter((c) => {
        if (c.title.toLowerCase().includes(s)) return true;
        return c.messages.some((m) => m.content.toLowerCase().includes(s));
      })
      .slice(0, 12);
  }, [conversations, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-label="Search conversations"
      >
        <div className="border-b border-zinc-900 p-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-cyan-500/40"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-600">Tip: press Esc to close</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
        </div>
        <div className="max-h-[50vh] overflow-auto p-2">
          {results.length ? (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900/70"
                onClick={() => {
                  onPick(c.id);
                  onClose();
                }}
              >
                <span className="truncate">{c.title}</span>
                <span className="shrink-0 text-[11px] text-zinc-600">
                  {new Date(c.updatedAt).toLocaleString()}
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-sm text-zinc-500">No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}

```
### src/components/SettingsPanel.tsx

```typescript
"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import {
  loadUiPreferences,
  saveUiPreferences,
  tryEnableDesktopNotifications,
  type UiPreferences,
} from "@/lib/ui-preferences";
import {
  addTimeCapsule,
  listTimeCapsules,
  removeTimeCapsule,
  type TimeCapsule,
} from "@/lib/time-capsule";

export function SettingsPanel({
  open,
  onClose,
  onPreferencesSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after user saves so parent can re-apply theme/font. */
  onPreferencesSaved: (p: UiPreferences) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(open, ref, onClose);

  const [prefs, setPrefs] = useState<UiPreferences>(loadUiPreferences);
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [capMessage, setCapMessage] = useState("");
  const [capDate, setCapDate] = useState("");

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      setPrefs(loadUiPreferences());
      setCapsules(listTimeCapsules());
    });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-auto bg-black/60 p-4 pt-16 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="babygpt-settings-title"
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="babygpt-settings-title" className="text-sm font-semibold text-zinc-100">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            Close
          </button>
        </div>

        <div className="max-h-[min(80vh,720px)] space-y-6 overflow-y-auto px-4 py-4">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Appearance</h3>
            <label className="mt-2 block text-xs text-zinc-400">
              Font size ({Math.round(prefs.fontScale * 100)}%)
              <input
                type="range"
                min={85}
                max={135}
                step={5}
                value={Math.round(prefs.fontScale * 100)}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, fontScale: Number(e.target.value) / 100 }))
                }
                className="mt-2 w-full accent-cyan-500"
              />
            </label>
            <label className="mt-3 block text-xs text-zinc-400">
              Color shell
              <select
                value={prefs.appearance}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    appearance: e.target.value as UiPreferences["appearance"],
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="dark">Dark (default)</option>
                <option value="oled">OLED black</option>
                <option value="light">Light</option>
              </select>
            </label>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Notifications</h3>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={prefs.notificationsEnabled}
                onChange={(e) => setPrefs((p) => ({ ...p, notificationsEnabled: e.target.checked }))}
                className="rounded border-zinc-600"
              />
              Desktop notifications for reminders & suggestions (browser permission)
            </label>
            {prefs.notificationsEnabled ? (
              <button
                type="button"
                className="mt-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-700"
                onClick={async () => {
                  const perm = await tryEnableDesktopNotifications();
                  if (perm !== "granted") {
                    alert(
                      perm === "denied"
                        ? "Notifications blocked in browser settings."
                        : "Permission was not granted.",
                    );
                  }
                }}
              >
                Request browser permission now
              </button>
            ) : null}
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Time capsule</h3>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              Save a note to your future self. When the time passes, BabyGPT shows it in a popup (stored in this
              browser only).
            </p>
            <textarea
              value={capMessage}
              onChange={(e) => setCapMessage(e.target.value)}
              placeholder="Message to future you…"
              rows={3}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600"
            />
            <label className="mt-2 block text-xs text-zinc-400">
              Reveal at (local time)
              <input
                type="datetime-local"
                value={capDate}
                onChange={(e) => setCapDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <button
              type="button"
              disabled={!capMessage.trim() || !capDate}
              onClick={() => {
                const revealAt = new Date(capDate).getTime();
                if (!Number.isFinite(revealAt) || revealAt <= Date.now()) {
                  alert("Pick a future date and time.");
                  return;
                }
                addTimeCapsule({
                  id: uuidv4(),
                  message: capMessage.trim(),
                  revealAt,
                  createdAt: Date.now(),
                });
                setCapMessage("");
                setCapDate("");
                setCapsules(listTimeCapsules());
              }}
              className="mt-2 rounded-lg bg-cyan-900/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 ring-1 ring-cyan-800/80 hover:bg-cyan-900/55 disabled:opacity-40"
            >
              Save capsule
            </button>
            {capsules.length > 0 ? (
              <ul className="mt-3 space-y-2 text-[11px] text-zinc-400">
                {capsules.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2 py-2"
                  >
                    <span className="min-w-0 break-words">
                      {new Date(c.revealAt).toLocaleString()}: {c.message.slice(0, 120)}
                      {c.message.length > 120 ? "…" : ""}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-red-400 hover:underline"
                      onClick={() => {
                        removeTimeCapsule(c.id);
                        setCapsules(listTimeCapsules());
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                saveUiPreferences(prefs);
                onPreferencesSaved(prefs);
                onClose();
              }}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

```
### src/components/Sidebar.tsx

```typescript
"use client";

import { useEffect, useState } from "react";
import type { AgentMemory } from "@/lib/agent-memory";
import { loadMemory, saveMemory } from "@/lib/agent-memory";
import type { Conversation } from "@/lib/types";
import type { UiPreferences } from "@/lib/ui-preferences";

type Tab = "chats" | "memory";

export function Sidebar({
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
  appearance = "dark",
}: {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  appearance?: UiPreferences["appearance"];
}) {
  const [tab, setTab] = useState<Tab>("chats");
  const [memory, setMemory] = useState<AgentMemory | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate memory editor from localStorage */
    setMemory(loadMemory());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!memory) return;
    saveMemory(memory);
  }, [memory]);

  const shell =
    appearance === "light"
      ? "border-zinc-200 bg-white/95"
      : appearance === "oled"
        ? "border-zinc-800 bg-black/50"
        : "border-zinc-900 bg-zinc-950/40";
  const hairline =
    appearance === "light" ? "border-zinc-200" : appearance === "oled" ? "border-zinc-800" : "border-zinc-900";
  const tabActive =
    appearance === "light"
      ? "bg-zinc-200 text-zinc-900 ring-1 ring-zinc-300"
      : "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800";
  const tabIdle = appearance === "light" ? "text-zinc-500" : "text-zinc-500";
  const rowHover = appearance === "light" ? "hover:bg-zinc-100" : "hover:bg-zinc-900/60";
  const rowActive =
    appearance === "light"
      ? "bg-zinc-200 text-zinc-900 ring-1 ring-zinc-300"
      : "bg-zinc-900 text-zinc-100 ring-1 ring-zinc-800";
  const rowText = appearance === "light" ? "text-zinc-800" : "text-zinc-300";

  return (
    <aside className={`flex h-full w-[300px] shrink-0 flex-col border-r ${shell}`}>
      <div className={`flex border-b ${hairline} p-2`}>
        <button
          type="button"
          className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold ${tab === "chats" ? tabActive : tabIdle}`}
          onClick={() => setTab("chats")}
        >
          Chats
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold ${tab === "memory" ? tabActive : tabIdle}`}
          onClick={() => setTab("memory")}
        >
          Memory
        </button>
      </div>

      {tab === "chats" ? (
        <>
          <div className={`border-b ${hairline} p-3`}>
            <button
              type="button"
              onClick={onNew}
              className="w-full rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
            >
              New chat
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {conversations.map((c) => (
              <div key={c.id} className="group mb-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-left text-sm ${
                    c.id === activeId ? rowActive : `${rowText} ${rowHover}`
                  }`}
                >
                  {c.title || "Untitled"}
                </button>
                <button
                  type="button"
                  title="Delete"
                  className={`hidden rounded-lg px-2 py-1 text-xs group-hover:inline ${
                    appearance === "light"
                      ? "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                  onClick={() => onDelete(c.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto p-3 text-sm">
          {!memory ? (
            <div className="text-xs text-zinc-500">Loading…</div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Persistent memory (local). Injected into system prompts alongside DNA-style routing.
              </p>
              <label className="block text-xs text-zinc-400">
                Preferences (one per line)
                <textarea
                  className="mt-1 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
                  rows={3}
                  value={memory.preferences.join("\n")}
                  onChange={(e) =>
                    setMemory({
                      ...memory,
                      preferences: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Style notes
                <textarea
                  className="mt-1 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
                  rows={3}
                  value={memory.styleNotes.join("\n")}
                  onChange={(e) =>
                    setMemory({
                      ...memory,
                      styleNotes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
              <label className="block text-xs text-zinc-400">
                Ongoing tasks
                <textarea
                  className="mt-1 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
                  rows={3}
                  value={memory.ongoingTasks.join("\n")}
                  onChange={(e) =>
                    setMemory({
                      ...memory,
                      ongoingTasks: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>
      )}

      <div
        className={`border-t ${hairline} p-3 text-[11px] ${appearance === "light" ? "text-zinc-600" : "text-zinc-600"}`}
      >
        History uses <span className={appearance === "light" ? "text-zinc-500" : "text-zinc-400"}>babygpt_</span> keys
      </div>
    </aside>
  );
}

```
### src/components/SkillsPanel.tsx

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { Skill } from "@/lib/skill-model";
import { createSkill, deleteSkill, loadAllSkills, saveCustomSkills } from "@/lib/skills";

export function SkillsPanel({
  open,
  onClose,
  onActivateSkill,
}: {
  open: boolean;
  onClose: () => void;
  /** Makes the skill the active system prompt modifier for the next sends. */
  onActivateSkill: (skill: Skill) => void;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- refresh list when panel opens */
    setSkills(loadAllSkills());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("Custom");

  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, panelRef, onClose);

  function persist(next: Skill[]) {
    setSkills(next);
    const custom = next.filter((s) => !s.builtIn);
    saveCustomSkills(custom);
  }

  function onCreate() {
    const s = createSkill({
      name: name.trim() || "Untitled skill",
      description: description.trim() || "Custom skill",
      prompt: prompt.trim() || "Help the user.",
      category: category.trim() || "Custom",
    });
    persist([...skills, s]);
    setName("");
    setDescription("");
    setPrompt("");
  }

  function onDelete(id: string) {
    deleteSkill(id);
    setSkills(loadAllSkills());
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="h-[min(90vh,820px)] w-full max-w-4xl overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="babygpt-skills-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur">
          <div id="babygpt-skills-title" className="text-sm font-semibold text-zinc-100">
            Skills
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[2fr,1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {skills.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-zinc-100">{s.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">{s.category}</div>
                  </div>
                  {!s.builtIn ? (
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => onDelete(s.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 text-xs text-zinc-400">{s.description}</div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-zinc-900 py-1.5 text-[11px] font-semibold text-cyan-300 ring-1 ring-zinc-800 hover:bg-zinc-800"
                  onClick={() => {
                    onActivateSkill(s);
                    onClose();
                  }}
                >
                  Set active skill
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs font-semibold text-zinc-200">Create skill</div>
            <input
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Description (used for auto-suggest)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <textarea
              className="mt-2 w-full resize-none rounded-xl bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
              rows={6}
              placeholder="Prompt instructions injected into system context"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-zinc-100 py-2 text-xs font-semibold text-zinc-950"
              onClick={onCreate}
            >
              Save skill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

```
### src/components/SmartActions.tsx

````typescript
"use client";

import { useMemo } from "react";

export type SmartAction = { id: string; label: string; prompt: string };

function pickActions(assistantText: string, lastUserText: string): SmartAction[] {
  const a = assistantText.trim();
  const u = lastUserText.toLowerCase();
  const al = a.toLowerCase();
  const out: SmartAction[] = [];

  const push = (id: string, label: string, prompt: string) => {
    if (!out.some((x) => x.id === id)) out.push({ id, label, prompt });
  };

  push("deeper", "Go deeper", "Go deeper with concrete examples, edge cases, and one counterargument.");
  push("simplify", "Simplify", "Explain the same core idea in simpler language with a short analogy.");
  push("angle", "Another angle", "Approach the topic from a different angle (assumptions, audience, or format).");

  const looksCode =
    a.includes("```") || /\b(function|class|def|const|let|import|export)\b/.test(al);
  if (looksCode) {
    push("bugs", "Find issues", "Review the code above for bugs or footguns; suggest minimal patches.");
    push("tests", "Add tests", "Propose focused unit tests (cases + assertions) for the code above.");
    push("optimize", "Optimize", "Suggest performance or readability optimizations without changing behavior.");
  }

  if (/\b(explain|why|how)\b/.test(u) || /\bconcept|understand\b/.test(u)) {
    push("quiz", "Quiz me", "Give me 3 quick questions to check my understanding, then answers.");
  }

  if (a.length > 400) {
    push("summary", "TL;DR", "Give a tight bullet TL;DR of your last reply (max 5 bullets).");
  }

  return out.slice(0, 6);
}

export function SmartActions({
  assistantText,
  lastUserText,
  onAction,
  disabled,
}: {
  assistantText: string;
  lastUserText: string;
  onAction: (prompt: string) => void;
  disabled?: boolean;
}) {
  const actions = useMemo(() => pickActions(assistantText, lastUserText), [assistantText, lastUserText]);

  if (!assistantText.trim() || actions.length === 0) return null;

  return (
    <div className="border-t border-zinc-800/80 bg-zinc-950/30 px-4 py-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Smart actions
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              disabled={disabled}
              onClick={() => onAction(act.prompt)}
              className="rounded-full bg-zinc-900/90 px-3 py-1.5 text-[11px] font-medium text-zinc-200 ring-1 ring-zinc-700/80 transition hover:bg-zinc-800 hover:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

````
### src/components/SubscriptionModal.tsx

```typescript
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { UsageHint } from "@/lib/billing-usage-hints";
import { FIRST_VISIT_CREDIT_BONUS, PLANS, type PlanId } from "@/lib/plans";
import { formatPlanMoneyHeadline, planPriceConfigured } from "@/lib/plan-pricing-display";
import { BILLING_FAQ, BILLING_SUGGESTED_QUESTIONS } from "@/lib/billing-faq";

export type StripeBillingInfo = {
  configured: boolean;
  customerId: string | null;
  subscriptionStatus: string | null;
};

export function SubscriptionModal({
  open,
  currentPlanId,
  balance,
  onClose,
  onSelectPlan,
  serverCredits = false,
  stripeBilling = null,
  onCheckout,
  onManageBilling,
  usageHints = [],
}: {
  open: boolean;
  currentPlanId: PlanId;
  balance: number;
  onClose: () => void;
  onSelectPlan: (id: PlanId) => void | Promise<void>;
  /** Server wallet from /api/credits (gate on). */
  serverCredits?: boolean;
  /** Present when credits API returned stripe payload. */
  stripeBilling?: StripeBillingInfo | null;
  onCheckout?: (id: Exclude<PlanId, "free">) => void | Promise<void>;
  onManageBilling?: () => void | Promise<void>;
  /** Heuristic hints from GET /api/credits (low credits, payment retry, etc.). */
  usageHints?: UsageHint[];
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copilotQ, setCopilotQ] = useState("");
  const [copilotA, setCopilotA] = useState<string | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [supportQ, setSupportQ] = useState("");
  const [supportA, setSupportA] = useState<string | null>(null);
  const [supportBusy, setSupportBusy] = useState(false);
  const [trText, setTrText] = useState("");
  const [trLocale, setTrLocale] = useState("Japanese");
  const [trOut, setTrOut] = useState<string | null>(null);
  const [trBusy, setTrBusy] = useState(false);
  const [faqPick, setFaqPick] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCopilotA(null);
    setSupportA(null);
    setTrOut(null);
    setFaqPick(null);
  }, [open]);

  useDialogA11y(open, dialogRef, onClose);

  if (!open) return null;

  const stripeMode = Boolean(serverCredits && stripeBilling?.configured);
  const missingPublicPrices = stripeMode && (["starter", "pro", "team"] as const).some((id) => !planPriceConfigured(id));

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/60 p-4 pt-12 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="babygpt-plans-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-900 px-5 py-4">
          <div>
            <div id="babygpt-plans-title" className="text-sm font-semibold text-zinc-100">
              Plans & credits
            </div>
            <p className="mt-1 max-w-xl text-xs text-zinc-500">
              {stripeMode ? (
                <>
                  Paid tiers use <span className="text-zinc-300">Stripe Checkout</span> — you&apos;ll confirm tax,
                  currency, and the final total on Stripe&apos;s page. The table below is your public list price (set{" "}
                  <span className="font-mono text-zinc-400">NEXT_PUBLIC_PLAN_PRICE_*_USD</span>) plus monthly credits
                  included in-app.
                </>
              ) : (
                <>
                  Credits estimate cost per reply (models, thinking, agent, and dual-model modes). Your plan unlocks
                  which models and features you can use. Without a gated deploy, plan and balance stay in this browser
                  for development.
                </>
              )}
            </p>
            {missingPublicPrices && stripeMode ? (
              <p className="mt-2 text-[11px] text-amber-400/90">
                Set <span className="font-mono">NEXT_PUBLIC_PLAN_PRICE_STARTER_USD</span>,{" "}
                <span className="font-mono">PRO</span>, and <span className="font-mono">TEAM</span> so list prices show
                here (Checkout still shows Stripe&apos;s authoritative amount).
              </p>
            ) : null}
            {serverCredits && !stripeBilling?.configured ? (
              <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-100/95">
                <span className="font-semibold text-amber-50">No Subscribe / Pay button?</span> Paid checkout only
                appears after the server has <span className="font-mono text-amber-200/90">STRIPE_SECRET_KEY</span> set
                (Vercel → Environment Variables → Production). Until then, the modal shows{" "}
                <span className="italic">Use this plan</span> and the server accepts plan changes without payment (dev /
                staging). Add Stripe keys + <span className="font-mono">STRIPE_PRICE_*</span> price IDs, redeploy, then
                use <span className="italic">Subscribe with Stripe</span>.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stripeMode && stripeBilling?.customerId && onManageBilling ? (
              <button
                type="button"
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white"
                onClick={() => void onManageBilling()}
              >
                Manage billing
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-900 hover:text-zinc-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {stripeMode ? (
          <div className="border-b border-zinc-900 bg-zinc-950/90 px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Price breakdown (USD)</div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-[11px] text-zinc-400">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="py-1.5 pr-2 font-medium">Plan</th>
                    <th className="py-1.5 pr-2 font-medium">List price</th>
                    <th className="py-1.5 font-medium">Credits / month</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(PLANS) as PlanId[]).map((id) => {
                    const p = PLANS[id];
                    return (
                      <tr key={id} className="border-b border-zinc-800/80 last:border-0">
                        <td className="py-2 pr-2 text-zinc-200">{p.label}</td>
                        <td className="py-2 pr-2 font-mono text-emerald-300/95">{formatPlanMoneyHeadline(id)}</td>
                        <td className="py-2 font-mono text-zinc-300">{p.monthlyCredits.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-zinc-600">
              Subscription charges are processed by Stripe. Per-message credits are drawn from your wallet after each
              successful reply (see composer preview).
            </p>
            <p className="mt-2 text-[10px] text-zinc-500">
              Reference only (US consumer, changes often): ChatGPT Plus is commonly around $20/mo from OpenAI — not a
              feature comparison. Your list prices come from{" "}
              <span className="font-mono text-zinc-400">NEXT_PUBLIC_PLAN_PRICE_*_USD</span>.
            </p>
          </div>
        ) : null}

        <div className="border-b border-zinc-900 bg-zinc-950/80 px-5 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span>
              Balance: <span className="font-mono text-cyan-300">{balance.toLocaleString()}</span> credits
            </span>
            <span>
              Active plan: <span className="text-zinc-200">{PLANS[currentPlanId].label}</span>
            </span>
            {stripeMode && stripeBilling?.subscriptionStatus ? (
              <span>
                Stripe:{" "}
                <span className="font-mono text-zinc-300">{stripeBilling.subscriptionStatus}</span>
              </span>
            ) : null}
            {!serverCredits ? (
              <span className="text-zinc-600">
                One-time welcome: +{FIRST_VISIT_CREDIT_BONUS} credits on first local setup (per browser)
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const p = PLANS[id];
            const active = id === currentPlanId;
            const paid = id !== "free";

            let primary: ReactNode;
            if (!stripeMode) {
              primary = (
                <button
                  type="button"
                  disabled={active}
                  onClick={() => onSelectPlan(id)}
                  className={`mt-4 w-full rounded-xl py-2 text-xs font-semibold ${
                    active
                      ? "cursor-default bg-zinc-800 text-zinc-500"
                      : "bg-zinc-100 text-zinc-950 hover:bg-white"
                  }`}
                >
                  {active ? "Current" : "Use this plan"}
                </button>
              );
            } else if (paid) {
              primary = (
                <button
                  type="button"
                  disabled={active || !onCheckout}
                  onClick={() => {
                    if (active || !onCheckout) return;
                    void onCheckout(id);
                  }}
                  className={`mt-4 w-full rounded-xl py-2 text-xs font-semibold ${
                    active
                      ? "cursor-default bg-zinc-800 text-zinc-500"
                      : "bg-zinc-100 text-zinc-950 hover:bg-white"
                  }`}
                >
                  {active ? "Current" : "Subscribe with Stripe"}
                </button>
              );
            } else {
              primary =
                active ? (
                  <button
                    type="button"
                    disabled
                    className="mt-4 w-full cursor-default rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-500"
                  >
                    Current
                  </button>
                ) : (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] leading-snug text-zinc-500">
                      To use Free, cancel any paid subscription in the billing portal (Stripe syncs your plan).
                    </p>
                    {stripeBilling?.customerId && onManageBilling ? (
                      <button
                        type="button"
                        onClick={() => void onManageBilling()}
                        className="w-full rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700"
                      >
                        Open billing portal
                      </button>
                    ) : (
                      <p className="text-[10px] text-zinc-600">
                        No active Stripe subscription on this account — pick a paid tier above to subscribe.
                      </p>
                    )}
                  </div>
                );
            }

            return (
              <div
                key={id}
                className={`flex flex-col rounded-2xl border p-4 ${
                  active ? "border-cyan-500/40 bg-cyan-500/5 ring-1 ring-cyan-500/20" : "border-zinc-800 bg-zinc-950/40"
                }`}
              >
                <div className="text-sm font-semibold text-zinc-100">{p.label}</div>
                <div className="mt-1 text-[11px] text-zinc-500">{p.subtitle}</div>
                <div className="mt-2 text-base font-semibold text-emerald-300/95">{formatPlanMoneyHeadline(id)}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  <span className="font-mono text-zinc-200">{p.monthlyCredits.toLocaleString()}</span> credits / month
                </div>
                <ul className="mt-3 flex-1 space-y-1.5 text-[11px] text-zinc-500">
                  <li>
                    Models: <span className="text-zinc-300">{p.allowedModels.join(", ")}</span>
                  </li>
                  <li>
                    Agent: {p.features.agent ? <span className="text-emerald-400">yes</span> : <span className="text-zinc-600">no</span>}
                    {" · "}
                    Schrödinger:{" "}
                    {p.features.schrodinger ? <span className="text-emerald-400">yes</span> : <span className="text-zinc-600">no</span>}
                  </li>
                  <li>
                    Quantum: K {p.features.kolmogorov ? "✓" : "—"} · H {p.features.holographic ? "✓" : "—"} · DNA{" "}
                    {p.features.dna ? "✓" : "—"}
                  </li>
                </ul>
                {primary}
              </div>
            );
          })}
        </div>

        <div className="border-t border-zinc-900 bg-zinc-950/90 px-5 py-4">
          <div className="text-xs font-semibold text-zinc-200">Billing & subscription help</div>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Topics below are about payments, credits, and your plan — not life-coach onboarding (that lives on the home
            screen when you have no messages). For AI-paraphrased help, use Search FAQ. For Stripe-specific account
            details when signed in, use Ask copilot.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BILLING_FAQ.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setFaqPick((p) => (p === e.id ? null : e.id))}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition-colors ${
                  faqPick === e.id
                    ? "bg-cyan-900/40 text-cyan-100 ring-cyan-700"
                    : "bg-zinc-900 text-zinc-300 ring-zinc-800 hover:bg-zinc-800"
                }`}
              >
                {e.title}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Suggested questions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BILLING_SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setSupportQ(q);
                  setFaqPick(null);
                }}
                className="rounded-lg bg-zinc-900/80 px-2.5 py-1.5 text-left text-[10px] leading-snug text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
              >
                {q}
              </button>
            ))}
          </div>
          {faqPick ? (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-[11px] leading-relaxed text-zinc-300">
              <div className="font-semibold text-zinc-100">{BILLING_FAQ.find((x) => x.id === faqPick)?.title}</div>
              <p className="mt-2">{BILLING_FAQ.find((x) => x.id === faqPick)?.body}</p>
            </div>
          ) : null}
        </div>

        {serverCredits ? (
          <div className="border-t border-zinc-900 bg-zinc-950/90 px-5 py-4">
            <div className="text-xs font-semibold text-zinc-200">Account billing assistant</div>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              Copilot reads Stripe data for this login. Not legal or tax advice.
            </p>
            {usageHints.length > 0 ? (
              <ul className="mt-3 list-inside list-disc space-y-1 text-[11px] text-zinc-400">
                {usageHints.map((h) => (
                  <li key={`${h.kind}-${h.message.slice(0, 40)}`}>{h.message}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Your subscription (Stripe-backed)
              </label>
              <textarea
                value={copilotQ}
                onChange={(e) => setCopilotQ(e.target.value)}
                placeholder="e.g. When does my current period renew?"
                rows={2}
                className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
              />
              <button
                type="button"
                disabled={copilotBusy || !copilotQ.trim()}
                onClick={async () => {
                  setCopilotBusy(true);
                  setCopilotA(null);
                  try {
                    const res = await fetch("/api/billing/copilot", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ question: copilotQ.trim() }),
                    });
                    const data = (await res.json()) as { answer?: string; error?: string };
                    if (!res.ok) {
                      setCopilotA(data.error ?? "Could not reach billing assistant.");
                      return;
                    }
                    setCopilotA(data.answer ?? "");
                  } catch {
                    setCopilotA("Network error.");
                  } finally {
                    setCopilotBusy(false);
                  }
                }}
                className="rounded-lg bg-cyan-900/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 ring-1 ring-cyan-800/80 hover:bg-cyan-900/55 disabled:opacity-40"
              >
                {copilotBusy ? "Thinking…" : "Ask copilot"}
              </button>
              {copilotA ? (
                <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-300">
                  {copilotA}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="border-t border-zinc-900 bg-zinc-950/90 px-5 py-4">
          <div className="text-xs font-semibold text-zinc-200">AI billing FAQ search</div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Paraphrases matched help articles. Works without login when the app has no password gate.
          </p>
          <div className="mt-4 space-y-2">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Search billing FAQ
            </label>
            <textarea
              value={supportQ}
              onChange={(e) => setSupportQ(e.target.value)}
              placeholder="e.g. How do I cancel?"
              rows={2}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
            />
            <button
              type="button"
              disabled={supportBusy || !supportQ.trim()}
              onClick={async () => {
                setSupportBusy(true);
                setSupportA(null);
                try {
                  const res = await fetch("/api/billing/support", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: supportQ.trim() }),
                  });
                  const data = (await res.json()) as { answer?: string; error?: string };
                  if (!res.ok) {
                    setSupportA(data.error ?? "FAQ search failed.");
                    return;
                  }
                  setSupportA(data.answer ?? "");
                } catch {
                  setSupportA("Network error.");
                } finally {
                  setSupportBusy(false);
                }
              }}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700 disabled:opacity-40"
            >
              {supportBusy ? "Searching…" : "Search FAQ"}
            </button>
            {supportA ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-300">
                {supportA}
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-2 border-t border-zinc-900 pt-4">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Translate UI text (localization)
            </label>
            <input
              type="text"
              value={trLocale}
              onChange={(e) => setTrLocale(e.target.value)}
              placeholder="Target language or locale"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
            />
            <textarea
              value={trText}
              onChange={(e) => setTrText(e.target.value)}
              placeholder="English string to translate"
              rows={2}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
            />
            <button
              type="button"
              disabled={trBusy || !trText.trim()}
              onClick={async () => {
                setTrBusy(true);
                setTrOut(null);
                try {
                  const res = await fetch("/api/billing/translate", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: trText.trim(), targetLocale: trLocale.trim() || "Spanish" }),
                  });
                  const data = (await res.json()) as { translation?: string; error?: string };
                  if (!res.ok) {
                    setTrOut(data.error ?? "Translation failed.");
                    return;
                  }
                  setTrOut(data.translation ?? "");
                } catch {
                  setTrOut("Network error.");
                } finally {
                  setTrBusy(false);
                }
              }}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700 disabled:opacity-40"
            >
              {trBusy ? "Translating…" : "Translate"}
            </button>
            {trOut ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-300">
                {trOut}
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-zinc-900 px-5 py-3 text-[11px] text-zinc-600">
          Higher tiers unlock larger models and heavier modes; each send still spends credits from your balance so usage
          stays predictable.
        </div>
      </div>
    </div>
  );
}

```
### src/components/ThinkingCanvas.tsx

```typescript
"use client";

import { useMemo } from "react";

const SEGMENT_COLORS = [
  "border-cyan-500/40 bg-cyan-500/10 text-cyan-100/95",
  "border-violet-500/40 bg-violet-500/10 text-violet-100/95",
  "border-amber-500/40 bg-amber-500/10 text-amber-100/95",
  "border-emerald-500/40 bg-emerald-500/10 text-emerald-100/95",
];

function segmentThinking(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const byPara = t.split(/\n{2,}/).filter(Boolean);
  if (byPara.length > 1) return byPara.slice(-12);
  const words = t.split(/\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).length > 140 && cur) {
      chunks.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks.slice(-10);
}

export function ThinkingCanvas({
  text,
  active,
}: {
  /** Streaming or final reasoning text */
  text: string;
  /** Pulse / animate when model is still streaming */
  active: boolean;
}) {
  const segments = useMemo(() => segmentThinking(text), [text]);

  if (!text.trim()) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/70 ring-1 ring-white/5">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              active ? "animate-pulse bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" : "bg-zinc-600"
            }`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Thinking canvas
          </span>
        </div>
        {active ? (
          <span className="font-mono text-[10px] text-cyan-400/90">streaming…</span>
        ) : (
          <span className="text-[10px] text-zinc-600">complete</span>
        )}
      </div>
      <div className="relative max-h-[min(220px,28vh)] overflow-y-auto px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {segments.map((seg, i) => (
            <span
              key={`${i}-${seg.slice(0, 12)}`}
              className={`inline-block max-w-full rounded-lg border px-2 py-1 text-[11px] leading-snug ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
            >
              {seg}
            </span>
          ))}
        </div>
        {active ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent" />
        ) : null}
      </div>
    </div>
  );
}

```
### src/components/TimeCapsuleReveal.tsx

```typescript
"use client";

import { useRef } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { TimeCapsule } from "@/lib/time-capsule";

export function TimeCapsuleReveal({
  capsule,
  onDismiss,
}: {
  capsule: TimeCapsule;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(true, ref, onDismiss);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capsule-title"
        className="w-full max-w-md rounded-2xl border border-cyan-800/50 bg-zinc-950 p-6 shadow-2xl ring-1 ring-cyan-500/20"
      >
        <h2 id="capsule-title" className="text-lg font-semibold text-cyan-100">
          Message from your past self
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{capsule.message}</p>
        <p className="mt-4 text-[11px] text-zinc-500">
          Scheduled for {new Date(capsule.revealAt).toLocaleString()}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

```
### src/components/WelcomeScreen.tsx

```typescript
"use client";

import Image from "next/image";
import { QUANTUM_FEATURES } from "@/lib/types";
import type { PlanDefinition } from "@/lib/plans";
import type { PowerTemplate } from "@/lib/instant-templates";
import {
  COMPANION_WELCOME_LEAD,
  CORE_CONTROLS_SUMMARY,
  INTRO_SEVEN_QUESTIONS,
  JOURNEY_SEVEN_QUESTIONS,
  MESSAGE_MODE_PREFIXES,
} from "@/lib/companion-onboarding";
import { BlochSphere } from "./BlochSphere";
import { ConversationTopology } from "./ConversationTopology";
import { InstantTemplates } from "./InstantTemplates";

export function WelcomeScreen({
  onOpenPlans,
  onOpenSearch,
  onJumpToQuantum,
  plan,
  onPickTemplate,
  onInsertComposerText,
}: {
  onOpenPlans: () => void;
  onOpenSearch: () => void;
  /** Scrolls the header Quantum controls into view — connects illustrations to real toggles. */
  onJumpToQuantum: () => void;
  plan: PlanDefinition;
  onPickTemplate: (t: PowerTemplate) => void;
  /** Prefill composer: full questions replace draft; mode prefixes go first. */
  onInsertComposerText: (text: string, how?: "replace" | "prefixFirst") => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/babygpt-logo.png"
          alt="BabyGPT"
          width={88}
          height={88}
          priority
          style={{ width: "auto", height: "auto" }}
          className="drop-shadow-[0_0_24px_rgba(34,211,238,0.25)]"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">BabyGPT</h1>
          <p className="mt-2 text-sm text-zinc-400">
            A dark, ChatGPT-style UI with quantum-inspired controls — powered by{" "}
            <span className="text-zinc-300">z-ai-web-dev-sdk</span> on the server.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={onOpenPlans}
              className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-white"
            >
              Plans & credits
            </button>
            <button
              type="button"
              onClick={onOpenSearch}
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800"
            >
              Search chats (⌘/Ctrl+K)
            </button>
          </div>
        </div>
      </div>

      <section className="w-full rounded-2xl border border-cyan-900/40 bg-gradient-to-b from-cyan-950/20 to-zinc-950/40 p-4 ring-1 ring-cyan-900/30">
        <h2 className="text-sm font-semibold text-cyan-100/95">Companion — start here</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{COMPANION_WELCOME_LEAD}</p>

        <div className="mt-4 space-y-3">
          <details open className="group rounded-xl border border-zinc-800 bg-zinc-950/60">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-cyan-500/90">▼</span>7 questions to connect & understand you
            </summary>
            <ol className="list-decimal space-y-2 px-3 pb-3 pl-8 text-[11px] leading-relaxed text-zinc-400">
              {INTRO_SEVEN_QUESTIONS.map((q, i) => (
                <li key={i} className="pl-1">
                  <span>{q}</span>
                  <button
                    type="button"
                    onClick={() => onInsertComposerText(`${q} `, "replace")}
                    className="ml-2 shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300/90 ring-1 ring-zinc-700 hover:bg-zinc-700"
                  >
                    Use in chat
                  </button>
                </li>
              ))}
            </ol>
          </details>

          <details className="group rounded-xl border border-zinc-800 bg-zinc-950/60">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-zinc-500">▶</span>7 journey questions (vision & direction)
            </summary>
            <ol className="list-decimal space-y-2 px-3 pb-3 pl-8 text-[11px] leading-relaxed text-zinc-400">
              {JOURNEY_SEVEN_QUESTIONS.map((q, i) => (
                <li key={i} className="pl-1">
                  <span>{q}</span>
                  <button
                    type="button"
                    onClick={() => onInsertComposerText(`${q} `, "replace")}
                    className="ml-2 shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300/90 ring-1 ring-zinc-700 hover:bg-zinc-700"
                  >
                    Use in chat
                  </button>
                </li>
              ))}
            </ol>
          </details>
        </div>

        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Message modes</div>
          <p className="mt-1 text-[10px] text-zinc-600">Tap to insert at the start of your next message.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MESSAGE_MODE_PREFIXES.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.hint}
                onClick={() => onInsertComposerText(`${m.prefix} `, "prefixFirst")}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-200 ring-1 ring-zinc-800 hover:bg-zinc-800 hover:ring-cyan-800/50"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[10px] leading-snug text-zinc-600">{CORE_CONTROLS_SUMMARY}</p>
      </section>

      <InstantTemplates plan={plan} onPick={onPickTemplate} />

      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-center">
        <p className="text-xs text-zinc-400">
          The Bloch sphere and topology graphic are <span className="text-zinc-300">illustrations</span>. Use the
          header bar to turn on Kolmogorov routing, holographic context, DNA, and more.
        </p>
        <button
          type="button"
          onClick={onJumpToQuantum}
          className="mt-3 rounded-full bg-cyan-950/50 px-4 py-2 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-900/60 hover:bg-cyan-900/40"
        >
          Jump to live Quantum controls
        </button>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="mb-3 text-sm font-medium text-zinc-200">Quantum feature showcase</div>
          <ul className="space-y-2 text-sm text-zinc-400">
            {QUANTUM_FEATURES.map((f) => (
              <li key={f.id} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                <span>
                  <span className="text-zinc-200">{f.name}</span>
                  <span className="text-zinc-500"> — {f.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div>
              <div className="text-sm font-medium text-zinc-200">Bloch sphere</div>
              <div className="mt-1 text-xs text-zinc-500">Decorative metaphor (not a live qubit state).</div>
            </div>
            <BlochSphere />
          </div>
          <div>
            <ConversationTopology />
            <p className="mt-2 text-[10px] text-zinc-600">Sample graph — not your chat history.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

```
### src/hooks/useDialogA11y.ts

```typescript
"use client";

import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Focus trap, Escape to close, restore focus when the dialog unmounts or closes.
 */
export function useDialogA11y(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const root = containerRef.current;
    if (!root) return;

    const focusables = listFocusables(root);
    const first = focusables[0];
    queueMicrotask(() => first?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const list = listFocusables(root);
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus.current?.focus?.();
      prevFocus.current = null;
    };
  }, [open, onClose, containerRef]);
}

```
### src/instrumentation.ts

```typescript
/**
 * Next.js instrumentation hook (runs once when the Node server starts).
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  // BabyGPT: add server bootstrap here if needed (metrics, tracing, etc.).
}

```
### src/lib/adiabatic-prompt.ts

```typescript
export function adiabaticSystemPrompt(base: string, morph: number): string {
  const t = Math.max(0, Math.min(1, morph));
  const steer = t < 0.33 ? "explore" : t < 0.66 ? "balance" : "commit";
  return `${base}\nMode: ${steer} (${(t * 100).toFixed(0)}%).`;
}

```
### src/lib/agent-loop.ts

```typescript
import { randomUUID } from "crypto";
import type { ErrorCorrectionLogEntry, ModelTier, ToolCall } from "./types";
import { getToolByName, toolsPromptBlock } from "./tools";
import type { ToolContext } from "./tools/types";
import { executeToolWithRetry, tryRepairJson } from "./quantum-error-correction";
import type ZAI from "z-ai-web-dev-sdk";
import { mapTierToOpenAIModel, openaiChatCompletionJson } from "./openai-api";
import { routeWithKolmogorovDetailed } from "./kolmogorov-router";

type Zai = InstanceType<typeof ZAI>;

type AgentJson = {
  thought?: string;
  finish?: boolean;
  finalAnswer?: string;
  toolCalls?: { name?: string; arguments?: Record<string, unknown> }[];
};

const MAX_STEPS = 5;

function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const o = data as { choices?: Array<{ message?: { content?: string } }> };
  return o.choices?.[0]?.message?.content ?? "";
}

function parseAgentJson(raw: string): AgentJson | null {
  const repaired = tryRepairJson(raw);
  const text = repaired ?? raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as AgentJson;
  } catch {
    return null;
  }
}

function synthesizeFinalFromThought(parsed: AgentJson): string {
  const t = parsed.thought?.trim();
  if (t) return t;
  return "I could not produce a structured agent plan. Please rephrase your request.";
}

export async function runReactAgentLoop(opts: {
  /** Z.AI SDK instance (GLM). Omit when using OpenAI-only path. */
  zai?: Zai;
  /** When set, planner steps use OpenAI Chat Completions (JSON steps). */
  openaiApiKey?: string;
  /** User/assistant messages only (no leading system — added here) */
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  preferredModel: ModelTier;
  kolmogorov: boolean;
  thinking: boolean;
  extraSystem?: string;
}): Promise<{
  toolCalls: ToolCall[];
  errorCorrectionLog: ErrorCorrectionLogEntry[];
  finalText: string;
  routingReason: string;
  plannerModel: ModelTier;
}> {
  if (!opts.zai && !opts.openaiApiKey) {
    throw new Error("runReactAgentLoop: provide zai or openaiApiKey");
  }

  const errorCorrectionLog: ErrorCorrectionLogEntry[] = [];
  const pushLog = (e: ErrorCorrectionLogEntry) => errorCorrectionLog.push(e);

  const uiMessages = opts.messages.filter((m) => m.role !== "system");

  const { model: plannerModel, reason: routingReason } = routeWithKolmogorovDetailed(
    opts.preferredModel,
    uiMessages as { role: "user" | "assistant"; content: string }[],
    opts.kolmogorov,
  );

  const system = [
    "You are BabyGPT in AGENT mode (ReAct).",
    "You must reply with ONE JSON object ONLY (no markdown fences). Schema:",
    `{"thought":"string","finish":boolean,"finalAnswer":"string (when finish)","toolCalls":[{"name":"tool_id","arguments":{}}]}`,
    "If finish is true, put the user-facing answer in finalAnswer.",
    "If you need tools, set finish=false and include toolCalls (can be multiple).",
    "Available tools:\n" + toolsPromptBlock(),
    opts.extraSystem ? "\nContext:\n" + opts.extraSystem : "",
  ].join("\n");

  const dialog: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
    ...uiMessages,
  ];

  const toolCalls: ToolCall[] = [];
  const ctx: ToolContext = { zai: opts.zai };

  let lastFinal: string | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const thinkingMode =
      opts.thinking ? ({ type: "enabled" as const } satisfies { type: "enabled" }) : { type: "disabled" as const };

    let res: unknown;
    if (opts.zai) {
      res = await opts.zai.chat.completions.create({
        model: plannerModel,
        messages: dialog,
        stream: false,
        thinking: thinkingMode,
      });
    } else {
      const omodel = mapTierToOpenAIModel(plannerModel);
      res = await openaiChatCompletionJson({
        apiKey: opts.openaiApiKey!,
        model: omodel,
        messages: dialog.map((m) => ({ role: m.role, content: m.content })),
      });
    }

    const text = extractAssistantText(res);
    dialog.push({ role: "assistant", content: text });

    const parsed = parseAgentJson(text);
    if (!parsed) {
      pushLog({
        at: Date.now(),
        kind: "parse_fix",
        detail: "Model output was not valid JSON — asking for a repair.",
      });
      dialog.push({
        role: "user",
        content:
          "Your last message was not valid JSON. Reply again with ONLY one JSON object following the schema.",
      });
      continue;
    }

    if (parsed.finish && typeof parsed.finalAnswer === "string" && parsed.finalAnswer.trim()) {
      lastFinal = parsed.finalAnswer.trim();
      break;
    }

    const calls = parsed.toolCalls ?? [];
    if (!calls.length) {
      lastFinal = synthesizeFinalFromThought(parsed);
      break;
    }

    for (const c of calls) {
      const name = String(c.name ?? "");
      const args = (c.arguments ?? {}) as Record<string, unknown>;
      const tool = getToolByName(name);
      if (!tool) {
        const msg = `Observation (${name}): unknown tool`;
        dialog.push({ role: "user", content: msg });
        toolCalls.push({
          id: randomUUID(),
          name,
          arguments: args,
          result: msg,
        });
        continue;
      }

      const result = await executeToolWithRetry(() => tool.execute(args, ctx), { log: pushLog });
      toolCalls.push({
        id: randomUUID(),
        name,
        arguments: args,
        result,
      });
      dialog.push({
        role: "user",
        content: `Observation (${name}):\n${result}`,
      });
    }
  }

  if (!lastFinal) {
    lastFinal =
      "Agent stopped after the maximum number of reasoning steps. Try narrowing the task or enabling Thinking.";
  }

  return {
    toolCalls,
    errorCorrectionLog,
    finalText: lastFinal,
    routingReason,
    plannerModel,
  };
}

```
### src/lib/agent-memory.ts

```typescript
import { lsKey } from "./storage";
import type { Conversation } from "./types";
import { buildHolographicMessages } from "./holographic-context";

const KEY = lsKey("agent_memory_v1");

export type AgentMemory = {
  preferences: string[];
  styleNotes: string[];
  ongoingTasks: string[];
  topics: string[];
  technicalLevel: "beginner" | "intermediate" | "advanced" | "unknown";
  updatedAt: number;
};

const DEFAULT_MEMORY: AgentMemory = {
  preferences: [],
  styleNotes: [],
  ongoingTasks: [],
  topics: [],
  technicalLevel: "unknown",
  updatedAt: Date.now(),
};

export function loadMemory(): AgentMemory {
  if (typeof window === "undefined") return DEFAULT_MEMORY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_MEMORY;
    const parsed = JSON.parse(raw) as AgentMemory;
    return { ...DEFAULT_MEMORY, ...parsed };
  } catch {
    return DEFAULT_MEMORY;
  }
}

export function saveMemory(m: AgentMemory): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...m, updatedAt: Date.now() }));
  } catch {
    // ignore
  }
}

function guessTechnicalLevel(text: string): AgentMemory["technicalLevel"] {
  const t = text.toLowerCase();
  const adv =
    /\b(kubernetes|terraform|rust|llvm|distributed|postgres internals)\b/.test(t) ||
    (t.match(/\b(api|async|typescript|react)\b/g) ?? []).length >= 4;
  const beg =
    /\b(new to|beginner|what is a|don't understand|simple terms)\b/.test(t) || text.length < 80;
  if (adv) return "advanced";
  if (beg) return "beginner";
  return "intermediate";
}

function extractTopics(text: string): string[] {
  const words = text.toLowerCase().match(/\b[a-z][a-z\-]{2,}\b/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (w.length < 4) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

export function updateMemoryFromConversation(conv: Conversation): AgentMemory {
  const m = loadMemory();
  const last = [...conv.messages].reverse().find((x) => x.role === "user");
  if (!last) return m;
  const topics = extractTopics(last.content);
  const tech = guessTechnicalLevel(last.content);
  const mergedTopics = [...new Set([...m.topics, ...topics])].slice(0, 24);
  return {
    ...m,
    topics: mergedTopics,
    technicalLevel: tech === "unknown" ? m.technicalLevel : tech,
    updatedAt: Date.now(),
  };
}

function compactBlock(label: string, lines: string[], maxChars: number): string {
  const raw = lines.filter(Boolean).join(" · ");
  if (raw.length <= maxChars) return `${label}: ${raw}`;
  return `${label}: ${raw.slice(0, maxChars)}…`;
}

export function generateMemoryPrompt(m: AgentMemory): string {
  const block = [
    "User memory (persistent, local):",
    m.preferences.length ? `Preferences: ${m.preferences.join("; ")}` : "",
    m.styleNotes.length ? `Style: ${m.styleNotes.join("; ")}` : "",
    m.ongoingTasks.length ? `Ongoing tasks: ${m.ongoingTasks.join("; ")}` : "",
    m.topics.length ? `Topics: ${m.topics.slice(0, 12).join(", ")}` : "",
    `Technical level guess: ${m.technicalLevel}`,
  ]
    .filter(Boolean)
    .join("\n");
  const folded = buildHolographicMessages([{ role: "user", content: block }], { enabled: true });
  return compactBlock("Memory", [folded[0]?.content ?? block], 2500);
}

```
### src/lib/app-version.ts

```typescript
import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version as string;

```
### src/lib/billing-faq.ts

```typescript
export type FaqEntry = { id: string; keywords: string[]; title: string; body: string };

/** Stripe / subscription FAQ only — life-coach onboarding lives in src/lib/companion-onboarding.ts + WelcomeScreen. */
export const BILLING_FAQ: FaqEntry[] = [
  {
    id: "cancel",
    keywords: ["cancel", "unsubscribe", "stop", "subscription", "end"],
    title: "Cancel or change plan",
    body: "Open Manage billing in the Plans modal to use the Stripe Customer Portal. There you can cancel, update payment methods, and download invoices. After canceling a paid plan, the app syncs to Free on the next webhook update.",
  },
  {
    id: "charge",
    keywords: ["charge", "charged", "bill", "invoice", "receipt", "payment", "why"],
    title: "Charges and receipts",
    body: "Subscription amounts are set by your Stripe Price and any tax at checkout. Stripe emails receipts when enabled in your Dashboard. Use Manage billing to see invoices and payment methods.",
  },
  {
    id: "failed",
    keywords: ["failed", "declined", "card", "past_due", "past due", "retry"],
    title: "Failed payment",
    body: "If a renewal fails, update your card in Manage billing. Stripe retries automatically on a schedule you configure in the Dashboard. The app may show an alert until payment succeeds.",
  },
  {
    id: "credits",
    keywords: ["credit", "credits", "balance", "usage", "month"],
    title: "Credits vs subscription",
    body: "Your plan sets which models and features you can use. Credits are spent per successful reply (see the composer preview). Monthly credit grants accrue according to server wallet rules in gated mode.",
  },
  {
    id: "refund",
    keywords: ["refund", "money back", "dispute"],
    title: "Refunds",
    body: "Refund policy is set by you as the merchant. Stripe supports refunds and disputes in the Dashboard. BabyGPT does not decide refund eligibility automatically.",
  },
  {
    id: "tax",
    keywords: ["tax", "vat", "gst", "sales tax", "automatic tax"],
    title: "Tax and VAT",
    body: "If STRIPE_CHECKOUT_AUTO_TAX is enabled and Stripe Tax is configured in your Dashboard, Checkout can calculate tax from the customer address. Otherwise totals follow your Stripe Price and regional rules you set in Stripe.",
  },
  {
    id: "upgrade",
    keywords: ["upgrade", "downgrade", "change plan", "switch plan", "different plan"],
    title: "Change or upgrade plan",
    body: "Use Subscribe with Stripe on a higher tier to start Checkout for that price. To downgrade or cancel, open Manage billing (Stripe Customer Portal) and pick a different subscription action.",
  },
  {
    id: "privacy",
    keywords: ["privacy", "data", "storage", "where", "retention"],
    title: "Data and privacy",
    body: "Chats and credits can live in this browser (localStorage) or on the server when BABYGPT_APP_PASSWORD is set. Community posts in this app are in-memory on the server and reset on restart. No separate cloud sync unless you add it.",
  },
  {
    id: "coupon",
    keywords: ["coupon", "promo", "code", "discount", "promotion"],
    title: "Coupons and promotions",
    body: "Stripe Checkout has allow_promotion_codes enabled when configured. Users can enter valid Stripe promotion codes on the hosted checkout page if you create them in the Stripe Dashboard.",
  },
  {
    id: "team",
    keywords: ["team", "business", "seats", "multiple users"],
    title: "Team plan",
    body: "Team is a subscription tier in this app with higher monthly credits and model access. It is still a single shared login unless you build multi-user accounts. Seat-based billing would require additional Stripe products and app logic.",
  },
];

/** Chips for Plans modal — subscription and payment help only. */
export const BILLING_SUGGESTED_QUESTIONS: string[] = [
  "How do I cancel my subscription?",
  "Why was I charged?",
  "What if my payment failed?",
  "How do credits work?",
  "How do I change my plan?",
  "Is tax included?",
  "How is my data stored?",
];

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
}

/** Returns top billing FAQ entries by simple overlap score (deterministic, fast). */
export function matchBillingFaq(query: string, limit = 4): FaqEntry[] {
  const q = tokenize(query);
  if (q.size === 0) return BILLING_FAQ.slice(0, limit);
  const scored = BILLING_FAQ.map((e) => {
    const kw = new Set(e.keywords.flatMap((k) => Array.from(tokenize(k))));
    let score = 0;
    for (const t of q) {
      if (kw.has(t)) score += 3;
      if (e.title.toLowerCase().includes(t)) score += 2;
      if (e.body.toLowerCase().includes(t)) score += 1;
    }
    return { e, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((x) => x.score > 0).slice(0, limit).map((x) => x.e);
}

```
### src/lib/billing-llm.ts

```typescript
import { resolveLlm } from "@/lib/llm-resolve";
import { openaiChatCompletionJson, pickChatTextFromCompletion } from "@/lib/openai-api";

export async function completeBillingText(opts: {
  system: string;
  user: string;
}): Promise<{ text: string } | { error: string }> {
  const llm = resolveLlm();
  if (llm.provider === "none") {
    return { error: llm.message };
  }

  const messages = [
    { role: "system" as const, content: opts.system },
    { role: "user" as const, content: opts.user },
  ];

  try {
    if (llm.provider === "openai") {
      const data = await openaiChatCompletionJson({
        apiKey: llm.apiKey,
        model: "gpt-4o-mini",
        messages,
      });
      return { text: pickChatTextFromCompletion(data).trim() };
    }

    const zai = llm.zai;
    const raw = await zai.chat.completions.create({
      model: "glm-4-flash",
      messages,
      stream: false,
      thinking: { type: "disabled" },
    });
    return { text: pickChatTextFromCompletion(raw as unknown).trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LLM request failed";
    return { error: msg };
  }
}

```
### src/lib/billing-usage-hints.ts

```typescript
import type { CreditsStateV1 } from "@/lib/credits-store";
import { PLANS } from "@/lib/plans";

export type UsageHint = { kind: string; message: string };

/** JSON from GET /api/credits when a renewal failed (client-safe). */
export type BillingAlertPayload = {
  kind: "payment_failed";
  at: string;
  message: string;
  attemptCount: number | null;
};

/** Lightweight heuristics for in-app guidance (no ML). */
export function computeUsageHints(wallet: CreditsStateV1): UsageHint[] {
  const hints: UsageHint[] = [];
  const monthly = PLANS[wallet.planId].monthlyCredits;
  const threshold = Math.max(30, Math.floor(monthly * 0.15));
  if (wallet.balance < threshold) {
    hints.push({
      kind: "low_credits",
      message: `Balance is low (${wallet.balance} credits). Larger models and thinking modes use more credits per reply; consider upgrading or spacing sends until your monthly refresh.`,
    });
  }
  return hints;
}

```
### src/lib/built-in-skills.ts

```typescript
import type { Skill } from "./skill-model";

export const BUILT_IN_SKILLS: Skill[] = [
  {
    id: "prd",
    name: "Write a PRD",
    description: "Turn a rough idea into a structured product requirements document with goals and risks.",
    prompt:
      "Write a concise PRD with: problem, goals, non-goals, users, user stories, metrics, rollout risks, open questions.",
    category: "Product",
    builtIn: true,
  },
  {
    id: "review",
    name: "Code Review",
    description: "Review code for correctness, edge cases, security, and readability with actionable notes.",
    prompt:
      "Perform a thorough code review. Call out bugs, security issues, performance, tests to add, and suggest refactors.",
    category: "Engineering",
    builtIn: true,
  },
  {
    id: "eli5",
    name: "Explain Like I'm 5",
    description: "Explain complex topics using simple analogies and short sentences.",
    prompt: "Explain the topic as if to a curious beginner. Use analogies, avoid jargon, keep it short.",
    category: "Learning",
    builtIn: true,
  },
  {
    id: "debate",
    name: "Debate Both Sides",
    description: "Argue both sides fairly, then give a balanced takeaway.",
    prompt:
      "Present the strongest case FOR and AGAINST. Then summarize tradeoffs and what you'd recommend and why.",
    category: "Reasoning",
    builtIn: true,
  },
  {
    id: "summarize",
    name: "Summarize",
    description: "Summarize long text into bullets with key claims and unknowns.",
    prompt:
      "Summarize with: key points, assumptions, risks, and a tight executive summary at the top.",
    category: "Writing",
    builtIn: true,
  },
  {
    id: "tutorial",
    name: "Create Tutorial",
    description: "Create a step-by-step tutorial with prerequisites and checkpoints.",
    prompt:
      "Write a tutorial with prerequisites, numbered steps, expected outputs, troubleshooting, and next steps.",
    category: "Learning",
    builtIn: true,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    description: "Generate diverse ideas, constraints, and evaluation criteria.",
    prompt:
      "Brainstorm options, include constraints, rank by impact/effort, and propose 3 next experiments.",
    category: "Product",
    builtIn: true,
  },
  {
    id: "debug",
    name: "Debug This",
    description: "Systematically debug errors with hypotheses and minimal repro steps.",
    prompt:
      "Debug systematically: restate symptoms, hypotheses, quick checks, likely root cause, fix, and validation steps.",
    category: "Engineering",
    builtIn: true,
  },
  {
    id: "risk",
    name: "Risk Review",
    description: "Identify operational and product risks with mitigations.",
    prompt: "List risks (likelihood/impact), mitigations, monitoring signals, and rollback plans.",
    category: "Product",
    builtIn: true,
  },
  {
    id: "rewrite",
    name: "Polish Writing",
    description: "Improve clarity, tone, and structure without changing meaning.",
    prompt: "Rewrite for clarity and tone. Keep meaning. Note important caveats if any.",
    category: "Writing",
    builtIn: true,
  },
];

```
### src/lib/chat-route-guard.test.ts

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { guardChatSend, guardDebate } from "./chat-route-guard";

vi.mock("@/lib/session-server", () => ({
  assertAuthorized: vi.fn(),
}));

vi.mock("@/lib/server-config", () => ({
  isGateEnabled: vi.fn(),
}));

vi.mock("@/lib/server-wallet", () => ({
  readServerWallet: vi.fn(),
  tryDebitServerWallet: vi.fn(),
}));

import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerWallet, tryDebitServerWallet } from "@/lib/server-wallet";
import { PLANS } from "@/lib/plans";

function req(): NextRequest {
  return new NextRequest(new URL("http://localhost/"));
}

describe("guardChatSend", () => {
  beforeEach(() => {
    vi.mocked(assertAuthorized).mockResolvedValue(null);
    vi.mocked(isGateEnabled).mockReturnValue(false);
    vi.mocked(readServerWallet).mockReset();
    vi.mocked(tryDebitServerWallet).mockReset();
  });

  it("returns null when gate is off (no server debit)", async () => {
    const out = await guardChatSend(req(), {
      model: "glm-4-flash",
      thinking: false,
      mode: "chat",
    });
    expect(out).toBeNull();
    expect(readServerWallet).not.toHaveBeenCalled();
  });

  it("returns 401 when assertAuthorized fails", async () => {
    vi.mocked(isGateEnabled).mockReturnValue(true);
    vi.mocked(assertAuthorized).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const out = await guardChatSend(req(), {
      model: "glm-4-flash",
      thinking: false,
      mode: "chat",
    });
    expect(out?.status).toBe(401);
    expect(readServerWallet).not.toHaveBeenCalled();
  });

  it("returns 403 when plan does not permit send mode", async () => {
    vi.mocked(isGateEnabled).mockReturnValue(true);
    vi.mocked(assertAuthorized).mockResolvedValue(null);
    vi.mocked(readServerWallet).mockReturnValue({
      version: 1,
      planId: "free",
      balance: 10_000,
      accrualMonth: "2026-01",
      welcomeApplied: true,
    });
    const out = await guardChatSend(req(), {
      model: "glm-4-flash",
      thinking: false,
      mode: "agent",
    });
    expect(out?.status).toBe(403);
    expect(tryDebitServerWallet).not.toHaveBeenCalled();
  });

  it("returns 402 when debit fails", async () => {
    vi.mocked(isGateEnabled).mockReturnValue(true);
    vi.mocked(assertAuthorized).mockResolvedValue(null);
    vi.mocked(readServerWallet).mockReturnValue({
      version: 1,
      planId: "pro",
      balance: PLANS.pro.monthlyCredits,
      accrualMonth: "2026-01",
      welcomeApplied: true,
    });
    vi.mocked(tryDebitServerWallet).mockReturnValue({
      ok: false,
      wallet: {
        version: 1,
        planId: "pro",
        balance: 0,
        accrualMonth: "2026-01",
        welcomeApplied: true,
      },
    });
    const out = await guardChatSend(req(), {
      model: "glm-4-flash",
      thinking: false,
      mode: "chat",
    });
    expect(out?.status).toBe(402);
  });

  it("returns null when debit succeeds", async () => {
    vi.mocked(isGateEnabled).mockReturnValue(true);
    vi.mocked(assertAuthorized).mockResolvedValue(null);
    vi.mocked(readServerWallet).mockReturnValue({
      version: 1,
      planId: "pro",
      balance: PLANS.pro.monthlyCredits,
      accrualMonth: "2026-01",
      welcomeApplied: true,
    });
    vi.mocked(tryDebitServerWallet).mockReturnValue({
      ok: true,
      wallet: {
        version: 1,
        planId: "pro",
        balance: PLANS.pro.monthlyCredits - 1,
        accrualMonth: "2026-01",
        welcomeApplied: true,
      },
    });
    const out = await guardChatSend(req(), {
      model: "glm-4-flash",
      thinking: false,
      mode: "chat",
    });
    expect(out).toBeNull();
    expect(tryDebitServerWallet).toHaveBeenCalled();
  });
});

describe("guardDebate", () => {
  beforeEach(() => {
    vi.mocked(assertAuthorized).mockResolvedValue(null);
    vi.mocked(isGateEnabled).mockReturnValue(false);
    vi.mocked(readServerWallet).mockReset();
    vi.mocked(tryDebitServerWallet).mockReset();
  });

  it("returns null when gate is off", async () => {
    expect(await guardDebate(req())).toBeNull();
  });
});

```
### src/lib/chat-route-guard.ts

```typescript
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerWallet, tryDebitServerWallet } from "@/lib/server-wallet";
import { PLANS } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";
import {
  COMMUNITY_DEBATE_COST,
  estimateSendCredits,
  planPermitsSend,
  type SendMode,
} from "@/lib/usage-cost";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Auth + optional server wallet debit for chat-style routes.
 * When gate is disabled, returns `null` (caller continues, no server debit).
 */
export async function guardChatSend(
  request: NextRequest,
  input: { model: ModelTier; thinking: boolean; mode: SendMode },
): Promise<NextResponse | null> {
  const denied = await assertAuthorized(request);
  if (denied) {
    return denied;
  }
  if (!isGateEnabled()) {
    return null;
  }

  const wallet = readServerWallet();
  const plan = PLANS[wallet.planId];
  if (!planPermitsSend(plan, input)) {
    return NextResponse.json(
      { error: "Your plan does not include this model or mode. Change plan or settings." },
      { status: 403 },
    );
  }

  const cost = estimateSendCredits(input);
  const { ok } = tryDebitServerWallet(cost);
  if (!ok) {
    return NextResponse.json(
      { error: `Insufficient credits (this send needs ${cost}).` },
      { status: 402 },
    );
  }
  return null;
}

export async function guardDebate(request: NextRequest): Promise<NextResponse | null> {
  const denied = await assertAuthorized(request);
  if (denied) {
    return denied;
  }
  if (!isGateEnabled()) {
    return null;
  }

  const wallet = readServerWallet();
  const plan = PLANS[wallet.planId];
  if (!plan.features.communityDebate) {
    return NextResponse.json({ error: "Debate not included on your plan." }, { status: 403 });
  }

  const { ok } = tryDebitServerWallet(COMMUNITY_DEBATE_COST);
  if (!ok) {
    return NextResponse.json(
      { error: `Insufficient credits (debate costs ${COMMUNITY_DEBATE_COST}).` },
      { status: 402 },
    );
  }
  return null;
}

/** Gate-only (no debit) for community CRUD. */
export async function guardApi(request: NextRequest): Promise<NextResponse | null> {
  return assertAuthorized(request);
}

```
### src/lib/comment-analysis.ts

```typescript
export type CommentSentiment = "pos" | "neu" | "neg";

export function analyzeCommentSentiment(text: string): CommentSentiment {
  const t = text.toLowerCase();
  const neg = ["not", "bad", "worst", "hate", "never"].filter((w) => t.includes(w)).length;
  const pos = ["great", "love", "thanks", "awesome", "nice"].filter((w) => t.includes(w)).length;
  if (pos > neg) return "pos";
  if (neg > pos) return "neg";
  return "neu";
}

```
### src/lib/community.ts

```typescript
import { v4 as uuidv4 } from "uuid";
import type { CommentSentiment } from "./comment-analysis";

export type Sentiment = CommentSentiment;

export interface CommunityComment {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  ghostReply?: string;
  sentiment?: Sentiment;
}

export interface CommunityPost {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  comments: CommunityComment[];
  resonance: number;
}

const memory: CommunityPost[] = [];

export function listPosts(): CommunityPost[] {
  return [...memory].sort((a, b) => b.createdAt - a.createdAt);
}

export function addPost(title: string, body: string): CommunityPost {
  const post: CommunityPost = {
    id: uuidv4(),
    title: title.trim(),
    body: body.trim(),
    createdAt: Date.now(),
    comments: [],
    resonance: 0,
  };
  memory.unshift(post);
  return post;
}

export function addComment(postId: string, author: string, body: string): CommunityComment | null {
  const p = memory.find((x) => x.id === postId);
  if (!p) return null;
  const c: CommunityComment = {
    id: uuidv4(),
    author: author.trim() || "anon",
    body: body.trim(),
    createdAt: Date.now(),
  };
  p.comments.push(c);
  return c;
}

export function updateResonance(postId: string, score: number) {
  const p = memory.find((x) => x.id === postId);
  if (p) p.resonance = score;
}

```
### src/lib/companion-onboarding.ts

```typescript
/**
 * Life-coach / AI companion onboarding copy — not billing.
 * Shown on the welcome (empty chat) screen. Full narrative: docs/BabyGPT-Onboarding-Paths-Spec.md
 */

export const COMPANION_WELCOME_LEAD =
  "BabyGPT is built to be an AI companion: quick help when you need it, and space to think clearly about your life and goals. Start with the questions below, or jump in with a mode prefix.";

/** Seven intro questions — connect and understand before heavy strategy. */
export const INTRO_SEVEN_QUESTIONS: string[] = [
  "Why are you here right now — what made you open this chat?",
  "What are we hoping to figure out together; what would “this helped” look like?",
  "What have you already tried, and what patterns feel conditioned or repeated?",
  "What sucks the most about how things stand — where’s it stuck or heavy?",
  "How urgent is this: deadlines, stakes, or pressure if nothing changes?",
  "Who else is affected by how this turns out (team, family, customers, future you)?",
  "How should I talk with you — preferred tone and format: direct vs gentle, brief vs deep, examples vs steps?",
];

/** Deeper journey (mountaintop arc) — after rapport, when you want vision / letter work. */
export const JOURNEY_SEVEN_QUESTIONS: string[] = [
  "What’s one thing you’re really hoping I can help you with?",
  "What’s your mountaintop — that big thing you’re ultimately working toward?",
  "If you woke up tomorrow and your life was exactly how you want it, what would that perfect day look like?",
  "What are the things you love doing so much that time just disappears?",
  "What’s the one habit you know would change everything if you actually stuck with it?",
  "When you’re finally on that mountaintop, what does a perfect day there actually feel like?",
  "What’s one thing about you that I should never forget?",
];

/** Lead a message with one line so the model stays in that mode. */
export const MESSAGE_MODE_PREFIXES: { id: string; label: string; prefix: string; hint: string }[] = [
  {
    id: "fact",
    label: "Fact search",
    prefix: "Fact search:",
    hint: "Verifiable info, sources, dates; say when uncertain.",
  },
  {
    id: "clarity",
    label: "Clarity",
    prefix: "Clarity mode:",
    hint: "Define terms, remove ambiguity, confirm before advice.",
  },
  {
    id: "discover",
    label: "Discover",
    prefix: "Discover mode:",
    hint: "Widen options; no forced early answer.",
  },
  {
    id: "precision",
    label: "Precision",
    prefix: "Precision mode:",
    hint: "Decisions, criteria, one next step.",
  },
  {
    id: "perspective",
    label: "Perspective",
    prefix: "Perspective mode:",
    hint: "Stakeholders, tradeoffs, alternate frames.",
  },
];

/** Short product controls reminder (not billing). */
export const CORE_CONTROLS_SUMMARY =
  "Header bar: model, Thinking, Schrödinger, Agent, and Quantum (Kolmogorov, Holographic, DNA, Adiabatic). Power templates set several at once.";

```
### src/lib/credits-store.ts

```typescript
import { lsKey } from "@/lib/storage";
import { DEFAULT_PLAN, FIRST_VISIT_CREDIT_BONUS, type PlanId } from "@/lib/plans";

const KEY = lsKey("credits_v1");

export interface CreditsStateV1 {
  version: 1;
  planId: PlanId;
  balance: number;
  /** YYYY-MM for monthly accrual tracking */
  accrualMonth: string;
  /** One-time welcome bonus applied */
  welcomeApplied: boolean;
}

export function creditMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultState(): CreditsStateV1 {
  return {
    version: 1,
    planId: DEFAULT_PLAN,
    balance: 0,
    accrualMonth: creditMonthKey(),
    welcomeApplied: false,
  };
}

export function loadCreditsState(): CreditsStateV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as CreditsStateV1;
    if (p?.version !== 1) return defaultState();
    return {
      ...defaultState(),
      ...p,
      planId: p.planId ?? DEFAULT_PLAN,
      balance: typeof p.balance === "number" && p.balance >= 0 ? Math.floor(p.balance) : 0,
      accrualMonth: typeof p.accrualMonth === "string" ? p.accrualMonth : creditMonthKey(),
      welcomeApplied: Boolean(p.welcomeApplied),
    };
  } catch {
    return defaultState();
  }
}

export function saveCreditsState(state: CreditsStateV1): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota
  }
}

/** Apply monthly grant + first-visit bonus. Import plan monthlyCredits inside caller to avoid circular deps. */
export function hydrateCredits(
  state: CreditsStateV1,
  monthlyCreditsForPlan: number,
): CreditsStateV1 {
  const next = { ...state };
  const m = creditMonthKey();
  if (next.accrualMonth !== m) {
    next.balance += monthlyCreditsForPlan;
    next.accrualMonth = m;
  }
  if (!next.welcomeApplied) {
    next.balance += FIRST_VISIT_CREDIT_BONUS;
    next.welcomeApplied = true;
  }
  return next;
}

export function setPlan(state: CreditsStateV1, planId: PlanId): CreditsStateV1 {
  return { ...state, planId };
}

export function adjustBalance(state: CreditsStateV1, delta: number): CreditsStateV1 {
  const balance = Math.max(0, state.balance + delta);
  return { ...state, balance };
}

```
### src/lib/entanglement.ts

```typescript
export function entanglementHint(threadIds: string[]): string {
  if (threadIds.length < 2) return "";
  return `Linked threads: ${threadIds.slice(0, 3).join(", ")}`;
}

```
### src/lib/fetch-chat.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { fetchChatWithRetry, formatChatError } from "@/lib/fetch-chat";

describe("fetchChatWithRetry", () => {
  it("throws AbortError before fetch when signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(fetchChatWithRetry("https://example.test/chat", { signal: ac.signal })).rejects.toThrow(
      DOMException,
    );
  });
});

describe("formatChatError", () => {
  it("maps 503 missing LLM copy", () => {
    const s = formatChatError(503, "No LLM configured. Set keys.");
    expect(s).toContain("LLM not configured");
  });

  it("passes through generic 502 message", () => {
    expect(formatChatError(502, "upstream")).toBe("upstream");
  });
});

```
### src/lib/fetch-chat.ts

```typescript
const RETRIABLE = new Set([502, 503, 504]);

/**
 * Retries transient server errors a few times with backoff (chat / agent / schrodinger).
 */
export async function fetchChatWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  opts?: { retries?: number },
): Promise<Response> {
  const retries = opts?.retries ?? 2;
  let last: Response | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (init.signal?.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    last = await fetch(input, {
      ...init,
      credentials: init.credentials ?? "include",
    });
    if (!RETRIABLE.has(last.status) || attempt === retries) {
      return last;
    }
    await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
  }
  return last!;
}

export function formatChatError(status: number, bodyError?: string): string {
  if (status === 503) {
    if (bodyError?.toLowerCase().includes("no llm") || bodyError?.toLowerCase().includes("configured")) {
      return "LLM not configured — add Z_AI_API_KEY or OPENAI_API_KEY (see .env.local.example).";
    }
    return bodyError ?? "Service unavailable (503). Check API keys and provider status.";
  }
  if (status === 502) {
    return bodyError ?? "Bad gateway (502) — provider error. Try again in a moment.";
  }
  if (status === 401) {
    return bodyError ?? "Unauthorized — sign in or use a valid API token.";
  }
  if (status === 402) {
    return bodyError ?? "Not enough credits (server wallet). Open Plans or wait for monthly accrual.";
  }
  if (status === 403) {
    return bodyError ?? "This model or mode is not included on your plan.";
  }
  return bodyError ?? `Request failed (${status})`;
}

```
### src/lib/heartbeat.ts

```typescript
import { predictNextUserIntent } from "./retrocausal-prediction";
import { dueReminders, removeReminder } from "./reminders";

export type HeartbeatSuggestion = {
  id: string;
  title: string;
  body: string;
  draft: string;
};

const INTERVAL_MS = 5 * 60_000;

export function startHeartbeat(opts: {
  getLastUserMessage: () => string | null;
  onSuggest: (s: HeartbeatSuggestion) => void;
}): () => void {
  const tick = () => {
    const now = Date.now();
    const due = dueReminders(now);
    if (due.length) {
      const r = due[0];
      opts.onSuggest({
        id: `rem-${r.id}`,
        title: "Reminder",
        body: r.text,
        draft: `Follow up: ${r.text}`,
      });
      removeReminder(r.id);
      return;
    }

    const last = opts.getLastUserMessage();
    if (last) {
      const ideas = predictNextUserIntent(last);
      if (ideas.length) {
        const pick = ideas[Math.floor(Math.random() * ideas.length)];
        opts.onSuggest({
          id: `retro-${now}`,
          title: "BabyGPT suggests",
          body: `Would you like to continue: ${pick}?`,
          draft: pick,
        });
      }
    }
  };

  const id = window.setInterval(tick, INTERVAL_MS);
  return () => window.clearInterval(id);
}

export { INTERVAL_MS };

```
### src/lib/holographic-context.ts

```typescript
import type { ChatMessage } from "./types";

const MAX_CHARS = 12000;

export function buildHolographicMessages(
  messages: Pick<ChatMessage, "role" | "content">[],
  opts?: { enabled?: boolean },
): { role: "system" | "user" | "assistant"; content: string }[] {
  const base = messages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
  if (!opts?.enabled) return base;

  let total = base.reduce((n, m) => n + m.content.length, 0);
  if (total <= MAX_CHARS) return base;

  const kept: typeof base = [];
  for (let i = base.length - 1; i >= 0; i--) {
    kept.unshift(base[i]);
    total = kept.reduce((n, m) => n + m.content.length, 0);
    if (total > MAX_CHARS) {
      kept[0] = {
        ...kept[0],
        content: `[folded] ${kept[0].content.slice(-Math.floor(MAX_CHARS / 4))}`,
      };
      break;
    }
  }
  return kept;
}

```
### src/lib/instant-templates.ts

````typescript
import type { PlanId } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "team"];

export function planRank(id: PlanId): number {
  const i = PLAN_ORDER.indexOf(id);
  return i === -1 ? 0 : i;
}

export type PowerTemplate = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Minimum plan required to apply full settings */
  minPlan: PlanId;
  apply: {
    model: ModelTier;
    thinking: boolean;
    agentMode: boolean;
    schrodinger: boolean;
    quantum: { kolmogorov: boolean; holographic: boolean; dna: boolean; adiabatic: number };
    draft: string;
  };
};

export const POWER_TEMPLATES: PowerTemplate[] = [
  {
    id: "quick",
    title: "Quick answer",
    description: "Fastest path — Flash, no extras",
    emoji: "⚡",
    minPlan: "free",
    apply: {
      model: "glm-4-flash",
      thinking: false,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "",
    },
  },
  {
    id: "explain-simple",
    title: "Explain simply",
    description: "Plain language + thinking stream",
    emoji: "💡",
    minPlan: "free",
    apply: {
      model: "glm-4-flash",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "Explain this in simple terms with one analogy:\n\n",
    },
  },
  {
    id: "deep-dive",
    title: "Deep dive",
    description: "Plus model + thinking + context folding",
    emoji: "🧭",
    minPlan: "starter",
    apply: {
      model: "glm-4-plus",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: true, dna: false, adiabatic: 0.5 },
      draft: "Give a structured deep dive with headings:\n\nTopic: ",
    },
  },
  {
    id: "debug-code",
    title: "Debug my code",
    description: "Plus + Agent + router",
    emoji: "🐛",
    minPlan: "starter",
    apply: {
      model: "glm-4-plus",
      thinking: true,
      agentMode: true,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "Debug this code. List likely bugs, then minimal fixes:\n\n```\n\n```",
    },
  },
  {
    id: "doc-long",
    title: "Long document",
    description: "Long context + thinking",
    emoji: "📄",
    minPlan: "pro",
    apply: {
      model: "glm-4-long",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: true, dna: false, adiabatic: 0.5 },
      draft: "Summarize and extract action items from the following:\n\n",
    },
  },
  {
    id: "flagship",
    title: "Flagship reasoning",
    description: "GLM-4 + Agent + DNA style lock",
    emoji: "🚀",
    minPlan: "pro",
    apply: {
      model: "glm-4",
      thinking: true,
      agentMode: true,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: true, dna: true, adiabatic: 0.65 },
      draft: "Solve step-by-step with explicit assumptions:\n\n",
    },
  },
  {
    id: "schrodinger-race",
    title: "Schrödinger race",
    description: "Dual-model stream (Pro+)",
    emoji: "🔀",
    minPlan: "pro",
    apply: {
      model: "glm-4-air",
      thinking: true,
      agentMode: false,
      schrodinger: true,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "Two perspectives on:\n\n",
    },
  },
  {
    id: "rewrite-pro",
    title: "Polish & tighten",
    description: "Air + holographic folding",
    emoji: "✍️",
    minPlan: "starter",
    apply: {
      model: "glm-4-air",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: true, dna: false, adiabatic: 0.5 },
      draft: "Rewrite for clarity and rhythm without changing meaning:\n\n",
    },
  },
  {
    id: "brainstorm",
    title: "Brainstorm",
    description: "Creative expansion — Air + thinking",
    emoji: "🌟",
    minPlan: "starter",
    apply: {
      model: "glm-4-air",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: true, dna: false, adiabatic: 0.45 },
      draft: "Brainstorm 10 distinct ideas for:\n\n",
    },
  },
  {
    id: "quiz-me",
    title: "Quiz me",
    description: "Learn mode — Flash + thinking",
    emoji: "❓",
    minPlan: "free",
    apply: {
      model: "glm-4-flash",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "After explaining, give me 3 quick self-check questions on:\n\n",
    },
  },
];

````
### src/lib/kolmogorov-router.ts

````typescript
import type { ChatMessage, ModelTier } from "./types";

function approxComplexity(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const words = t.split(/\s+/).length;
  const unique = new Set(t.toLowerCase().match(/\w+/g) ?? []).size;
  return words * 0.6 + unique * 0.4;
}

export type TaskSignal =
  | "web"
  | "code"
  | "creative"
  | "long_context"
  | "general";

export function classifyTaskSignals(text: string): TaskSignal[] {
  const t = text.toLowerCase();
  const out: TaskSignal[] = [];
  if (
    /\b(search|latest|news|today|current|url|http|https|website|web)\b/.test(t) ||
    t.includes("look up")
  ) {
    out.push("web");
  }
  if (
    /\b(code|function|debug|stack trace|typescript|javascript|python|implement|refactor|eval|execute)\b/.test(
      t,
    ) ||
    /```/.test(t)
  ) {
    out.push("code");
  }
  if (/\b(story|poem|creative|write a|tone|voice|novel)\b/.test(t)) {
    out.push("creative");
  }
  if (t.length > 3500 || /\b(entire|full document|long context|summarize this wall)\b/.test(t)) {
    out.push("long_context");
  }
  if (!out.length) out.push("general");
  return out;
}

export function routeWithKolmogorov(
  preferred: ModelTier,
  messages: Pick<ChatMessage, "role" | "content">[],
  enabled?: boolean,
): ModelTier {
  return routeWithKolmogorovDetailed(preferred, messages, enabled).model;
}

export function routeWithKolmogorovDetailed(
  preferred: ModelTier,
  messages: Pick<ChatMessage, "role" | "content">[],
  enabled?: boolean,
): { model: ModelTier; reason: string } {
  if (!enabled) {
    return { model: preferred, reason: "Kolmogorov router off — using selected model" };
  }
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = lastUser?.content ?? "";
  const signals = classifyTaskSignals(text);
  const c = lastUser ? approxComplexity(text) : 0;

  if (signals.includes("long_context") || c > 120) {
    return {
      model: "glm-4-long",
      reason: "Routed to GLM-4 Long for long context / very large prompts",
    };
  }
  if (signals.includes("web")) {
    return { model: "glm-4-flash", reason: "Routed to Flash for web-grounded, fast lookups" };
  }
  if (signals.includes("code")) {
    return {
      model: "glm-4-plus",
      reason: "Routed to Plus for code / tool reasoning (enable Thinking for hardest bugs)",
    };
  }
  if (signals.includes("creative")) {
    return { model: "glm-4", reason: "Routed to GLM-4 for richer creative writing" };
  }
  if (c > 60) return { model: "glm-4", reason: "Routed to GLM-4 for deeper reasoning (high complexity)" };
  if (c > 25) return { model: "glm-4-plus", reason: "Routed to Plus for moderate complexity" };
  return { model: "glm-4-air", reason: "Routed to Air for balanced general chat" };
}

````
### src/lib/llm-resolve.ts

```typescript
import type ZAI from "z-ai-web-dev-sdk";
import { createZai } from "@/lib/zai";
import { getOpenAIApiKey } from "@/lib/openai-api";

export type LlmResolved =
  | { provider: "zai"; zai: InstanceType<typeof ZAI> }
  | { provider: "openai"; apiKey: string }
  | { provider: "none"; message: string };

/**
 * Prefer Z.AI (GLM) when configured; otherwise use OpenAI if `OPENAI_API_KEY` is set.
 * `z-ai-web-dev-sdk` targets Z.AI’s HTTP API — OpenAI is a separate compatibility path.
 */
export function resolveLlm(): LlmResolved {
  try {
    return { provider: "zai", zai: createZai() };
  } catch {
    const openai = getOpenAIApiKey();
    if (openai) {
      return { provider: "openai", apiKey: openai };
    }
    return {
      provider: "none",
      message:
        "No LLM configured. Set Z_AI_API_KEY (and optional Z_AI_BASE_URL) for GLM, or OPENAI_API_KEY for OpenAI. See .env.local.example.",
    };
  }
}

```
### src/lib/model-tier.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { isModelTier, parseModelTierBody } from "@/lib/model-tier";

describe("model-tier", () => {
  it("accepts known tiers", () => {
    expect(isModelTier("glm-4-flash")).toBe(true);
    expect(isModelTier("glm-4")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isModelTier("gpt-4")).toBe(false);
    expect(isModelTier("")).toBe(false);
    expect(isModelTier(1)).toBe(false);
  });

  it("parseModelTierBody reads model field", () => {
    expect(parseModelTierBody({ model: "glm-4-plus" })).toBe("glm-4-plus");
    expect(parseModelTierBody({ model: "nope" })).toBe(null);
    expect(parseModelTierBody({})).toBe(null);
  });
});

```
### src/lib/model-tier.ts

```typescript
import type { ModelTier } from "@/lib/types";

const TIERS: readonly ModelTier[] = [
  "glm-4-flash",
  "glm-4-air",
  "glm-4-plus",
  "glm-4-long",
  "glm-4",
] as const;

export function isModelTier(s: unknown): s is ModelTier {
  return typeof s === "string" && (TIERS as readonly string[]).includes(s);
}

export function parseModelTierBody(body: { model?: unknown }): ModelTier | null {
  return isModelTier(body.model) ? body.model : null;
}

```
### src/lib/mood-engine.ts

```typescript
/**
 * Lightweight heuristic “mood” from draft + recent user text — drives subtle UI tint only.
 */

export type MoodId = "analytical" | "creative" | "learning" | "urgent" | "philosophical" | "neutral";

export type Mood = {
  id: MoodId;
  label: string;
  emoji: string;
  /** Applied to main column for gradient + border tint */
  shellClass: string;
  /** Subtle header underline / ring accent */
  accentClass: string;
};

const MOODS: Record<MoodId, Mood> = {
  analytical: {
    id: "analytical",
    label: "Analytical",
    emoji: "🔬",
    shellClass:
      "from-sky-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-sky-500/15",
    accentClass: "ring-sky-500/40 text-sky-200/90",
  },
  creative: {
    id: "creative",
    label: "Creative",
    emoji: "🎨",
    shellClass:
      "from-fuchsia-950/20 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-fuchsia-500/15",
    accentClass: "ring-fuchsia-500/35 text-fuchsia-200/90",
  },
  learning: {
    id: "learning",
    label: "Learning",
    emoji: "📚",
    shellClass:
      "from-amber-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-amber-500/15",
    accentClass: "ring-amber-500/35 text-amber-200/90",
  },
  urgent: {
    id: "urgent",
    label: "Urgent",
    emoji: "⚡",
    shellClass:
      "from-rose-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-rose-500/20",
    accentClass: "ring-rose-500/40 text-rose-200/90",
  },
  philosophical: {
    id: "philosophical",
    label: "Philosophical",
    emoji: "🌌",
    shellClass:
      "from-violet-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-violet-500/15",
    accentClass: "ring-violet-500/35 text-violet-200/90",
  },
  neutral: {
    id: "neutral",
    label: "Neutral",
    emoji: "◆",
    shellClass: "from-zinc-950 via-zinc-950 to-zinc-950 bg-gradient-to-br ring-zinc-800/40",
    accentClass: "ring-zinc-700 text-zinc-400",
  },
};

export function inferMood(text: string): Mood {
  const t = text.toLowerCase();
  if (!t.trim()) return MOODS.neutral;

  if (
    /\b(urgent|asap|deadline|production|crash|error|segfault|outage|incident)\b/.test(t) ||
    /!!!/.test(text)
  ) {
    return MOODS.urgent;
  }
  if (
    /\b(why|meaning|consciousness|ethics|exist|universe|should we|philosophy|moral)\b/.test(t)
  ) {
    return MOODS.philosophical;
  }
  if (
    /\b(story|poem|creative|imagine|brand|design|write a song|fiction|art)\b/.test(t) ||
    /\b(color|colour|visual|aesthetic)\b/.test(t)
  ) {
    return MOODS.creative;
  }
  if (
    /\b(learn|explain|tutorial|what is|how does|beginner|eli5|simple)\b/.test(t) ||
    /\b(teach|course|study)\b/.test(t)
  ) {
    return MOODS.learning;
  }
  if (
    /\b(analyze|data|metric|sql|spreadsheet|logic|proof|derive|compare|optimize|benchmark)\b/.test(
      t,
    ) ||
    /\b(code|function|class|debug|refactor|typescript|python)\b/.test(t)
  ) {
    return MOODS.analytical;
  }

  return MOODS.neutral;
}

```
### src/lib/openai-api.ts

```typescript
import type { ModelTier } from "./types";

const OPENAI_CHAT = "https://api.openai.com/v1/chat/completions";

/** Reasonable OpenAI model for each GLM tier (UI still shows GLM names). */
export const GLM_TO_OPENAI_MODEL: Record<ModelTier, string> = {
  "glm-4-flash": "gpt-4o-mini",
  "glm-4-air": "gpt-4o-mini",
  "glm-4-plus": "gpt-4o",
  "glm-4-long": "gpt-4o",
  "glm-4": "gpt-4o",
};

export function mapTierToOpenAIModel(tier: ModelTier): string {
  return GLM_TO_OPENAI_MODEL[tier] ?? "gpt-4o-mini";
}

export function getOpenAIApiKey(): string | null {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k || null;
}

/** Parses OpenAI-compatible chat completion JSON (OpenAI + Z.AI GLM). */
export function pickChatTextFromCompletion(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const o = data as { choices?: unknown };
  const ch = o.choices;
  if (!Array.isArray(ch) || !ch[0] || typeof ch[0] !== "object") return "";
  const c0 = ch[0] as { message?: unknown };
  if (!c0.message || typeof c0.message !== "object") return "";
  const msg = c0.message as { content?: unknown };
  return typeof msg.content === "string" ? msg.content : "";
}

export async function openaiChatCompletionJson(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<unknown> {
  const res = await fetch(OPENAI_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: false,
      temperature: 0.6,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text.slice(0, 800));
  }
  return JSON.parse(text) as unknown;
}

/** OpenAI SSE stream (OpenAI-compatible; client SSE parser already handles deltas). */
export async function streamOpenAIChat(opts: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(OPENAI_CHAT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t.slice(0, 800));
  }
  if (!res.body) throw new Error("OpenAI returned empty body");
  return res.body;
}

```
### src/lib/plan-pricing-display.test.ts

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatPlanMoneyHeadline, getMonthlyUsdCents, planPriceConfigured } from "./plan-pricing-display";

describe("plan-pricing-display", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_STARTER_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_PRO_USD", "");
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_TEAM_USD", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("free is zero", () => {
    expect(getMonthlyUsdCents("free")).toBe(0);
    expect(formatPlanMoneyHeadline("free")).toBe("$0");
    expect(planPriceConfigured("free")).toBe(true);
  });

  it("reads starter USD from env", () => {
    vi.stubEnv("NEXT_PUBLIC_PLAN_PRICE_STARTER_USD", "12");
    expect(getMonthlyUsdCents("starter")).toBe(1200);
    expect(formatPlanMoneyHeadline("starter")).toBe("$12/mo");
    expect(planPriceConfigured("starter")).toBe(true);
  });

  it("missing env shows checkout fallback for paid", () => {
    expect(formatPlanMoneyHeadline("pro")).toBe("Price on checkout");
    expect(planPriceConfigured("pro")).toBe(false);
  });
});

```
### src/lib/plan-pricing-display.ts

```typescript
import type { PlanId } from "@/lib/plans";

/**
 * Public marketing/list prices (USD / month) — must match what you configure in Stripe Products.
 * Set in `.env.local` so the Plans modal can show money next to each tier without calling Stripe from the browser.
 */
export function getMonthlyUsdCents(planId: PlanId): number | null {
  if (planId === "free") return 0;
  const raw =
    planId === "starter"
      ? process.env.NEXT_PUBLIC_PLAN_PRICE_STARTER_USD
      : planId === "pro"
        ? process.env.NEXT_PUBLIC_PLAN_PRICE_PRO_USD
        : planId === "team"
          ? process.env.NEXT_PUBLIC_PLAN_PRICE_TEAM_USD
          : undefined;
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** e.g. "$12/mo" or "Set price in env" when missing (paid tiers only). */
export function formatPlanMoneyHeadline(planId: PlanId): string {
  if (planId === "free") return "$0";
  const cents = getMonthlyUsdCents(planId);
  if (cents === null) return "Price on checkout";
  if (cents === 0) return "$0";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`;
}

export function planPriceConfigured(planId: PlanId): boolean {
  if (planId === "free") return true;
  return getMonthlyUsdCents(planId) !== null;
}

```
### src/lib/plans.ts

```typescript
import type { ModelTier } from "@/lib/types";

export type PlanId = "free" | "starter" | "pro" | "team";

export type QuantumFeatureKey = "kolmogorov" | "holographic" | "dna";

export interface PlanDefinition {
  id: PlanId;
  label: string;
  subtitle: string;
  /** Credits added at the start of each calendar month (client-side bookkeeping). */
  monthlyCredits: number;
  allowedModels: readonly ModelTier[];
  /** Relative capability emphasis (shown in UI; server routing unchanged). */
  modelHighlights: Record<ModelTier, string>;
  features: {
    thinking: boolean;
    agent: boolean;
    schrodinger: boolean;
    kolmogorov: boolean;
    holographic: boolean;
    dna: boolean;
    communityDebate: boolean;
  };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    subtitle: "Try the core chat experience",
    monthlyCredits: 400,
    allowedModels: ["glm-4-flash"],
    modelHighlights: {
      "glm-4-flash": "Fast default — included",
      "glm-4-air": "Upgrade to Starter",
      "glm-4-plus": "Upgrade to Starter",
      "glm-4-long": "Upgrade to Pro",
      "glm-4": "Upgrade to Pro",
    },
    features: {
      thinking: true,
      agent: false,
      schrodinger: false,
      kolmogorov: false,
      holographic: false,
      dna: false,
      communityDebate: true,
    },
  },
  starter: {
    id: "starter",
    label: "Starter",
    subtitle: "Stronger models + agent tools",
    monthlyCredits: 4_000,
    allowedModels: ["glm-4-flash", "glm-4-air", "glm-4-plus"],
    modelHighlights: {
      "glm-4-flash": "Quick answers",
      "glm-4-air": "Balanced daily driver",
      "glm-4-plus": "Code & reasoning",
      "glm-4-long": "Upgrade to Pro for long context",
      "glm-4": "Upgrade to Pro for flagship quality",
    },
    features: {
      thinking: true,
      agent: true,
      schrodinger: false,
      kolmogorov: true,
      holographic: true,
      dna: false,
      communityDebate: true,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    subtitle: "Full stack: dual-model, DNA, long context",
    monthlyCredits: 25_000,
    allowedModels: ["glm-4-flash", "glm-4-air", "glm-4-plus", "glm-4-long", "glm-4"],
    modelHighlights: {
      "glm-4-flash": "Fast",
      "glm-4-air": "Balanced",
      "glm-4-plus": "Code / tools",
      "glm-4-long": "Long documents",
      "glm-4": "Richest reasoning",
    },
    features: {
      thinking: true,
      agent: true,
      schrodinger: true,
      kolmogorov: true,
      holographic: true,
      dna: true,
      communityDebate: true,
    },
  },
  team: {
    id: "team",
    label: "Team",
    subtitle: "Same capabilities as Pro — higher monthly pool",
    monthlyCredits: 80_000,
    allowedModels: ["glm-4-flash", "glm-4-air", "glm-4-plus", "glm-4-long", "glm-4"],
    modelHighlights: {
      "glm-4-flash": "Fast",
      "glm-4-air": "Balanced",
      "glm-4-plus": "Code / tools",
      "glm-4-long": "Long documents",
      "glm-4": "Flagship",
    },
    features: {
      thinking: true,
      agent: true,
      schrodinger: true,
      kolmogorov: true,
      holographic: true,
      dna: true,
      communityDebate: true,
    },
  },
};

export const DEFAULT_PLAN: PlanId = "free";

/** One-time welcome grant so new users can explore credit spend before monthly accrual. */
export const FIRST_VISIT_CREDIT_BONUS = 120;

export function planAllowsModel(plan: PlanDefinition, model: ModelTier): boolean {
  return plan.allowedModels.includes(model);
}

```
### src/lib/quantum-error-correction.ts

````typescript
import type { ErrorCorrectionLogEntry } from "./types";

export function correctDraft(text: string): string {
  let t = text.replace(/\s+\n/g, "\n").trim();
  if (t.endsWith("...") && t.length > 20) {
    t = `${t.slice(0, -3).trimEnd()}…`;
  }
  return t;
}

export function looksLikeRateLimitMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("429") ||
    m.includes("too many requests") ||
    m.includes("quota")
  );
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: { log: (e: ErrorCorrectionLogEntry) => void; maxRetries?: number },
): Promise<T> {
  const max = opts.maxRetries ?? 3;
  let delay = 400;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isRate = looksLikeRateLimitMessage(msg);
      opts.log({
        at: Date.now(),
        kind: isRate ? "rate_limit" : "api_malformed",
        detail: msg.slice(0, 500),
      });
      if (!isRate || i === max - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 8000);
    }
  }
  throw new Error("withBackoff: unreachable");
}

export async function executeToolWithRetry(
  run: () => Promise<string>,
  opts: { log: (e: ErrorCorrectionLogEntry) => void },
): Promise<string> {
  try {
    return await run();
  } catch (e) {
    opts.log({
      at: Date.now(),
      kind: "tool_retry",
      detail: e instanceof Error ? e.message : String(e),
    });
    try {
      return await run();
    } catch (e2) {
      return `tool error: ${e2 instanceof Error ? e2.message : String(e2)}`;
    }
  }
}

export function tryRepairJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = candidate.slice(start, end + 1);
  try {
    JSON.parse(slice);
    return slice;
  } catch {
    return null;
  }
}

````
### src/lib/reminders.ts

```typescript
import { lsKey } from "./storage";

const KEY = lsKey("reminders_v1");

export type Reminder = {
  id: string;
  text: string;
  triggerAt: number;
  createdAt: number;
};

function loadAll(): Reminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

function saveAll(items: Reminder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listReminders(): Reminder[] {
  return loadAll().sort((a, b) => a.triggerAt - b.triggerAt);
}

export function addReminder(r: Reminder) {
  const all = loadAll();
  all.push(r);
  saveAll(all);
}

export function removeReminder(id: string) {
  saveAll(loadAll().filter((x) => x.id !== id));
}

export function dueReminders(now = Date.now()): Reminder[] {
  return loadAll().filter((r) => r.triggerAt <= now);
}

/** Parse "remind me ... in 30 minutes" style lines from a user message */
export function parseReminderFromMessage(text: string): { reminderText: string; at: number } | null {
  const t = text.trim();
  const lower = t.toLowerCase();
  if (!/\bremind\b/.test(lower)) return null;

  const relMin = lower.match(/\bin\s+(\d+)\s*(?:minute|minutes|min)\b/);
  const relHour = lower.match(/\bin\s+(\d+)\s*(?:hour|hours)\b/);
  const relSec = lower.match(/\bin\s+(\d+)\s*(?:second|seconds|sec)\b/);
  let ms = 0;
  if (relMin) ms += Number(relMin[1]) * 60_000;
  if (relHour) ms += Number(relHour[1]) * 3_600_000;
  if (relSec) ms += Number(relSec[1]) * 1000;
  if (!ms && /\bin an hour\b/.test(lower)) ms = 3_600_000;
  if (!ms && /\bin half an hour\b/.test(lower)) ms = 1_800_000;
  if (!ms) return null;

  const stripped = t.replace(/^[^:]*remind(?:\s+me)?\s*(?:about|to)?\s*/i, "").replace(/\s+in\s+.*$/i, "");
  const reminderText = stripped.trim() || t;
  return { reminderText, at: Date.now() + ms };
}

```
### src/lib/request-origin.ts

```typescript
import type { NextRequest } from "next/server";

/** Public base URL for Stripe redirects. Prefer NEXT_PUBLIC_APP_URL in production. */
export function requestAppOrigin(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) {
    return env.replace(/\/$/, "");
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "127.0.0.1:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

```
### src/lib/resonance.ts

```typescript
export function resonanceScore(text: string, replies: string[]): number {
  if (!replies.length) return 0;
  const words = new Set(text.toLowerCase().match(/\w{4,}/g) ?? []);
  let hit = 0;
  for (const r of replies) {
    for (const w of r.toLowerCase().match(/\w{4,}/g) ?? []) {
      if (words.has(w)) hit++;
    }
  }
  return Math.min(100, Math.round((hit / (replies.length * 8 + 1)) * 100));
}

```
### src/lib/retrocausal-prediction.ts

```typescript
export function predictNextUserIntent(lastUser: string): string[] {
  const q = lastUser.toLowerCase();
  const out: string[] = [];
  if (q.includes("code")) out.push("Ask for tests or edge cases");
  if (q.includes("explain")) out.push("Request a shorter summary");
  if (q.length < 40) out.push("Add constraints or examples");
  if (!out.length) out.push("Iterate on the strongest objection");
  return out;
}

```
### src/lib/schrodinger-pair.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { schrodingerPair } from "@/lib/schrodinger-pair";

describe("schrodingerPair", () => {
  it("uses default counterpart when allowed", () => {
    const p = schrodingerPair("glm-4-flash", ["glm-4-flash", "glm-4-air", "glm-4-plus"]);
    expect(p).toEqual({ modelA: "glm-4-flash", modelB: "glm-4-air" });
  });

  it("falls back to another allowed tier when counterpart missing", () => {
    const p = schrodingerPair("glm-4-flash", ["glm-4-flash", "glm-4-plus"]);
    expect(p.modelA).toBe("glm-4-flash");
    expect(p.modelB).toBe("glm-4-plus");
  });

  it("picks any other allowed tier when counterpart missing", () => {
    const p = schrodingerPair("glm-4-long", ["glm-4-flash", "glm-4-air"]);
    expect(p.modelA).toBe("glm-4-long");
    expect(p.modelB).toBe("glm-4-flash");
  });
});

```
### src/lib/schrodinger-pair.ts

```typescript
import type { ModelTier } from "@/lib/types";

const DEFAULT_COUNTERPART: Record<ModelTier, ModelTier> = {
  "glm-4-flash": "glm-4-air",
  "glm-4-air": "glm-4-flash",
  "glm-4-plus": "glm-4-air",
  "glm-4-long": "glm-4-plus",
  "glm-4": "glm-4-long",
};

/** Prefer flash ↔ air when plan allows both (distinct race when primary has no other tier). */
const PAIR_FALLBACK: ModelTier[] = ["glm-4-flash", "glm-4-air"];

/**
 * Picks a distinct second model for dual-stream "race" mode.
 * If the default counterpart is not on the user's plan, picks another allowed tier ≠ primary.
 */
export function schrodingerPair(
  primary: ModelTier,
  allowedModels: readonly ModelTier[],
): { modelA: ModelTier; modelB: ModelTier } {
  const preferred = DEFAULT_COUNTERPART[primary];
  if (allowedModels.includes(preferred) && preferred !== primary) {
    return { modelA: primary, modelB: preferred };
  }
  const other = allowedModels.find((m) => m !== primary);
  if (other) {
    return { modelA: primary, modelB: other };
  }
  const [a, b] = PAIR_FALLBACK;
  if (allowedModels.includes(a) && allowedModels.includes(b)) {
    return primary === a ? { modelA: a, modelB: b } : { modelA: b, modelB: a };
  }
  return { modelA: primary, modelB: primary };
}

```
### src/lib/server-billing.ts

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { BillingAlertPayload } from "@/lib/billing-usage-hints";

/** Shown in-app after Stripe `invoice.payment_failed` until cleared by `invoice.paid` or successful checkout. */
export type PaymentAlert = {
  at: string;
  invoiceId: string | null;
  attemptCount: number | null;
};

export type ServerBillingRecord = {
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  paymentAlert: PaymentAlert | null;
};

const DATA_DIR = join(process.cwd(), ".data");
const BILLING_FILE = join(DATA_DIR, "billing.json");

function defaultBilling(): ServerBillingRecord {
  return {
    customerId: null,
    subscriptionId: null,
    status: null,
    priceId: null,
    paymentAlert: null,
  };
}

export function readServerBilling(): ServerBillingRecord {
  if (!existsSync(BILLING_FILE)) {
    return defaultBilling();
  }
  try {
    const raw = readFileSync(BILLING_FILE, "utf-8");
    const p = JSON.parse(raw) as Partial<ServerBillingRecord>;
    let paymentAlert: PaymentAlert | null = null;
    if (p.paymentAlert && typeof p.paymentAlert === "object") {
      const a = p.paymentAlert as Partial<PaymentAlert>;
      if (typeof a.at === "string") {
        paymentAlert = {
          at: a.at,
          invoiceId: typeof a.invoiceId === "string" ? a.invoiceId : null,
          attemptCount: typeof a.attemptCount === "number" ? a.attemptCount : null,
        };
      }
    }
    return {
      customerId: typeof p.customerId === "string" ? p.customerId : null,
      subscriptionId: typeof p.subscriptionId === "string" ? p.subscriptionId : null,
      status: typeof p.status === "string" ? p.status : null,
      priceId: typeof p.priceId === "string" ? p.priceId : null,
      paymentAlert,
    };
  } catch {
    return defaultBilling();
  }
}

export function writeServerBilling(next: ServerBillingRecord): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(BILLING_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export function recordPaymentFailure(alert: PaymentAlert): void {
  const prev = readServerBilling();
  writeServerBilling({ ...prev, paymentAlert: alert });
}

export function clearPaymentAlert(): void {
  const prev = readServerBilling();
  if (!prev.paymentAlert) return;
  writeServerBilling({ ...prev, paymentAlert: null });
}

/** Client-safe banner for failed renewal (no Stripe ids). */
export function formatBillingAlertForClient(b: ServerBillingRecord): BillingAlertPayload | null {
  if (!b.paymentAlert) return null;
  const a = b.paymentAlert;
  const extra = a.attemptCount != null ? ` (attempt ${a.attemptCount})` : "";
  return {
    kind: "payment_failed",
    at: a.at,
    attemptCount: a.attemptCount,
    message: `Subscription payment failed${extra}. Update your payment method in Manage billing.`,
  };
}

```
### src/lib/server-config.ts

```typescript
/**
 * Optional deployment gate: password login + server-side wallet.
 * When BABYGPT_APP_PASSWORD is unset, the app behaves as a local-first dev UI (no login).
 */

/** Trim and strip a single pair of surrounding quotes (common .env copy/paste mistake). */
function normalizeEnvString(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  let s = raw.trim();
  if (!s) return undefined;
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

/** Resolved app password for login comparison (undefined if gate should be off). */
export function getAppPassword(): string | undefined {
  return normalizeEnvString(process.env.BABYGPT_APP_PASSWORD);
}

export function isGateEnabled(): boolean {
  return Boolean(getAppPassword());
}

export function getApiSecret(): string | undefined {
  return normalizeEnvString(process.env.BABYGPT_API_SECRET);
}

export function getSessionSecret(): string | undefined {
  return normalizeEnvString(process.env.BABYGPT_SESSION_SECRET);
}

```
### src/lib/server-wallet.ts

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { CreditsStateV1 } from "@/lib/credits-store";
import { DEFAULT_PLAN, FIRST_VISIT_CREDIT_BONUS, PLANS, type PlanId } from "@/lib/plans";

/** Persisted under project `.data/` (gitignored). */
const DATA_DIR = join(process.cwd(), ".data");
const WALLET_FILE = join(DATA_DIR, "wallet.json");

function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultWallet(): CreditsStateV1 {
  return {
    version: 1,
    planId: DEFAULT_PLAN,
    balance: 0,
    accrualMonth: monthKey(),
    welcomeApplied: false,
  };
}

function parseWallet(raw: string): CreditsStateV1 {
  try {
    const p = JSON.parse(raw) as CreditsStateV1;
    if (p?.version !== 1) return defaultWallet();
    return {
      ...defaultWallet(),
      ...p,
      planId: (p.planId ?? DEFAULT_PLAN) as PlanId,
      balance: typeof p.balance === "number" && p.balance >= 0 ? Math.floor(p.balance) : 0,
      accrualMonth: typeof p.accrualMonth === "string" ? p.accrualMonth : monthKey(),
      welcomeApplied: Boolean(p.welcomeApplied),
    };
  } catch {
    return defaultWallet();
  }
}

/** Monthly accrual + welcome — mirrors client `hydrateCredits`. */
export function hydrateServerWallet(state: CreditsStateV1): CreditsStateV1 {
  const next = { ...state };
  const m = monthKey();
  const monthly = PLANS[next.planId].monthlyCredits;
  if (next.accrualMonth !== m) {
    next.balance += monthly;
    next.accrualMonth = m;
  }
  if (!next.welcomeApplied) {
    next.balance += FIRST_VISIT_CREDIT_BONUS;
    next.welcomeApplied = true;
  }
  return next;
}

function ensureWalletFile(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(WALLET_FILE)) {
    const w = hydrateServerWallet(defaultWallet());
    writeFileSync(WALLET_FILE, JSON.stringify(w, null, 2), "utf-8");
  }
}

export function readServerWallet(): CreditsStateV1 {
  ensureWalletFile();
  const raw = readFileSync(WALLET_FILE, "utf-8");
  return hydrateServerWallet(parseWallet(raw));
}

export function writeServerWallet(state: CreditsStateV1): void {
  ensureWalletFile();
  writeFileSync(WALLET_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function tryDebitServerWallet(amount: number): { ok: boolean; wallet: CreditsStateV1 } {
  const w = readServerWallet();
  if (w.balance < amount) {
    return { ok: false, wallet: w };
  }
  const next: CreditsStateV1 = { ...w, balance: Math.max(0, w.balance - amount) };
  writeServerWallet(next);
  return { ok: true, wallet: next };
}

export function setServerPlan(planId: PlanId): CreditsStateV1 {
  const w = readServerWallet();
  const next = { ...w, planId };
  writeServerWallet(next);
  return next;
}

```
### src/lib/session-server.ts

```typescript
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getApiSecret, getSessionSecret, isGateEnabled } from "@/lib/server-config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * True when gate is off, or JWT cookie is valid, or Authorization Bearer matches BABYGPT_API_SECRET.
 */
export async function isRequestAuthorized(request: NextRequest): Promise<boolean> {
  if (!isGateEnabled()) {
    return true;
  }

  const apiSecret = getApiSecret();
  const auth = request.headers.get("authorization");
  if (apiSecret && auth === `Bearer ${apiSecret}`) {
    return true;
  }

  const secret = getSessionSecret();
  if (!secret) {
    return false;
  }

  const token = (await cookies()).get("babygpt_token")?.value;
  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

/** `null` means OK to proceed. */
export async function assertAuthorized(request: NextRequest): Promise<NextResponse | null> {
  const ok = await isRequestAuthorized(request);
  if (ok) {
    return null;
  }
  return NextResponse.json(
    { error: "Unauthorized — sign in or send Authorization: Bearer (API secret)." },
    { status: 401 },
  );
}

```
### src/lib/skill-model.ts

```typescript
export type Skill = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
  builtIn?: boolean;
};

```
### src/lib/skills.ts

```typescript
import { v4 as uuidv4 } from "uuid";
import { lsKey } from "./storage";
import { BUILT_IN_SKILLS } from "./built-in-skills";
import type { Skill } from "./skill-model";

export type { Skill } from "./skill-model";

const KEY = lsKey("skills_v1");

function isBrowser() {
  return typeof window !== "undefined";
}

function loadCustomOnly(): Skill[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Skill[];
  } catch {
    return [];
  }
}

export function loadAllSkills(): Skill[] {
  return [...BUILT_IN_SKILLS, ...loadCustomOnly()];
}

export function saveCustomSkills(skills: Skill[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(skills.filter((s) => !s.builtIn)));
}

export function createSkill(partial: Omit<Skill, "id" | "builtIn">): Skill {
  return {
    id: uuidv4(),
    builtIn: false,
    ...partial,
  };
}

export function deleteSkill(id: string) {
  const next = loadCustomOnly().filter((s) => s.id !== id);
  saveCustomSkills(next);
}

/** Pick best matching skill by naive keyword overlap with description */
export function suggestSkillForMessage(text: string): Skill | null {
  const skills = loadAllSkills();
  const words = new Set(text.toLowerCase().match(/\w{4,}/g) ?? []);
  let best: { s: Skill; score: number } | null = null;
  for (const s of skills) {
    const hay = `${s.name} ${s.description}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (hay.includes(w)) score += 1;
    }
    if (!best || score > best.score) best = { s, score };
  }
  if (!best || best.score < 2) return null;
  return best.s;
}

export function skillSystemPrompt(skill: Skill | null): string {
  if (!skill) return "";
  return `Active skill: ${skill.name}\nInstructions:\n${skill.prompt}`;
}

```
### src/lib/storage.ts

```typescript
export const LS_PREFIX = "babygpt_";

export function lsKey(name: string): string {
  return `${LS_PREFIX}${name}`;
}

```
### src/lib/stream-parse.test.ts

```typescript
import { describe, expect, it } from "vitest";
import { extractSseTextDelta, extractSseThinkingDelta } from "@/lib/stream-parse";

describe("stream-parse", () => {
  it("extractSseTextDelta reads OpenAI-style delta content", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: "hi" } }] })}\n`;
    expect(extractSseTextDelta(line)).toBe("hi");
  });

  it("extractSseThinkingDelta reads reasoning_content", () => {
    const line = `data: ${JSON.stringify({
      choices: [{ delta: { reasoning_content: "step 1" } }],
    })}\n`;
    expect(extractSseThinkingDelta(line)).toBe("step 1");
  });

  it("extractSseThinkingDelta reads thinking field", () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { thinking: "t" } }] })}\n`;
    expect(extractSseThinkingDelta(line)).toBe("t");
  });

  it("skips schrodinger winner lines for text", () => {
    const line = `data: ${JSON.stringify({ schrodinger: true, winner: "glm-4-flash" })}\n`;
    expect(extractSseTextDelta(line)).toBe("");
  });
});

```
### src/lib/stream-parse.ts

```typescript
import type { ErrorCorrectionLogEntry, ToolCall } from "./types";

export function extractSseTextDelta(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  try {
    const j = JSON.parse(payload) as {
      schrodinger?: boolean;
      winner?: string;
      babygpt_agent?: unknown;
      choices?: { delta?: { content?: string }; message?: { content?: string } }[];
    };
    if (j.schrodinger) return "";
    const c =
      j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? "";
    return typeof c === "string" ? c : "";
  } catch {
    return "";
  }
}

/** Extended reasoning / chain-of-thought chunks (GLM thinking mode, OpenAI-style reasoning, etc.). */
export function extractSseThinkingDelta(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  try {
    const j = JSON.parse(payload) as {
      schrodinger?: boolean;
      babygpt_agent?: unknown;
      choices?: {
        delta?: {
          reasoning_content?: string;
          thinking?: string;
        };
      }[];
    };
    if (j.schrodinger || j.babygpt_agent) return "";
    const d = j.choices?.[0]?.delta;
    if (!d) return "";
    const t = d.reasoning_content ?? d.thinking ?? "";
    return typeof t === "string" ? t : "";
  } catch {
    return "";
  }
}

export type AgentStreamMeta = {
  toolCalls: ToolCall[];
  errorCorrectionLog: ErrorCorrectionLogEntry[];
  routingReason: string;
};

export function parseSseAgentMeta(line: string): AgentStreamMeta | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  try {
    const j = JSON.parse(payload) as {
      babygpt_agent?: {
        toolCalls?: ToolCall[];
        errorCorrectionLog?: ErrorCorrectionLogEntry[];
        routingReason?: string;
      };
    };
    if (!j.babygpt_agent) return null;
    return {
      toolCalls: j.babygpt_agent.toolCalls ?? [],
      errorCorrectionLog: j.babygpt_agent.errorCorrectionLog ?? [],
      routingReason: j.babygpt_agent.routingReason ?? "",
    };
  } catch {
    return null;
  }
}

```
### src/lib/stripe-billing-context.ts

```typescript
import { getStripe } from "@/lib/stripe-client";
import type { ServerBillingRecord } from "@/lib/server-billing";

/**
 * Read-only Stripe facts for billing copilot / support (no secrets).
 * Best-effort: upcoming invoice may be unavailable if the customer has no subscription.
 */
export async function buildStripeBillingFacts(billing: ServerBillingRecord): Promise<{
  facts: string;
  error?: string;
}> {
  if (!billing.customerId) {
    return { facts: "", error: "No Stripe customer on this account yet. Subscribe once to create one." };
  }

  const stripe = getStripe();
  const lines: string[] = [];

  try {
    const c = await stripe.customers.retrieve(billing.customerId);
    if (typeof c !== "object" || ("deleted" in c && c.deleted)) {
      lines.push(`Customer ${billing.customerId} missing or deleted in Stripe.`);
    } else {
      lines.push(`Stripe customer: ${c.id}`);
      if (c.email) lines.push(`Email on file: ${c.email}`);
      if (c.name) lines.push(`Name: ${c.name}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "customer retrieve failed";
    return { facts: "", error: msg };
  }

  const subId = billing.subscriptionId;
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      lines.push(`Subscription: ${sub.id} status=${sub.status}`);
      lines.push(`Current period end (UTC): ${new Date(sub.current_period_end * 1000).toISOString()}`);
      const price = sub.items.data[0]?.price;
      if (price?.unit_amount != null && price.currency) {
        lines.push(
          `Recurring price: ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()} / ${price.recurring?.interval ?? "?"}`,
        );
      }
    } catch (e) {
      lines.push(`Subscription retrieve failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  } else {
    lines.push("No subscription id stored locally (may still be syncing).");
  }

  try {
    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: billing.customerId,
    });
    const total = upcoming.total != null ? (upcoming.total / 100).toFixed(2) : "?";
    lines.push(`Upcoming invoice estimate: ${total} ${upcoming.currency?.toUpperCase() ?? ""}`.trim());
    if (upcoming.next_payment_attempt) {
      lines.push(`Next payment attempt: ${new Date(upcoming.next_payment_attempt * 1000).toISOString()}`);
    }
  } catch {
    lines.push("Upcoming invoice: not available (no renewal scheduled, incomplete setup, or one-off customer).");
  }

  return { facts: lines.join("\n") };
}

```
### src/lib/stripe-client.ts

```typescript
import Stripe from "stripe";

let instance: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!instance) {
    instance = new Stripe(key);
  }
  return instance;
}

```
### src/lib/stripe-config.test.ts

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStripeConfigured, planIdFromStripePriceId, stripePriceIdForPlan } from "./stripe-config";

describe("stripe-config", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_PRICE_STARTER", "");
    vi.stubEnv("STRIPE_PRICE_PRO", "");
    vi.stubEnv("STRIPE_PRICE_TEAM", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isStripeConfigured is false without secret key", () => {
    expect(isStripeConfigured()).toBe(false);
  });

  it("isStripeConfigured is true when STRIPE_SECRET_KEY is set", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xxx");
    expect(isStripeConfigured()).toBe(true);
  });

  it("stripePriceIdForPlan maps env to price ids", () => {
    vi.stubEnv("STRIPE_PRICE_STARTER", "price_starter_1");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro_1");
    vi.stubEnv("STRIPE_PRICE_TEAM", "price_team_1");
    expect(stripePriceIdForPlan("starter")).toBe("price_starter_1");
    expect(stripePriceIdForPlan("pro")).toBe("price_pro_1");
    expect(stripePriceIdForPlan("team")).toBe("price_team_1");
    expect(stripePriceIdForPlan("free")).toBeNull();
  });

  it("planIdFromStripePriceId resolves from env", () => {
    vi.stubEnv("STRIPE_PRICE_STARTER", "price_a");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_b");
    vi.stubEnv("STRIPE_PRICE_TEAM", "price_c");
    expect(planIdFromStripePriceId("price_b")).toBe("pro");
    expect(planIdFromStripePriceId("unknown")).toBeNull();
    expect(planIdFromStripePriceId(null)).toBeNull();
  });
});

```
### src/lib/stripe-config.ts

```typescript
import type { PlanId } from "@/lib/plans";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

/** Stripe Price IDs (Dashboard → Products → Price ID) for subscription mode. */
export function stripePriceIdForPlan(planId: PlanId): string | null {
  const m: Record<PlanId, string | undefined> = {
    free: undefined,
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    team: process.env.STRIPE_PRICE_TEAM,
  };
  const v = m[planId]?.trim();
  return v || null;
}

export function planIdFromStripePriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const pairs: [string | undefined, PlanId][] = [
    [process.env.STRIPE_PRICE_STARTER?.trim(), "starter"],
    [process.env.STRIPE_PRICE_PRO?.trim(), "pro"],
    [process.env.STRIPE_PRICE_TEAM?.trim(), "team"],
  ];
  for (const [pid, plan] of pairs) {
    if (pid && pid === priceId) return plan;
  }
  return null;
}

```
### src/lib/stripe-sync.test.ts

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const writeServerBilling = vi.fn();
const readServerBilling = vi.fn();
const setServerPlan = vi.fn();

vi.mock("./server-billing", () => ({
  readServerBilling: () => readServerBilling(),
  writeServerBilling: (r: unknown) => writeServerBilling(r),
}));

vi.mock("./server-wallet", () => ({
  setServerPlan: (id: unknown) => setServerPlan(id),
}));

vi.mock("./stripe-config", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./stripe-config")>();
  return {
    ...mod,
    planIdFromStripePriceId: (id: string | null | undefined) =>
      id === "price_map_pro" ? "pro" : id === "price_map_starter" ? "starter" : null,
  };
});

import { applyStripeSubscription, clearStripeSubscriptionToFree } from "./stripe-sync";

function mockSub(overrides: Partial<{ status: Stripe.Subscription.Status; priceId: string; customer: string }>): Stripe.Subscription {
  const status = overrides.status ?? "active";
  const priceId = overrides.priceId ?? "price_map_pro";
  const customer = overrides.customer ?? "cus_test";
  return {
    id: "sub_test",
    object: "subscription",
    status,
    customer,
    items: {
      object: "list",
      data: [{ id: "si_1", price: { id: priceId } }],
    },
  } as Stripe.Subscription;
}

describe("stripe-sync", () => {
  beforeEach(() => {
    writeServerBilling.mockClear();
    setServerPlan.mockClear();
    readServerBilling.mockReturnValue({
      customerId: "cus_prev",
      subscriptionId: "sub_old",
      status: "active",
      priceId: "price_old",
    });
  });

  it("applyStripeSubscription sets plan from price when subscription is active", () => {
    applyStripeSubscription(mockSub({ status: "active", priceId: "price_map_pro" }));
    expect(writeServerBilling).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_test",
        subscriptionId: "sub_test",
        status: "active",
        priceId: "price_map_pro",
      }),
    );
    expect(setServerPlan).toHaveBeenCalledWith("pro");
  });

  it("applyStripeSubscription sets starter when price maps to starter", () => {
    applyStripeSubscription(mockSub({ priceId: "price_map_starter" }));
    expect(setServerPlan).toHaveBeenCalledWith("starter");
  });

  it("applyStripeSubscription sets free when status is canceled", () => {
    applyStripeSubscription(mockSub({ status: "canceled" }));
    expect(setServerPlan).toHaveBeenCalledWith("free");
  });

  it("clearStripeSubscriptionToFree resets billing and plan", () => {
    clearStripeSubscriptionToFree("cus_keep");
    expect(writeServerBilling).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_keep",
        subscriptionId: null,
        status: "canceled",
        priceId: null,
      }),
    );
    expect(setServerPlan).toHaveBeenCalledWith("free");
  });
});

```
### src/lib/stripe-sync.ts

```typescript
import type Stripe from "stripe";
import type { PlanId } from "@/lib/plans";
import { DEFAULT_PLAN } from "@/lib/plans";
import { setServerPlan } from "@/lib/server-wallet";
import { planIdFromStripePriceId } from "@/lib/stripe-config";
import { readServerBilling, writeServerBilling, type ServerBillingRecord } from "@/lib/server-billing";

function activeStatuses(): Set<string> {
  const grace = process.env.STRIPE_GRACE_PAST_DUE?.trim() === "1";
  return new Set(grace ? ["active", "trialing", "past_due"] : ["active", "trialing"]);
}

function resolvePlanFromSubscription(sub: Stripe.Subscription): PlanId {
  const priceId = sub.items.data[0]?.price?.id;
  return planIdFromStripePriceId(priceId) ?? DEFAULT_PLAN;
}

/**
 * Syncs wallet plan + `.data/billing.json` from a Stripe Subscription object.
 */
export function applyStripeSubscription(sub: Stripe.Subscription): PlanId {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const prev = readServerBilling();
  const billing: ServerBillingRecord = {
    ...prev,
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    priceId,
  };
  writeServerBilling(billing);

  const ACTIVE = activeStatuses();
  let planId: PlanId = DEFAULT_PLAN;
  if (ACTIVE.has(sub.status)) {
    planId = resolvePlanFromSubscription(sub);
  } else {
    planId = DEFAULT_PLAN;
  }

  setServerPlan(planId);
  return planId;
}

/**
 * Clears subscription to Free (e.g. canceled / unpaid).
 */
export function clearStripeSubscriptionToFree(customerId?: string | null): void {
  const prev = readServerBilling();
  writeServerBilling({
    ...prev,
    customerId: customerId ?? prev.customerId,
    subscriptionId: null,
    status: "canceled",
    priceId: null,
  });
  setServerPlan(DEFAULT_PLAN);
}

```
### src/lib/time-capsule.ts

```typescript
import { lsKey } from "@/lib/storage";

const KEY = lsKey("time_capsule_v1");

export type TimeCapsule = {
  id: string;
  message: string;
  revealAt: number;
  createdAt: number;
  /** Set when user dismissed the reveal modal */
  openedAt?: number;
};

function loadAll(): TimeCapsule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TimeCapsule[];
  } catch {
    return [];
  }
}

function saveAll(items: TimeCapsule[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listTimeCapsules(): TimeCapsule[] {
  return loadAll().sort((a, b) => a.revealAt - b.revealAt);
}

export function addTimeCapsule(c: TimeCapsule) {
  const all = loadAll();
  all.push(c);
  saveAll(all);
}

export function removeTimeCapsule(id: string) {
  saveAll(loadAll().filter((x) => x.id !== id));
}

export function markCapsuleOpened(id: string) {
  const all = loadAll();
  const i = all.findIndex((x) => x.id === id);
  if (i === -1) return;
  all[i] = { ...all[i], openedAt: Date.now() };
  saveAll(all);
}

/** Next capsule whose time has passed and was not opened yet. */
export function nextDueTimeCapsule(now = Date.now()): TimeCapsule | null {
  const all = loadAll();
  const pending = all.filter((c) => c.revealAt <= now && !c.openedAt);
  pending.sort((a, b) => a.revealAt - b.revealAt);
  return pending[0] ?? null;
}

```
### src/lib/tools/calculator.ts

```typescript
import type { ToolDefinition } from "./types";

const SAFE = /^[0-9+\-*/().\s]+$/;

export const calculatorTool: ToolDefinition = {
  name: "calculator",
  description: "Evaluate a numeric arithmetic expression safely (+ - * / parentheses).",
  parametersSchema: {
    type: "object",
    properties: {
      expression: { type: "string", description: 'Expression like "2*(3+4)"' },
    },
    required: ["expression"],
  },
  async execute(args) {
    const expr = String(args.expression ?? "").trim();
    if (!expr) return "Error: empty expression";
    if (!SAFE.test(expr)) return "Error: only digits, + - * / ( ) and spaces allowed";
    try {
      const fn = new Function(`"use strict"; return (${expr});`);
      const v = fn();
      if (typeof v !== "number" || !Number.isFinite(v)) return "Error: invalid result";
      return String(v);
    } catch (e) {
      return `calculator error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

```
### src/lib/tools/code-executor.ts

```typescript
import type { ToolDefinition } from "./types";

const MAX_LEN = 4000;

export const codeExecutorTool: ToolDefinition = {
  name: "code_executor",
  description:
    "Run a short JavaScript expression in a restricted sandbox (Math/JSON/console.log only; no imports).",
  parametersSchema: {
    type: "object",
    properties: {
      code: { type: "string", description: "Single expression returning a printable value" },
    },
    required: ["code"],
  },
  async execute(args) {
    let code = String(args.code ?? "");
    if (code.length > MAX_LEN) code = code.slice(0, MAX_LEN);
    if (!code.trim()) return "Error: empty code";
    const logs: string[] = [];
    const consoleStub = {
      log: (...items: unknown[]) => {
        logs.push(items.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
      },
    };
    try {
      const fn = new Function(
        "Math",
        "JSON",
        "console",
        `"use strict"; return (${code});`,
      );
      const out = fn(Math, JSON, consoleStub);
      const printed = logs.length ? `${logs.join("\n")}\n` : "";
      if (typeof out === "string") return printed + out.slice(0, 8000);
      try {
        return printed + JSON.stringify(out, null, 2).slice(0, 8000);
      } catch {
        return printed + String(out).slice(0, 8000);
      }
    } catch (e) {
      return `code_executor error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

```
### src/lib/tools/index.ts

```typescript
import { calculatorTool } from "./calculator";
import { codeExecutorTool } from "./code-executor";
import type { ToolDefinition } from "./types";
import { webReaderTool } from "./web-reader";
import { webSearchTool } from "./web-search";

export const ALL_TOOLS: ToolDefinition[] = [
  webSearchTool,
  webReaderTool,
  calculatorTool,
  codeExecutorTool,
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

export function toolsPromptBlock(): string {
  return ALL_TOOLS.map(
    (t) =>
      `- ${t.name}: ${t.description}\n  Parameters JSON schema: ${JSON.stringify(t.parametersSchema)}`,
  ).join("\n");
}

```
### src/lib/tools/types.ts

```typescript
import type ZAI from "z-ai-web-dev-sdk";

export type ZaiInstance = InstanceType<typeof ZAI>;

export type ToolContext = {
  /** Present when using Z.AI backend (enables `web_search` via platform function). */
  zai?: ZaiInstance;
};

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON-schema-like object for the agent prompt */
  parametersSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}

```
### src/lib/tools/web-reader.ts

```typescript
import type { ToolDefinition } from "./types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const webReaderTool: ToolDefinition = {
  name: "web_reader",
  description: "Fetch a public URL and return readable plain text (best-effort extraction).",
  parametersSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "HTTP or HTTPS URL" },
    },
    required: ["url"],
  },
  async execute(args) {
    const url = String(args.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) return "Error: url must start with http:// or https://";
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: {
          "User-Agent": "BabyGPT-Agent/1.0 (educational)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
      });
      const ct = res.headers.get("content-type") ?? "";
      const buf = await res.arrayBuffer();
      const text = new TextDecoder("utf-8").decode(buf);
      if (ct.includes("text/html")) {
        const plain = stripHtml(text).slice(0, 12000);
        return plain || "(empty body)";
      }
      return text.slice(0, 12000);
    } catch (e) {
      return `web_reader failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      clearTimeout(t);
    }
  },
};

```
### src/lib/tools/web-search.ts

```typescript
import type { ToolDefinition } from "./types";

/** DuckDuckGo lite + optional Z.AI web_search. Full browser automation (e.g. OpenClaw-style Playwright agents) is out of scope here — run as a separate service if you need it. */
async function duckDuckGoLite(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { headers: { "User-Agent": "BabyGPT/1.0 (tool)" } });
  const j = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: { Text?: string }[];
  };
  const parts: string[] = [];
  if (j.AbstractText) parts.push(j.AbstractText);
  if (j.AbstractURL) parts.push(`Source: ${j.AbstractURL}`);
  if (j.RelatedTopics?.length) {
    parts.push(
      ...j.RelatedTopics.slice(0, 5).map((t) => t.Text).filter(Boolean) as string[],
    );
  }
  return parts.length
    ? parts.join("\n")
    : "No instant DuckDuckGo summary. Try a more specific query, or configure Z.AI for full web search.";
}

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  description: "Search the public web for current facts, news, documentation, or links.",
  parametersSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      num: { type: "number", description: "Max results (default 5)" },
    },
    required: ["query"],
  },
  async execute(args, ctx) {
    const query = String(args.query ?? "").trim();
    if (!query) return "Error: empty query";
    const num = Math.min(10, Math.max(1, Number(args.num ?? 5)));
    void num;
    try {
      if (ctx.zai) {
        const raw = await ctx.zai.functions.invoke("web_search", { query, num });
        if (typeof raw === "string") return raw;
        return JSON.stringify(raw, null, 2);
      }
      return await duckDuckGoLite(query);
    } catch (e) {
      return `web_search failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

```
### src/lib/types.ts

```typescript
export type ModelTier =
  | "glm-4-flash"
  | "glm-4-air"
  | "glm-4-plus"
  | "glm-4-long"
  | "glm-4";

export type Role = "system" | "user" | "assistant";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: string;
}

export type ErrorCorrectionKind = "tool_retry" | "parse_fix" | "rate_limit" | "api_malformed";

export interface ErrorCorrectionLogEntry {
  at: number;
  kind: ErrorCorrectionKind;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  thinking?: string;
  createdAt: number;
  toolCalls?: ToolCall[];
  errorCorrectionLog?: ErrorCorrectionLogEntry[];
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export const QUANTUM_FEATURES = [
  { id: "schrodinger", name: "Schrödinger Chat", description: "Dual-model racing" },
  { id: "kolmogorov", name: "Kolmogorov Router", description: "Complexity-aware routing" },
  { id: "holographic", name: "Holographic Context", description: "Token-aware context folding" },
  { id: "dna", name: "Eigenresponse / DNA", description: "Style lock from prior turns" },
  { id: "bloch", name: "Bloch Sphere", description: "Intent state visualization" },
  { id: "entangle", name: "Entanglement", description: "Linked thread coherence" },
  { id: "adiabatic", name: "Adiabatic Prompts", description: "Smooth prompt morphing" },
  { id: "qec", name: "Quantum Error Correction", description: "Self-healing drafts" },
  { id: "topology", name: "Conversation Topology", description: "Branch graph view" },
  { id: "retro", name: "Retrocausal Prediction", description: "Next-turn priors" },
] as const;

```
### src/lib/ui-preferences.ts

```typescript
import { lsKey } from "@/lib/storage";

const KEY = lsKey("ui_prefs_v1");

export type UiPreferences = {
  /** Multiplier for root font size (0.85–1.35). */
  fontScale: number;
  /** Shell palette: dark (default), OLED black, or light gray. */
  appearance: "dark" | "oled" | "light";
  /** User opted in to Notification API prompts / toasts that can use system notifications. */
  notificationsEnabled: boolean;
};

const DEFAULTS: UiPreferences = {
  fontScale: 1,
  appearance: "dark",
  notificationsEnabled: false,
};

function clampScale(n: number): number {
  if (!Number.isFinite(n)) return DEFAULTS.fontScale;
  return Math.min(1.35, Math.max(0.85, Math.round(n * 100) / 100));
}

export function loadUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<UiPreferences>;
    const legacy = p as { theme?: string };
    let appearance: UiPreferences["appearance"] = "dark";
    if (p.appearance === "light" || p.appearance === "oled") appearance = p.appearance;
    else if (legacy.theme === "light") appearance = "light";

    return {
      fontScale: clampScale(typeof p.fontScale === "number" ? p.fontScale : DEFAULTS.fontScale),
      appearance,
      notificationsEnabled: Boolean(p.notificationsEnabled),
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveUiPreferences(next: UiPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...next,
      fontScale: clampScale(next.fontScale),
    }),
  );
}

/** Apply CSS variables + html classes (call on load and after save). */
export function applyUiPreferences(p: UiPreferences): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--babygpt-font-scale", String(p.fontScale));
  root.dataset.babygptAppearance = p.appearance;
  root.classList.toggle("babygpt-appearance-light", p.appearance === "light");
  root.classList.toggle("babygpt-appearance-oled", p.appearance === "oled");
}

/** Outer app root background (fills viewport). */
export function appRootBgClass(appearance: UiPreferences["appearance"]): string {
  if (appearance === "light") return "bg-zinc-100";
  if (appearance === "oled") return "bg-black";
  return "bg-zinc-950";
}

/** Header strip classes. */
export function headerShellClass(appearance: UiPreferences["appearance"]): string {
  if (appearance === "light") {
    return "flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 text-zinc-900 shadow-sm backdrop-blur";
  }
  if (appearance === "oled") {
    return "flex items-center justify-between gap-3 border-b border-zinc-800 bg-black/70 px-4 py-3 backdrop-blur";
  }
  return "flex items-center justify-between gap-3 border-b border-zinc-900 bg-zinc-950/60 px-4 py-3 backdrop-blur";
}

/** Sub-banner (streaming / errors) row. */
export function subBannerClass(appearance: UiPreferences["appearance"]): string {
  if (appearance === "light") {
    return "flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-200/60 px-4 py-2";
  }
  if (appearance === "oled") {
    return "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/40 px-4 py-2";
  }
  return "flex items-center justify-between gap-3 border-b border-zinc-900 bg-zinc-900/40 px-4 py-2";
}

/** Main chat column (inside Sidebar row): mood gradient or light neutral. */
export function mainChatShellClass(appearance: UiPreferences["appearance"], moodShellClass: string): string {
  const base = "flex min-h-0 min-w-0 flex-1 flex-col transition-[background,box-shadow] duration-700";
  if (appearance === "light") {
    return `${base} bg-zinc-100 ring-1 ring-zinc-200/40`;
  }
  return `${base} ${moodShellClass}`;
}

export function footerShellClass(appearance: UiPreferences["appearance"]): string {
  if (appearance === "light") {
    return "shrink-0 border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-center text-[10px] text-zinc-600";
  }
  if (appearance === "oled") {
    return "shrink-0 border-t border-zinc-800 bg-black px-4 py-2 text-center text-[10px] text-zinc-500";
  }
  return "shrink-0 border-t border-zinc-900/80 px-4 py-2 text-center text-[10px] text-zinc-600";
}

export async function tryEnableDesktopNotifications(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

```
### src/lib/usage-cost.ts

```typescript
import type { PlanDefinition } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";

export type SendMode = "chat" | "agent" | "schrodinger";

export interface SendCostInput {
  model: ModelTier;
  thinking: boolean;
  mode: SendMode;
  /** Community AI debate (separate API). */
  debate?: boolean;
}

/** Credit weights — tune relative to monthly plan pools in `plans.ts`. */
function modelWeight(model: ModelTier): number {
  switch (model) {
    case "glm-4-flash":
      return 1;
    case "glm-4-air":
      return 1;
    case "glm-4-plus":
      return 2;
    case "glm-4-long":
      return 3;
    case "glm-4":
      return 4;
    default:
      return 1;
  }
}

/**
 * Estimated credits for one successful generation (charged after the stream completes).
 */
/** Community panel: AI debate calls a separate route; fixed weight for budgeting. */
export const COMMUNITY_DEBATE_COST = 6;

export function estimateSendCredits(input: SendCostInput): number {
  let w = modelWeight(input.model);
  if (input.thinking) w += 2;
  if (input.mode === "agent") w += 6;
  if (input.mode === "schrodinger") w += 8;
  if (input.debate) w += 5;
  return Math.max(1, w);
}

/** Line items for UI (Cost preview). Omits zero rows. */
export function estimateSendCreditsBreakdown(input: SendCostInput): {
  lines: { label: string; credits: number }[];
  total: number;
} {
  const lines: { label: string; credits: number }[] = [];
  const base = modelWeight(input.model);
  lines.push({ label: `Model (${input.model})`, credits: base });
  if (input.thinking) lines.push({ label: "Thinking", credits: 2 });
  if (input.mode === "agent") lines.push({ label: "Agent loop", credits: 6 });
  if (input.mode === "schrodinger") lines.push({ label: "Schrödinger", credits: 8 });
  if (input.debate) lines.push({ label: "Debate", credits: 5 });
  return { lines, total: estimateSendCredits(input) };
}

export function describeCost(input: SendCostInput, credits: number): string {
  const bits: string[] = [];
  bits.push(`${input.model}`);
  if (input.thinking) bits.push("thinking");
  if (input.mode === "agent") bits.push("agent");
  if (input.mode === "schrodinger") bits.push("Schrödinger");
  if (input.debate) bits.push("debate");
  return `${credits} credits (${bits.join(" · ")})`;
}

/** Whether the current plan permits this combination (before credits). */
export function planPermitsSend(plan: PlanDefinition, input: Omit<SendCostInput, "debate">): boolean {
  if (!plan.allowedModels.includes(input.model)) return false;
  if (input.thinking && !plan.features.thinking) return false;
  if (input.mode === "agent" && !plan.features.agent) return false;
  if (input.mode === "schrodinger" && !plan.features.schrodinger) return false;
  return true;
}

```
### src/lib/user-dna.ts

```typescript
import type { ChatMessage } from "./types";

export function extractStyleDNA(messages: ChatMessage[]): string {
  const sample = messages
    .filter((m) => m.role === "assistant")
    .slice(-3)
    .map((m) => m.content)
    .join("\n");
  if (!sample) return "";
  const tone = sample.length > 400 ? "detailed" : "concise";
  return `Prefer ${tone} replies; mirror user's formality.`;
}

```
### src/lib/zai.ts

```typescript
import { existsSync, readFileSync } from "fs";
import path from "path";
import ZAI from "z-ai-web-dev-sdk";

/** GLM / Z.AI Open Platform (BigModel) compatible base; see https://open.bigmodel.cn/ */
export const DEFAULT_Z_AI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

type ZaiFileConfig = { baseUrl?: string; apiKey?: string };

function readProjectZAiConfig(): ZaiFileConfig | null {
  try {
    const p = path.join(process.cwd(), ".z-ai-config");
    if (!existsSync(p)) return null;
    const raw = readFileSync(p, "utf-8");
    const j = JSON.parse(raw) as ZaiFileConfig;
    return j && typeof j === "object" ? j : null;
  } catch {
    return null;
  }
}

function trim(s: string | undefined): string {
  return (s ?? "").trim();
}

/**
 * Resolves Z.AI credentials from (highest priority first):
 * - `Z_AI_BASE_URL` + `Z_AI_API_KEY`
 * - `BIGMODEL_BASE_URL` + `BIGMODEL_API_KEY` / `GLM_API_KEY` / `ZHIPUAI_API_KEY`
 * - Project root `.z-ai-config` JSON (`baseUrl`, `apiKey`)
 * If `apiKey` is set but base URL is missing, uses {@link DEFAULT_Z_AI_BASE_URL}.
 */
export function getZaiConfig(): { baseUrl: string; apiKey: string } {
  const file = readProjectZAiConfig();

  const apiKey =
    trim(process.env.Z_AI_API_KEY) ||
    trim(process.env.BIGMODEL_API_KEY) ||
    trim(process.env.GLM_API_KEY) ||
    trim(process.env.ZHIPUAI_API_KEY) ||
    trim(file?.apiKey);

  let baseUrl =
    trim(process.env.Z_AI_BASE_URL) ||
    trim(process.env.BIGMODEL_BASE_URL) ||
    trim(file?.baseUrl);

  if (apiKey && !baseUrl) {
    baseUrl = DEFAULT_Z_AI_BASE_URL;
  }

  if (!apiKey || !baseUrl) {
    throw new Error(
      [
        "Missing Z.AI API credentials.",
        "Do one of the following:",
        `1) Add Z_AI_API_KEY to .env.local (optional: Z_AI_BASE_URL, defaults to ${DEFAULT_Z_AI_BASE_URL})`,
        "2) Or set BIGMODEL_API_KEY / GLM_API_KEY",
        "3) Or create .z-ai-config in the project root: {\"baseUrl\":\"...\",\"apiKey\":\"...\"}",
        "Get a key: https://open.bigmodel.cn/",
      ].join(" "),
    );
  }

  return { baseUrl, apiKey };
}

export function createZai(): InstanceType<typeof ZAI> {
  return new ZAI(getZaiConfig());
}

```
### src/middleware.ts

```typescript
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiSecret, getSessionSecret, isGateEnabled } from "@/lib/server-config";

export async function middleware(request: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }
  // Stripe Checkout/Portal/Finalize require the same session as the rest of the app.
  // Only the webhook is verified via Stripe-Signature (no browser cookie).
  if (pathname === "/api/stripe/webhook" || pathname.startsWith("/api/stripe/webhook/")) {
    return NextResponse.next();
  }

  const apiSecret = getApiSecret();
  const auth = request.headers.get("authorization");
  if (apiSecret && auth === `Bearer ${apiSecret}`) {
    return NextResponse.next();
  }

  const secret = getSessionSecret();
  if (!secret) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Server misconfigured: set BABYGPT_SESSION_SECRET when BABYGPT_APP_PASSWORD is set." },
        { status: 500 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = request.cookies.get("babygpt_token")?.value;
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|babygpt-logo.png|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif)$).*)",
  ],
};

```
### src/types/z-ai-web-dev-sdk.d.ts

```typescript
declare module "z-ai-web-dev-sdk" {
  type Thinking = { type: "enabled" } | { type: "disabled" };

  export default class ZAI {
    constructor(config: { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string });
    chat: {
      completions: {
        create: (body: {
          model: string;
          messages: { role: string; content: string }[];
          stream: boolean;
          thinking?: Thinking;
        }) => Promise<ReadableStream<Uint8Array> | unknown>;
      };
    };
    functions: {
      invoke: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

```
### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "target": "ES2017",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.mts",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "_archive"
  ]
}

```

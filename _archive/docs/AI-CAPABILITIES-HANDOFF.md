# AI capabilities handoff (Postforge)

**Purpose:** Give another AI or engineer a single place to understand **what AI does in this repo**, **which providers and routes matter**, and **how to improve cost/latency/robustness** without rediscovering the codebase.

**Related:** [`AI-HANDOFF-DIAGNOSTIC.md`](./AI-HANDOFF-DIAGNOSTIC.md) (architecture, APIs, env), [`AI-RAILWAY-ENV-HANDOFF.md`](./AI-RAILWAY-ENV-HANDOFF.md) (Railway / deployment env). **Planned image product (not in code yet):** [`IMAGE-GENERATION-SPEC.md`](./IMAGE-GENERATION-SPEC.md). **Aspirational platform prompts vs this repo:** [`CURSOR-IMPLEMENTATION-BRIEF.md`](./CURSOR-IMPLEMENTATION-BRIEF.md).

---

## Stack and framework notes

- **Next.js 16** — follow `AGENTS.md` and `node_modules/next/dist/docs/` for framework-specific behavior and deprecations.
- **Env template:** repo root `.env.local.example` (exact variable names).

---

## AI backends (by product area)

### 1) Unified Content Studio (`/unified`) — Anthropic **or** OpenAI chat

#### Anthropic (Messages API)

| Item | Detail |
|------|--------|
| **Env** | `ANTHROPIC_API_KEY` — required when chat/generate use Claude (default chat provider). |
| **HTTP API** | `https://api.anthropic.com/v1/messages` |
| **Headers** | `anthropic-version: 2023-06-01`, `x-api-key: <key>` |
| **Default model** | `claude-sonnet-4-20250514` (chat route allows override via JSON body `model`). |

#### OpenAI (Responses API + Conversations)

| Item | Detail |
|------|--------|
| **Env** | `OPENAI_API_KEY`; optional `UNIFIED_CHAT_PROVIDER=openai`, `UNIFIED_OPENAI_CHAT_MODEL` (default `gpt-4o`). |
| **API** | `openai.responses.create` with server-side **`conversation`** id stored on `UnifiedStudioProfile.openaiChatConversationId`; each request sends the **latest user** message only (history lives in OpenAI). User text is **moderated** before the API call. |
| **Reset** | POST body `resetOpenAiConversation: true` (+ `provider: "openai"`) clears the stored conversation id. |

**Routes (authoritative paths)**

| Method | Path | Role |
|--------|------|------|
| POST | `/api/unified/chat` | Multi-turn chat: **Anthropic** (full `messages` each request) **or** **OpenAI** (stateful conversation). Body: `provider`, `messages`, `system`, `model`, `resetOpenAiConversation`. |
| POST | `/api/unified/generate` | One-shot generation from `prompt` + optional `platform`, `contentType`, `options`; Anthropic `max_tokens: 1024`. |

**Implementation**

- `src/app/api/unified/chat/route.ts` — debits **`chatMessageCost(800)`** unified credits on success (both providers).
- `src/app/api/unified/generate/route.ts` — debits **`chatMessageCost(1000)`**; logs analytics **`content_generation`** with model, lengths, cost.

**Auth:** NextAuth session required → **`401`** if unauthenticated.

**Limits before calling Anthropic**

- `checkUsageLimits` in `src/lib/unified-limits.ts` — generation count in period, draft storage, plan caps.
- **`402`** + `code: "LIMIT_REACHED"` when over limit.
- **`402`** + `code: "INSUFFICIENT_CREDITS"` when `unifiedCredits` on the profile is too low after `getOrCreateUnifiedProfile`.

**Credit formula** (`src/lib/unified-revenue.ts`)

```ts
chatMessageCost(tokensEstimate) = max(1, ceil(tokensEstimate / 1000))
```

So debits use **fixed estimates** (800 / 1000), not necessarily actual token usage from the API response.

**Tier constants:** `TIER_LIMITS` in `unified-revenue.ts` is separate from **`getPlanLimits`** / subscription row fields in `unified-limits.ts` — enforcement for generations and drafts in unified flows is centered on **`checkUsageLimits`** plus DB state.

**Generation budget:** `checkUsageLimits` counts both **`content_generation`** and **`image_generation`** analytics events toward the same period cap.

### 1b) Unified image generation — OpenAI DALL·E 3

| Item | Detail |
|------|--------|
| **Env** | `OPENAI_API_KEY` |
| **Routes** | `POST /api/unified/images/generate` (create), `GET /api/unified/images/generate?id=` (fetch row) |
| **Credits** | `dalle3CreditCost(size, quality)` — 15 (standard) / 30 (hd); see `src/lib/image-gen/costs.ts` |
| **Persistence** | Sharp WebP by default → **`public/uploads/{userId}/generated/`** or **`R2_*`** public URL when configured |
| **Async** | **`inngest.send({ name: "unified/image.generated", ... })`** after DB write; handler in `src/inngest/functions/unified-image.ts` |
| **UI** | **Create** tab → “Image (DALL·E 3)” card |

### 1c) Unified image **edit** + **speech-to-text** — OpenAI

| Item | Detail |
|------|--------|
| **Image edit** | `POST /api/unified/images/edit` — `multipart`: `image`, `prompt`, optional `mask`, optional `model` (default `gpt-image-1.5`). Credits: **`gptImageEditCreditCost()`** (20). Provider enum **`GPT_IMAGE`** on `UnifiedGeneratedImage`. |
| **Transcription** | `POST /api/unified/audio/transcribe` — `multipart` field **`file`**; default model **`whisper-1`**. Output text is **moderated**; debits **`chatMessageCost(200)`** credits. |
| **Moderation** | `moderateImagePrompt` / `moderateOpenAIText` in `src/lib/image-gen/moderation.ts` |

---

### 2) Core Postforge (legacy flows) — OpenAI

| Item | Detail |
|------|--------|
| **Env** | `OPENAI_API_KEY` |
| **Model** | `gpt-4o-mini` |
| **Routes** | `src/app/api/generate/route.ts`, `src/app/api/regenerate-draft/route.ts` |
| **Pattern** | `OpenAI` SDK `chat.completions.create`; credits/brands via existing Prisma + credit services. |

**Additional:** `src/app/api/anthropic/chat/route.ts` — separate Anthropic Messages proxy; confirm whether any UI still calls it vs `/api/unified/chat`.

---

## Rate limiting (important)

- `src/lib/rate-limit.ts` defines **`limitGenerate`** (Upstash sliding window **10 requests / 60s** per user, with in-memory fallback when Redis is unset).
- As of this doc, **`limitGenerate` is not imported** by unified chat/generate routes — unified AI relies on **session + `checkUsageLimits` + `unifiedCredits`**, not this limiter.

---

## Client and API contracts (unified)

- Main UI: `src/app/unified/unified-studio-client.tsx` — handles **`LIMIT_REACHED`**, upgrade URLs, and errors via `src/lib/unified-api-error.ts`.
- Progress: **`GET` / `POST /api/unified/user/progress`** (not `/api/unified/progress`).

---

## Automated tests

- `npm run test` — Vitest (`vitest.config.ts`): plan limits, Stripe sync, checkout edge cases, gamification level unlock rules (`src/lib/__tests__/`, `src/app/api/unified/checkout/__tests__/`).

---

## Performance and cost levers (actionable)

1. **Model / `max_tokens`** — Defaults favor quality; reducing tokens or switching model (still Anthropic Messages API–compatible) changes latency and bill.
2. **Credit fairness** — `chatMessageCost` uses rough estimates; optionally tie debits to `usage.input_tokens` / `usage.output_tokens` from the Anthropic JSON when present (`generate` already reads `usage` for the response payload).
3. **Abuse / burst** — Optionally wire **`limitGenerate`** (or a dedicated key) to `/api/unified/chat` and `/api/unified/generate`.
4. **Streaming** — Not implemented; would require API + client changes.
5. **Load** — No in-repo load harness; Upstash is optional (`UPSTASH_REDIS_*` in `.env.local.example`).

---

## One-line summary

**Unified Studio uses Anthropic Messages *or* OpenAI Responses + Conversations behind `/api/unified/chat`, Anthropic for `/api/unified/generate`, OpenAI for DALL·E 3 / GPT Image edit / Whisper transcribe; plan limits + unified credits apply; legacy dashboard flows use OpenAI `gpt-4o-mini`; shared Upstash rate limit helper exists but is not applied to unified AI routes today.**

---

*Update this file when models, routes, credit rules, or rate limiting change.*

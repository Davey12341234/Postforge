# Cursor implementation brief (target vs current repo)

**Purpose:** Preserve **incremental build prompts** for a fuller platform (conversations API, RAG, publishing, Inngest workflows). **Do not treat the checklist below as implemented** — see §2 for what Postforge actually has today.

**Related:** [`AI-CAPABILITIES-HANDOFF.md`](./AI-CAPABILITIES-HANDOFF.md), [`AI-HANDOFF-DIAGNOSTIC.md`](./AI-HANDOFF-DIAGNOSTIC.md), [`IMAGE-GENERATION-SPEC.md`](./IMAGE-GENERATION-SPEC.md).

---

## 1. Original target checklist (aspirational)

The following was supplied as a **product/architecture target**. Several lines are **not** true of this repository as of the last update to this file.

```
✓ Multi-tenancy: Row-level tenantId on ALL models
✓ Auth: NextAuth session → 401 if unauthenticated
✓ Credits: chatMessageCost(800) / chatMessageCost(1000) per handoff doc
✓ Rate limits: checkUsageLimits + unifiedCredits enforcement
✓ Models: Anthropic claude-sonnet-4-20250514 (unified), gpt-4o-mini (legacy)
✓ Routes: /api/unified/chat, /api/unified/generate, /api/conversations/[id]/chat, /api/publish
✓ Async: Inngest tasks with exponential backoff + circuit breakers
✓ Storage: Neon PostgreSQL + pgvector + Redis/Upstash cache
✓ Security: AES-256-GCM tokens, OAuth2 PKCE, GDPR/CCPA consent tracking
```

---

## 2. Accuracy matrix (this repo)

| Claim | In repo today? | Notes |
|--------|----------------|--------|
| **NextAuth → 401** | Yes | Unified AI routes require session. |
| **Credits `chatMessageCost(800/1000)`** | Yes | `src/lib/unified-revenue.ts`; chat vs generate. |
| **`checkUsageLimits` + `unifiedCredits`** | Yes | Before Anthropic calls in unified routes. |
| **Anthropic + legacy OpenAI models** | Yes | Per [`AI-CAPABILITIES-HANDOFF.md`](./AI-CAPABILITIES-HANDOFF.md). |
| **`/api/unified/chat`, `/api/unified/generate`** | Yes | Authoritative unified paths. |
| **`tenantId` on all models** | No | No `tenantId` field in Prisma; org scoping uses `Organization` / `organizationId` on legacy models, not a global tenant column. |
| **`/api/conversations/[id]/chat`** | No | No such route. Chat is **`POST /api/unified/chat`**; persistence uses **`UnifiedConversationSession`** / messages under unified profile (not this URL shape). |
| **`/api/publish` (top-level)** | No | **`POST /api/unified/publish`** exists as a **Phase 3 placeholder** (intent/analytics), not full Meta Graph multi-platform publish. |
| **Inngest backoff + circuit breakers** | No | `src/lib/inngest.ts` exports an Inngest client only; no workflows wired here. |
| **pgvector** | No | Not in `schema.prisma`. |
| **Redis/Upstash for AI cache** | Partial | Optional Upstash for **`limitGenerate`** in `src/lib/rate-limit.ts` — **not** wired to unified chat/generate; in-memory fallback exists. |
| **AES-256-GCM / PKCE / GDPR consent modules** | Not verified | Do not assume; search before claiming. |

---

## 3. Quick start prompts for Cursor (copy as backlog)

Use these **after** aligning schema and routes with §2. They describe **new** work, not maintenance of current code.

**Prisma (if you add Conversation/Embedding/etc.)**

```text
Create the complete Prisma schema migration adding Conversation, Embedding, SocialAccount, PublishLog, AudienceInsights, and ABTest models as specified in the architecture document — and reconcile with existing Unified* models to avoid duplicate concepts.
```

**Conversation service (not present as a class today)**

```text
Implement the ConversationService class with stateful dialogue management, Redis caching, pgvector persistence, chain-of-density summarization, and FSM state transitions — or adapt to existing UnifiedConversationSession + Prisma first.
```

**LangGraph**

```text
Create the LangGraph.js agent supervisor workflow with RAG retrieval node, generation agent, critique agent loop (threshold >0.85), and Inngest integration.
```

**Publish service**

```text
Build the PublishService class with Facebook Pages POST /feed, Instagram two-phase container workflow, OAuth2 token auto-refresh, and cross-platform support for LinkedIn/TikTok/Threads — note current unified publish route is placeholder.
```

**API routes**

```text
Generate API routes with auth middleware, usage limit checks, credit debiting, and isolation — prefer extending /api/unified/* patterns; if adding /api/conversations/[id]/chat, document how it differs from POST /api/unified/chat.
```

---

## 4. One-line truth

**Unified text AI (`/api/unified/chat`, `/api/unified/generate`) and limits/credits match the handoff docs; multi-tenant `tenantId`, conversation REST shape, LangGraph, pgvector, full Inngest workflows, and the security stack listed in §1 are not implemented as described.**

---

*Update §2 when migrations or routes land.*

# BabyGPT — full app diagnostic (compact handoff)

**Generated for copy-paste review.** Repo: Next.js 16 App Router, React 19, Tailwind 4. AI via `z-ai-web-dev-sdk` (+ OpenAI in billing helpers). See `AGENTS.md`, `docs/HANDOFF-AI-NEXT-REVIEW.md`.

---

## 1. Entry & shell

| Item | Detail |
|------|--------|
| UI entry | `src/app/page.tsx` → `BabyGPTClient` |
| Layout | `src/app/layout.tsx` — metadata, fonts |
| Auth | Optional gate: `BABYGPT_APP_PASSWORD`; JWT session `babygpt_token`; `src/middleware.ts` (or `proxy`) protects routes except `/login`, `/api/auth/*`, `/api/stripe/webhook` |
| Login | `src/app/login/page.tsx` → `POST /api/auth/login` |

---

## 2. API routes (dynamic)

| Method | Path | Role |
|--------|------|------|
| POST | `/api/auth/login` | Password → session cookie |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/chat` | SSE chat, credits if gated |
| POST | `/api/chat/agent` | Agent loop + tools |
| POST | `/api/chat/schrodinger` | Dual-model race stream |
| GET/POST | `/api/community` | In-memory community CRUD |
| POST | `/api/community/debate` | Paired completions |
| GET/POST | `/api/credits` | Plan + balance (+ Stripe payload when configured) |
| POST | `/api/stripe/checkout` | Checkout session |
| POST | `/api/stripe/portal` | Customer portal |
| POST | `/api/stripe/finalize` | Post-checkout finalize |
| POST | `/api/stripe/webhook` | Stripe events → `.data/billing.json` |
| POST | `/api/billing/copilot` | Stripe-aware copilot (typically gated) |
| POST | `/api/billing/support` | FAQ + LLM (auth if gate on) |
| POST | `/api/billing/translate` | FAQ text translate (auth if gate on) |

Static: `/checkout/return` — return page after Stripe.

---

## 3. Client architecture (main)

| Area | Files / behavior |
|------|------------------|
| Orchestration | `BabyGPTClient.tsx` — conversations, send pipeline, credits, plan, quantum flags, Stripe helpers |
| Sidebar | `Sidebar.tsx` — chats, memory (`agent-memory.ts`) |
| Chat | `ChatArea.tsx`, `MessageBubble.tsx`, `ThinkingCanvas.tsx`, `SmartActions.tsx` |
| Input | `ChatInput.tsx`, `CostPreview.tsx` |
| Quantum | `QuantumControls.tsx` — model, Thinking, Schrödinger, Agent, Quantum submenu |
| Templates | `InstantTemplates.tsx` — `POWER_TEMPLATES` from `instant-templates.ts` |
| Overlays | `SearchOverlay.tsx` — **conversation text search** (Cmd/Ctrl+K), not "path" search |
| Modals | `SubscriptionModal.tsx` — plans, FAQ chips, copilot/support/translate blocks |
| Other | `WelcomeScreen.tsx`, `CommunityPanel.tsx`, `SkillsPanel.tsx`, `ProactiveToast.tsx`, `PostCard.tsx` |

---

## 4. Data & persistence

| Store | Notes |
|-------|--------|
| `localStorage` prefix `babygpt_*` | Conversations, active id, credits v1, agent memory, skills, reminders — see `src/lib/storage.ts` |
| Server `.data/` | `wallet.json`, `billing.json` when gate + Stripe features used — single-tenant |
| Community | **In-memory** — lost on restart |

---

## 5. Billing & Stripe (implemented)

- Checkout → `/checkout/return` → finalize; webhook syncs subscription state.
- Plans modal: public price env vars for display; `verify:billing` / `finish:billing` scripts.
- **Gap vs product spec:** Onboarding/paths spec in `docs/BabyGPT-Onboarding-Paths-Spec.md` is **not** implemented as a wizard, Letter generator, six-path router, Daily Anchor UI, Future Self ritual, 4-card Clarity UI, or Life Mirror safety layer — **documentation + FAQ entries only** until built.

---

## 6. Chat pipeline (summary)

1. User sends → `fetch-chat` / `BabyGPTClient` chooses `/api/chat` | `/api/chat/agent` | `/api/chat/schrodinger`.
2. Body includes model, thinking on/off, quantum flags, optional memory/skills prompts.
3. SSE parsed in `stream-parse.ts`; credits debited when server wallet active (`chat-route-guard.ts`).

---

## 7. Product FAQ / Plans modal

- Copy lives in `src/lib/billing-faq.ts` (billing + product onboarding/path **summaries** for search).
- Full narrative: `docs/BabyGPT-Onboarding-Paths-Spec.md`.
- **Removed:** all "Spark" mis-labels from FAQ and API prompts.

---

## 8. Risks & known limitations

| Issue | Severity |
|-------|----------|
| Community data ephemeral | Expected |
| Single-tenant server wallet | Multi-user needs redesign |
| Next.js "middleware" deprecation warning | Follow Next upgrade docs |
| FAQ match is token overlap, not embeddings | May miss paraphrases |
| No clinical/safety model in chat routes for Life Mirror spec | Spec is forward-looking |

---

## 9. Quality gates (run locally)

```bash
npm run lint
npm run test
npm run build
```

---

## 10. File map (high level)

```
src/app/           App Router pages + api/*
src/components/    UI
src/lib/           Domain logic, Stripe, FAQ, tools, agent loop
src/hooks/         Dialog a11y, etc.
scripts/           Billing finish, cursor context generator, etc.
docs/              Handoff, onboarding spec, this diagnostic
_archive/          Legacy PostForge — must not be imported
```

---

## 11. Spec vs code (this session)

| Spec item | In code? |
|-----------|----------|
| 7 onboarding questions (reordered) | FAQ + doc; **no** dedicated onboarding flow |
| Opening line variants | Doc + FAQ; **not** default welcome copy |
| Per-question reactions | Doc + FAQ; **not** automated in UI |
| Skip after Q3/Q4 + Letter | **Not implemented** |
| 6 paths including Quick Fire | Doc + FAQ; **not** a path picker |
| Daily Anchor / streak forgiveness | **Not implemented** |
| Future Self ritual / time capsule | **Not implemented** |
| Clarity 4-card UI | **Not implemented** |
| Life Mirror safety pipeline | **Not implemented** |
| 90-day realignment | **Not implemented** |

**Next build step:** implement onboarding state machine + Letter + path router + safety hooks per spec, or ship iteratively (Quick Fire vs Deep Talk first).

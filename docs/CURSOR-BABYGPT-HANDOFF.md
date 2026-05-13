# BabyGPT — Cursor handoff (sync with external session notes)

This document maps work described against `/home/z/my-project` (monolithic `page.tsx`) to **this repository**, where the app shell lives in `src/components/BabyGPTClient.tsx` and `src/app/page.tsx` only renders it.

## Verified on this machine (2026)

- `npm run lint` — passes (eslint-config-next).
- `npm run build` — succeeds (Next.js 16 App Router routes listed in build output).

## Architecture map

| External / other session | This repo |
|--------------------------|-----------|
| `src/app/page.tsx` holds all UI state | `src/app/page.tsx` → `<BabyGPTClient />` only |
| `PricingModal.tsx` | `src/components/SubscriptionModal.tsx` (plans + credits UI) |
| New `prompts.ts` “technique” layer | **Not present** — skills live in `src/lib/skills.ts` + `SkillsPanel` |
| `worklog.md` | Use git history / this doc instead |

## Already implemented here (no port required)

- **Credits / plans / usage:** `src/lib/credits-store.ts`, `plans.ts`, `usage-cost.ts`
- **Billing UI:** `SubscriptionModal.tsx` (wired from header **Plans** + `QuantumControls` upgrade)
- **Chat pipeline:** `src/app/api/chat/route.ts`, `schrodinger/route.ts`, `agent/route.ts`
- **Community:** `CommunityPanel`, `PostCard`, `/api/community`, `/api/community/debate`
- **Quantum / DNA / routing libs:** under `src/lib/` (entanglement, kolmogorov-router, etc.)
- **Search:** `SearchOverlay` (Cmd/Ctrl+K)

## Optional backlog (from external “full diagnostic” narrative)

Implement only if product asks for parity with that session:

1. **`src/lib/prompts.ts`** — structured “prompting techniques” (CoT, ReAct, etc.) merged into system prompt; gate by plan in `plans.ts`.
2. **Chat UI chips** — expose selected technique in `ChatInput` + pass into `sendMessage` / API body.
3. **Share assistant reply to Community** — add prop from `BabyGPTClient` → `ChatArea` / `MessageBubble` → prefill `CommunityPanel` create form (not wired today).
4. **Extra motion / “behavioral UX” CSS** — only if design wants it; keep `globals.css` small.

## Commands

```bash
npm run dev    # http://127.0.0.1:3000
npm run build
npm run lint
```

## Deploy / server note

Production secrets and Z.AI config stay in env (see repo `.env*` templates). `_archive/` is legacy and must not be imported (see `AGENTS.md`).

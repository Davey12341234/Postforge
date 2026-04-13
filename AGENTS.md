# BabyGPT — agent notes

## Stack

- Next.js 16 App Router, React 19, Tailwind CSS 4.
- AI: `z-ai-web-dev-sdk` in server Route Handlers only.

## Routes

- `GET /` — BabyGPT UI (sidebar, chat, quantum controls, community).
- `POST /api/chat` — streaming chat (SSE).
- `POST /api/chat/schrodinger` — dual-model “race” stream.
- `GET|POST /api/community` — in-memory community CRUD.
- `POST /api/community/debate` — paired non-stream completions.

## Persistence

- Browser: `localStorage` keys prefixed with `babygpt_`.
- Server: no durable store for community data (resets on restart).

## PostForge

Legacy PostForge code, if any, should live under `_archive/` and must not be imported by the app.

## Handoff for reviewers

See `docs/HANDOFF-AI-NEXT-REVIEW.md` (architecture, Stripe / Plans modal behavior, checkout checklist).

**Finish billing setup:** `npm run finish:billing` (then `npm run vercel:env:prod` on Windows when keys are complete).

**Cursor handoff doc:** `npm run context:docx` writes `docs/BabyGPT-Cursor-Context.docx` and **`docs/BabyGPT-Cursor-Context.md`** (same content; use `.md` if Word won’t open the docx). `npm run context:review` writes `docs/cursor-review-snapshot.json`.

**Onboarding / paths product spec (not fully implemented in UI):** `docs/BabyGPT-Onboarding-Paths-Spec.md`. **Full app diagnostic (compact paste):** `docs/BabyGPT-App-Diagnostic.md`.

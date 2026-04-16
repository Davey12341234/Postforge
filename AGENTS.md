# BabyGPT — agent notes

## Quality gate (local / CI)

- `npm run lint` — ESLint on `src` + `scripts` only (avoids OOM on full-tree `eslint .`; use `npm run lint:full` if you need everything).
- `npm test` — Vitest (`src/**/*.test.ts`).
- `npm run verify` — `lint` + `test` + `build`.

## Stack

- Next.js 16 App Router, React 19, Tailwind CSS 4.
- AI: `z-ai-web-dev-sdk` in server Route Handlers only.

## Routes

- `GET /` — BabyGPT UI (sidebar, chat, quantum controls, community).
- `POST /api/chat` — streaming chat (SSE).
- `POST /api/chat/agent` — agent loop (tools) stream.
- `POST /api/chat/gemini` — Gemini multimodal when user messages include attachments (`GEMINI_API_KEY`).
- `POST /api/gemini/files` — multipart upload to Gemini Files API (large attachments).
- `POST /api/gemini/image` — Gemini image generation.
- `POST /api/chat/schrodinger` — dual-model “race” stream.
- `GET|POST /api/community` — in-memory community CRUD.
- `POST /api/community/debate` — paired non-stream completions.

**Voice / files (UI):** Composer uses Web Speech API (voice overlay) and per-file size presets (`babygpt_max_file_bytes_override` in `localStorage`). Default max ~25 MB when env unset; raise `BABYGPT_MAX_FILE_BYTES` for self-host.

## Persistence

- Browser: `localStorage` keys prefixed with `babygpt_`.
- Server: no durable store for community data (resets on restart).

## PostForge

Legacy PostForge code, if any, should live under `_archive/` and must not be imported by the app.

## Handoff for reviewers

See `docs/HANDOFF-AI-NEXT-REVIEW.md` (architecture, Stripe / Plans modal behavior, checkout checklist).  
**New to Stripe (account, products, webhooks):** `docs/STRIPE-ACCOUNT-SETUP.md`.

**Finish billing setup:** `npm run finish:billing` (then `npm run vercel:env:prod` on Windows when keys are complete).

**ProLiant / installer USB (bare metal):** step-by-step for beginners: `deploy/proliant/BEGINNER-FULL-PATH.md`. Technical runbook: `deploy/proliant/RUNBOOK.md`. **Ubuntu 22.04 ISO + Rufus:** `npm run proliant:prepare-official` (or download-only: `npm run proliant:prepare-official-download`). ISOs download to **`deploy/proliant/staging` on a fixed disk** only (scripts refuse USB/SD staging). **BabyGPT onto the flashed stick:** `npm run proliant:usb-sync:e` (or `npm run proliant:usb-sync` with **`BABYGPT_USB_LETTER`**). Check: `npm run proliant:verify-usb-deploy:e`. One shot: `npm run proliant:usb-sync-and-verify:e`. **No NVMe / no bay disks yet (USB-only OS):** `npm run proliant:quick-usb` (verify + staging + deploy to all plugged USBs; optional `-LaunchRufus` in `scripts/proliant-usb-only-prep.ps1`).

**Cursor handoff doc:** `npm run context:docx` writes `docs/BabyGPT-Cursor-Context.docx` and **`docs/BabyGPT-Cursor-Context.md`** (same content; use `.md` if Word won’t open the docx). Section **9** is **Cursor handoff & continuity** (quality gates, storage/CSS/AI notes, warnings, next steps, commands). `npm run context:review` writes `docs/cursor-review-snapshot.json`.

**Onboarding / paths product spec (not fully implemented in UI):** `docs/BabyGPT-Onboarding-Paths-Spec.md`. **Full app diagnostic (compact paste):** `docs/BabyGPT-App-Diagnostic.md`. **Go-live, Stripe, final copy:** `docs/FINAL-LAUNCH-COPY.md`.

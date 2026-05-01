#!/usr/bin/env node
/**
 * Generates docs/bbGPT-Cursor-Context.docx — architecture, API map, storage keys,
 * button/interaction map, known issues, Cursor handoff (continuity, commands, warnings),
 * file tree, and full source under src/ (+ key config files).
 *
 * Usage: node scripts/cursor-context-generator.mjs
 * Requires: npm install (devDependency docx)
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "bbGPT-Cursor-Context.docx");
const OUT_MD = path.join(ROOT, "docs", "bbGPT-Cursor-Context.md");
const META_OUT = path.join(ROOT, "docs", "cursor-context-meta.json");

const MAX_LINES_PER_FILE = 4000;

/** Strip characters illegal in WordprocessingML text runs (fixes corrupt / unreadable .docx). */
function sanitizeDocxText(s) {
  if (s === "") return " ";
  return s
    .replace(/\0/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/\uFFFE|\uFFFF/g, "");
}

/** Markdown fenced block that cannot be broken by ``` inside source files. */
function mdFenced(lang, code) {
  let n = 3;
  while (true) {
    const fence = "`".repeat(n);
    if (!code.includes(fence)) {
      return `${fence}${lang}\n${code}\n${fence}\n`;
    }
    n++;
  }
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun(sanitizeDocxText(text))],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun(sanitizeDocxText(text))],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: sanitizeDocxText(String(text)), ...opts })],
  });
}
function monoLine(line) {
  const t = sanitizeDocxText(line);
  return new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ font: "Consolas", size: 18, text: t })],
  });
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf-8"));
}

async function walkFiles(dir, acc, pred) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name === ".git" || e.name === ".next") continue;
    if (e.isDirectory()) {
      await walkFiles(full, acc, pred);
    } else if (pred(full, e.name)) {
      acc.push(full);
    }
  }
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

/** Curated: bbGPT shipped UI (not _archive). */
const BUTTON_AND_INTERACTION_MAP = `
BbGPTClient.tsx
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
`.trim();

const STORAGE_KEYS_DOC = `
localStorage prefix: bbgpt_ (legacy babygpt_* migrated once; see src/lib/storage.ts lsKey)

Resolved keys in shipped code:
- bbgpt_conversations — Conversation[] (BbGPTClient)
- bbgpt_active_conversation_id — string | null
- bbgpt_credits_v1 — CreditsStateV1 (credits-store.ts)
- bbgpt_agent_memory_v1 — agent memory blob (agent-memory.ts)
- bbgpt_skills_v1 — custom skills (skills.ts)
- bbgpt_reminders_v1 — reminders list (reminders.ts)
- bbgpt_ui_prefs_v1 — UiPreferences: fontScale, appearance, notificationsEnabled (ui-preferences.ts)
- bbgpt_time_capsule_v1 — scheduled messages (time-capsule.ts; UI in SettingsPanel)

Cookie (not localStorage): bbgpt_token — session JWT when gate enabled (legacy babygpt_token cleared on logout).

Server files (not localStorage): .data/wallet.json, .data/billing.json when gate + Stripe features are used.
`.trim();

const KNOWN_ISSUES_DOC = `
Verified for this repository (bbGPT / postforge):

• Community API (GET/POST /api/community) is in-memory only — data is lost on server restart.
• Server wallet and billing JSON under .data/ are single-tenant — not suitable for multi-user production without redesign.
• Next.js may warn that "middleware" file convention is deprecated in favor of "proxy" — follow Next.js upgrade guidance when upgrading.
• Stripe webhook must include events the handler uses (e.g. invoice.paid, invoice.payment_failed) for billing alerts.
• Chat / API routes have no built-in per-IP rate limiting — add if exposing publicly.

UI notes: Font scale is applied via CSS variable --bbgpt-font-scale on document root (see globals.css + ui-preferences applyUiPreferencesToDom). SettingsPanel includes time-capsule CRUD. Life-coach copy lives in companion-onboarding.ts + WelcomeScreen; billing FAQ is Stripe-only (billing-faq.ts). Full Clarity Engine / realignment product notes: docs/BabyGPT-Onboarding-Paths-Spec.md (product spec filenames still use BabyGPT-era names).
`.trim();

/** Continuity block for Cursor — merge with sprint notes; regenerate updates timestamp only. */
const CURSOR_HANDOFF_DOC = `
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
• API: /api/billing/support and /translate optional auth when BBGPT_APP_PASSWORD unset; support prompt is billing-only.
• SettingsPanel: refresh-on-open uses startTransition for ESLint react-hooks rule.
• cursor-context-generator: removed unused h3 helper.
(Document additional PR-level bug list in your changelog if you keep one.)

TEN IMPROVEMENTS (product — see docs for detail)
Verified as documented in docs/BabyGPT-Onboarding-Paths-Spec.md + docs/FINAL-LAUNCH-COPY.md: sharper opener, question reorder, micro-reactions, skip+letter, Quick Fire path, Daily Anchor ideas, Future Self ritual spec, Clarity 4-card spread, Life Mirror safety, 90-day realignment. Implementation in UI varies by item — see docs/BabyGPT-App-Diagnostic.md for code vs spec.

KEY TECHNICAL DETAILS
• localStorage: full key list in Section 6 (includes ui_prefs_v1, time_capsule_v1).
• CSS: --bbgpt-font-scale applied on :root; globals.css uses calc(14px * var(--bbgpt-font-scale, 1)).
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
`.trim();

async function collectSourceFiles() {
  const srcDir = path.join(ROOT, "src");
  const files = [];
  await walkFiles(
    srcDir,
    files,
    (full, name) => /\.(ts|tsx|css)$/.test(name) || name === "instrumentation.ts",
  );
  const configs = ["package.json", "tsconfig.json", "eslint.config.mjs", "next.config.ts", "postcss.config.mjs"].map((f) =>
    path.join(ROOT, f),
  );
  for (const c of configs) {
    try {
      await fs.access(c);
      files.push(c);
    } catch {
      /* skip */
    }
  }
  files.sort((a, b) => rel(a).localeCompare(rel(b)));
  return files;
}

async function fileTree(dir, prefix = "") {
  const lines = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const skip = new Set(["node_modules", ".git", ".next"]);
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (skip.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const r = rel(full);
    if (r.startsWith("_archive/")) continue;
    lines.push(`${prefix}${e.isDirectory() ? "[dir] " : "[file] "}${e.name}`);
    if (e.isDirectory()) {
      lines.push(...(await fileTree(full, prefix + "  ")));
    }
  }
  return lines;
}

function apiRouteList() {
  return [
    "POST /api/auth/login",
    "POST /api/auth/logout",
    "POST /api/chat",
    "POST /api/chat/agent",
    "POST /api/chat/schrodinger",
    "GET/POST /api/community",
    "POST /api/community/debate",
    "GET/POST /api/credits",
    "POST /api/stripe/checkout",
    "POST /api/stripe/portal",
    "POST /api/stripe/finalize",
    "POST /api/stripe/webhook",
    "POST /api/billing/copilot",
    "POST /api/billing/support",
    "POST /api/billing/translate",
  ];
}

function buildMarkdownHeader(pkg, treeLines) {
  const iso = new Date().toISOString();
  let md = `# bbGPT — Cursor context\n\n`;
  md += `Generated: ${iso}\n\n`;
  md += `Repository root: \`${ROOT.replace(/\\/g, "/")}\`\n\n`;
  md += `## 1. Project overview\n\n`;
  md += `- Name: **${pkg.name}** v${pkg.version}\n`;
  md += `- Stack: Next.js App Router, React 19, Tailwind 4, Stripe, jose (JWT), z-ai-web-dev-sdk + OpenAI fallback.\n`;
  md += `- Scripts: \`npm run dev\` | \`build\` | \`lint\` | \`test\` | \`verify:billing\` | \`finish:billing\`\n\n`;
  md += `## 2. Architecture\n\n`;
  md += `Entry: \`src/app/page.tsx\` renders BbGPTClient. Gated deploy: middleware protects routes except /login, /api/auth/*, /api/stripe/webhook; session cookie \`bbgpt_token\`.\n\n`;
  md += `## 3. API routes\n\n`;
  for (const line of apiRouteList()) {
    md += `- ${line}\n`;
  }
  md += `\n## 4. Component map (summary)\n\n`;
  md += `Main shell: BbGPTClient orchestrates Sidebar, ChatArea (WelcomeScreen when empty), ChatInput, QuantumControls, CommunityPanel, SkillsPanel, SearchOverlay, SubscriptionModal, ProactiveToast, billing banner.\n\n`;
  md += `## 5. Button & interaction map\n\n`;
  md += mdFenced("text", BUTTON_AND_INTERACTION_MAP);
  md += `## 6. Storage & data model\n\n`;
  md += mdFenced("text", STORAGE_KEYS_DOC);
  md += `## 7. Path / feature configuration\n\n`;
  md += `Plans & models: src/lib/plans.ts, model-tier.ts, usage-cost.ts. Stripe: stripe-config, stripe-sync, server-billing. Billing FAQ only: src/lib/billing-faq.ts. Life-coach / companion onboarding: src/lib/companion-onboarding.ts + WelcomeScreen (empty chat). Quantum/skills: QuantumControls, skills.ts, built-in-skills.ts.\n\n`;
  md += `## 8. Known issues & follow-ups\n\n`;
  md += mdFenced("text", KNOWN_ISSUES_DOC);
  md += `## 9. Cursor handoff & continuity\n\n`;
  md += mdFenced("text", CURSOR_HANDOFF_DOC);
  md += `## 10. File structure (trimmed, no _archive)\n\n`;
  md += mdFenced("text", treeLines.slice(0, 400).join("\n") + (treeLines.length > 400 ? `\n… truncated (${treeLines.length} lines total).` : ""));
  md += `## 11. Complete source listing\n\n`;
  return md;
}

async function main() {
  const pkg = await readJson(path.join(ROOT, "package.json"));
  const files = await collectSourceFiles();
  const treeLines = await fileTree(ROOT);

  const children = [];

  children.push(h1("bbGPT — Cursor context document"));
  children.push(p(`Generated: ${new Date().toISOString()}`));
  children.push(p(`Repository root: ${ROOT}`));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  children.push(h1("1. Project overview"));
  children.push(p(`Name: ${pkg.name} v${pkg.version}`));
  children.push(p(`Stack: Next.js App Router, React 19, Tailwind 4, Stripe, jose (JWT), z-ai-web-dev-sdk + OpenAI fallback.`));
  children.push(p(`Scripts: npm run dev | build | lint | test | verify:billing | finish:billing`));
  children.push(p(`Dependencies (count): ${Object.keys(pkg.dependencies || {}).length} prod, ${Object.keys(pkg.devDependencies || {}).length} dev.`));

  children.push(h1("2. Architecture"));
  children.push(
    p(
      "Entry: src/app/page.tsx renders BbGPTClient. Gated deploy: middleware protects routes except /login, /api/auth/*, /api/stripe/webhook; session cookie bbgpt_token.",
    ),
  );
  children.push(p("Chat: POST /api/chat streams SSE; credits enforced when BBGPT_APP_PASSWORD is set (server wallet)."));
  children.push(p("Billing: Stripe Checkout → /checkout/return → finalize; webhooks sync .data/billing.json; Customer Portal for self-serve."));
  children.push(p("Hydration: conversations and credits can start in localStorage; server mode replaces with GET /api/credits."));

  children.push(h1("3. API routes"));
  for (const line of apiRouteList()) {
    children.push(p(`• ${line}`));
  }

  children.push(h1("4. Component map (summary)"));
  children.push(
    p(
      "Main shell: BbGPTClient orchestrates Sidebar, ChatArea (WelcomeScreen when no messages), ChatInput, QuantumControls, CommunityPanel, SkillsPanel, SearchOverlay, SubscriptionModal, ProactiveToast, billing banner.",
    ),
  );
  children.push(p("See Section 10 for the file tree and Section 11 for full source under src/."));

  children.push(h1("5. Button & interaction map"));
  children.push(p(BUTTON_AND_INTERACTION_MAP));

  children.push(h1("6. Storage & data model"));
  children.push(p(STORAGE_KEYS_DOC));

  children.push(h1("7. Path / feature configuration"));
  children.push(p("Plans & models: src/lib/plans.ts, model-tier.ts, usage-cost.ts."));
  children.push(p("Stripe: src/lib/stripe-config.ts, stripe-sync.ts, server-billing.ts."));
  children.push(p("Billing FAQ (Plans modal): src/lib/billing-faq.ts — subscription and payment topics only."));
  children.push(p("Companion onboarding (empty chat): src/lib/companion-onboarding.ts — intro/journey questions and mode prefixes on WelcomeScreen."));
  children.push(p("Quantum / skills: QuantumControls, src/lib/skills.ts, built-in skills in src/lib/built-in-skills.ts."));
  children.push(p("System prompts for chat are composed in route handlers and lib (memory, skills, quantum)."));

  children.push(h1("8. Known issues & follow-ups"));
  children.push(p(KNOWN_ISSUES_DOC));

  children.push(h1("9. Cursor handoff & continuity"));
  for (const block of CURSOR_HANDOFF_DOC.split(/\n\n+/)) {
    const t = block.trim();
    if (t) children.push(p(t));
  }

  children.push(h1("10. File structure (trimmed, no _archive)"));
  for (const line of treeLines.slice(0, 400)) {
    children.push(p(line, { size: 20 }));
  }
  if (treeLines.length > 400) {
    children.push(p(`… truncated (${treeLines.length} lines total).`));
  }

  children.push(h1("11. Complete source listing"));
  children.push(
    p(
      `The following ${files.length} files are included verbatim (lines beyond ${MAX_LINES_PER_FILE} per file are truncated).`,
    ),
  );

  const meta = { generatedAt: new Date().toISOString(), files: [] };
  let md = buildMarkdownHeader(pkg, treeLines);

  for (let fi = 0; fi < files.length; fi++) {
    const abs = files[fi];
    const r = rel(abs);
    meta.files.push(r);
    children.push(h2(r));
    let raw = await fs.readFile(abs, "utf-8");
    const lines = raw.split(/\r?\n/);
    let truncated = false;
    if (lines.length > MAX_LINES_PER_FILE) {
      lines.splice(MAX_LINES_PER_FILE);
      truncated = true;
      raw = lines.join("\n");
    }
    const lang =
      r.endsWith(".css") ? "css" : r.endsWith(".json") ? "json" : r.endsWith(".mjs") ? "javascript" : "typescript";
    md += `### ${r}\n\n`;
    if (truncated) {
      md += `*(Truncated to ${MAX_LINES_PER_FILE} lines.)*\n\n`;
    }
    md += mdFenced(lang, raw);

    if (truncated) {
      children.push(p(`(Truncated to ${MAX_LINES_PER_FILE} lines.)`));
    }
    for (const line of raw.split(/\r?\n/)) {
      const display = line.length > 800 ? line.slice(0, 800) + "…" : line;
      children.push(monoLine(display));
    }
    if (fi < files.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT_MD, md, "utf-8");
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  await fs.writeFile(OUT, buf);
  await fs.writeFile(META_OUT, JSON.stringify(meta, null, 2), "utf-8");
  console.log(`Wrote ${rel(OUT)} (${buf.length} bytes)`);
  console.log(`Wrote ${rel(OUT_MD)} (${Buffer.byteLength(md, "utf-8")} bytes)`);
  console.log(`Wrote ${rel(META_OUT)} (${meta.files.length} files listed)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

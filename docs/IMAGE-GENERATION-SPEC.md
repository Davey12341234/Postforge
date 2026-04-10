# Image generation — spec + implementation status

**Implemented:** DALL·E 3 via **`OPENAI_API_KEY`**, `POST/GET /api/unified/images/generate`, Prisma **`UnifiedGeneratedImage`**, credits **`dalle3CreditCost`**, moderation pre-check, **Sharp → WebP** then **local disk** or **optional R2** (`R2_*` env), **Inngest** event **`unified/image.generated`** + function **`unified-image-generated`**, **Create** tab UI in Unified Studio. See `src/lib/image-gen/*`.

**Still not built:** `BrandKit`, multi-provider router (SDXL/MJ/etc.), DALL·E 2 edit, `tenantId` column — sketches below remain long-term target.

**Related:** [`AI-CAPABILITIES-HANDOFF.md`](./AI-CAPABILITIES-HANDOFF.md).

---

## 1. Entity sketches (long-term target)

### GeneratedImage

```
GeneratedImage
├── id, tenantId, userId, conversationId, contentId
├── prompt, enhancedPrompt (brand-augmented)
├── provider (DALLE3 | DALLE2 | STABLE_DIFFUSION | MIDJOURNEY | IDEOGRAM | FLUX)
├── originalUrl, cdnUrl, thumbnailUrl
├── width, height, format (PNG | JPEG | WEBP)
├── style (NATURAL | VIVID | CINEMATIC | BRAND_TEMPLATE | CUSTOM)
├── brandKitId, status, moderationStatus
├── costCredits, publishLogIds
└── createdAt
```

### BrandKit

```
BrandKit
├── primaryColor, secondaryColor, accentColor, backgroundColor
├── fontFamily, logoStyle (MINIMAL | BOLD | PLAYFUL | LUXURY | TECH)
├── moodKeywords[], negativePrompts[]
└── styleReferenceUrl, isActive
```

---

## 2. Multi-provider support grid

| Provider | Best For | Cost Tier (example credits) |
|----------|----------|-----------------------------|
| **DALL·E 3** | Text rendering, prompt adherence | $$ (15–30 credits) |
| **Stable Diffusion XL** | Self-hosted, cost-efficient, ControlNet | $ (5–10 credits) |
| **Midjourney v6** | Aesthetic quality, photorealistic | $$$ (20–40 credits) |
| **Ideogram 2.0** | Typography, graphics, text-in-image | $ (8–16 credits) |
| **FLUX.1** | Open weights, fast inference | $ (8–16 credits) |

Credit numbers are **product policy** — align with whatever ledger exists (`unifiedCredits`, org `aiCredits`, or a dedicated image ledger).

---

## 3. Five-step image pipeline

1. **Intent & brand context** — Resolve `tenantId`, `userId`, optional `brandKitId`; load `BrandKit` (palette, logo style, mood keywords, negative prompts, `styleReferenceUrl`); merge user prompt into **`enhancedPrompt`** (brand-augmented).
2. **Provider routing** — Choose `provider` from policy (cost tier, feature flags, moderation, latency); map to an internal adapter (DALL·E 3, SDXL, Midjourney API proxy, Ideogram, FLUX, etc.).
3. **Generation** — Call provider with size/style; persist **`originalUrl`** (or blob) and **`costCredits`** (reserve/commit against ledger); set **`status`** (e.g. PENDING → SUCCEEDED / FAILED).
4. **Post-process** — Derive **`thumbnailUrl`**, optional **`cdnUrl`**; set **`width` / `height` / `format`**; attach **`conversationId` / `contentId`** when part of a thread or post.
5. **Safety & publish** — Set **`moderationStatus`**; link **`publishLogIds`** when published; index for search/analytics.

---

## 4. Implementation notes (when you decide)

- **Tenancy:** Clarify how `tenantId` maps to existing **`Organization`** vs Unified-only users.
- **Brand overlap:** Today **`Brand`** is org-scoped and minimal; **`BrandKit`** may extend or replace part of that surface.
- **Assets:** **`UnifiedAsset`** today covers uploads; generated images may share CDN patterns or stay a separate table.
- **API surface:** e.g. `POST /api/unified/images/generate` — auth, limits, and webhook/cost parity with [`unified-limits`](./AI-CAPABILITIES-HANDOFF.md) TBD.

---

*Update this file when the schema and provider choices are locked.*

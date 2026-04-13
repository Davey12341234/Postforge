# BabyGPT

BabyGPT is a dark, ChatGPT-style assistant built with Next.js 16, React 19, Tailwind CSS 4, and the `z-ai-web-dev-sdk` on the server.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Z.AI credentials in `.env.local`:

```bash
Z_AI_BASE_URL=https://your-api-base-url
Z_AI_API_KEY=your-api-key
```

3. Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — development server (port 3000)
- `npm run build` — production build
- `npm run lint` — ESLint

## Notes

- Chat history is stored in the browser (`localStorage`, prefix `babygpt_`).
- Community posts are kept in memory on the server and reset when the dev server restarts.
- Legacy PostForge assets are archived under `_archive/`.

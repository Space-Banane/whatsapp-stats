# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Production build (React Router SSG)
pnpm start        # Serve built output
pnpm typecheck    # Run typegen + tsc type check

docker compose up -d  # Run with Docker (serves on http://localhost:6767)
```

There are no tests.

## Architecture

This is a **React Router v7 SPA** (SSR disabled in `react-router.config.ts`) that processes WhatsApp chat exports entirely in the browser — no backend involved.

**Two routes:**
- `/` → `app/routes/home.tsx` — landing page
- `/stats` → `app/routes/stats.tsx` — upload + analysis UI

**Data flow:**
1. User uploads a `.zip` file (WhatsApp export)
2. `@zip.js/zip.js` extracts the `.txt` file from the zip in the browser
3. `parseWhatsAppChat()` in `app/logic/whatsapp.ts` parses the raw text into `Message[]`
4. `calculateDeepStats()` in the same file computes all statistics from `Message[]` into a `DeepStats` object
5. `app/routes/stats.helpers.ts` contains chart-building helpers (ApexCharts config) and insight formatters used only by the stats route
6. The stats route renders three tabs: **Overview**, **Chat Log**, and **Deep Stats**

**Key types** (all in `app/logic/whatsapp.ts`):
- `Message` — a parsed chat line with date, time, sender, content
- `ParticipantStat` — per-person stats (words, media, emojis, streaks, reply times, etc.)
- `DeepStats` — top-level stats object containing `participants: Record<string, ParticipantStat>` plus chat-wide aggregates

**Date parsing caveat:** `parseWhatsAppDateTime` handles ambiguous `dd/mm/yy` vs `mm/dd/yy` by assuming the first field is the day if it's ≤ 12 and the second > 12; otherwise defaults to first=day. Only English Android exports are supported.

**Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`). Dark theme throughout. Charts use ApexCharts via `react-apexcharts`.

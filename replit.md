# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Features

- **Unified inbox** — Email across multiple accounts (Gmail + Outlook)
- **Cloud Storage** — 1 GB free (25 GB on Pro), upload/download/delete/share files
  - **AI Auto-categorization** — Files automatically tagged on upload (invoice, contract, receipt, report, etc.) using GPT-4o-mini
  - **AI Natural Language Search** — Search files by description ("find my invoices from last month") via `POST /api/storage/search`
  - **Analyze with AI** — Per-file AI analysis button opens the AI assistant with the file pre-loaded and auto-sends a summary prompt
- **AI Assistant** — Multi-model chat (OpenAI, Anthropic, Gemini); 200 free requests/day, unlimited for Pro users
- **Contacts & Search** — Search across database records, contacts, and stored/live email messages
- **Calendar** — Month/week/agenda views, syncs events from connected Gmail and Outlook accounts, plus local event creation/deletion

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI, Anthropic (Claude), Google Gemini via Replit AI proxy (`@workspace/integrations-openai-ai-server`, `@workspace/integrations-anthropic-ai`, `@workspace/integrations-gemini-ai`)
- **Auth**: Clerk (white-label, no Replit branding). Web uses `@clerk/react` + Clerk proxy middleware on Express. Mobile uses `@clerk/expo`.
- **Payments (web)**: Disabled for publishing; web payment routes/packages were removed.
- **Payments (mobile)**: RevenueCat via Replit integration (`conn_revenuecat_01KNV6BP3EBM58RFPCRXS6PX0K`)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port via PORT env)
│   ├── unified-comms/      # React + Vite web app (PinnboxIO)
│   └── mobile/             # Expo React Native app (PinnboxIO Mobile)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI client (Replit proxy)
│   └── replit-auth-web/    # Legacy (no longer used — replaced by Clerk)
├── scripts/
│   └── src/                # Utility scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — listed in each package's `tsconfig.json`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then builds all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server.

- Entry: `src/index.ts`
- App setup: `src/app.ts`
- Routes: `src/routes/index.ts` mounts sub-routers
  - `routes/ai.ts` — AI conversations + messages with SSE streaming (`/api/ai/*`)
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-openai-ai-server`

### `artifacts/unified-comms` (`@workspace/unified-comms`)

React + Vite web app. Routes: `/`, `/inbox`, `/contacts`, `/ai`, `/search`, `/accounts`, `/whatsapp`.

- AI page (`/ai`): shows AI chat with SSE streaming.
- AI assistant uses recent database emails, live Gmail/Outlook samples, contacts, WhatsApp messages, and storage file metadata/text snippets as workspace context. Free users get one AI request per UTC day; Pro users get unlimited AI usage.
- Search page (`/search`): labeled "Search", queries local database messages/contacts, live connected email samples where permissions allow, and WhatsApp messages, then offers a Google search link if no local matches are found.
- AI daily limit handling: the assistant recognizes `AI_DAILY_LIMIT_REACHED`; mobile opens the RevenueCat Pro paywall automatically and shows an Upgrade to Pro button in the limit message. Web shows an Upgrade to Pro CTA from the AI limit message.
- Inbox page (`/inbox`): desktop uses three panes; mobile uses a drill-down flow from mailboxes to folder messages to message detail.
- Message detail views support reply/forward draft actions plus body zoom controls; the web shell includes a saved day/dark mode toggle.
- Gmail and Outlook mail access are connected through user-authorized mail connections; API server reads messages live for Inbox/Sent/Drafts/Trash/Spam and exposes them as virtual accounts.

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native app. Tabs: Home, Inbox, AI, Contacts, Accounts.

- AI tab: paywall (RevenueCat) for non-Pro, AI chat for Pro users
- RevenueCat initialized in `_layout.tsx`, paywall in `app/(tabs)/ai.tsx`
- Lib: `lib/revenuecat.tsx` — `SubscriptionProvider`, `useSubscription`
- Storage tab shows a Pro upgrade nudge when quota is over 80% full.
- Mobile uses a saved day/dark theme setting through `ThemeProvider`, with a global toggle overlay and app-wide color tokens.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- Schema includes: `usersTable` (with `stripeCustomerId`, `stripeSubscriptionId`, `isPro`), `aiConversationsTable`, `aiMessagesTable`
- Production migrations via Replit on publish; dev: `pnpm --filter @workspace/db run push`

### `scripts` (`@workspace/scripts`)

Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`.

## RevenueCat Integration Notes

- Project ID: `projce947fce`
- Entitlement: `pro` at $7.99/month
- iOS bundle ID: `com.pinnboxio.mobile`
- Env vars set: `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, etc.
- RevenueCat storage packages: `storage_10gb_monthly`, `storage_50gb_monthly`, `storage_100gb_monthly`.
- EAS production builds include `EXPO_PUBLIC_DOMAIN=pinnboxio.net`, `EXPO_PUBLIC_API_DOMAIN=38defd90-5362-4523-ab8a-d909d0a8000a-00-rdlmxu7tmz57.picard.replit.dev`, `EXPO_PUBLIC_AUTH_REDIRECT_DOMAIN=38defd90-5362-4523-ab8a-d909d0a8000a-00-rdlmxu7tmz57.picard.replit.dev`, and `EXPO_PUBLIC_REPL_ID=38defd90-5362-4523-ab8a-d909d0a8000a` so TestFlight builds can reach the API and use an accepted Replit OIDC callback while the custom domain is still returning 404.

## AI Integration Notes

- Model: `gpt-5.2` via Replit OpenAI proxy (no API key needed)
- Streaming SSE: `POST /api/ai/conversations/:id/messages`
- System context injects recent emails + contacts for each user
- Tables: `ai_conversations`, `ai_messages` (prefixed to avoid conflict with messaging tables)

# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Features

- **Unified inbox** — Email across multiple accounts
- **WhatsApp integration** — Connect via QR code, read & send messages
- **LinkedIn integration** — OAuth sign-in, profile card, conversations
- **Cloud Storage** — 2 GB free, upload/download/delete files, purchase 10/50/100 GB plans via RevenueCat on mobile
- **AI Assistant** — Multi-model chat (OpenAI, Anthropic, Gemini)
- **Contacts & Search** — Global search across messages and contacts

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
- **Payments (web)**: Stripe via Replit integration (`conn_stripe_01KNV6EDHC6M2CZC01JTTH0DQD`)
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
│   └── replit-auth-web/    # Replit Auth web client
├── scripts/
│   └── src/                # Utility scripts
│       ├── seed-stripe.ts  # Seeds Stripe products (run once)
│       └── setup-stripe-schema.ts  # Runs stripe-replit-sync migrations
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
- App setup: `src/app.ts` — includes Stripe webhook (raw body, before JSON), Stripe sync on startup
- Routes: `src/routes/index.ts` mounts sub-routers
  - `routes/ai.ts` — AI conversations + messages with SSE streaming (`/api/ai/*`)
  - `routes/stripe.ts` — Stripe checkout, portal, subscription, products (`/api/stripe/*`)
- Libs: `src/lib/stripeClient.ts`, `src/lib/stripeStorage.ts`, `src/lib/webhookHandlers.ts`
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-openai-ai-server`

### `artifacts/unified-comms` (`@workspace/unified-comms`)

React + Vite web app. Routes: `/`, `/inbox`, `/contacts`, `/ai`, `/search`, `/accounts`, `/whatsapp`.

- AI page (`/ai`): shows paywall (pricing) if not Pro, else shows AI chat with SSE streaming
- Pricing page fetches `/api/stripe/products` and creates Stripe Checkout sessions
- Hooks: `src/hooks/useStripe.ts` — `useGetStripeSubscription`, `useGetStripeProducts`

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native app. Tabs: Home, Inbox, AI, Contacts, Accounts.

- AI tab: paywall (RevenueCat) for non-Pro, AI chat for Pro users
- RevenueCat initialized in `_layout.tsx`, paywall in `app/(tabs)/ai.tsx`
- Lib: `lib/revenuecat.tsx` — `SubscriptionProvider`, `useSubscription`
- Storage tab uses RevenueCat packages for 10/50/100 GB mobile upgrades and activates the selected quota through the API after purchase.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- Schema includes: `usersTable` (with `stripeCustomerId`, `stripeSubscriptionId`, `isPro`), `aiConversationsTable`, `aiMessagesTable`
- Production migrations via Replit on publish; dev: `pnpm --filter @workspace/db run push`

### `scripts` (`@workspace/scripts`)

Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`.

- `seed-stripe` — creates CommsHub Pro product in Stripe ($7.99/mo, $71.88/yr)
- `setup-stripe-schema` — runs `stripe-replit-sync` DB migrations (creates `stripe.*` tables)

## Stripe Integration Notes

- Stripe schema (`stripe.*` tables) synced from Stripe API on server startup via `StripeSync.syncProducts()`/`syncPrices()`
- Webhook endpoint: `POST /api/stripe/webhook` (raw body before JSON middleware)
- Checkout success redirects to `/ai?upgrade=success`
- Products seeded: `prod_UJCaUSfDbnDywe` (CommsHub Pro), prices: `price_1TKaBkBPepAwyKcGu83TlBTF` (monthly), `price_1TKaBkBPepAwyKcGj7jpaFEc` (yearly)

## RevenueCat Integration Notes

- Project ID: `projce947fce`
- Entitlement: `pro` at $7.99/month
- iOS bundle ID: `com.pinnboxio.mobile`
- Env vars set: `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, etc.
- RevenueCat storage packages: `storage_10gb_monthly`, `storage_50gb_monthly`, `storage_100gb_monthly`.
- EAS production builds include `EXPO_PUBLIC_DOMAIN=pinnboxio.net` and `EXPO_PUBLIC_REPL_ID=38defd90-5362-4523-ab8a-d909d0a8000a` so TestFlight builds can reach the production app/API.

## AI Integration Notes

- Model: `gpt-5.2` via Replit OpenAI proxy (no API key needed)
- Streaming SSE: `POST /api/ai/conversations/:id/messages`
- System context injects recent emails + contacts for each user
- Tables: `ai_conversations`, `ai_messages` (prefixed to avoid conflict with messaging tables)

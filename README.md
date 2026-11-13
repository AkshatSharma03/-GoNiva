# GoNiva

A personal travel workspace built with Next.js, React, TypeScript, tRPC, and Tailwind. The original dark purple palette, lavender accents, rounded cards, and hotel discovery experience are retained in a complete trip-planning interface.

## Run locally

Requires Node.js 22.13+ (tested with Node.js 26) and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No API keys are needed for the basic planner and sample hotel collection.

```sh
npm run check   # TypeScript and behavioral tests
npm run build  # Production build
npm start      # Serve the production build
```

## Working features

- Niva conversation with destination, date, guest, budget, star, and amenity preferences. The basic planner accepts requests such as “Paris for 4 nights under $900 with a pool” and follow-up changes. Use two YYYY-MM-DD dates for exact travel dates.
- Optional server-side OpenAI Responses API integration for natural conversation, with structured output validation, bounded requests, timeouts, per-process concurrency and daily/client request caps, and a basic-planner fallback.
- Hotel search with validated dates (1–30 nights), 1–6 guests, total-stay budgets, ratings, and amenities. Results are presented five at a time with sorting and explicit empty/error/loading states.
- Hotel details and booking-provider search handoff carrying destination, dates, and occupancy.
- Saved stays and side-by-side comparison of up to three options, including dates and occupancy.
- Persistent conversations, renamed and pinned trips, custom folders, and trip organization. Recent-trip cards help resume planning.
- URL-based view/trip recovery across refresh and browser Back, plus a phone navigation bar and keyboard-accessible mobile drawer.
- Visible applied-filter chips, one-click empty-result recovery, and undo when removing a saved stay.
- Suggested daily itineraries with editable activities, times, notes, and text export.
- Browser-local persistence, validated JSON backup export/restore, responsive navigation, keyboard-accessible dialogs, and reduced-motion support.

## Integrations and data modes

**Basic planner:** works without credentials. This is a deterministic preference parser, not a language model. It supports the ten destinations shown in the search form. It does not understand arbitrary travel advice, relative dates, or every phrasing.

**AI planner:** set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local`. Keys stay on the server. Recent conversation and current preferences are sent to OpenAI with `store: false`. The response is validated before changing trip preferences. The integration follows the [official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

**Sample hotels:** when `LITEAPI_API_KEY` is absent, the app shows fictional properties with illustrative Unsplash photographs. Prices account for nights and one double room per two guests. No sample constitutes real availability.

**Nuitee/LiteAPI setup:** create your account at [Nuitee Connect](https://connect.nuitee.com), then open Developer tools → API Keys and create your own sandbox key. Add `LITEAPI_API_KEY=sand_…` and `LITEAPI_ENV=sandbox` to Railway's service Variables. Sandbox results stay labeled after saving and restoring a backup. Configured failures produce errors rather than silent sample substitution. Keys stay server-side in the `X-API-Key` header.

**Production:** activate production access in your Nuitee account (including the required payment setup), then replace the key with your own `prod_…` key and set `LITEAPI_ENV=production`. Mismatched key/environment settings fail closed. The migration uses `POST /v3.0/hotels/rates` with hotel metadata included; it does not need separate hotel-content credentials. See [Nuitee's sandbox guide](https://docs.nuitee.com/docs/getting-a-sandbox-key) and [rates API](https://docs.nuitee.com/reference/post_hotels-rates).

**Rate behavior:** guests select nationality explicitly; adults are distributed across double rooms. The server searches up to 20 hotels, applies strict facility and star filters, and chooses a qualifying offer per property. It respects suggested public selling prices, excludes package/loyalty-only rates in production, and displays reported property charges. Unconverted extra fees are shown separately and excluded from USD-budget matches. Rates are indicative estimates requiring revalidation. Actual property photos are used when available; fallback images remain labeled illustrative. Saved estimates may expire.

**Railway variables:** `LITEAPI_API_KEY` is your private key; `LITEAPI_ENV` defaults to `sandbox`. `OPENAI_API_KEY` is optional for AI chat, `OPENAI_MODEL` defaults to `gpt-4o-mini`, and `AI_DAILY_REQUEST_LIMIT` defaults to `100`. The Docker server uses `PORT=8080` and `NODE_ENV=production`. Old `AMADEUS_*` variables are no longer read and can be removed. Never use a `NEXT_PUBLIC_` prefix for keys. Without your Nuitee key, deployed hotel search stays in sample mode.

**Booking:** this application sends visitors to a provider search. It does not process payments, issue reservations, or claim a completed booking. A transactional OTA would additionally need commercial booking access, offer revalidation, payment processing, cancellation/refund workflows, and operational support.

**Persistence:** trips, conversations, folders, and saved stays are stored in localStorage on the current browser, not in a server database. Settings provides backup export and restore. There is no account sync or shared-trip access. Discord OAuth remains an optional inherited endpoint; it does not sync browser data.

## Credit-card travel benefits

The Card perks view supports U.S. consumer Amex Platinum, Chase Sapphire Reserve, Chase Sapphire Preferred, and Capital One Venture X. Users can select card names or mention supported products to Niva. Only product identifiers are saved; card numbers and bank logins are never requested. Card-number-shaped chat messages are rejected before being sent to AI.

The verified catalog links to issuer terms and shows the review date. Users enter actual portal totals, unused credit balances, and confirm booking eligibility. The app ranks these entered quotes by estimated room cost after the applicable credit, respecting stay minimums, per-booking caps, and shared credit pools. Property-spend credits and points are not subtracted as cash. No issuer portal API or personalized bank-offer feed is connected, so this does not claim to search every deal or know account-specific credits. Review terms before booking; catalog entries flag themselves for rechecking after 30 days.

## Deployment

The included multi-stage Dockerfile builds a Next.js standalone server on Node.js 22. Railway uses that Dockerfile, the existing port 8080 domain, and `/api/health`. Build with `npm run build` and start with `npm start`; set integration secrets in the host environment. Never expose secrets with `NEXT_PUBLIC_` variables. Before opening a public AI service, add authentication and distributed rate limits/spend controls at the hosting layer; the included limits are process-local and reset on restart. `AI_DAILY_REQUEST_LIMIT` defaults to 100; clients are limited to 12 AI requests per 15 minutes. Use a shared rate-limit store before scaling replicas.

## Verification

Production dependencies pass `npm audit --omit=dev`. The full dependency tree retains moderate advisories in the ESLint/TypeScript lint tooling.

`npm test` uses the Node test runner with tsx. It covers invalid dates, past trips, length/occupancy constraints, destination-specific samples, combined filters, price filtering, follow-up preferences, nightly-budget calculations, itinerary generation, provider links, and provider failure behavior. Provider contract tests cover metadata, public-price floors, property charges, multi-room occupancy, environment mismatch, and failure behavior. Read-only Nuitee sandbox smoke tests were also run; offline tests do not make external API calls.

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
- Persistent conversations, renamed and pinned trips, custom folders, and trip organization.
- Suggested daily itineraries with editable activities, times, notes, and text export.
- Browser-local persistence, validated JSON backup export/restore, responsive navigation, keyboard-accessible dialogs, and reduced-motion support.

## Integrations and data modes

**Basic planner:** works without credentials. This is a deterministic preference parser, not a language model. It supports the ten destinations shown in the search form. It does not understand arbitrary travel advice, relative dates, or every phrasing.

**AI planner:** set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local`. Keys stay on the server. Recent conversation and current preferences are sent to OpenAI with `store: false`. The response is validated before changing trip preferences. The integration follows the [official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

**Sample hotels:** without Amadeus credentials, destination-specific fictional hotels and illustrative prices are clearly labeled throughout the app. Sample images are illustrative Unsplash photographs; they do not depict the named properties. Sample prices account for nights and one double room per two guests. Sample results never constitute reservations or real availability.

**Amadeus sandbox:** set both Amadeus credentials and `AMADEUS_ENV=test`. The server uses test.api.amadeus.com, and the UI labels sandbox quotes. Configured provider failures are shown to the user rather than silently replaced with samples.

**Live hotel search:** set production Amadeus credentials and `AMADEUS_ENV=production`. The app searches up to 20 hotels and requests offers in batches. Quotes are for the requested occupancy in one room; availability depends on the provider. Unknown ratings/amenities do not pass active filters. Quotes can change and need reconfirmation.

**Booking:** this application sends visitors to a provider search. It does not process payments, issue reservations, or claim a completed booking. A transactional OTA would additionally need commercial booking access, offer revalidation, payment processing, cancellation/refund workflows, and operational support.

**Persistence:** trips, conversations, folders, and saved stays are stored in localStorage on the current browser, not in a server database. Settings provides backup export and restore. There is no account sync or shared-trip access. Discord OAuth remains an optional inherited endpoint; it does not sync browser data.

## Credit-card travel benefits

The Card perks view supports U.S. consumer Amex Platinum, Chase Sapphire Reserve, Chase Sapphire Preferred, and Capital One Venture X. Users can select card names or mention supported products to Niva. Only product identifiers are saved; card numbers and bank logins are never requested. Card-number-shaped chat messages are rejected before being sent to AI.

The verified catalog links to issuer terms and shows the review date. Users enter actual portal totals, unused credit balances, and confirm booking eligibility. The app ranks these entered quotes by estimated room cost after the applicable credit, respecting stay minimums, per-booking caps, and shared credit pools. Property-spend credits and points are not subtracted as cash. No issuer portal API or personalized bank-offer feed is connected, so this does not claim to search every deal or know account-specific credits. Review terms before booking; catalog entries flag themselves for rechecking after 30 days.

## Deployment

The included multi-stage Dockerfile builds a Next.js standalone server on Node.js 22. Railway uses that Dockerfile, the existing port 8080 domain, and `/api/health`. Build with `npm run build` and start with `npm start`; set integration secrets in the host environment. Never expose secrets with `NEXT_PUBLIC_` variables. Before opening a public AI service, add authentication and distributed rate limits/spend controls at the hosting layer; the included limits are process-local and reset on restart. `AI_DAILY_REQUEST_LIMIT` defaults to 100; clients are limited to 12 AI requests per 15 minutes. Use a shared rate-limit store before scaling replicas.

## Verification

Production dependencies pass `npm audit --omit=dev`. The full dependency tree retains moderate advisories in the ESLint/TypeScript lint tooling.

`npm test` uses the Node test runner with tsx. It covers invalid dates, past trips, length/occupancy constraints, destination-specific samples, combined filters, price filtering, follow-up preferences, nightly-budget calculations, itinerary generation, provider links, and provider failure behavior. Live OpenAI and Amadeus calls require credentials and are not exercised by offline tests.

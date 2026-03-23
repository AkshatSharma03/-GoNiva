# Goniva — Hotel Search

A full-stack hotel search app built with the [T3 Stack](https://create.t3.gg/) — Next.js 15, tRPC, NextAuth, Tailwind CSS v4, and the Amadeus Hotel API.

## Features

- Real-time hotel search powered by the [Amadeus API](https://developers.amadeus.com/) (falls back to demo data without credentials)
- City autocomplete with worldwide coverage
- Filters: max price, minimum star rating
- Sort by price, rating, or name
- Free-cancellation indicator per offer
- Dark-purple theme, fully responsive

## Getting Started

```bash
cp .env.example .env
# fill in your secrets
npm install
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes (prod) | NextAuth secret — generate with `npx auth secret` |
| `AUTH_DISCORD_ID` | No | Discord OAuth app client ID |
| `AUTH_DISCORD_SECRET` | No | Discord OAuth app client secret |
| `AMADEUS_CLIENT_ID` | No | Amadeus API client ID |
| `AMADEUS_CLIENT_SECRET` | No | Amadeus API client secret |

Without Amadeus credentials the app displays built-in demo data.

## Deployment (Railway)

1. Push this repo to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Set the environment variables listed above in the Railway dashboard
4. Railway auto-detects the `railway.toml` and runs:
   - **Build**: `npm ci && SKIP_ENV_VALIDATION=1 npm run build`
   - **Start**: `npm start`

## Tech Stack

- [Next.js 15](https://nextjs.org)
- [tRPC](https://trpc.io)
- [NextAuth.js v5](https://authjs.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Amadeus Hotel API](https://developers.amadeus.com)
- [Radix UI](https://radix-ui.com)

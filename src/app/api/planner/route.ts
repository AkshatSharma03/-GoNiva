import { NextResponse } from "next/server";
import { z } from "zod";
import { cities, searchSchema } from "~/lib/travel/model";
import { planLocally } from "~/lib/travel/planner";
import { cardIdSchema, cardContext, detectCards } from "~/lib/travel/cards";
import { plannerAllowance } from "~/server/planner-limits";
export const runtime = "nodejs";
const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
  search: searchSchema,
  cards: z.array(cardIdSchema).max(4).default([]),
});
const responseSchema = z.object({
  reply: z.string().min(1).max(6000),
  cityCode: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number(),
  maxPrice: z.number().nullable(),
  minRating: z.number().nullable(),
  amenities: z.array(z.string()),
});
// Per-process concurrency cap keeps public requests from creating unbounded provider work.
let inFlight = 0;
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 140000)
    return NextResponse.json(
      { error: "Message is too large" },
      { status: 413 },
    );
  let parsed;
  try {
    const body = await request.text();
    if (body.length > 140000)
      return NextResponse.json(
        { error: "Message is too large" },
        { status: 413 },
      );
    parsed = requestSchema.safeParse(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check your dates and message, then try again." },
      { status: 400 },
    );
  const { messages, search } = parsed.data;
  if (
    messages.some(
      (m) => m.role === "user" && /\b(?:\d[ -]?){13,19}\b/.test(m.content),
    )
  )
    return NextResponse.json(
      {
        error:
          "Use card product names only; remove any account or card numbers.",
      },
      { status: 400 },
    );
  const selected = Array.from(
    new Set([
      ...parsed.data.cards,
      ...detectCards(messages.at(-1)?.content ?? ""),
    ]),
  );
  const benefits = cardContext(selected);
  const local = planLocally(
    messages.filter((m) => m.role === "user").at(-1)?.content ?? "",
    search,
  );
  if (
    selected.length &&
    /card|amex|sapphire|venture|credit|benefit|perk|deal/i.test(
      messages.at(-1)?.content ?? "",
    )
  )
    local.reply +=
      " Open Card perks to compare your cards’ official booking programs. Enter portal quotes and your unused credit balance there; eligibility and member-only prices must be checked with the issuer.";
  if (!process.env.OPENAI_API_KEY) return NextResponse.json(local);
  const limited = plannerAllowance(
    (request.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim(),
  );
  if (limited)
    return NextResponse.json(
      { error: limited },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  if (inFlight >= 4)
    return NextResponse.json(
      { error: "Niva is busy. Please try again in a moment." },
      { status: 429 },
    );
  inFlight++;
  try {
    const properties = {
      reply: { type: "string" },
      cityCode: { type: "string", enum: cities.map((c) => c.cityCode) },
      checkIn: { type: "string" },
      checkOut: { type: "string" },
      adults: { type: "integer" },
      maxPrice: { type: ["number", "null"] },
      minRating: { type: ["number", "null"] },
      amenities: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "WIFI",
            "POOL",
            "SPA",
            "FITNESS",
            "RESTAURANT",
            "PARKING",
            "BAR",
          ],
        },
      },
    };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        store: false,
        max_output_tokens: 1500,
        instructions: `You are Niva, a thoughtful travel planning assistant. Card context, verified on the dates shown: ${JSON.stringify(benefits)}. For card questions, use only this context. Never assume unused balances, stack credits, convert points to cash, or invent member-only portal prices. Explain that the Card perks tab compares user-entered eligible portal quotes. Only card product names are needed; never request card numbers, CVVs, or bank logins. Help choose a destination and update search preferences. Supported destinations: ${JSON.stringify(cities.map((c) => ({ code: c.cityCode, name: c.name })))}. Current date: ${new Date().toISOString().slice(0, 10)}. Current search: ${JSON.stringify(search)}. Preserve preferences unless changed by the user. maxPrice is USD total for the entire stay, not nightly. Ask clarifying questions when needed. Never invent hotels, prices, availability, reservations, or booking confirmations. Hotel results come separately from the hotel API and may be sample data. Reply in plain text, at most 150 words. Dates must be valid, in the future, with a stay of 1-30 nights; adults 1-6.`,
        input: messages.map((m) => ({ role: m.role, content: m.content })),
        text: {
          format: {
            type: "json_schema",
            name: "trip_preferences",
            strict: true,
            schema: {
              type: "object",
              properties,
              required: Object.keys(properties),
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error("Provider unavailable");
    const data = z
      .object({
        status: z.string(),
        output: z.array(
          z.object({
            content: z
              .array(
                z.object({ type: z.string(), text: z.string().optional() }),
              )
              .optional(),
          }),
        ),
      })
      .parse(await response.json());
    if (data.status !== "completed") throw new Error("Incomplete response");
    const output = data.output
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("");
    const result = responseSchema.parse(JSON.parse(output));
    const city = cities.find((c) => c.cityCode === result.cityCode);
    if (!city) throw new Error("Unsupported destination");
    const nextSearch = searchSchema.parse({
      ...result,
      cityName: city.name,
      maxPrice: result.maxPrice ?? undefined,
      minRating: result.minRating ?? undefined,
    });
    return NextResponse.json({
      reply: result.reply,
      search: nextSearch,
      mode: "ai",
    });
  } catch {
    return NextResponse.json({
      ...local,
      warning: "AI is temporarily unavailable. Basic trip planning is active.",
    });
  } finally {
    inFlight--;
  }
}

export function GET() {
  return NextResponse.json({
    mode: process.env.OPENAI_API_KEY ? "ai" : "local",
    hotels:
      process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET
        ? process.env.AMADEUS_ENV === "production"
          ? "live"
          : "sandbox"
        : "sample",
    cardPrograms: "verified-catalog",
  });
}

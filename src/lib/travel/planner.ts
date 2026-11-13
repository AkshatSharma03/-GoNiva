import {
  cities,
  addDays,
  searchSchema,
  dateString,
  type Search,
  type Message,
} from "./model";

export function planLocally(message: string, previous: Search) {
  const text = message.toLowerCase();
  const city = cities.find((c) =>
    new RegExp(
      `\\b${c.name.toLowerCase()}\\b|\\b${c.cityCode.toLowerCase()}\\b`,
    ).test(text),
  );
  const search: Search = {
    ...previous,
    amenities: [...previous.amenities],
    ...(city ? { cityName: city.name, cityCode: city.cityCode } : {}),
  };
  if (/no budget|no limit|any budget/.test(text)) search.maxPrice = undefined;
  const guests = /(\d+)\s*(?:guests|adults|people|travelers)/.exec(text);
  if (guests) search.adults = Number(guests[1]);
  const dates = text.match(/\d{4}-\d{2}-\d{2}/g);
  if (dates?.length === 2) {
    search.checkIn = dates[0]!;
    search.checkOut = dates[1]!;
  }
  const duration = /(\d+)\s*nights?/.exec(text);
  if (duration) {
    const days = Number(duration[1]);
    if (days < 1 || days > 30 || !dateString.safeParse(search.checkIn).success)
      return {
        reply: "Choose valid dates and a stay between 1 and 30 nights.",
        search: previous,
        mode: "local" as const,
      };
    search.checkOut = addDays(search.checkIn, days);
  }
  const budget =
    /(?:under|below|budget(?: of)?|max(?:imum)?|up to)\s*\$?\s*(\d[\d,]*(?:\.\d{1,2})?)/.exec(
      text,
    );
  if (budget) {
    const amount = Number(budget[1]!.replace(/,/g, ""));
    search.maxPrice = /(?:per|a|\/)\s*night|nightly/.test(text)
      ? amount *
        ((Date.parse(search.checkOut) - Date.parse(search.checkIn)) / 86400000)
      : amount;
  }
  const stars = /(\d+)\s*(?:star|★)/.exec(text);
  if (stars) search.minRating = Number(stars[1]);
  if (text.includes("luxury")) search.minRating = 5;
  if (/any (?:rating|stars)|remove.*rating/.test(text))
    search.minRating = undefined;
  for (const [word, code] of [
    ["pool", "POOL"],
    ["spa", "SPA"],
    ["gym", "FITNESS"],
    ["restaurant", "RESTAURANT"],
    ["parking", "PARKING"],
  ]) {
    if (new RegExp(`(?:no|without|remove) (?:the )?${word}`).test(text))
      search.amenities = search.amenities.filter((a) => a !== code);
    else if (text.includes(word!))
      search.amenities = Array.from(new Set([...search.amenities, code!]));
  }
  const validated = searchSchema.safeParse(search);
  if (!validated.success)
    return {
      reply:
        validated.error.issues.map((i) => i.message).join(". ") +
        ". You can set exact dates and guests in the search form.",
      search: previous,
      mode: "local" as const,
    };
  const recognized =
    Boolean(city) ||
    Boolean(budget) ||
    Boolean(guests) ||
    Boolean(dates) ||
    Boolean(duration) ||
    Boolean(stars) ||
    /luxury|pool|spa|gym|restaurant|parking|no limit|any budget/.test(text);
  return {
    reply: recognized
      ? `I’ve updated your trip to ${search.cityName}: ${search.adults} guests, ${Math.round((Date.parse(search.checkOut) - Date.parse(search.checkIn)) / 86400000)} nights${search.maxPrice ? `, up to $${search.maxPrice} for the stay` : ""}${search.amenities.length ? `, with ${search.amenities.map((a) => a.toLowerCase()).join(", ")}` : ""}. Your stay suggestions are ready below. Keep refining, or save a favorite and build your itinerary.`
      : `I can help you find a stay in ${cities.map((c) => c.name).join(", ")}. Try “Paris for 4 nights under $900 with a pool,” or give me dates in YYYY-MM-DD format. Your current destination is ${search.cityName}.`,
    search: validated.data,
    mode: "local" as const,
  };
}
export type PlannerResult = {
  reply: string;
  search: Search;
  mode: "local" | "ai";
  warning?: string;
};
export type PlannerRequest = { messages: Message[]; search: Search };

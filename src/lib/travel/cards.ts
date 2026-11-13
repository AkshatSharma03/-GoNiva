import { z } from "zod";
export const cardIds = [
  "amex-platinum",
  "chase-reserve",
  "chase-preferred",
  "venture-x",
] as const;
export const cardIdSchema = z.enum(cardIds);
export type CardId = z.infer<typeof cardIdSchema>;
export const cards: {
  id: CardId;
  name: string;
  issuer: string;
  aliases: string[];
}[] = [
  {
    id: "amex-platinum",
    name: "American Express Platinum",
    issuer: "American Express",
    aliases: ["amex platinum", "american express platinum"],
  },
  {
    id: "chase-reserve",
    name: "Chase Sapphire Reserve",
    issuer: "Chase",
    aliases: ["sapphire reserve", "chase reserve"],
  },
  {
    id: "chase-preferred",
    name: "Chase Sapphire Preferred",
    issuer: "Chase",
    aliases: ["sapphire preferred", "chase preferred"],
  },
  {
    id: "venture-x",
    name: "Capital One Venture X",
    issuer: "Capital One",
    aliases: ["venture x"],
  },
];
export interface CardProgram {
  id: string;
  cardId: CardId;
  name: string;
  pool: string;
  creditCap: number;
  poolCap: number;
  creditPeriod: string;
  minNights: number;
  perks: string[];
  conditions: string;
  source: string;
  portal: string;
  checkedAt: string;
}
const checkedAt = "2026-11-13";
export const cardPrograms: CardProgram[] = [
  {
    id: "amex-fhr",
    cardId: "amex-platinum",
    name: "Fine Hotels + Resorts",
    pool: "amex-lodging",
    creditCap: 300,
    poolCap: 300,
    creditPeriod: "per half-year",
    minNights: 1,
    perks: ["Hotel program benefits vary by property"],
    conditions:
      "Eligible prepaid Amex Travel booking with the U.S. consumer Platinum Card. Shares the lodging-credit allowance with The Hotel Collection and other eligible lodging. FHR credit eligibility requires at least two nights for bookings made from January 1, 2027.",
    source:
      "https://www.americanexpress.com/en-us/travel/benefits/lodging-credit/",
    portal: "https://www.americanexpress.com/en-us/travel/discover/",
    checkedAt,
  },
  {
    id: "amex-thc",
    cardId: "amex-platinum",
    name: "The Hotel Collection",
    pool: "amex-lodging",
    creditCap: 300,
    poolCap: 300,
    creditPeriod: "per half-year",
    minNights: 2,
    perks: ["Selected hotel program benefits"],
    conditions:
      "At least two nights, eligible property, prepaid through Amex Travel with the U.S. consumer Platinum Card. Uses the same lodging-credit balance as Fine Hotels + Resorts; these are alternatives, not extra credits.",
    source:
      "https://www.americanexpress.com/en-us/travel/benefits/lodging-credit/",
    portal: "https://www.americanexpress.com/en-us/travel/discover/",
    checkedAt,
  },
  {
    id: "reserve-edit",
    cardId: "chase-reserve",
    name: "The Edit by Chase Travel",
    pool: "reserve-edit",
    creditCap: 250,
    poolCap: 500,
    creditPeriod: "per booking; $500 per calendar year",
    minNights: 2,
    perks: [
      "Breakfast for two",
      "$100 property credit",
      "Upgrade when available",
    ],
    conditions:
      "Qualifying prepaid The Edit booking, at least two nights. Up to $250 per booking and $500 annually. Property credit is for eligible on-property spending, not a reduction in room price. No other credit is stacked in this estimate.",
    source:
      "https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve",
    portal: "https://www.chase.com/travel/the-edit",
    checkedAt,
  },
  {
    id: "reserve-travel",
    cardId: "chase-reserve",
    name: "Reserve annual travel credit",
    pool: "reserve-travel",
    creditCap: 300,
    poolCap: 300,
    creditPeriod: "per account anniversary year",
    minNights: 1,
    perks: ["Applies to eligible travel purchases"],
    conditions:
      "Credit for qualifying travel purchases with an eligible U.S. consumer Reserve account. Confirm transaction eligibility and the unused balance. Compare this separately from The Edit; this calculator does not assume credits stack.",
    source:
      "https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve",
    portal: "https://www.chase.com/travel",
    checkedAt,
  },
  {
    id: "preferred-hotel",
    cardId: "chase-preferred",
    name: "Chase Travel hotel credit",
    pool: "preferred-hotel",
    creditCap: 100,
    poolCap: 100,
    creditPeriod: "per account anniversary year",
    minNights: 1,
    perks: ["Hotel credit through Chase Travel"],
    conditions:
      "Qualifying hotel purchase through Chase Travel using the eligible U.S. consumer Sapphire Preferred card. Confirm your anniversary-year balance and purchase terms.",
    source:
      "https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred",
    portal: "https://www.chase.com/travel",
    checkedAt,
  },
  {
    id: "venture-travel",
    cardId: "venture-x",
    name: "Capital One Travel credit",
    pool: "venture-travel",
    creditCap: 300,
    poolCap: 300,
    creditPeriod: "per account anniversary year",
    minNights: 1,
    perks: ["Credit applied in the travel portal"],
    conditions:
      "Eligible U.S. Venture X primary cardholder. Use Capital One Travel and confirm the available credit at checkout. Credits expire at the next account anniversary. Do not assume an outside booking qualifies.",
    source: "https://www.capitalone.com/travel/premier-collection/",
    portal: "https://travel.capitalone.com/",
    checkedAt,
  },
  {
    id: "venture-premier",
    cardId: "venture-x",
    name: "Premier Collection",
    pool: "venture-travel",
    creditCap: 300,
    poolCap: 300,
    creditPeriod: "same Capital One Travel credit",
    minNights: 1,
    perks: [
      "$100 experience credit",
      "Breakfast for two at hotels",
      "Upgrade when available",
    ],
    conditions:
      "Qualifying Premier Collection hotel booked through Capital One Travel. Select pay today to use the travel credit. The experience credit covers eligible property expenses; it is not deducted from the room total. Shares the annual travel-credit pool.",
    source: "https://www.capitalone.com/travel/premier-collection/",
    portal: "https://travel.capitalone.com/",
    checkedAt,
  },
];
export function detectCards(text: string): CardId[] {
  const input = text.toLowerCase();
  if (/\b(business|corporate)\b/.test(input)) return [];
  return cards
    .filter((c) => c.aliases.some((a) => input.includes(a)))
    .map((c) => c.id);
}
export function detectOwnedCards(text: string): CardId[] {
  if (
    !/\b(?:i|we) (?:have|own|hold|carry|use)\b|\bmy (?:credit )?card is\b/i.test(
      text,
    ) ||
    /\b(?:don’t|don't|do not|no longer|used to)\b/i.test(text)
  )
    return [];
  return detectCards(text);
}
export function minimumNights(program: CardProgram, bookingDate: string) {
  return program.id === "amex-fhr" && bookingDate >= "2027-01-01"
    ? 2
    : program.minNights;
}
export function estimateCardBenefit(
  program: CardProgram,
  input: {
    nights: number;
    bookingDate: string;
    quote: number;
    remaining: number;
    eligible: boolean;
  },
) {
  if (
    !input.eligible ||
    input.nights < minimumNights(program, input.bookingDate) ||
    !Number.isFinite(input.quote) ||
    input.quote <= 0 ||
    !Number.isFinite(input.remaining) ||
    input.remaining < 0
  )
    return null;
  const credit = Math.min(
    input.quote,
    input.remaining,
    program.creditCap,
    program.poolCap,
  );
  return { credit, net: Math.round((input.quote - credit) * 100) / 100 };
}
export function cardContext(ids: CardId[]) {
  return cardPrograms
    .filter((p) => ids.includes(p.cardId))
    .map((p) => ({
      card: cards.find((c) => c.id === p.cardId)?.name,
      program: p.name,
      maxPerBooking: p.creditCap,
      remainingBalance: "unknown; ask user",
      period: p.creditPeriod,
      terms: p.conditions,
      source: p.source,
      verified: p.checkedAt,
    }));
}

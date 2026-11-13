import { z } from "zod";
import {
  cities,
  type Hotel,
  type Offer,
  type Search,
} from "~/lib/travel/model";
import { HotelProviderError } from "./liteapi-config";
const base = "https://api.liteapi.travel/v3.0";
// Canonical facility IDs from GET /data/facilities, verified 2026-11-13.
const facilityIds: Record<string, number> = {
  WIFI: 107,
  POOL: 301,
  SPA: 54,
  FITNESS: 11,
  RESTAURANT: 3,
  PARKING: 2,
  BAR: 7,
};
const amount = z.object({
  amount: z.number().finite().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
const amountSet = z.union([amount, z.array(amount)]).nullish();
const fee = z.object({
  included: z.boolean(),
  amount: z.number().finite().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  description: z.string().default("Property charge"),
});
const rate = z.object({
  name: z.string().optional(),
  adultCount: z.number().int().optional(),
  boardType: z.string().optional(),
  retailRate: z
    .object({
      total: amountSet,
      suggestedSellingPrice: amountSet,
      taxesAndFees: z.array(fee).nullish(),
    })
    .optional(),
  cancellationPolicies: z
    .object({ refundableTag: z.string().optional() })
    .nullish(),
});
const offerSchema = z.object({
  offerId: z.string().min(1),
  rateType: z.string().optional(),
  loyaltyMembershipIdRequired: z.boolean().optional(),
  offerRetailRate: amountSet,
  suggestedSellingPrice: amountSet,
  rates: z.array(rate).min(1),
});
const hotelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().nullish(),
  city_name: z.string().nullish(),
  country_code: z.string().nullish(),
  stars: z.number().min(0).max(5).nullish(),
  main_photo: z.string().nullish(),
  thumbnail: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
});
const envelope = z.object({
  data: z
    .array(z.object({ hotelId: z.string(), roomTypes: z.array(z.unknown()) }))
    .optional(),
  hotels: z.array(z.unknown()).optional(),
  sandbox: z.boolean().optional(),
  error: z.object({ code: z.union([z.number(), z.string()]) }).optional(),
});
const amounts = (value: z.infer<typeof amountSet>) =>
  value ? (Array.isArray(value) ? value : [value]) : [];
const usd = (value: z.infer<typeof amountSet>) =>
  amounts(value).find((a) => a.currency === "USD")?.amount;
export function hotelOccupancies(adults: number) {
  return Array.from({ length: Math.ceil(adults / 2) }, (_, i) => ({
    adults: Math.min(2, adults - i * 2),
  }));
}
function imageUrl(...values: (string | null | undefined)[]) {
  for (const value of values) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && !url.username && !url.password)
        return url.href;
    } catch {}
  }
  return undefined;
}
export function buildLiteapiSearch(search: Search) {
  const city = cities.find((c) => c.cityCode === search.cityCode);
  if (!city)
    throw new HotelProviderError(
      "configuration",
      "Choose a supported destination to search hotels.",
    );
  const amenities = search.amenities.map((a) => facilityIds[a]);
  if (amenities.some((id) => id === undefined))
    throw new HotelProviderError(
      "configuration",
      "One of the selected hotel amenities is not supported.",
    );
  return {
    cityName: city.name,
    countryCode: city.countryCode,
    checkin: search.checkIn,
    checkout: search.checkOut,
    currency: "USD",
    guestNationality: search.guestNationality,
    occupancies: hotelOccupancies(search.adults),
    limit: 20,
    maxRatesPerHotel: 5,
    includeHotelData: true,
    timeout: 10,
    sessionId: crypto.randomUUID(),
    ...(search.minRating
      ? {
          starRating: Array.from(
            { length: 11 - search.minRating * 2 },
            (_, i) => search.minRating! + i * 0.5,
          ),
        }
      : {}),
    ...(amenities.length
      ? { facilities: amenities, strictFacilityFiltering: true }
      : {}),
  };
}
function mapOffer(
  value: unknown,
  hotel: Hotel,
  search: Search,
  mode: "sandbox" | "live",
): Offer | undefined {
  const parsed = offerSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const o = parsed.data;
  // Package and loyalty-only offers are not sold as public standalone inventory.
  if (
    mode === "live" &&
    (o.rateType !== "standard" || o.loyaltyMembershipIdRequired)
  )
    return undefined;
  const occupancy = hotelOccupancies(search.adults);
  if (
    o.rates.length !== occupancy.length ||
    o.rates.some(
      (r, i) =>
        r.adultCount !== undefined && r.adultCount !== occupancy[i]?.adults,
    )
  )
    return undefined;
  const roomTotals = o.rates.map((r) => usd(r.retailRate?.total));
  const retail =
    usd(o.offerRetailRate) ??
    (roomTotals.every((v) => v !== undefined)
      ? roomTotals.reduce<number>((sum, v) => sum + v!, 0)
      : undefined);
  if (retail === undefined || retail <= 0) return undefined;
  const suggested = usd(o.suggestedSellingPrice);
  const perRoomSuggested = o.rates.map((r) =>
    usd(r.retailRate?.suggestedSellingPrice),
  );
  const floor =
    suggested ??
    (perRoomSuggested.every((v) => v !== undefined)
      ? perRoomSuggested.reduce<number>((sum, v) => sum + v!, 0)
      : retail);
  // A supplied public-price floor in another currency cannot be safely compared without FX.
  if (
    (amounts(o.suggestedSellingPrice).length && suggested === undefined) ||
    o.rates.some(
      (r) =>
        amounts(r.retailRate?.suggestedSellingPrice).length &&
        !amounts(r.retailRate?.suggestedSellingPrice).some(
          (p) => p.currency === "USD",
        ),
    )
  )
    return undefined;
  const payAtProperty = o.rates.flatMap((r) =>
    (r.retailRate?.taxesAndFees ?? [])
      .filter((f) => !f.included)
      .map(({ amount, currency, description }) => ({
        amount,
        currency,
        description,
      })),
  );
  const usdFees = payAtProperty
    .filter((f) => f.currency === "USD")
    .reduce((sum, f) => sum + f.amount, 0);
  // SSP may already include taxes. Compare it with retail + reported property charges,
  // rather than adding property charges to SSP again.
  const total = Math.max(floor, retail + usdFees);
  const boards = new Set(o.rates.map((r) => r.boardType));
  return {
    offerId: o.offerId,
    hotelId: hotel.hotelId,
    hotelName: hotel.name,
    price: { currency: "USD", total: total.toFixed(2) },
    room: {
      type: "PROVIDER_OFFER",
      description: `${o.rates.length} ${o.rates.length === 1 ? "room" : "rooms"} · ${o.rates.map((r) => r.name ?? "Room details on request").join(" / ")}`,
    },
    checkInDate: search.checkIn,
    checkOutDate: search.checkOut,
    adults: search.adults,
    boardType: boards.size === 1 ? o.rates[0]?.boardType : undefined,
    cancellable: o.rates.every(
      (r) => r.cancellationPolicies?.refundableTag === "RFN",
    ),
    payAtProperty,
    additionalFees: payAtProperty.filter((f) => f.currency !== "USD"),
    isEstimate: true,
  };
}
export async function searchLiteapiHotels(
  search: Search,
  key: string,
  mode: "sandbox" | "live",
) {
  let response: Response;
  try {
    response = await fetch(`${base}/hotels/rates`, {
      method: "POST",
      headers: {
        "X-API-Key": key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(buildLiteapiSearch(search)),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
  } catch {
    throw new HotelProviderError(
      "unavailable",
      "Nuitee hotel search timed out. Please try again.",
    );
  }
  const meta = {
    isMock: false,
    source: mode,
    provider: "liteapi" as const,
    notice:
      mode === "sandbox"
        ? "Nuitee sandbox test results. Prices and availability are for testing; no reservation is created."
        : "Nuitee public stay estimates include reported USD property charges. Other-currency fees are shown separately. Final price and eligibility require revalidation; external booking sites set their own prices.",
  };
  const empty = () => ({
    ...meta,
    hotels: [] as Hotel[],
    offers: [] as Offer[],
  });
  if (response.status === 204) return empty();
  if (response.status === 401 || response.status === 403)
    throw new HotelProviderError(
      "authentication",
      "Nuitee hotel access is unavailable. Check the server API key and account permissions.",
    );
  if (response.status === 429)
    throw new HotelProviderError(
      "rate_limit",
      "Nuitee’s search limit has been reached. Please try again shortly.",
    );
  if (!response.ok)
    throw new HotelProviderError(
      "unavailable",
      "Nuitee hotel search is temporarily unavailable. Please try again.",
    );
  let payload: z.infer<typeof envelope>;
  try {
    payload = envelope.parse(await response.json());
  } catch {
    throw new HotelProviderError(
      "unavailable",
      "Nuitee returned an unexpected response. Please try again.",
    );
  }
  if (payload.error) {
    if (String(payload.error.code) === "2001") return empty();
    throw new HotelProviderError(
      "unavailable",
      "Nuitee could not complete this hotel search. Please try again.",
    );
  }
  if (payload.sandbox !== undefined && payload.sandbox !== (mode === "sandbox"))
    throw new HotelProviderError(
      "configuration",
      "Nuitee returned a different hotel environment than configured. Check the API key and environment.",
    );
  if (!payload.data)
    throw new HotelProviderError(
      "unavailable",
      "Nuitee returned an incomplete hotel response. Please try again.",
    );
  const metadata = new Map(
    (payload.hotels ?? []).flatMap((v) => {
      const p = hotelSchema.safeParse(v);
      return p.success ? [[p.data.id, p.data] as const] : [];
    }),
  );
  const hotels: Hotel[] = [],
    offers: Offer[] = [];
  for (const item of payload.data.slice(0, 20)) {
    const h = metadata.get(item.hotelId);
    if (!h) continue;
    const city = cities.find((c) => c.cityCode === search.cityCode)!;
    if (h.country_code && h.country_code.toUpperCase() !== city.countryCode)
      continue;
    const hotel: Hotel = {
      hotelId: h.id,
      name: h.name,
      cityCode: search.cityCode,
      address: [h.address, h.city_name ?? city.name].filter(Boolean).join(", "),
      rating: h.stars ? String(h.stars) : undefined,
      amenities: [...search.amenities],
      latitude: h.latitude ?? undefined,
      longitude: h.longitude ?? undefined,
      imageUrl: imageUrl(h.thumbnail, h.main_photo),
    };
    const candidates = item.roomTypes
      .map((o) => mapOffer(o, hotel, search, mode))
      .filter((o): o is Offer => Boolean(o))
      .filter(
        (o) =>
          search.maxPrice === undefined ||
          (!o.additionalFees?.length &&
            Number(o.price.total) <= search.maxPrice),
      )
      .sort((a, b) => Number(a.price.total) - Number(b.price.total));
    const best = candidates[0];
    if (!best) continue;
    hotels.push(hotel);
    offers.push(best);
  }
  return { ...meta, hotels, offers };
}

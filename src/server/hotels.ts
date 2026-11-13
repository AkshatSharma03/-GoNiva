import { z } from "zod";
import {
  cities,
  nights,
  type Hotel,
  type Offer,
  type Search,
} from "~/lib/travel/model";

const base = () =>
  process.env.AMADEUS_ENV === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";
let cached: { token: string; expires: number; host: string } | undefined;
async function token() {
  const id = process.env.AMADEUS_CLIENT_ID,
    secret = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cached && cached.host === base() && cached.expires > Date.now())
    return cached.token;
  const res = await fetch(`${base()}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("Hotel provider authentication failed");
  const data = z
    .object({ access_token: z.string(), expires_in: z.number() })
    .parse(await res.json());
  cached = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
    host: base(),
  };
  return cached.token;
}
const sampleTypes = [
  {
    name: "Garden House",
    price: 155,
    rating: "4",
    amenities: ["WIFI", "RESTAURANT", "SPA"],
  },
  {
    name: "The Grand",
    price: 310,
    rating: "5",
    amenities: ["WIFI", "POOL", "SPA", "RESTAURANT", "FITNESS"],
  },
  {
    name: "City Loft",
    price: 115,
    rating: "3",
    amenities: ["WIFI", "FITNESS"],
  },
  {
    name: "Riverside Suites",
    price: 225,
    rating: "4",
    amenities: ["WIFI", "POOL", "RESTAURANT"],
  },
  {
    name: "The Violet",
    price: 185,
    rating: "4",
    amenities: ["WIFI", "RESTAURANT", "BAR"],
  },
  { name: "Central Hideaway", price: 85, rating: "3", amenities: ["WIFI"] },
  {
    name: "Palazzo Retreat",
    price: 420,
    rating: "5",
    amenities: ["WIFI", "POOL", "SPA", "FITNESS"],
  },
  {
    name: "Neighborhood Inn",
    price: 135,
    rating: "3",
    amenities: ["WIFI", "RESTAURANT", "PARKING"],
  },
];
export function sampleHotels(search: Search) {
  const city = cities.find((c) => c.cityCode === search.cityCode);
  const hotels: Hotel[] = sampleTypes.map((h, i) => ({
    hotelId: `sample-${search.cityCode}-${i}`,
    name: `${h.name} ${search.cityName}`,
    cityCode: search.cityCode,
    rating: h.rating,
    address: `${city?.spots[i % city.spots.length] ?? "City center"}, ${search.cityName}`,
    amenities: h.amenities,
    distance: `${(0.4 + i * 0.3).toFixed(1)} km`,
  }));
  const offers: Offer[] = hotels.map((h, i) => ({
    hotelId: h.hotelId,
    hotelName: h.name,
    offerId: `sample-offer-${h.hotelId}`,
    price: {
      currency: "USD",
      total: String(
        sampleTypes[i]!.price *
          nights(search.checkIn, search.checkOut) *
          Math.ceil(search.adults / 2),
      ),
    },
    checkInDate: search.checkIn,
    checkOutDate: search.checkOut,
    adults: search.adults,
    room: {
      type: "DOUBLE",
      description: `${Math.ceil(search.adults / 2)} room(s) · Double room`,
      bedType: "DOUBLE",
    },
    cancellable: Number(h.rating) >= 4,
    boardType: Number(h.rating) === 5 ? "BREAKFAST" : "ROOM_ONLY",
  }));
  return applyFilters(
    {
      hotels,
      offers,
      isMock: true,
      source: "sample" as const,
      notice:
        "Illustrative hotels and prices. These are not real properties or bookable offers.",
    },
    search,
  );
}
export function applyFilters<T extends { hotels: Hotel[]; offers: Offer[] }>(
  data: T,
  search: Search,
): T {
  const offers = data.offers.filter(
    (o) =>
      search.maxPrice === undefined || Number(o.price.total) <= search.maxPrice,
  );
  const offered = new Set(offers.map((o) => o.hotelId));
  const hotels = data.hotels.filter(
    (h) =>
      (!search.minRating || Number(h.rating) >= search.minRating) &&
      search.amenities.every((a) => h.amenities?.includes(a)) &&
      (search.maxPrice === undefined || offered.has(h.hotelId)),
  );
  const ids = new Set(hotels.map((h) => h.hotelId));
  return { ...data, hotels, offers: offers.filter((o) => ids.has(o.hotelId)) };
}
const listSchema = z.object({
  data: z
    .array(
      z.object({
        hotelId: z.string(),
        name: z.string(),
        rating: z.string().optional(),
        geoCode: z
          .object({ latitude: z.number(), longitude: z.number() })
          .optional(),
        amenities: z.array(z.string()).optional(),
        address: z
          .object({
            lines: z.array(z.string()).optional(),
            cityName: z.string().optional(),
          })
          .optional(),
        distance: z.object({ value: z.number(), unit: z.string() }).optional(),
      }),
    )
    .default([]),
});
const offersSchema = z.object({
  data: z
    .array(
      z.object({
        hotel: z.object({ hotelId: z.string(), name: z.string() }),
        offers: z
          .array(
            z.object({
              id: z.string(),
              price: z.object({
                currency: z.string(),
                total: z.string(),
                base: z.string().optional(),
              }),
              room: z
                .object({
                  type: z.string().optional(),
                  description: z
                    .object({ text: z.string().optional() })
                    .optional(),
                  typeEstimated: z
                    .object({ bedType: z.string().optional() })
                    .optional(),
                })
                .optional(),
              boardType: z.string().optional(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});
async function providerGet(path: string, access: string) {
  const res = await fetch(`${base()}${path}`, {
    headers: { Authorization: `Bearer ${access}` },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) cached = undefined;
    throw new Error("Hotel provider is temporarily unavailable");
  }
  return res.json() as Promise<unknown>;
}
export async function searchHotels(search: Search) {
  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET)
    return sampleHotels(search);
  // A configured provider failure is surfaced instead of silently substituting invented prices.
  const access = await token();
  if (!access) return sampleHotels(search);
  const list = listSchema.parse(
    await providerGet(
      `/v1/reference-data/locations/hotels/by-city?${new URLSearchParams({ cityCode: search.cityCode, radius: "20", radiusUnit: "KM", hotelSource: "ALL" })}`,
      access,
    ),
  );
  const hotels: Hotel[] = list.data.slice(0, 20).map((h) => ({
    hotelId: h.hotelId,
    name: h.name,
    cityCode: search.cityCode,
    rating: h.rating,
    amenities: h.amenities,
    latitude: h.geoCode?.latitude,
    longitude: h.geoCode?.longitude,
    address: [...(h.address?.lines ?? []), h.address?.cityName]
      .filter(Boolean)
      .join(", "),
    distance: h.distance ? `${h.distance.value} ${h.distance.unit}` : undefined,
  }));
  const chunks = Array.from({ length: Math.ceil(hotels.length / 5) }, (_, i) =>
    hotels.slice(i * 5, i * 5 + 5),
  );
  const results = await Promise.all(
    chunks.map(async (chunk) =>
      offersSchema.parse(
        await providerGet(
          `/v3/shopping/hotel-offers?${new URLSearchParams({ hotelIds: chunk.map((h) => h.hotelId).join(","), checkInDate: search.checkIn, checkOutDate: search.checkOut, adults: String(search.adults), currency: "USD", roomQuantity: "1" })}`,
          access,
        ),
      ),
    ),
  );
  const offers: Offer[] = results.flatMap((r) =>
    r.data.flatMap((item) =>
      item.offers.slice(0, 1).map((o) => ({
        offerId: o.id,
        hotelId: item.hotel.hotelId,
        hotelName: item.hotel.name,
        price: o.price,
        room: {
          type: o.room?.type ?? "",
          description: o.room?.description?.text,
          bedType: o.room?.typeEstimated?.bedType,
        },
        checkInDate: search.checkIn,
        checkOutDate: search.checkOut,
        adults: search.adults,
        boardType: o.boardType,
      })),
    ),
  );
  return applyFilters(
    {
      hotels,
      offers,
      isMock: false,
      source:
        process.env.AMADEUS_ENV === "production"
          ? ("live" as const)
          : ("sandbox" as const),
      notice:
        process.env.AMADEUS_ENV === "production"
          ? "Provider quotes can change. Confirm price, occupancy, and cancellation terms with the booking provider."
          : "Amadeus test environment. Quotes are for testing and are not production inventory.",
    },
    search,
  );
}

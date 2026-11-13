import { liteapiConfiguration } from "./liteapi-config";
import { searchLiteapiHotels } from "./liteapi";
import {
  cities,
  nights,
  type Hotel,
  type Offer,
  type Search,
} from "~/lib/travel/model";

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
      provider: "liteapi" as const,
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
      search.maxPrice === undefined ||
      (!o.additionalFees?.length && Number(o.price.total) <= search.maxPrice),
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
export async function searchHotels(search: Search) {
  const { mode, key } = liteapiConfiguration();
  if (mode === "sample" || !key) return sampleHotels(search);
  return applyFilters(await searchLiteapiHotels(search, key, mode), search);
}

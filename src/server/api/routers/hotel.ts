import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Hotel {
  hotelId: string;
  name: string;
  cityCode: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  rating?: string;
  amenities?: string[];
  distance?: string;
}

export interface HotelOffer {
  offerId: string;
  hotelId: string;
  hotelName: string;
  price: { currency: string; total: string; base?: string };
  room?: { type: string; description?: string; bedType?: string };
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  cancellable?: boolean;
  boardType?: string;
}

// ── Amadeus auth ──────────────────────────────────────────────────────────────
let _token: string | null = null;
let _expiry = 0;

async function getToken(): Promise<string | null> {
  const id  = process.env.AMADEUS_CLIENT_ID;
  const sec = process.env.AMADEUS_CLIENT_SECRET;
  if (!id || !sec) return null;
  if (_token && Date.now() < _expiry) return _token;
  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${id}&client_secret=${sec}`,
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { access_token: string; expires_in: number };
  _token  = d.access_token;
  _expiry = Date.now() + (d.expires_in - 60) * 1000;
  return _token;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK: Hotel[] = [
  { hotelId: "GNV001", name: "The Grand Palazzo",       cityCode: "LON", latitude: 51.5074, longitude: -0.1278, address: "1 Mayfair Lane, London W1K",         rating: "5", amenities: ["WIFI","SPA","POOL","RESTAURANT","BAR","CONCIERGE"], distance: "0.3 km" },
  { hotelId: "GNV002", name: "Violet Garden Suites",    cityCode: "LON", latitude: 51.5155, longitude: -0.0921, address: "45 Bloomsbury Square, London WC1A",   rating: "4", amenities: ["WIFI","FITNESS","RESTAURANT","BAR"],                distance: "1.1 km" },
  { hotelId: "GNV003", name: "The Purple Crown",        cityCode: "LON", latitude: 51.4994, longitude: -0.1248, address: "9 Westminster Bridge Rd, London SE1",  rating: "5", amenities: ["WIFI","SPA","POOL","BAR","RESTAURANT","PARKING"],  distance: "1.4 km" },
  { hotelId: "GNV004", name: "Clerkenwell Boutique",    cityCode: "LON", latitude: 51.5225, longitude: -0.1022, address: "12 Clerkenwell Rd, London EC1M",       rating: "4", amenities: ["WIFI","BAR","FITNESS","RESTAURANT"],                distance: "2.2 km" },
  { hotelId: "GNV005", name: "City Budget Inn",         cityCode: "LON", latitude: 51.5120, longitude: -0.0898, address: "88 Bishopsgate, London EC2N",          rating: "3", amenities: ["WIFI","PARKING"],                                    distance: "3.0 km" },
  { hotelId: "GNV006", name: "Soho Nights Hotel",       cityCode: "LON", latitude: 51.5130, longitude: -0.1320, address: "22 Dean Street, London W1D",           rating: "4", amenities: ["WIFI","BAR","RESTAURANT","ROOFTOP"],                 distance: "0.8 km" },
  { hotelId: "GNV007", name: "The Kensington Pearl",    cityCode: "LON", latitude: 51.4991, longitude: -0.1924, address: "35 Queen's Gate, London SW7",          rating: "5", amenities: ["WIFI","SPA","POOL","RESTAURANT","CONCIERGE"],       distance: "2.9 km" },
  { hotelId: "GNV008", name: "Shoreditch Loft Hotel",   cityCode: "LON", latitude: 51.5245, longitude: -0.0780, address: "5 Curtain Rd, London EC2A",            rating: "3", amenities: ["WIFI","BAR","FITNESS"],                              distance: "4.1 km" },
];

const MOCK_PRICES: Record<string, number> = {
  GNV001: 580, GNV002: 210, GNV003: 620, GNV004: 185,
  GNV005: 92,  GNV006: 195, GNV007: 640, GNV008: 110,
};

function nights(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function mockOffers(hotels: Hotel[], checkIn: string, checkOut: string, adults: number): HotelOffer[] {
  const n = nights(checkIn, checkOut);
  return hotels.map(h => {
    const ppn = MOCK_PRICES[h.hotelId] ?? 150;
    const total = (ppn * n * adults).toFixed(2);
    return {
      offerId: `mock-${h.hotelId}`,
      hotelId: h.hotelId,
      hotelName: h.name,
      price: { currency: "USD", total, base: (parseFloat(total) * 0.88).toFixed(2) },
      room: { type: "STANDARD_ROOM", description: parseInt(h.rating ?? "3") >= 5 ? "Deluxe Room with City View" : "Standard Double Room", bedType: "KING" },
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      cancellable: parseInt(h.rating ?? "3") >= 4,
      boardType: parseInt(h.rating ?? "3") >= 5 ? "BREAKFAST" : "ROOM_ONLY",
    };
  });
}

// ── Popular cities ────────────────────────────────────────────────────────────
const CITIES = [
  { cityCode: "LON", name: "London",       country: "GB" }, { cityCode: "NYC", name: "New York",      country: "US" },
  { cityCode: "PAR", name: "Paris",        country: "FR" }, { cityCode: "DXB", name: "Dubai",         country: "AE" },
  { cityCode: "SIN", name: "Singapore",    country: "SG" }, { cityCode: "TYO", name: "Tokyo",         country: "JP" },
  { cityCode: "BKK", name: "Bangkok",      country: "TH" }, { cityCode: "ROM", name: "Rome",          country: "IT" },
  { cityCode: "BCN", name: "Barcelona",    country: "ES" }, { cityCode: "AMS", name: "Amsterdam",     country: "NL" },
  { cityCode: "LAX", name: "Los Angeles",  country: "US" }, { cityCode: "MIA", name: "Miami",         country: "US" },
  { cityCode: "IST", name: "Istanbul",     country: "TR" }, { cityCode: "BER", name: "Berlin",        country: "DE" },
  { cityCode: "SYD", name: "Sydney",       country: "AU" }, { cityCode: "HKG", name: "Hong Kong",     country: "HK" },
  { cityCode: "SEL", name: "Seoul",        country: "KR" }, { cityCode: "MUM", name: "Mumbai",        country: "IN" },
  { cityCode: "MAD", name: "Madrid",       country: "ES" }, { cityCode: "ZRH", name: "Zurich",        country: "CH" },
];

// ── Router ────────────────────────────────────────────────────────────────────
export const hotelRouter = createTRPCRouter({

  searchCities: publicProcedure
    .input(z.object({ keyword: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const token = await getToken();
      const kw = input.keyword.toLowerCase();

      if (!token) {
        return { cities: CITIES.filter(c => c.name.toLowerCase().includes(kw) || c.cityCode.toLowerCase().includes(kw)).slice(0, 8) };
      }
      try {
        const res = await fetch(
          `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${encodeURIComponent(input.keyword)}&page[limit]=8`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { data?: Array<{ iataCode: string; name: string; address?: { countryCode?: string } }> };
        return {
          cities: (data.data ?? []).map(l => ({ cityCode: l.iataCode, name: l.name, country: l.address?.countryCode ?? "" })),
        };
      } catch {
        return { cities: CITIES.filter(c => c.name.toLowerCase().includes(kw)).slice(0, 8) };
      }
    }),

  searchHotels: publicProcedure
    .input(z.object({
      cityCode:  z.string().min(2).max(6).toUpperCase(),
      checkIn:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      checkOut:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      adults:    z.number().int().min(1).max(9).default(2),
      maxPrice:  z.number().optional(),
      minRating: z.number().min(1).max(5).optional(),
    }))
    .query(async ({ input }) => {
      const token = await getToken();

      if (!token) {
        let hotels = MOCK.map(h => ({ ...h, cityCode: input.cityCode }));
        if (input.minRating) hotels = hotels.filter(h => parseInt(h.rating ?? "0") >= input.minRating!);
        let offers = mockOffers(hotels, input.checkIn, input.checkOut, input.adults);
        if (input.maxPrice) offers = offers.filter(o => parseFloat(o.price.total) <= input.maxPrice!);
        return { hotels, offers, isMock: true };
      }

      try {
        const listRes = await fetch(
          `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${input.cityCode}&radius=20&radiusUnit=KM&hotelSource=ALL`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!listRes.ok) throw new Error("hotel list failed");
        const listData = (await listRes.json()) as {
          data?: Array<{ hotelId: string; name: string; rating?: string; geoCode?: { latitude: number; longitude: number }; address?: { lines?: string[]; cityName?: string; countryCode?: string; cityCode?: string }; amenities?: string[]; distance?: { value: number; unit: string } }>;
        };

        let hotels: Hotel[] = (listData.data ?? []).slice(0, 20).map(h => ({
          hotelId: h.hotelId, name: h.name, cityCode: h.address?.cityCode ?? input.cityCode,
          latitude: h.geoCode?.latitude, longitude: h.geoCode?.longitude,
          address: [h.address?.lines?.[0], h.address?.cityName, h.address?.countryCode].filter(Boolean).join(", "),
          rating: h.rating, amenities: h.amenities,
          distance: h.distance ? `${h.distance.value} ${h.distance.unit}` : undefined,
        }));
        if (input.minRating) hotels = hotels.filter(h => parseInt(h.rating ?? "0") >= input.minRating!);

        const hotelIds = hotels.slice(0, 5).map(h => h.hotelId).join(",");
        if (!hotelIds) return { hotels, offers: [], isMock: false };

        const offersRes = await fetch(
          `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${input.checkIn}&checkOutDate=${input.checkOut}&adults=${input.adults}&currency=USD`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        type OfferItem = { hotel?: { hotelId?: string; name?: string }; offers?: Array<{ id: string; price: { currency: string; total: string; base?: string }; room?: { type?: string; description?: { text?: string }; typeEstimated?: { bedType?: string } }; checkInDate?: string; checkOutDate?: string; guests?: { adults?: number }; policies?: { cancellations?: Array<{ type?: string }> }; boardType?: string }> };
        const offersData: { data?: OfferItem[] } = offersRes.ok ? (await offersRes.json()) as { data?: OfferItem[] } : { data: [] };

        let offers: HotelOffer[] = (offersData.data ?? []).flatMap(item =>
          (item.offers ?? []).slice(0, 1).map(o => ({
            offerId: o.id, hotelId: item.hotel?.hotelId ?? "", hotelName: item.hotel?.name ?? "",
            price: { currency: o.price.currency, total: o.price.total, base: o.price.base },
            room: { type: o.room?.type ?? "", description: o.room?.description?.text, bedType: o.room?.typeEstimated?.bedType },
            checkInDate: o.checkInDate ?? input.checkIn, checkOutDate: o.checkOutDate ?? input.checkOut,
            adults: o.guests?.adults ?? input.adults,
            cancellable: o.policies?.cancellations?.some(c => c.type === "FULL_CREDIT") ?? false,
            boardType: o.boardType,
          }))
        );
        if (input.maxPrice) offers = offers.filter(o => parseFloat(o.price.total) <= input.maxPrice!);
        return { hotels, offers, isMock: false };
      } catch {
        let hotels = MOCK.map(h => ({ ...h, cityCode: input.cityCode }));
        if (input.minRating) hotels = hotels.filter(h => parseInt(h.rating ?? "0") >= input.minRating!);
        const offers = mockOffers(hotels, input.checkIn, input.checkOut, input.adults);
        return { hotels, offers, isMock: true };
      }
    }),
});

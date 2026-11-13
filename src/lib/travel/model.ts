import { z } from "zod";
import { nationalitySchema } from "./countries";

export const cities = [
  {
    cityCode: "LON",
    countryCode: "GB",
    name: "London",
    country: "United Kingdom",
    mood: "Historic streets, modern discoveries",
    image: "photo-1513635269975-59663e0ac1ad",
    spots: [
      "South Bank",
      "British Museum",
      "Borough Market",
      "Hyde Park",
      "Notting Hill",
    ],
  },
  {
    cityCode: "PAR",
    countryCode: "FR",
    name: "Paris",
    country: "France",
    mood: "A little romance. A lot to discover.",
    image: "photo-1502602898657-3e91760cbb34",
    spots: [
      "Seine river walk",
      "Musée d’Orsay",
      "Le Marais",
      "Luxembourg Gardens",
      "Montmartre",
    ],
  },
  {
    cityCode: "TYO",
    countryCode: "JP",
    name: "Tokyo",
    country: "Japan",
    mood: "Find wonder around every corner",
    image: "photo-1540959733332-eab4deabeeaf",
    spots: ["Asakusa", "Meiji Shrine", "Shibuya", "Ueno Park", "Yanaka"],
  },
  {
    cityCode: "BCN",
    countryCode: "ES",
    name: "Barcelona",
    country: "Spain",
    mood: "Slow mornings, Mediterranean evenings",
    image: "photo-1539037116277-4db20889f2d4",
    spots: [
      "Gothic Quarter",
      "Sagrada Família",
      "El Born",
      "Ciutadella Park",
      "Barceloneta",
    ],
  },
  {
    cityCode: "NYC",
    countryCode: "US",
    name: "New York",
    country: "United States",
    mood: "Your next main-character moment",
    image: "photo-1485871981521-5b1fd3805eee",
    spots: [
      "Central Park",
      "The Met",
      "West Village",
      "High Line",
      "Brooklyn Bridge",
    ],
  },
  {
    cityCode: "DXB",
    countryCode: "AE",
    name: "Dubai",
    country: "United Arab Emirates",
    mood: "Desert horizons and dazzling nights",
    image: "photo-1512453979798-5ea266f8880c",
    spots: [
      "Al Fahidi",
      "Dubai Creek",
      "Jumeirah Beach",
      "Dubai Marina",
      "Al Seef",
    ],
  },
  {
    cityCode: "ROM",
    countryCode: "IT",
    name: "Rome",
    country: "Italy",
    mood: "Take the scenic route through history",
    image: "photo-1552832230-c0197dd311b5",
    spots: [
      "Trastevere",
      "Colosseum",
      "Pantheon",
      "Villa Borghese",
      "Testaccio",
    ],
  },
  {
    cityCode: "BKK",
    countryCode: "TH",
    name: "Bangkok",
    country: "Thailand",
    mood: "Street food and golden-hour adventures",
    image: "photo-1508009603885-50cf7c579365",
    spots: [
      "Old Town",
      "Wat Pho",
      "Chinatown",
      "Lumphini Park",
      "Chao Phraya river",
    ],
  },
  {
    cityCode: "SIN",
    countryCode: "SG",
    name: "Singapore",
    country: "Singapore",
    mood: "Garden city, endless possibilities",
    image: "photo-1525625293386-3f8f99389edd",
    spots: [
      "Gardens by the Bay",
      "National Gallery",
      "Kampong Glam",
      "Botanic Gardens",
      "Chinatown",
    ],
  },
  {
    cityCode: "AMS",
    countryCode: "NL",
    name: "Amsterdam",
    country: "Netherlands",
    mood: "Canals, culture, and cozy corners",
    image: "photo-1534351590666-13e3e96b5017",
    spots: ["Jordaan", "Rijksmuseum", "De Pijp", "Vondelpark", "Canal ring"],
  },
] as const;
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Choose a valid date",
  );
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(value: string, days: number) {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function nights(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
export const searchFields = z.object({
  cityCode: z.string().regex(/^[A-Z]{3}$/),
  cityName: z.string().min(1).max(100),
  checkIn: dateString,
  checkOut: dateString,
  adults: z.number().int().min(1).max(6),
  guestNationality: nationalitySchema.default("US"),
  maxPrice: z.number().positive().max(100000).optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  amenities: z.array(z.string().max(30)).max(10).default([]),
});
export const searchSchema = searchFields.superRefine((v, ctx) => {
  if (v.checkIn < today())
    ctx.addIssue({
      code: "custom",
      path: ["checkIn"],
      message: "Check-in cannot be in the past",
    });
  if (nights(v.checkIn, v.checkOut) < 1 || nights(v.checkIn, v.checkOut) > 30)
    ctx.addIssue({
      code: "custom",
      path: ["checkOut"],
      message: "Choose a stay between 1 and 30 nights",
    });
});
export type Search = z.infer<typeof searchFields>;
export function defaultSearch(): Search {
  return {
    cityCode: "LON",
    cityName: "London",
    checkIn: addDays(today(), 7),
    checkOut: addDays(today(), 10),
    adults: 2,
    guestNationality: "US",
    amenities: [],
  };
}
export interface Hotel {
  hotelId: string;
  name: string;
  cityCode: string;
  address?: string;
  rating?: string;
  amenities?: string[];
  distance?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}
export interface Offer {
  offerId: string;
  hotelId: string;
  hotelName: string;
  price: { currency: string; total: string; base?: string };
  additionalFees?: { amount: number; currency: string; description: string }[];
  payAtProperty?: { amount: number; currency: string; description: string }[];
  isEstimate?: boolean;
  room?: { type: string; description?: string; bedType?: string };
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  cancellable?: boolean;
  boardType?: string;
}
export interface SavedStay {
  id: string;
  hotel: Hotel;
  offer?: Offer;
  search: Search;
  isMock: boolean;
  source?: "sample" | "sandbox" | "live";
  provider?: "liteapi";
  savedAt: string;
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}
export interface Activity {
  id: string;
  day: number;
  time: string;
  title: string;
  notes: string;
}
export interface Trip {
  id: string;
  title: string;
  folder: string;
  pinned: boolean;
  updatedAt: string;
  search: Search;
  messages: Message[];
  activities: Activity[];
}
export const money = (total: string | number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(total));
export function hotelImage(id: string) {
  const images = [
    "photo-1566073771259-6a8506099945",
    "photo-1611892440504-42a792e24d32",
    "photo-1542314831-068cd1dbfeeb",
    "photo-1564013799919-ab600027ffc6",
    "photo-1571896349842-33c89424de2d",
  ];
  let hash = 0;
  for (const c of id) hash += c.charCodeAt(0);
  return `https://images.unsplash.com/${images[hash % images.length]}?auto=format&fit=crop&w=900&q=80`;
}
export function bookingLink(stay: SavedStay) {
  const p = new URLSearchParams({
    ss: `${stay.hotel.name} ${stay.search.cityName}`,
    checkin: stay.search.checkIn,
    checkout: stay.search.checkOut,
    group_adults: String(stay.search.adults),
    no_rooms: String(Math.ceil(stay.search.adults / 2)),
  });
  return `https://www.booking.com/searchresults.html?${p}`;
}
export function itinerary(search: Search): Activity[] {
  const city = cities.find((c) => c.cityCode === search.cityCode);
  return Array.from(
    { length: nights(search.checkIn, search.checkOut) },
    (_, i) => [
      {
        id: crypto.randomUUID(),
        day: i + 1,
        time: "09:00",
        title:
          i === 0
            ? `Arrive and settle into ${search.cityName}`
            : `Explore ${city?.spots[i % city.spots.length] ?? search.cityName}`,
        notes: "Leave time for breakfast and getting around.",
      },
      {
        id: crypto.randomUUID(),
        day: i + 1,
        time: "14:00",
        title: `Discover ${city?.spots[(i + 1) % city.spots.length] ?? "the local neighborhood"}`,
        notes:
          "Suggested stop — check opening hours, tickets, and accessibility before visiting.",
      },
      {
        id: crypto.randomUUID(),
        day: i + 1,
        time: "19:00",
        title: "A taste of the neighborhood",
        notes: "Find a local restaurant and enjoy an unhurried evening.",
      },
    ],
  ).flat();
}

export function staySourceLabel(stay: SavedStay) {
  return stay.isMock
    ? "Sample stay"
    : stay.source === "sandbox"
      ? "Nuitee sandbox"
      : stay.provider === "liteapi" && stay.source === "live"
        ? "Nuitee estimate"
        : "Saved quote";
}

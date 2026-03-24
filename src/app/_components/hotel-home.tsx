"use client";

import { useState } from "react";
import { HotelSearch } from "./hotel-search";
import { HotelResults } from "./hotel-results";

interface SearchParams {
  cityCode: string; cityName: string; checkIn: string; checkOut: string;
  adults: number; maxPrice?: number; minRating?: number;
}

const QUICK_CITIES = [
  { cityCode: "LON", cityName: "London"    },
  { cityCode: "PAR", cityName: "Paris"     },
  { cityCode: "DXB", cityName: "Dubai"     },
  { cityCode: "TYO", cityName: "Tokyo"     },
  { cityCode: "NYC", cityName: "New York"  },
  { cityCode: "BCN", cityName: "Barcelona" },
];

function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0]!;
}

export function HotelHomePage() {
  const [activeSearch, setActiveSearch] = useState<SearchParams | null>(null);

  const handleSearch = (params: SearchParams) => setActiveSearch(params);

  const quickSearch = (cityCode: string, cityName: string) =>
    handleSearch({ cityCode, cityName, checkIn: addDays(7), checkOut: addDays(9), adults: 2 });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-12">

        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
            🏨 Hotel Search · Powered by Amadeus API
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Find your{" "}
            <span className="text-[hsl(280,100%,70%)]">perfect</span>
            {" "}stay
          </h1>
          <p className="mt-4 text-lg text-white/50">
            Real-time hotel pricing · Worldwide coverage · Instant availability
          </p>
        </div>

        {/* Search card */}
        <div className="mx-auto mb-10 max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          <HotelSearch onSearch={handleSearch} />
        </div>

        {/* Quick-search chips */}
        {!activeSearch && (
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-white/30">
              Popular destinations
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {QUICK_CITIES.map(({ cityCode, cityName }) => (
                <button
                  key={cityCode}
                  onClick={() => quickSearch(cityCode, cityName)}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/70 transition-all hover:border-[hsl(280,100%,70%)]/50 hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-purple-900/30"
                >
                  {cityName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature grid — only shown before first search */}
        {!activeSearch && (
          <div className="mx-auto mb-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: "⚡", title: "Real-time prices",  desc: "Live rates from Amadeus API updated continuously" },
              { icon: "🌍", title: "Global coverage",   desc: "Thousands of hotels across 180+ countries" },
              { icon: "🔒", title: "Secure booking",    desc: "Free cancellation options clearly shown" },
            ].map(f => (
              <div key={f.title} className="flex max-w-xs flex-col gap-2 rounded-xl bg-white/10 p-4 hover:bg-white/20 transition-colors">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {activeSearch && (
          <div className="mx-auto max-w-6xl">
            <HotelResults params={activeSearch} />
          </div>
        )}

        {/* Empty state */}
        {!activeSearch && (
          <div className="mt-4 flex flex-col items-center gap-3 text-white/20">
            <div className="text-7xl">🏨</div>
            <p className="text-base">Enter a destination above to start searching</p>
          </div>
        )}
      </div>
    </main>
  );
}

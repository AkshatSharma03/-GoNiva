"use client";

import { useState } from "react";
import { HotelSearch, type SearchParams } from "./hotel-search";
import { HotelResults } from "./hotel-results";
import { Button } from "~/components/ui/button";

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
  const [activeSearch, setActiveSearch]   = useState<SearchParams | null>(null);
  const [formKey,      setFormKey]        = useState(0);
  const [formInitials, setFormInitials]   = useState<Partial<SearchParams>>({});

  const handleSearch = (params: SearchParams) => setActiveSearch(params);

  const quickSearch = (cityCode: string, cityName: string) => {
    const params: SearchParams = {
      cityCode, cityName,
      checkIn:  addDays(1),
      checkOut: addDays(4),
      adults:   2,
    };
    setFormInitials(params);
    setFormKey(k => k + 1);
    setActiveSearch(params);
  };

  const clearSearch = () => {
    setActiveSearch(null);
    setFormInitials({});
    setFormKey(k => k + 1);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-10">

        {/* ── Hero (full, shown only before first search) ── */}
        {!activeSearch && (
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              🏨 Hotel Search · Powered by Amadeus API
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              Find your{" "}
              <span className="text-primary">perfect</span>
              {" "}stay
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Real-time hotel pricing · Worldwide coverage · Instant availability
            </p>
          </div>
        )}

        {/* ── Compact header (when results are showing) ── */}
        {activeSearch && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">Goniva</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">
                Hotels in{" "}
                <span className="font-semibold text-foreground">{activeSearch.cityName}</span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearSearch} className="text-muted-foreground hover:text-foreground">
              ← New search
            </Button>
          </div>
        )}

        {/* ── Search form card ── */}
        <div className="mx-auto mb-8 max-w-4xl rounded-2xl border border-border bg-card/80 p-6 shadow-2xl backdrop-blur-sm">
          <HotelSearch
            key={formKey}
            initialValues={formInitials}
            onSearch={handleSearch}
          />
        </div>

        {/* ── Popular destinations (only before first search) ── */}
        {!activeSearch && (
          <div className="mb-10 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              Popular destinations
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_CITIES.map(({ cityCode, cityName }) => (
                <Button
                  key={cityCode}
                  variant="outline"
                  size="sm"
                  onClick={() => quickSearch(cityCode, cityName)}
                  className="rounded-full border-border hover:border-primary/50 hover:text-foreground"
                >
                  {cityName}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* ── Feature grid (only before first search) ── */}
        {!activeSearch && (
          <div className="mx-auto mb-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: "⚡", title: "Real-time prices",  desc: "Live rates from Amadeus updated continuously" },
              { icon: "🌍", title: "Global coverage",   desc: "Thousands of hotels in 180+ countries" },
              { icon: "🔒", title: "Free cancellation", desc: "Clearly shown on every search result" },
            ].map(f => (
              <div
                key={f.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-card"
              >
                <div className="text-2xl">{f.icon}</div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Results ── */}
        {activeSearch && (
          <div className="mx-auto max-w-6xl">
            <HotelResults params={activeSearch} />
          </div>
        )}

      </div>
    </main>
  );
}

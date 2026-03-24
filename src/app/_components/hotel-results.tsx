"use client";

import { useState } from "react";
import { HotelCard } from "./hotel-card";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

interface SearchParams {
  cityCode: string; cityName: string; checkIn: string; checkOut: string;
  adults: number; maxPrice?: number; minRating?: number;
}

interface Props { params: SearchParams }

type SortKey = "price" | "rating" | "name";

function nights(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export function HotelResults({ params }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("price");

  const { data, isFetching, error } = api.hotel.searchHotels.useQuery(
    {
      cityCode:  params.cityCode,
      checkIn:   params.checkIn,
      checkOut:  params.checkOut,
      adults:    params.adults,
      maxPrice:  params.maxPrice,
      minRating: params.minRating,
    },
    { staleTime: 5 * 60_000 }
  );

  const n = nights(params.checkIn, params.checkOut);
  const offerMap = new Map((data?.offers ?? []).map(o => [o.hotelId, o]));

  const sorted = [...(data?.hotels ?? [])].sort((a, b) => {
    if (sortBy === "price") {
      return (parseFloat(offerMap.get(a.hotelId)?.price.total ?? "9999")) -
             (parseFloat(offerMap.get(b.hotelId)?.price.total ?? "9999"));
    }
    if (sortBy === "rating") return parseInt(b.rating ?? "0") - parseInt(a.rating ?? "0");
    return a.name.localeCompare(b.name);
  });

  if (error) return (
    <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
      ⚠ {error.message}
    </div>
  );

  if (isFetching) return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="mb-4 h-1 w-1/2 rounded bg-white/10" />
          <div className="mb-2 h-4 rounded bg-white/10" />
          <div className="mb-4 h-3 w-3/4 rounded bg-white/10" />
          <div className="h-8 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );

  if (!data?.hotels.length) return (
    <div className="py-16 text-center text-muted-foreground">
      <div className="mb-3 text-4xl">🔍</div>
      <p className="text-sm">No hotels found for <strong className="text-white">{params.cityName}</strong>. Try adjusting your filters.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-white">{sorted.length}</span> hotels in{" "}
          <span className="font-bold text-white">{params.cityName}</span>
          {" · "}{n} {n === 1 ? "night" : "nights"} · {params.adults} {params.adults === 1 ? "guest" : "guests"}
          {data.isMock && (
            <Badge variant="default" className="ml-1 text-[10px]">demo data</Badge>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sort:</span>
          {(["price", "rating", "name"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                sortBy === s
                  ? "bg-[hsl(280,100%,70%)] text-black"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              )}
            >
              {s === "price" ? "💰 Price" : s === "rating" ? "⭐ Rating" : "🔤 Name"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(hotel => (
          <HotelCard
            key={hotel.hotelId}
            hotel={hotel}
            offer={offerMap.get(hotel.hotelId)}
            nights={n}
          />
        ))}
      </div>
    </div>
  );
}

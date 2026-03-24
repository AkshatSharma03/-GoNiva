"use client";

import { useState } from "react";
import { HotelCard } from "./hotel-card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
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

function HotelCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-1 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between items-start pt-1">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="space-y-1 ml-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="flex gap-1.5 pt-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "price",  label: "💰 Price"  },
  { key: "rating", label: "⭐ Rating" },
  { key: "name",   label: "🔤 Name"   },
];

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
    <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
      ⚠ {error.message}
    </div>
  );

  if (isFetching) return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-1.5">
          {SORT_OPTIONS.map(s => <Skeleton key={s.key} className="h-7 w-20 rounded-md" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <HotelCardSkeleton key={i} />)}
      </div>
    </div>
  );

  if (!data?.hotels.length) return (
    <div className="py-16 text-center text-muted-foreground">
      <div className="mb-3 text-4xl">🔍</div>
      <p className="text-sm">
        No hotels found for{" "}
        <strong className="text-foreground">{params.cityName}</strong>.{" "}
        Try adjusting your filters.
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{sorted.length}</span> hotels in{" "}
          <span className="font-bold text-foreground">{params.cityName}</span>
          {" · "}{n} {n === 1 ? "night" : "nights"} · {params.adults}{" "}
          {params.adults === 1 ? "guest" : "guests"}
          {data.isMock && (
            <Badge variant="outline" className="ml-1 text-[10px]">demo data</Badge>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sort:</span>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                sortBy === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              )}
            >
              {label}
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

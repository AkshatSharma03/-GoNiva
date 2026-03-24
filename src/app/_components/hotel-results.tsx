"use client";

import { useState } from "react";
import { HotelCard } from "./hotel-card";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { AlertTriangle } from "lucide-react";

interface SearchParams {
  cityCode: string; cityName: string; checkIn: string; checkOut: string;
  adults: number; maxPrice?: number; minRating?: number;
}

interface Props { params: SearchParams }

type SortKey = "price" | "rating" | "name";

function nights(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function HotelCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="flex gap-1.5 pt-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "price",  label: "Price",  icon: "↑" },
  { key: "rating", label: "Rating", icon: "★" },
  { key: "name",   label: "A–Z",    icon: ""  },
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
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
      <div className="mb-2 text-2xl">⚠️</div>
      <p className="font-semibold text-destructive">Search failed</p>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      <p className="mt-2 text-xs text-muted-foreground">Try a different destination or adjust your dates.</p>
    </div>
  );

  if (isFetching) return (
    <div className="space-y-5">
      {/* Header skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="flex items-center gap-1.5">
          {SORT_OPTIONS.map(s => <Skeleton key={s.key} className="h-7 w-16 rounded-md" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <HotelCardSkeleton key={i} />)}
      </div>
    </div>
  );

  if (!data?.hotels.length) return (
    <div className="rounded-xl border border-border bg-card/50 py-16 text-center">
      <div className="mb-3 text-4xl">🔍</div>
      <p className="font-semibold">No hotels found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        No results for <strong className="text-foreground">{params.cityName}</strong>.
        {params.minRating && " Try lowering the star rating filter."}
        {params.maxPrice  && " Try raising the max price."}
        {!params.minRating && !params.maxPrice && " Try different dates or a nearby city."}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Demo data warning */}
      {data.isMock && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <span className="font-semibold">Example data</span>
            {" — "}
            These are sample hotels to illustrate the UI. Add your{" "}
            <span className="font-mono text-amber-200">AMADEUS_CLIENT_ID</span> and{" "}
            <span className="font-mono text-amber-200">AMADEUS_CLIENT_SECRET</span>{" "}
            environment variables to see real results.
          </div>
        </div>
      )}

      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            <span className="text-primary">{sorted.length}</span> hotels in {params.cityName}
          </p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(params.checkIn)} – {fmtDate(params.checkOut)}
            {" · "}{n} {n === 1 ? "night" : "nights"}
            {" · "}{params.adults} {params.adults === 1 ? "guest" : "guests"}
            {params.minRating && <> · {params.minRating}★+</>}
            {params.maxPrice  && <> · max ${params.maxPrice}</>}
          </p>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Sort:</span>
          {SORT_OPTIONS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                sortBy === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent/10 hover:text-foreground border border-border"
              )}
            >
              {icon && <span className="mr-0.5 text-[10px]">{icon}</span>}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-3">
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

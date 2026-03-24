"use client";

import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Calendar, Users, SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

interface SearchParams {
  cityCode: string;
  cityName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  maxPrice?: number;
  minRating?: number;
}

interface Props {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

type City = { cityCode: string; name: string; country: string };

function today() { return new Date().toISOString().split("T")[0]!; }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0]!;
}

export function HotelSearch({ onSearch, loading }: Props) {
  const checkInDefault  = addDays(today(), 7);
  const checkOutDefault = addDays(today(), 9);

  const [cityQuery,  setCityQuery]  = useState("");
  const [cityCode,   setCityCode]   = useState("LON");
  const [cityName,   setCityName]   = useState("");
  const [checkIn,    setCheckIn]    = useState(checkInDefault);
  const [checkOut,   setCheckOut]   = useState(checkOutDefault);
  const [adults,     setAdults]     = useState(2);
  const [maxPrice,   setMaxPrice]   = useState<number | undefined>();
  const [minRating,  setMinRating]  = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [dropOpen,   setDropOpen]   = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const { data: cityData, isFetching: cityFetching } = api.hotel.searchCities.useQuery(
    { keyword: cityQuery },
    { enabled: cityQuery.length >= 1, staleTime: 30_000 }
  );

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityCode) return;
    onSearch({ cityCode, cityName: cityName || cityCode, checkIn, checkOut, adults, maxPrice, minRating });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

        {/* City */}
        <div ref={dropRef} className="relative lg:col-span-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-purple-300">
            Destination
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <Input
              className="pl-9"
              placeholder="City — e.g. London, Paris, Dubai…"
              value={cityQuery || cityName}
              onChange={e => { setCityQuery(e.target.value); setCityName(""); setDropOpen(true); }}
              onFocus={() => setDropOpen(true)}
            />
            {cityFetching && (
              <span className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
          {dropOpen && cityData?.cities && cityData.cities.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
              {cityData.cities.map((c: City) => (
                <li key={c.cityCode}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/10"
                    onMouseDown={e => {
                      e.preventDefault();
                      setCityCode(c.cityCode); setCityName(c.name); setCityQuery(""); setDropOpen(false);
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.cityCode} · {c.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Check-in */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-purple-300">
            Check-in
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <Input type="date" className="pl-9" min={today()} value={checkIn}
              onChange={e => setCheckIn(e.target.value)} />
          </div>
        </div>

        {/* Check-out */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-purple-300">
            Check-out
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <Input type="date" className="pl-9" min={checkIn || today()} value={checkOut}
              onChange={e => setCheckOut(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Row 2: guests + filters toggle + search */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-purple-300">
            Guests
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <select
              value={adults}
              onChange={e => setAdults(parseInt(e.target.value))}
              className="flex h-9 w-full appearance-none rounded-md border border-border bg-white/5 pl-9 pr-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n===1?"adult":"adults"}</option>)}
            </select>
          </div>
        </div>

        <Button type="button" variant="outline" size="sm"
          onClick={() => setShowFilters(v => !v)}
          className="gap-1.5 border-purple-700/50 text-purple-300 hover:bg-purple-900/30"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </Button>

        <Button
          type="submit"
          disabled={!cityCode || loading}
          className="ml-auto gap-2 bg-[hsl(280,100%,70%)] px-6 font-bold text-black hover:bg-[hsl(280,100%,60%)]"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search Hotels
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-purple-900/50 bg-white/5 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-purple-300">
              Max total price (USD)
            </label>
            <Input
              type="number"
              placeholder="No limit"
              min={0}
              value={maxPrice ?? ""}
              onChange={e => setMaxPrice(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-purple-300">
              Min star rating
            </label>
            <select
              value={minRating ?? ""}
              onChange={e => setMinRating(e.target.value ? parseInt(e.target.value) : undefined)}
              className="flex h-9 w-full appearance-none rounded-md border border-border bg-white/5 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Any rating</option>
              <option value="3">3★ and above</option>
              <option value="4">4★ and above</option>
              <option value="5">5★ only</option>
            </select>
          </div>
        </div>
      )}
    </form>
  );
}

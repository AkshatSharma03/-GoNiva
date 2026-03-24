"use client";

import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Calendar, Users, SlidersHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
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

  const [cityQuery,   setCityQuery]   = useState("");
  const [cityCode,    setCityCode]    = useState("LON");
  const [cityName,    setCityName]    = useState("");
  const [checkIn,     setCheckIn]     = useState(checkInDefault);
  const [checkOut,    setCheckOut]    = useState(checkOutDefault);
  const [adults,      setAdults]      = useState("2");
  const [maxPrice,    setMaxPrice]    = useState<number | undefined>();
  const [minRating,   setMinRating]   = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const { data: cityData, isFetching: cityFetching } = api.hotel.searchCities.useQuery(
    { keyword: cityQuery },
    { enabled: cityQuery.length >= 1, staleTime: 30_000 }
  );

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityCode) return;
    onSearch({
      cityCode,
      cityName: cityName || cityCode,
      checkIn,
      checkOut,
      adults: parseInt(adults),
      maxPrice,
      minRating: minRating ? parseInt(minRating) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

        {/* Destination */}
        <div ref={dropRef} className="relative lg:col-span-2">
          <Label htmlFor="destination" className="mb-1.5 block">Destination</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
            <Input
              id="destination"
              className="pl-9"
              placeholder="City — e.g. London, Paris, Dubai…"
              value={cityQuery || cityName}
              onChange={e => { setCityQuery(e.target.value); setCityName(""); setDropOpen(true); }}
              onFocus={() => setDropOpen(true)}
              autoComplete="off"
            />
            {cityFetching && (
              <span className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
          {dropOpen && cityData?.cities && cityData.cities.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
              {cityData.cities.map((c: City) => (
                <li key={c.cityCode}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent/10"
                    onMouseDown={e => {
                      e.preventDefault();
                      setCityCode(c.cityCode);
                      setCityName(c.name);
                      setCityQuery("");
                      setDropOpen(false);
                    }}
                  >
                    <MapPin className="size-3.5 shrink-0 text-primary/60" />
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {c.cityCode} · {c.country}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Check-in */}
        <div>
          <Label htmlFor="check-in" className="mb-1.5 block">Check-in</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
            <Input
              id="check-in"
              type="date"
              className="pl-9"
              min={today()}
              value={checkIn}
              onChange={e => setCheckIn(e.target.value)}
            />
          </div>
        </div>

        {/* Check-out */}
        <div>
          <Label htmlFor="check-out" className="mb-1.5 block">Check-out</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
            <Input
              id="check-out"
              type="date"
              className="pl-9"
              min={checkIn || today()}
              value={checkOut}
              onChange={e => setCheckOut(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Row 2: guests + filters toggle + search */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Label htmlFor="guests" className="mb-1.5 block">Guests</Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60 z-10 pointer-events-none" />
            <Select value={adults} onValueChange={setAdults}>
              <SelectTrigger id="guests" className="pl-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "adult" : "adults"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(v => !v)}
          className="gap-1.5 border-primary/30 text-primary/80 hover:bg-primary/10"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
        </Button>

        <Button
          type="submit"
          disabled={!cityCode || loading}
          className="ml-auto gap-2 px-6 font-bold"
        >
          {loading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Search className="size-4" />
          )}
          Search Hotels
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card/50 p-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="max-price" className="mb-1.5 block">Max total price (USD)</Label>
            <Input
              id="max-price"
              type="number"
              placeholder="No limit"
              min={0}
              value={maxPrice ?? ""}
              onChange={e => setMaxPrice(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
          <div>
            <Label htmlFor="min-rating" className="mb-1.5 block">Min star rating</Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger id="min-rating">
                <SelectValue placeholder="Any rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any rating</SelectItem>
                <SelectItem value="3">3★ and above</SelectItem>
                <SelectItem value="4">4★ and above</SelectItem>
                <SelectItem value="5">5★ only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </form>
  );
}

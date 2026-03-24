"use client";

import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Calendar, Users, SlidersHorizontal, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { api } from "~/trpc/react";

export interface SearchParams {
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
  initialValues?: Partial<SearchParams>;
}

type City = { cityCode: string; name: string; country: string };

function todayStr() { return new Date().toISOString().split("T")[0]!; }
function addDays(base: string, n: number) {
  const dt = new Date(base); dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0]!;
}

export function HotelSearch({ onSearch, loading, initialValues }: Props) {
  const t = todayStr();
  const defaultCheckIn  = addDays(t, 1);
  const defaultCheckOut = addDays(t, 4);

  const [cityCode,    setCityCode]    = useState(initialValues?.cityCode  ?? "");
  const [cityName,    setCityName]    = useState(initialValues?.cityName  ?? "");
  const [cityQuery,   setCityQuery]   = useState(initialValues?.cityName  ?? "");
  const [checkIn,     setCheckIn]     = useState(initialValues?.checkIn   ?? defaultCheckIn);
  const [checkOut,    setCheckOut]    = useState(initialValues?.checkOut  ?? defaultCheckOut);
  const [adults,      setAdults]      = useState(String(initialValues?.adults ?? 2));
  const [maxPrice,    setMaxPrice]    = useState<number | undefined>(initialValues?.maxPrice);
  const [minRating,   setMinRating]   = useState(String(initialValues?.minRating ?? ""));
  const [showFilters, setShowFilters] = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Show city name in the input when a city is selected, otherwise show what the user is typing
  const inputDisplayValue = cityQuery !== (cityName) && cityQuery.length > 0 ? cityQuery : cityName;

  const { data: cityData, isFetching: cityFetching } = api.hotel.searchCities.useQuery(
    { keyword: cityQuery },
    { enabled: cityQuery.length >= 1 && cityQuery !== cityName, staleTime: 30_000 }
  );

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Ensure check-out is always after check-in
  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    if (val >= checkOut) setCheckOut(addDays(val, 3));
  };

  const handleCityInput = (val: string) => {
    setCityQuery(val);
    setCityName(val); // keep them in sync while typing
    if (val === "") {
      setCityCode(""); // clear selection when input is cleared
    }
    setDropOpen(val.length > 0);
  };

  const selectCity = (c: City) => {
    setCityCode(c.cityCode);
    setCityName(c.name);
    setCityQuery(c.name);
    setDropOpen(false);
  };

  const clearCity = () => {
    setCityCode(""); setCityName(""); setCityQuery(""); setDropOpen(false);
  };

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
              className="pl-9 pr-8"
              placeholder="Where are you going?"
              value={inputDisplayValue}
              onChange={e => handleCityInput(e.target.value)}
              onFocus={() => { if (cityQuery.length > 0 && cityQuery !== cityName) setDropOpen(true); }}
              autoComplete="off"
            />
            {cityFetching ? (
              <span className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : cityCode ? (
              <button
                type="button"
                onClick={clearCity}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear destination"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {dropOpen && cityData?.cities && cityData.cities.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
              {cityData.cities.map((c: City) => (
                <li key={c.cityCode}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-accent/10"
                    onMouseDown={e => { e.preventDefault(); selectCity(c); }}
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
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60 pointer-events-none" />
            <Input
              id="check-in"
              type="date"
              className="pl-9"
              min={t}
              value={checkIn}
              onChange={e => handleCheckInChange(e.target.value)}
            />
          </div>
        </div>

        {/* Check-out */}
        <div>
          <Label htmlFor="check-out" className="mb-1.5 block">Check-out</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60 pointer-events-none" />
            <Input
              id="check-out"
              type="date"
              className="pl-9"
              min={addDays(checkIn, 1)}
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
          className={`gap-1.5 border-primary/30 hover:bg-primary/10 ${showFilters ? "bg-primary/10 text-primary" : "text-primary/80"}`}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters{showFilters ? " ▴" : ""}
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
          {cityCode ? "Search Hotels" : "Find Hotels"}
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

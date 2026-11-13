"use client";
import { useState, useId } from "react";
import {
  MapPin,
  CalendarDays,
  Users,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  cities,
  searchSchema,
  today,
  addDays,
  type Search,
} from "~/lib/travel/model";
export function TripSearch({
  initial,
  onSearch,
}: {
  initial: Search;
  onSearch: (s: Search) => void;
}) {
  const filtersId = useId();
  const [value, setValue] = useState(initial),
    [filters, setFilters] = useState(false),
    [error, setError] = useState("");
  const update = <K extends keyof Search>(key: K, v: Search[K]) =>
    setValue((p) => ({ ...p, [key]: v }));
  return (
    <form
      className="search-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = searchSchema.safeParse(value);
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Check your search");
          return;
        }
        setError("");
        onSearch(parsed.data);
      }}
    >
      <div className="search-fields">
        <label className="search-field destination-field">
          <span>
            <MapPin size={15} /> Destination
          </span>
          <select
            aria-label="Destination"
            value={value.cityCode}
            onChange={(e) => {
              const c = cities.find((c) => c.cityCode === e.target.value)!;
              setValue((p) => ({
                ...p,
                cityCode: c.cityCode,
                cityName: c.name,
              }));
            }}
          >
            {cities.map((c) => (
              <option key={c.cityCode} value={c.cityCode}>
                {c.name}, {c.country}
              </option>
            ))}
          </select>
        </label>
        <label className="search-field">
          <span>
            <CalendarDays size={15} /> Check-in
          </span>
          <input
            aria-label="Check-in"
            type="date"
            required
            min={today()}
            value={value.checkIn}
            onChange={(e) => {
              const v = e.target.value;
              setValue((p) => ({
                ...p,
                checkIn: v,
                checkOut: v >= p.checkOut ? addDays(v, 1) : p.checkOut,
              }));
            }}
          />
        </label>
        <label className="search-field">
          <span>
            <CalendarDays size={15} /> Check-out
          </span>
          <input
            aria-label="Check-out"
            type="date"
            required
            min={addDays(value.checkIn || today(), 1)}
            max={addDays(value.checkIn || today(), 30)}
            value={value.checkOut}
            onChange={(e) => update("checkOut", e.target.value)}
          />
        </label>
        <label className="search-field guests-field">
          <span>
            <Users size={15} /> Guests
          </span>
          <select
            aria-label="Guests"
            value={value.adults}
            onChange={(e) => update("adults", Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button search-submit" type="submit">
          <SearchIcon size={18} />
          <span>Find my stay</span>
        </button>
      </div>
      <div className="search-bottom">
        <span>Good trips start with a little curiosity.</span>
        <button
          type="button"
          className={`text-button ${filters ? "active" : ""}`}
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
          aria-controls={filtersId}
        >
          <SlidersHorizontal size={13} /> Preferences
          {value.maxPrice || value.minRating || value.amenities.length > 0
            ? " · Active"
            : ""}
        </button>
      </div>
      {filters && (
        <div className="search-filters" id={filtersId}>
          <label>
            Total stay budget · USD
            <input
              aria-label="Total stay budget"
              type="number"
              min="1"
              max="100000"
              placeholder="No limit"
              value={value.maxPrice ?? ""}
              onChange={(e) =>
                update(
                  "maxPrice",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </label>
          <label>
            Minimum star rating
            <select
              aria-label="Minimum star rating"
              value={value.minRating ?? "any"}
              onChange={(e) =>
                update(
                  "minRating",
                  e.target.value === "any" ? undefined : Number(e.target.value),
                )
              }
            >
              <option value="any">Any rating</option>
              {[3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} stars and above
                </option>
              ))}
            </select>
          </label>
          <div className="amenity-filters">
            <span>Make yourself at home</span>
            {["WIFI", "POOL", "SPA", "FITNESS", "RESTAURANT", "PARKING"].map(
              (a) => (
                <label key={a}>
                  <input
                    type="checkbox"
                    checked={value.amenities.includes(a)}
                    onChange={() =>
                      update(
                        "amenities",
                        value.amenities.includes(a)
                          ? value.amenities.filter((v) => v !== a)
                          : [...value.amenities, a],
                      )
                    }
                  />
                  {a === "FITNESS" ? "Gym" : a.toLowerCase()}
                </label>
              ),
            )}
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setValue((p) => ({
                ...p,
                maxPrice: undefined,
                minRating: undefined,
                amenities: [],
              }))
            }
          >
            <X size={12} /> Clear filters
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}

"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, SearchX, X } from "lucide-react";
import { api } from "~/trpc/react";
import { StayCard } from "./stay-card";
import { type Search, type SavedStay } from "~/lib/travel/model";
export function StayResults({
  search,
  saved,
  onSave,
  onDetails,
  onSearch,
}: {
  search: Search;
  onSearch: (s: Search) => void;
  saved: SavedStay[];
  onSave: (s: SavedStay) => void;
  onDetails: (s: SavedStay) => void;
}) {
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(0);
  const query = api.hotel.searchHotels.useQuery(search, {
    staleTime: 120000,
    retry: 1,
  });
  const data = query.data;
  const offers = new Map(data?.offers.map((o) => [o.hotelId, o]));
  const hotels = [...(data?.hotels ?? [])].sort((a, b) =>
    sort === "price"
      ? Number(offers.get(a.hotelId)?.price.total ?? Infinity) -
        Number(offers.get(b.hotelId)?.price.total ?? Infinity)
      : sort === "rating"
        ? Number(b.rating ?? 0) - Number(a.rating ?? 0)
        : 0,
  );
  const hasFilters =
    search.maxPrice !== undefined ||
    search.minRating !== undefined ||
    search.amenities.length > 0;
  const clearFilters = () =>
    onSearch({
      ...search,
      maxPrice: undefined,
      minRating: undefined,
      amenities: [],
    });
  const pages = Math.ceil(hotels.length / 5);
  const current = Math.min(page, Math.max(0, pages - 1));
  return (
    <section className="results-section" aria-label="Hotel recommendations">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LESS SCROLLING, MORE DISCOVERING</p>
          <h2>
            Your next <em>perfect stay.</em>
          </h2>
          <p>
            {query.isFetching
              ? "Finding your options…"
              : `${hotels.length} stays in ${search.cityName} · Curated in sets of five`}
          </p>
        </div>
        <label className="sort-label">
          Sort by
          <select
            aria-label="Sort hotels"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="recommended">Recommended</option>
            <option value="price">Price: low to high</option>
            <option value="rating">Star rating</option>
          </select>
        </label>
      </div>
      {hasFilters && (
        <div className="applied-filters" aria-label="Applied filters">
          <span>Your preferences</span>
          {search.maxPrice !== undefined && (
            <button
              aria-label="Remove budget filter"
              onClick={() => onSearch({ ...search, maxPrice: undefined })}
            >
              Up to ${search.maxPrice} total <X size={12} />
            </button>
          )}
          {search.minRating !== undefined && (
            <button
              aria-label="Remove star rating filter"
              onClick={() => onSearch({ ...search, minRating: undefined })}
            >
              {search.minRating}+ stars <X size={12} />
            </button>
          )}
          {search.amenities.map((a) => (
            <button
              key={a}
              aria-label={`Remove ${a.toLowerCase()} filter`}
              onClick={() =>
                onSearch({
                  ...search,
                  amenities: search.amenities.filter((v) => v !== a),
                })
              }
            >
              {a.toLowerCase().replace(/_/g, " ")} <X size={12} />
            </button>
          ))}
          <button className="clear-all-filters" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}
      {data && (
        <p className="data-notice">
          <span
            className={`status-dot ${data.source === "live" ? "live" : ""}`}
          />
          {data.source === "sample"
            ? "Sample collection"
            : data.source === "sandbox"
              ? "Nuitee sandbox"
              : "Nuitee live estimates"}{" "}
          <span>— {data.notice}</span>
        </p>
      )}
      {query.isPending ? (
        <div
          className="stay-grid"
          aria-busy="true"
          aria-label="Finding hotel recommendations"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="stay-skeleton">
              <div />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : query.error ? (
        <div className="empty-panel" role="alert">
          <SearchX />
          <h3>Let’s try that again</h3>
          <p>{query.error.message}</p>
          <button
            className="secondary-button"
            onClick={() => void query.refetch()}
          >
            <RotateCcw size={14} /> Retry search
          </button>
        </div>
      ) : hotels.length === 0 ? (
        <div className="empty-panel">
          <SearchX />
          <h3>No stays match just yet</h3>
          <p>
            Try increasing your total budget, lowering the star rating, or
            removing an amenity.
          </p>
          {hasFilters && (
            <button className="secondary-button" onClick={clearFilters}>
              <RotateCcw size={14} /> Reset preferences
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="stay-grid">
            {hotels.slice(current * 5, current * 5 + 5).map((hotel) => {
              const stay: SavedStay = {
                id: `${hotel.hotelId}-${search.checkIn}-${search.checkOut}-${search.adults}`,
                hotel,
                offer: offers.get(hotel.hotelId),
                search,
                isMock: data?.isMock ?? true,
                source: data?.source,
                provider: data?.provider,
                savedAt: new Date().toISOString(),
              };
              return (
                <StayCard
                  key={hotel.hotelId}
                  stay={stay}
                  saved={saved.some((s) => s.id === stay.id)}
                  onSave={() => onSave(stay)}
                  onDetails={() => onDetails(stay)}
                />
              );
            })}
          </div>
          {pages > 1 && (
            <div className="pagination">
              <button
                className="circle-button"
                aria-label="Previous recommendations"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ArrowLeft size={17} />
              </button>
              <span aria-live="polite">
                Collection {current + 1} <span>of {pages}</span>
              </span>
              <button
                className="circle-button"
                aria-label="Next recommendations"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
              >
                <ArrowRight size={17} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

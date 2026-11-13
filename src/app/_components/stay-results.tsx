"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, SearchX } from "lucide-react";
import { api } from "~/trpc/react";
import { StayCard } from "./stay-card";
import { type Search, type SavedStay } from "~/lib/travel/model";
export function StayResults({
  search,
  saved,
  onSave,
  onDetails,
}: {
  search: Search;
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
      {data && (
        <p className="data-notice">
          <span
            className={`status-dot ${data.source === "live" ? "live" : ""}`}
          />
          {data.source === "sample"
            ? "Sample collection"
            : data.source === "sandbox"
              ? "Amadeus sandbox"
              : "Amadeus live quotes"}{" "}
          <span>— {data.notice}</span>
        </p>
      )}
      {query.isPending ? (
        <div className="stay-grid">
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
              <span>
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

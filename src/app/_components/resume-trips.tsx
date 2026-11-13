"use client";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { cities, nights, type Trip } from "~/lib/travel/model";
export function ResumeTrips({
  trips,
  onOpen,
  onAll,
}: {
  trips: Trip[];
  onOpen: (t: Trip) => void;
  onAll: () => void;
}) {
  const recent = [...trips]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  if (!recent.length) return null;
  return (
    <section className="resume-section" aria-label="Continue planning">
      <div className="resume-heading">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>
            Pick up where you <em>left off.</em>
          </h2>
        </div>
        <button className="text-button" onClick={onAll}>
          All trips <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="resume-grid">
        {recent.map((t) => {
          const city = cities.find((c) => c.cityCode === t.search.cityCode);
          return (
            <button
              className="resume-card"
              key={t.id}
              onClick={() => onOpen(t)}
            >
              <span
                className="resume-photo"
                style={{
                  backgroundImage: city
                    ? `url(https://images.unsplash.com/${city.image}?auto=format&fit=crop&w=300&q=75)`
                    : undefined,
                }}
              />
              <span className="resume-copy">
                <span className="resume-city">
                  <MapPin size={11} />
                  {t.search.cityName}
                </span>
                <strong>{t.title}</strong>
                <small>
                  <CalendarDays size={11} />
                  {new Date(`${t.search.checkIn}T12:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric" },
                  )}{" "}
                  · {nights(t.search.checkIn, t.search.checkOut)} nights
                </small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

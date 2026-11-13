"use client";
import {
  Heart,
  MapPin,
  ArrowUpRight,
  Check,
  BedDouble,
  Sparkles,
} from "lucide-react";
import {
  hotelImage,
  staySourceLabel,
  money,
  nights,
  bookingLink,
  type SavedStay,
} from "~/lib/travel/model";
export function StayCard({
  stay,
  saved,
  onSave,
  onDetails,
  compare,
  onCompare,
}: {
  stay: SavedStay;
  saved: boolean;
  onSave: () => void;
  onDetails: () => void;
  compare?: boolean;
  onCompare?: () => void;
}) {
  const count = nights(stay.search.checkIn, stay.search.checkOut);
  return (
    <article className="stay-card">
      <div
        className="stay-image"
        style={{
          backgroundImage: `linear-gradient(0deg,rgba(15,7,24,.4),transparent 60%),url(${stay.hotel.imageUrl ?? hotelImage(stay.hotel.hotelId)})`,
        }}
      >
        <span className="photo-label">
          {staySourceLabel(stay)} ·{" "}
          {stay.hotel.imageUrl ? "Property photo" : "Illustrative photo"}
        </span>
        <button
          className={`heart-button ${saved ? "is-saved" : ""}`}
          aria-label={`${saved ? "Unsave" : "Save"} ${stay.hotel.name}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        <span
          className="stars"
          aria-label={`${stay.hotel.rating ?? "Unrated"} stars`}
        >
          {"★".repeat(Math.min(5, Number(stay.hotel.rating) || 0))}
        </span>
      </div>
      <div className="stay-body">
        <p className="eyebrow">
          {stay.hotel.rating === "5" ? (
            <>
              <Sparkles size={11} /> A little luxury
            </>
          ) : (
            <>
              <BedDouble size={12} /> Your home away
            </>
          )}
        </p>
        <button className="stay-title" onClick={onDetails}>
          {stay.hotel.name}
        </button>
        <p className="stay-address">
          <MapPin size={12} />
          {stay.hotel.address ?? stay.search.cityName}
        </p>
        <div className="amenity-list">
          {stay.hotel.amenities
            ?.slice(0, 3)
            .map((a) => (
              <span key={a}>{a.replace(/_/g, " ").toLowerCase()}</span>
            ))}
        </div>
        <div className="stay-price">
          <div>
            {stay.offer ? (
              <>
                <strong>
                  {money(
                    Number(stay.offer.price.total) / count,
                    stay.offer.price.currency,
                  )}
                </strong>
                <span> / night</span>
                <small>
                  {money(stay.offer.price.total, stay.offer.price.currency)}{" "}
                  {stay.offer.isEstimate ? "estimated total" : "total"} ·{" "}
                  {count} nights · {stay.search.adults} guests
                </small>
              </>
            ) : (
              <span>Availability on request</span>
            )}
          </div>
          <button
            className="circle-button"
            aria-label={`View ${stay.hotel.name}`}
            onClick={onDetails}
          >
            <ArrowUpRight size={19} />
          </button>
        </div>
        {stay.offer?.additionalFees?.map((fee, i) => (
          <small className="extra-fee" key={i}>
            + {money(fee.amount, fee.currency)} {fee.description} at property
          </small>
        ))}
        {onCompare && (
          <button
            className={`compare-button ${compare ? "selected" : ""}`}
            onClick={onCompare}
            aria-pressed={compare}
          >
            {compare ? <Check size={14} /> : <span className="check-box" />}{" "}
            Compare stay
          </button>
        )}
      </div>
    </article>
  );
}
export function ProviderLink({ stay }: { stay: SavedStay }) {
  return (
    <a
      className="primary-button"
      href={bookingLink(stay)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Search on Booking.com <ArrowUpRight size={16} />
    </a>
  );
}

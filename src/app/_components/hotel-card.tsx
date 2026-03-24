import { MapPin, Wifi, Waves, Dumbbell, Utensils, Wine, Car, CheckCircle, XCircle, ExternalLink, CoffeeIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WIFI:           <Wifi      className="size-3" />,
  POOL:           <Waves     className="size-3" />,
  SWIMMING_POOL:  <Waves     className="size-3" />,
  FITNESS:        <Dumbbell  className="size-3" />,
  FITNESS_CENTER: <Dumbbell  className="size-3" />,
  RESTAURANT:     <Utensils  className="size-3" />,
  BAR:            <Wine      className="size-3" />,
  PARKING:        <Car       className="size-3" />,
  BREAKFAST:      <CoffeeIcon className="size-3" />,
};

const AMENITY_LABELS: Record<string, string> = {
  WIFI: "WiFi", POOL: "Pool", SWIMMING_POOL: "Pool",
  FITNESS: "Gym", FITNESS_CENTER: "Gym",
  RESTAURANT: "Restaurant", BAR: "Bar",
  PARKING: "Parking", SPA: "Spa",
  CONCIERGE: "Concierge", ROOFTOP: "Rooftop",
  BEACH_ACCESS: "Beach", BREAKFAST: "Breakfast",
};

const BOARD_LABELS: Record<string, string> = {
  BREAKFAST:   "🥐 Breakfast",
  HALF_BOARD:  "🍽 Half board",
  FULL_BOARD:  "🍴 Full board",
  ALL_INCLUSIVE:"🌟 All inclusive",
};

interface Hotel {
  hotelId: string; name: string; cityCode: string;
  latitude?: number; longitude?: number; address?: string;
  rating?: string; amenities?: string[]; distance?: string;
}

interface Offer {
  offerId: string; hotelId: string; hotelName: string;
  price: { currency: string; total: string; base?: string };
  room?: { type: string; description?: string; bedType?: string };
  checkInDate: string; checkOutDate: string; adults: number;
  cancellable?: boolean; boardType?: string;
}

interface Props { hotel: Hotel; offer?: Offer; nights: number; }

function Stars({ n }: { n: number }) {
  const filled = Math.min(Math.max(n, 0), 5);
  return (
    <span aria-label={`${filled} stars`}>
      <span className="text-amber-400">{"★".repeat(filled)}</span>
      <span className="text-foreground/15">{"★".repeat(5 - filled)}</span>
    </span>
  );
}

export function HotelCard({ hotel, offer, nights }: Props) {
  const rating = parseInt(hotel.rating ?? "0");
  const total  = offer ? parseFloat(offer.price.total) : null;
  const perNight = total ? (total / nights).toFixed(0) : null;
  const basePerNight = offer?.price.base ? (parseFloat(offer.price.base) / nights).toFixed(0) : null;
  const isDiscounted = basePerNight && perNight && parseFloat(basePerNight) > parseFloat(perNight);

  // Top accent bar: full brightness for 5★, fades for lower
  const accentClass = rating >= 5 ? "opacity-100" : rating >= 4 ? "opacity-70" : "opacity-40";

  const knownAmenities = (hotel.amenities ?? []).filter(a => AMENITY_LABELS[a]);
  const displayAmenities = knownAmenities.slice(0, 5);
  const extraCount = (hotel.amenities?.length ?? 0) - displayAmenities.length;

  const handleViewDeal = () => {
    const query = `${hotel.name} ${hotel.cityCode}`;
    window.open(
      `https://www.google.com/travel/hotels/search?q=${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <Card className="group flex flex-col overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
      {/* Accent top bar */}
      <div className={`h-1 w-full bg-primary ${accentClass}`} />

      <CardContent className="flex flex-1 flex-col p-5">
        {/* ── Header: name + price ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {rating > 0 && (
              <div className="mb-1 flex items-center gap-1.5">
                <Stars n={rating} />
                <span className="text-[10px] text-muted-foreground">{rating}★ hotel</span>
              </div>
            )}
            <h3 className="truncate text-base font-bold leading-snug" title={hotel.name}>
              {hotel.name}
            </h3>
            {hotel.address && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <MapPin className="size-3 shrink-0 text-primary/50" />
                {hotel.address}
              </p>
            )}
            {hotel.distance && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                🚶 {hotel.distance} from centre
              </p>
            )}
          </div>

          {/* Price block */}
          {perNight ? (
            <div className="shrink-0 text-right">
              {isDiscounted && (
                <div className="text-[11px] text-muted-foreground line-through">
                  ${basePerNight}/night
                </div>
              )}
              <div className="text-2xl font-extrabold leading-none">
                ${perNight}
                <span className="text-xs font-normal text-muted-foreground">/night</span>
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {offer!.price.currency} {total?.toFixed(0)} · {nights}n total
              </div>
            </div>
          ) : (
            <div className="shrink-0 rounded-md border border-dashed border-border px-2 py-1 text-center text-[11px] text-muted-foreground">
              Price<br />on request
            </div>
          )}
        </div>

        {/* ── Room info ── */}
        {offer?.room && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {offer.room.bedType && (
              <Badge variant="secondary" className="text-[10px]">
                🛏 {offer.room.bedType.replace(/_/g, " ")}
              </Badge>
            )}
            {offer.boardType && offer.boardType !== "ROOM_ONLY" && (
              <Badge variant="success" className="text-[10px]">
                {BOARD_LABELS[offer.boardType] ?? offer.boardType.replace(/_/g, " ")}
              </Badge>
            )}
            {offer.room.description && !offer.room.bedType && (
              <span className="text-[11px] text-muted-foreground capitalize">
                {offer.room.description.replace(/_/g, " ").toLowerCase()}
              </span>
            )}
          </div>
        )}

        {/* ── Amenities ── */}
        {displayAmenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayAmenities.map(a => (
              <span
                key={a}
                className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[10px] text-primary/80"
              >
                {AMENITY_ICONS[a] ?? "·"}{" "}{AMENITY_LABELS[a]}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-[11px] text-muted-foreground self-center">
                +{extraCount} more
              </span>
            )}
          </div>
        )}

        {/* Spacer to push footer to bottom */}
        <div className="flex-1" />

        {/* ── Footer ── */}
        <Separator className="my-3" />
        <div className="flex items-center justify-between gap-2">
          <div>
            {offer?.cancellable === true && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle className="size-3.5" /> Free cancellation
              </span>
            )}
            {offer?.cancellable === false && (
              <span className="flex items-center gap-1 text-[11px] text-rose-400">
                <XCircle className="size-3.5" /> Non-refundable
              </span>
            )}
          </div>
          {offer && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewDeal}
              className="h-7 gap-1 border-primary/40 px-3 text-xs text-primary hover:border-primary hover:bg-primary/10"
            >
              View deal <ExternalLink className="size-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

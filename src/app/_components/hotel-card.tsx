import { MapPin, Wifi, Waves, Dumbbell, Utensils, Wine, Car, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WIFI:          <Wifi      className="size-3" />,
  POOL:          <Waves     className="size-3" />,
  SWIMMING_POOL: <Waves     className="size-3" />,
  FITNESS:       <Dumbbell  className="size-3" />,
  FITNESS_CENTER:<Dumbbell  className="size-3" />,
  RESTAURANT:    <Utensils  className="size-3" />,
  BAR:           <Wine      className="size-3" />,
  PARKING:       <Car       className="size-3" />,
};

const AMENITY_LABELS: Record<string, string> = {
  WIFI: "WiFi", POOL: "Pool", SWIMMING_POOL: "Pool", FITNESS: "Gym",
  FITNESS_CENTER: "Gym", RESTAURANT: "Restaurant", BAR: "Bar",
  PARKING: "Parking", SPA: "Spa", CONCIERGE: "Concierge",
  ROOFTOP: "Rooftop", BEACH_ACCESS: "Beach",
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
  return (
    <span className="text-yellow-400">
      {"★".repeat(Math.min(n, 5))}
      <span className="text-foreground/20">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

export function HotelCard({ hotel, offer, nights }: Props) {
  const rating = parseInt(hotel.rating ?? "0");
  const perNight = offer ? (parseFloat(offer.price.total) / nights).toFixed(0) : null;
  const accentOpacity = rating >= 5 ? "opacity-100" : rating >= 4 ? "opacity-70" : "opacity-40";

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
      {/* Accent top bar */}
      <div className={`h-1 w-full bg-primary ${accentOpacity}`} />

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {rating > 0 && <Stars n={rating} />}
              <Badge variant="default" className="text-[10px]">{rating}★ Hotel</Badge>
            </div>
            <h3 className="mt-1 truncate text-base font-bold">{hotel.name}</h3>
            {hotel.address && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <MapPin className="size-3 shrink-0 text-primary/60" />
                {hotel.address}
              </p>
            )}
            {hotel.distance && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                🚶 {hotel.distance} from city centre
              </p>
            )}
          </div>

          {/* Price */}
          {offer ? (
            <div className="shrink-0 text-right">
              <div className="text-2xl font-extrabold">
                ${perNight}
                <span className="text-xs font-normal text-muted-foreground">/night</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {offer.price.currency} {offer.price.total} total
              </div>
              {offer.price.base && parseFloat(offer.price.base) > parseFloat(offer.price.total) && (
                <div className="text-[11px] text-muted-foreground line-through">
                  ${(parseFloat(offer.price.base) / nights).toFixed(0)}/night
                </div>
              )}
            </div>
          ) : (
            <div className="shrink-0 text-right text-[11px] italic text-muted-foreground">
              Check availability
            </div>
          )}
        </div>

        {/* Room info */}
        {offer?.room && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {offer.room.bedType && (
              <Badge variant="secondary" className="text-[10px]">
                🛏 {offer.room.bedType.replace(/_/g, " ")}
              </Badge>
            )}
            {offer.room.description && (
              <span className="text-[11px] text-muted-foreground">
                {offer.room.description.replace(/_/g, " ")}
              </span>
            )}
            {offer.boardType && offer.boardType !== "ROOM_ONLY" && (
              <Badge variant="success" className="text-[10px]">
                {offer.boardType === "BREAKFAST" ? "🥐 Breakfast" :
                 offer.boardType === "HALF_BOARD" ? "🍽 Half board" :
                 offer.boardType.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        )}

        {/* Amenities */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 6).map(a => (
              <span
                key={a}
                className="flex items-center gap-1 rounded-md bg-muted/50 px-2 py-0.5 text-[10px] text-primary/80"
              >
                {AMENITY_ICONS[a] ?? "✓"} {AMENITY_LABELS[a] ?? a.replace(/_/g, " ")}
              </span>
            ))}
            {hotel.amenities.length > 6 && (
              <span className="text-[11px] text-muted-foreground">
                +{hotel.amenities.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <Separator className="my-3" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {offer?.cancellable ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle className="size-3.5" /> Free cancellation
              </span>
            ) : offer && (
              <span className="flex items-center gap-1 text-[11px] text-rose-400">
                <XCircle className="size-3.5" /> Non-refundable
              </span>
            )}
          </div>
          {offer && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              onClick={() =>
                window.open(
                  `https://www.google.com/travel/hotels/search?q=${encodeURIComponent(hotel.name)}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              View deal <ExternalLink className="ml-1 size-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export type View = "explore" | "saved" | "trips" | "cards";
export type TravelRoute = { view: View; tripId: string | null };
const views: View[] = ["explore", "saved", "trips", "cards"];
export function parseTravelRoute(hash: string): TravelRoute {
  const [path, query] = hash.replace(/^#\/?/, "").split("?");
  const view = views.includes(path as View) ? (path as View) : "explore";
  const candidate = new URLSearchParams(query).get("trip");
  const tripId =
    candidate && /^[a-zA-Z0-9_-]{1,100}$/.test(candidate) ? candidate : null;
  return { view, tripId };
}
export function travelRouteHash(route: TravelRoute) {
  return `#/${route.view}${route.tripId ? `?${new URLSearchParams({ trip: route.tripId })}` : ""}`;
}

"use client";
import { useEffect, useState } from "react";
import {
  parseTravelRoute,
  travelRouteHash,
  type View,
} from "~/lib/travel/navigation";
export function useTravelNavigation() {
  const [view, setView] = useState<View>("explore"),
    [activeId, setActiveId] = useState<string | null>(null),
    [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const read = () => {
      const route = parseTravelRoute(window.location.hash);
      setView(route.view);
      setActiveId(route.tripId);
    };
    read();
    setHydrated(true);
    window.addEventListener("popstate", read);
    window.addEventListener("hashchange", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("hashchange", read);
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const hash = travelRouteHash({ view, tripId: activeId });
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    window.scrollTo({ top: 0, behavior: "instant" });
    const labels = {
      explore: "Discover",
      saved: "Saved stays",
      trips: "My trips",
      cards: "Card perks",
    };
    document.title = `${labels[view]} · GoNiva`;
  }, [view, activeId, hydrated]);
  return { view, setView, activeId, setActiveId };
}

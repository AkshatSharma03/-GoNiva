"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  Compass,
  CreditCard,
  Folder,
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  cities,
  defaultSearch,
  itinerary,
  nights,
  money,
  today,
  type Search,
  type Trip,
  type SavedStay,
  type Activity,
  type Message,
} from "~/lib/travel/model";
import { type PlannerResult } from "~/lib/travel/planner";
import { download, useWorkspace, workspaceSchema } from "~/lib/travel/storage";
import { TripSearch } from "./trip-search";
import { StayResults } from "./stay-results";
import { StayCard, ProviderLink } from "./stay-card";

import { CardPerks } from "./card-perks";
import { detectOwnedCards, cards } from "~/lib/travel/cards";

import { type View } from "~/lib/travel/navigation";
import { useTravelNavigation } from "./use-travel-navigation";
import { ResumeTrips } from "./resume-trips";
type Modal =
  | { type: "stay"; stay: SavedStay }
  | { type: "settings" }
  | { type: "trip"; id: string }
  | { type: "compare" }
  | { type: "activity"; tripId: string; activity?: Activity; day: number }
  | null;
const uid = () => crypto.randomUUID();
export function TravelApp() {
  const { workspace, setWorkspace, ready, storageError, clearStorageError } =
    useWorkspace();
  const { view, setView, activeId, setActiveId } = useTravelNavigation();
  const [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<Modal>(null),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState("Basic planner"),
    [folderDraft, setFolderDraft] = useState<string | null>(null),
    [filterFolder, setFilterFolder] = useState("All trips"),
    [compare, setCompare] = useState<string[]>([]),
    [savedCity, setSavedCity] = useState("all"),
    [historyQuery, setHistoryQuery] = useState("");
  const [initialSearch] = useState(defaultSearch);
  const [isPhone, setIsPhone] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const effectiveSavedCity =
    savedCity !== "all" &&
    !workspace.saved.some((s) => s.search.cityName === savedCity)
      ? "all"
      : savedCity;
  const messageEnd = useRef<HTMLDivElement>(null),
    chatInput = useRef<HTMLTextAreaElement>(null),
    busyRef = useRef(false);
  const active = workspace.trips.find((t) => t.id === activeId);
  const search = active?.search ?? initialSearch;
  const comparison = workspace.saved.filter((s) => compare.includes(s.id));
  useEffect(() => {
    messageEnd.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [active?.messages.length, busy]);
  useEffect(() => {
    if (storageError) toast.error(storageError, { duration: 10000 });
  }, [storageError]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/planner", { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { mode: string }) =>
        setMode(data.mode === "ai" ? "AI planner" : "Basic planner"),
      )
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 650px)");
    const sync = () => {
      setIsPhone(media.matches);
      if (!media.matches) setMobile(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close =
      sidebarRef.current?.querySelector<HTMLButtonElement>(".drawer-close");
    close?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobile(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),a[href],select,textarea,[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      previouslyFocused?.focus();
    };
  }, [mobile]);
  function updateTrip(id: string, fn: (t: Trip) => Trip) {
    setWorkspace((w) => ({
      ...w,
      trips: w.trips.map((t) =>
        t.id === id ? { ...fn(t), updatedAt: new Date().toISOString() } : t,
      ),
    }));
  }
  function makeTrip(s: Search, messages: Message[] = []): Trip {
    return {
      id: uid(),
      title: `${s.cityName} escape`,
      folder: "",
      pinned: false,
      updatedAt: new Date().toISOString(),
      search: s,
      messages,
      activities: [],
    };
  }
  function submitSearch(s: Search) {
    if (active)
      updateTrip(active.id, (t) => ({
        ...t,
        search: s,
      }));
    else {
      const t = makeTrip(s);
      setWorkspace((w) => ({ ...w, trips: [t, ...w.trips] }));
      setActiveId(t.id);
    }
    setView("explore");
  }
  function openTrip(t: Trip, next: View = "explore") {
    setActiveId(t.id);
    setView(next);
    setMobile(false);
  }
  function toggleSave(stay: SavedStay) {
    const exists = workspace.saved.some((s) => s.id === stay.id);
    setWorkspace((w) => ({
      ...w,
      saved: exists
        ? w.saved.filter((s) => s.id !== stay.id)
        : [stay, ...w.saved],
    }));
    if (exists) setCompare((c) => c.filter((id) => id !== stay.id));
    toast.success(
      exists ? "Stay removed from your collection" : "Saved to your collection",
      exists
        ? {
            action: {
              label: "Undo",
              onClick: () =>
                setWorkspace((w) => ({
                  ...w,
                  saved: w.saved.some((s) => s.id === stay.id)
                    ? w.saved
                    : [stay, ...w.saved],
                })),
            },
          }
        : undefined,
    );
  }
  async function send(text: string) {
    if (busyRef.current || !text.trim()) return;
    if (/\b(?:\d[ -]?){13,19}\b/.test(text)) {
      toast.error(
        "Please use card names only. Remove any card or account number before sending.",
      );
      return;
    }
    const detected = detectOwnedCards(text);
    const owned = Array.from(new Set([...workspace.cards, ...detected]));
    if (detected.length) {
      setWorkspace((w) => ({ ...w, cards: owned }));
      toast.success(
        `${detected.map((id) => cards.find((c) => c.id === id)?.name).join(", ")} added to Card perks`,
      );
    }
    busyRef.current = true;
    setBusy(true);
    setDraft("");
    setView("explore");
    const user: Message = {
      id: uid(),
      role: "user",
      content: text.trim().slice(0, 4000),
    };
    const trip = active ?? makeTrip(search);
    const messages = [...trip.messages, user];
    if (!active) {
      setWorkspace((w) => ({
        ...w,
        trips: [{ ...trip, messages }, ...w.trips],
      }));
      setActiveId(trip.id);
    } else updateTrip(trip.id, (t) => ({ ...t, messages }));
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.slice(-20),
          search: trip.search,
          cards: owned,
        }),
        signal: AbortSignal.timeout(35000),
      });
      if (!res.ok) {
        const failure = (await res.json()) as { error?: string };
        throw new Error(
          failure.error ?? "We couldn’t send your message. Please try again.",
        );
      }
      const result = (await res.json()) as PlannerResult;
      setMode(result.mode === "ai" ? "AI planner" : "Basic planner");
      if (result.warning) toast.info(result.warning);
      updateTrip(trip.id, (t) => ({
        ...t,
        title:
          t.messages.length <= 1 ? `${result.search.cityName} escape` : t.title,
        search: result.search,
        messages: [
          ...t.messages,
          { id: uid(), role: "assistant", content: result.reply },
        ],
      }));
    } catch (e) {
      setDraft(text);
      toast.error(e instanceof Error ? e.message : "Couldn’t connect to Niva");
      updateTrip(trip.id, (t) => ({
        ...t,
        messages: t.messages.filter((m) => m.id !== user.id),
      }));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  const nav = (v: View) => {
    setView(v);
    setMobile(false);
  };
  const newTrip = () => {
    setActiveId(null);
    setView("explore");
    setMobile(false);
    setDraft("");
  };
  const shownTrips = workspace.trips
    .filter(
      (t) =>
        (filterFolder === "All trips" || t.folder === filterFolder) &&
        `${t.title} ${t.search.cityName}`
          .toLowerCase()
          .includes(historyQuery.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  function exportTrip(t: Trip) {
    const content = `${t.title}\n${t.search.cityName} · ${t.search.checkIn} to ${t.search.checkOut} · ${t.search.adults} guests\n\n${t.activities.map((a) => `Day ${a.day} · ${a.time} · ${a.title}\n${a.notes}`).join("\n\n")}\n\nSuggestions only. Verify hours, reservations, and travel requirements before departure.\nGenerated with GoNiva.`;
    download(
      `${t.title.replace(/[^a-z0-9]/gi, "-")}.txt`,
      content,
      "text/plain",
    );
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        inert={isPhone && !mobile}
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        className={`sidebar ${mobile ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <button
          className="drawer-close circle-button"
          aria-label="Close navigation menu"
          onClick={() => setMobile(false)}
        >
          <X size={18} />
        </button>
        <button className="brand" onClick={newTrip} disabled={busy}>
          <span className="brand-mark">
            <Compass size={23} />
          </span>
          <span>
            go<span>niva</span>
            <b>✦</b>
          </span>
        </button>
        <button className="new-trip-button" onClick={newTrip} disabled={busy}>
          <Plus size={17} /> Plan a new trip <span>↗</span>
        </button>
        <nav className="primary-nav">
          <button
            className={view === "explore" ? "selected" : ""}
            aria-current={view === "explore" ? "page" : undefined}
            onClick={() => nav("explore")}
          >
            <Compass size={18} /> Discover <span>✦</span>
          </button>
          <button
            className={view === "saved" ? "selected" : ""}
            aria-current={view === "saved" ? "page" : undefined}
            onClick={() => nav("saved")}
          >
            <Heart size={18} /> Saved stays{" "}
            {workspace.saved.length > 0 && <b>{workspace.saved.length}</b>}
          </button>
          <button
            className={view === "trips" ? "selected" : ""}
            aria-current={view === "trips" ? "page" : undefined}
            onClick={() => nav("trips")}
          >
            <CalendarDays size={18} /> My trips{" "}
            {workspace.trips.length > 0 && <b>{workspace.trips.length}</b>}
          </button>
          <button
            className={view === "cards" ? "selected" : ""}
            aria-current={view === "cards" ? "page" : undefined}
            onClick={() => nav("cards")}
          >
            <CreditCard size={18} /> Card perks <span>✧</span>
          </button>
        </nav>
        <div className="sidebar-label">
          YOUR SPACE{" "}
          <button aria-label="Create folder" onClick={() => setFolderDraft("")}>
            <Plus size={15} />
          </button>
        </div>
        {folderDraft !== null && (
          <form
            className="folder-form"
            onSubmit={(e) => {
              e.preventDefault();
              const name = folderDraft.trim().slice(0, 40);
              if (
                name &&
                name !== "All trips" &&
                !workspace.folders.includes(name)
              ) {
                setWorkspace((w) => ({ ...w, folders: [...w.folders, name] }));
                setFolderDraft(null);
              } else toast.error("Choose a unique folder name");
            }}
          >
            <input
              autoFocus
              aria-label="Folder name"
              placeholder="Folder name"
              value={folderDraft}
              onChange={(e) => setFolderDraft(e.target.value)}
              maxLength={40}
            />
            <button aria-label="Save folder">
              <Check size={14} />
            </button>
            <button
              type="button"
              aria-label="Cancel folder"
              onClick={() => setFolderDraft(null)}
            >
              <X size={14} />
            </button>
          </form>
        )}
        <div className="folder-list">
          {workspace.folders.map((f) => (
            <button
              key={f}
              className={
                filterFolder === f && view === "trips" ? "selected" : ""
              }
              onClick={() => {
                setFilterFolder(f);
                nav("trips");
              }}
            >
              <Folder size={15} />
              <span>{f}</span>
              <small>
                {workspace.trips.filter((t) => t.folder === f).length}
              </small>
            </button>
          ))}
        </div>
        <div className="sidebar-label">RECENT CONVERSATIONS</div>
        <div className="conversation-list">
          {workspace.trips.length > 4 && (
            <input
              aria-label="Search conversations"
              placeholder="Find a conversation…"
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
            />
          )}{" "}
          {workspace.trips
            .filter((t) =>
              t.title.toLowerCase().includes(historyQuery.toLowerCase()),
            )
            .sort(
              (a, b) =>
                Number(b.pinned) - Number(a.pinned) ||
                b.updatedAt.localeCompare(a.updatedAt),
            )
            .slice(0, 12)
            .map((t) => (
              <div
                className={`conversation ${activeId === t.id ? "selected" : ""}`}
                key={t.id}
              >
                <button disabled={busy} onClick={() => openTrip(t)}>
                  {t.pinned ? <Pin size={13} /> : <MessageCircle size={13} />}
                  <span>{t.title}</span>
                </button>
                <button
                  aria-label={`Manage ${t.title}`}
                  onClick={() => setModal({ type: "trip", id: t.id })}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            ))}
          {workspace.trips.length === 0 && (
            <p className="sidebar-empty">
              Your next adventure starts here.
              <br />
              Let’s make a little room for wonder.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>✦</span>
            <div>
              A world of possibilities.
              <br />
              <strong>One trip that feels like you.</strong>
            </div>
          </div>
          <button
            className="profile-button"
            onClick={() => setModal({ type: "settings" })}
          >
            <span className="avatar">Y</span>
            <span>
              Your travel space<small>Saved on this device</small>
            </span>
            <Settings size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell" inert={mobile}>
        <header className="topbar">
          <div>
            <button
              className="mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Your world <span>/</span>{" "}
              <strong>
                {view === "explore"
                  ? "Discover"
                  : view === "saved"
                    ? "Saved stays"
                    : view === "cards"
                      ? "Card perks"
                      : "My trips"}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="local-badge">
              <span /> Personal travel space
            </span>
            <button
              className="circle-button"
              aria-label="Open settings"
              onClick={() => setModal({ type: "settings" })}
            >
              <span className="avatar small">Y</span>
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          {!ready ? (
            <div className="empty-panel">
              <Sparkles className="spin" />
              <p>Opening your travel space…</p>
            </div>
          ) : (
            <>
              {storageError && (
                <div className="data-notice form-error" role="alert">
                  {storageError}
                </div>
              )}
              {activeId && !active && (
                <div className="missing-trip-notice" role="status">
                  <span>
                    This trip isn’t saved on this device. Your other plans are
                    still here.
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setActiveId(null);
                      nav("trips");
                    }}
                  >
                    Find my trips <ArrowRight size={14} />
                  </button>
                </div>
              )}
              {view === "explore" && (
                <>
                  {!active && (
                    <ResumeTrips
                      trips={workspace.trips}
                      onOpen={(t) => openTrip(t)}
                      onAll={() => nav("trips")}
                    />
                  )}
                  <section className={`hero ${active ? "compact" : ""}`}>
                    <div className="hero-orbit orbit-one" />
                    <div className="hero-orbit orbit-two" />
                    <p className="eyebrow">
                      <span className="tiny-star">✦</span> A LITTLE LESS
                      PLANNING. A LOT MORE POSSIBILITY.
                    </p>
                    <h1>
                      {active ? (
                        <>
                          Let’s make <em>{active.search.cityName}</em> yours.
                        </>
                      ) : (
                        <>
                          Find your <em>somewhere.</em>
                        </>
                      )}
                    </h1>
                    <p className="hero-description">
                      {active
                        ? "Thoughtful stays, your kind of days. Refine the details with Niva."
                        : "The perfect stay. The unexpected detour. The trip that feels like you."}
                      <br />
                      {!active &&
                        "Tell Niva what you’re dreaming of. We’ll take it from here."}
                    </p>
                  </section>
                  {active && (
                    <div className="active-trip-strip">
                      <span className="trip-strip-icon">
                        <MapPin size={18} />
                      </span>
                      <div>
                        <strong>{active.title}</strong>
                        <span>
                          {search.checkIn} — {search.checkOut} · {search.adults}{" "}
                          guests
                        </span>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => nav("trips")}
                      >
                        <CalendarDays size={14} /> Itinerary
                      </button>
                      <button
                        className="text-button"
                        onClick={() => nav("cards")}
                      >
                        <CreditCard size={14} /> Card perks
                      </button>
                    </div>
                  )}
                  <section
                    className={`niva-panel ${active?.messages.length ? "has-conversation" : ""}`}
                    aria-label="Plan with Niva"
                  >
                    <div className="niva-heading">
                      <div className="niva-icon">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h2>
                          Meet Niva<span>Your travel companion</span>
                        </h2>
                        <p>A little inspiration goes a long way.</p>
                      </div>
                      <span className="assistant-status">
                        <span />
                        {mode}
                      </span>
                    </div>
                    {active && active.messages.length > 0 && (
                      <div
                        className="messages"
                        aria-live="polite"
                        aria-busy={busy}
                      >
                        {active.messages.map((m) => (
                          <div key={m.id} className={`message ${m.role}`}>
                            <span className="message-avatar">
                              {m.role === "assistant" ? (
                                <Sparkles size={14} />
                              ) : (
                                "Y"
                              )}
                            </span>
                            <div>
                              <small>
                                {m.role === "assistant" ? "Niva" : "You"}
                              </small>
                              <p>{m.content}</p>
                            </div>
                          </div>
                        ))}
                        {busy && (
                          <div className="message assistant">
                            <span className="message-avatar">
                              <Sparkles size={14} />
                            </span>
                            <p className="thinking">
                              Thinking about your next adventure<span>•••</span>
                            </p>
                          </div>
                        )}
                        <div ref={messageEnd} />
                      </div>
                    )}
                    <form
                      className="chat-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void send(draft);
                      }}
                    >
                      <textarea
                        ref={chatInput}
                        aria-label="Message Niva"
                        placeholder="“A cozy stay in Paris for 4 nights, under $900…”"
                        value={draft}
                        maxLength={4000}
                        disabled={busy}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            void send(draft);
                          }
                        }}
                      />
                      <div className="chat-form-bottom">
                        <span>
                          <Sparkles size={12} />
                          {busy
                            ? "Making room for possibility…"
                            : "Big plans or a vague idea. Start anywhere."}
                        </span>
                        <button
                          className="send-button"
                          aria-label="Send message"
                          disabled={busy || !draft.trim()}
                        >
                          <ArrowUp size={19} />
                        </button>
                      </div>
                    </form>
                    {!active?.messages.length && (
                      <div className="prompt-chips">
                        {[
                          "Paris for 4 nights under $900",
                          "Tokyo for 2 guests with a spa",
                          "A 5-star London escape",
                        ].map((p) => (
                          <button
                            key={p}
                            disabled={busy}
                            onClick={() => void send(p)}
                          >
                            <span>✦</span>
                            {p}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                  <div className="or-divider">
                    <span />
                    or, start with the details
                    <span />
                  </div>
                  <TripSearch
                    key={JSON.stringify(search)}
                    initial={search}
                    onSearch={submitSearch}
                  />
                  {active ? (
                    <>
                      <StayResults
                        key={JSON.stringify(search)}
                        search={search}
                        onSearch={submitSearch}
                        saved={workspace.saved}
                        onSave={toggleSave}
                        onDetails={(stay) => setModal({ type: "stay", stay })}
                      />
                      <div className="itinerary-cta">
                        <span className="niva-icon">
                          <CalendarDays size={21} />
                        </span>
                        <div>
                          <h3>Turn your somewhere into a plan.</h3>
                          <p>
                            Build a day-by-day itinerary, then make it your own.
                          </p>
                        </div>
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setView("trips");
                            setFilterFolder("All trips");
                          }}
                        >
                          Plan my days <ArrowRight size={15} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <section className="destination-section">
                        <div className="section-heading">
                          <div>
                            <p className="eyebrow">LET YOUR CURIOSITY LEAD</p>
                            <h2>
                              Somewhere worth <em>going.</em>
                            </h2>
                            <p>A few places we can’t stop thinking about.</p>
                          </div>
                          <span className="quiet-label">
                            A world of possibilities <span>↗</span>
                          </span>
                        </div>
                        <div className="destination-grid">
                          {[cities[1], cities[2], cities[3]].map((c, i) => (
                            <button
                              className="destination-card"
                              key={c.cityCode}
                              onClick={() =>
                                submitSearch({
                                  ...search,
                                  cityCode: c.cityCode,
                                  cityName: c.name,
                                })
                              }
                              style={{
                                backgroundImage: `linear-gradient(0deg,rgba(12,6,20,.88),rgba(12,6,20,.04) 80%),url(https://images.unsplash.com/${c.image}?auto=format&fit=crop&w=900&q=85)`,
                              }}
                            >
                              <span className="destination-tag">
                                {
                                  [
                                    "THE ROMANTIC",
                                    "THE CURIOUS",
                                    "THE SUN SEEKER",
                                  ][i]
                                }
                              </span>
                              <div>
                                <span>{c.country}</span>
                                <h3>
                                  {c.name}
                                  <ArrowUpRight size={23} />
                                </h3>
                                <p>{c.mood}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                      <section className="promise-strip">
                        <div>
                          <Sparkles />
                          <span>
                            <strong>A little more you</strong>
                            <small>Stays shaped around your preferences.</small>
                          </span>
                        </div>
                        <div>
                          <Bookmark />
                          <span>
                            <strong>Good finds, kept close</strong>
                            <small>Save, compare, and come back anytime.</small>
                          </span>
                        </div>
                        <div>
                          <ShieldCheck />
                          <span>
                            <strong>Room to explore</strong>
                            <small>
                              Your plans. Your pace. Your possibilities.
                            </small>
                          </span>
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
              {view === "cards" && (
                <CardPerks
                  selected={workspace.cards}
                  onChange={(ids) =>
                    setWorkspace((w) => ({ ...w, cards: ids }))
                  }
                  search={search}
                />
              )}
              {view === "saved" && (
                <section className="collection-page">
                  <PageHeading
                    eyebrow="GOOD FINDS, KEPT CLOSE"
                    title="Your kind of"
                    emphasis="stay."
                    description="The places you loved, all in one little corner of the world."
                  />
                  <div className="collection-toolbar">
                    <span>
                      {workspace.saved.length} saved{" "}
                      {workspace.saved.length === 1 ? "stay" : "stays"}
                    </span>
                    <label>
                      Destination{" "}
                      <select
                        aria-label="Filter saved destination"
                        value={effectiveSavedCity}
                        onChange={(e) => setSavedCity(e.target.value)}
                      >
                        <option value="all">All destinations</option>
                        {[
                          ...new Set(
                            workspace.saved.map((s) => s.search.cityName),
                          ),
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {workspace.saved.length === 0 ? (
                    <Empty
                      icon={<Heart />}
                      title="Keep the places that speak to you"
                      description="Tap the heart on a stay to save it here. Your next favorite is out there."
                      action="Discover stays"
                      onAction={() => nav("explore")}
                    />
                  ) : (
                    <div className="stay-grid">
                      {workspace.saved
                        .filter(
                          (s) =>
                            effectiveSavedCity === "all" ||
                            s.search.cityName === effectiveSavedCity,
                        )
                        .map((stay) => (
                          <StayCard
                            key={stay.id}
                            stay={stay}
                            saved
                            onSave={() => toggleSave(stay)}
                            onDetails={() => setModal({ type: "stay", stay })}
                            compare={compare.includes(stay.id)}
                            onCompare={() => {
                              if (compare.includes(stay.id))
                                setCompare((c) =>
                                  c.filter((id) => id !== stay.id),
                                );
                              else if (compare.length < 3)
                                setCompare((c) => [...c, stay.id]);
                              else
                                toast.info(
                                  "Compare up to three stays at a time",
                                );
                            }}
                          />
                        ))}
                    </div>
                  )}
                  {comparison.length > 0 && (
                    <div className="compare-bar">
                      <span>
                        <Check size={16} />
                        {comparison.length}{" "}
                        {comparison.length === 1 ? "stay" : "stays"} selected
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setCompare([])}
                      >
                        Clear
                      </button>
                      <button
                        className="primary-button"
                        disabled={comparison.length < 2}
                        onClick={() => setModal({ type: "compare" })}
                      >
                        Compare stays <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </section>
              )}
              {view === "trips" && (
                <section className="trips-page">
                  <PageHeading
                    eyebrow="FROM DAYDREAM TO DAY-BY-DAY"
                    title="Make room for"
                    emphasis="adventure."
                    description="All your possibilities, neatly in one place."
                  />
                  <div className="trip-toolbar">
                    <div className="folder-tabs">
                      <button
                        className={
                          filterFolder === "All trips" ? "selected" : ""
                        }
                        onClick={() => setFilterFolder("All trips")}
                      >
                        All trips <span>{workspace.trips.length}</span>
                      </button>
                      {workspace.folders.map((f) => (
                        <button
                          key={f}
                          className={filterFolder === f ? "selected" : ""}
                          onClick={() => setFilterFolder(f)}
                        >
                          <Folder size={13} />
                          {f}
                        </button>
                      ))}
                    </div>
                    <button
                      className="secondary-button"
                      onClick={newTrip}
                      disabled={busy}
                    >
                      <Plus size={15} /> New trip
                    </button>
                  </div>
                  {shownTrips.length === 0 ? (
                    <Empty
                      icon={<Compass />}
                      title={
                        workspace.trips.length
                          ? "A little room for a new adventure"
                          : "Your story starts somewhere"
                      }
                      description={
                        workspace.trips.length
                          ? "Move a trip into this folder from its menu, or start a new one."
                          : "Start with a destination or a conversation. We’ll keep your plans here."
                      }
                      action="Plan a trip"
                      onAction={newTrip}
                    />
                  ) : (
                    <div className="trip-layout">
                      <div className="trip-list">
                        {shownTrips.map((t) => (
                          <article
                            key={t.id}
                            className={`trip-item ${activeId === t.id ? "selected" : ""}`}
                          >
                            <button
                              className="trip-main"
                              onClick={() => openTrip(t, "trips")}
                            >
                              <span
                                className="trip-thumbnail"
                                style={{
                                  backgroundImage: `url(https://images.unsplash.com/${cities.find((c) => c.cityCode === t.search.cityCode)?.image}?auto=format&fit=crop&w=160&q=70)`,
                                }}
                              />
                              <span>
                                <strong>
                                  {t.pinned && <Pin size={12} />} {t.title}
                                </strong>
                                <small>
                                  {t.search.checkIn} ·{" "}
                                  {nights(t.search.checkIn, t.search.checkOut)}{" "}
                                  nights
                                </small>
                                <span>
                                  {t.folder || "No folder"} ·{" "}
                                  {t.activities.length
                                    ? `${t.activities.length} activities`
                                    : "Ready to plan"}
                                </span>
                              </span>
                            </button>
                            <button
                              className="circle-button"
                              aria-label={`Manage ${t.title}`}
                              onClick={() =>
                                setModal({ type: "trip", id: t.id })
                              }
                            >
                              <MoreHorizontal size={17} />
                            </button>
                          </article>
                        ))}
                      </div>
                      <div className="itinerary-panel">
                        {active &&
                        shownTrips.some((t) => t.id === active.id) ? (
                          <>
                            <div className="itinerary-header">
                              <p className="eyebrow">
                                YOUR ADVENTURE, YOUR WAY
                              </p>
                              <h2>{active.title}</h2>
                              <p>
                                <MapPin size={13} />
                                {active.search.cityName} ·{" "}
                                {active.search.adults} guests
                              </p>
                              <div>
                                <button
                                  className="text-button"
                                  disabled={busy}
                                  onClick={() => nav("explore")}
                                >
                                  <MessageCircle size={14} /> Open conversation
                                </button>
                                {active.activities.length > 0 && (
                                  <button
                                    className="text-button"
                                    onClick={() => exportTrip(active)}
                                  >
                                    <ArrowDownToLine size={14} /> Export
                                  </button>
                                )}
                              </div>
                            </div>
                            {active.search.checkIn < today() && (
                              <p className="data-notice">
                                This trip’s dates are in the past. Update the
                                dates in Discover to search again.
                              </p>
                            )}
                            {active.activities.length === 0 ? (
                              <Empty
                                icon={<CalendarDays />}
                                title="Let’s give your days a little shape"
                                description="Start with a suggested itinerary, then edit it to match your pace. Suggestions aren’t reservations."
                                action="Build my itinerary"
                                onAction={() => {
                                  updateTrip(active.id, (t) => ({
                                    ...t,
                                    activities: itinerary(t.search),
                                  }));
                                  toast.success(
                                    "Your itinerary is ready to make your own",
                                  );
                                }}
                              />
                            ) : (
                              <>
                                <p className="itinerary-disclaimer">
                                  Suggested activities · Check opening hours and
                                  book tickets separately. Activities are kept
                                  when your destination or dates change — review
                                  them to suit your updated trip.
                                </p>
                                {Array.from(
                                  {
                                    length: Math.min(
                                      30,
                                      Math.max(
                                        0,
                                        nights(
                                          active.search.checkIn,
                                          active.search.checkOut,
                                        ),
                                        ...active.activities.map((a) => a.day),
                                      ),
                                    ),
                                  },
                                  (_, i) => i + 1,
                                ).map((day) => (
                                  <section className="day-section" key={day}>
                                    <div className="day-heading">
                                      <span>
                                        DAY {String(day).padStart(2, "0")}
                                        {day >
                                        nights(
                                          active.search.checkIn,
                                          active.search.checkOut,
                                        )
                                          ? " · Outside current stay"
                                          : ""}
                                      </span>
                                      <button
                                        className="text-button"
                                        onClick={() =>
                                          setModal({
                                            type: "activity",
                                            tripId: active.id,
                                            day,
                                          })
                                        }
                                      >
                                        <Plus size={13} /> Add activity
                                      </button>
                                    </div>
                                    {active.activities
                                      .filter((a) => a.day === day)
                                      .sort((a, b) =>
                                        a.time.localeCompare(b.time),
                                      )
                                      .map((a) => (
                                        <div className="activity" key={a.id}>
                                          <time>{a.time}</time>
                                          <span className="timeline-dot" />
                                          <div>
                                            <strong>{a.title}</strong>
                                            <p>{a.notes}</p>
                                          </div>
                                          <button
                                            className="icon-button"
                                            aria-label={`Edit ${a.title}`}
                                            onClick={() =>
                                              setModal({
                                                type: "activity",
                                                tripId: active.id,
                                                activity: a,
                                                day,
                                              })
                                            }
                                          >
                                            <Pencil size={13} />
                                          </button>
                                          <button
                                            className="icon-button danger"
                                            aria-label={`Remove ${a.title}`}
                                            onClick={() =>
                                              updateTrip(active.id, (t) => ({
                                                ...t,
                                                activities: t.activities.filter(
                                                  (v) => v.id !== a.id,
                                                ),
                                              }))
                                            }
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      ))}
                                  </section>
                                ))}
                              </>
                            )}
                          </>
                        ) : (
                          <Empty
                            icon={<CalendarDays />}
                            title="Pick a possibility"
                            description="Select a trip to see its itinerary and make your plans."
                          />
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}
              <footer className="footer">
                <span className="footer-brand">
                  goniva<span>✦</span>
                </span>
                <span>Go somewhere. Feel something.</span>
                <small>Made for the way you want to travel.</small>
              </footer>
            </>
          )}
        </main>
      </div>
      <Dialog.Root
        open={modal !== null}
        onOpenChange={(v) => {
          if (!v) setModal(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className={`dialog-content ${modal?.type === "compare" ? "wide" : ""}`}
            aria-describedby={undefined}
          >
            <Dialog.Close className="dialog-close" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
            {modal?.type === "stay" && (
              <>
                <Dialog.Title className="dialog-title">
                  {modal.stay.hotel.name}
                </Dialog.Title>
                <p className="dialog-subtitle">
                  <MapPin size={14} />
                  {modal.stay.hotel.address ?? modal.stay.search.cityName}
                </p>
                <div
                  className="detail-image"
                  style={{
                    backgroundImage: `url(${hotelImageFor(modal.stay)})`,
                  }}
                >
                  <span>Illustrative photograph</span>
                </div>
                <div className="detail-facts">
                  <div>
                    <small>Your dates</small>
                    <strong>
                      {modal.stay.search.checkIn} → {modal.stay.search.checkOut}
                    </strong>
                  </div>
                  <div>
                    <small>Your people</small>
                    <strong>{modal.stay.search.adults} guests</strong>
                  </div>
                  <div>
                    <small>Stay total</small>
                    <strong>
                      {modal.stay.offer
                        ? money(
                            modal.stay.offer.price.total,
                            modal.stay.offer.price.currency,
                          )
                        : "Check availability"}
                    </strong>
                  </div>
                  <div>
                    <small>Your room</small>
                    <strong>
                      {modal.stay.offer?.room?.description ??
                        "Confirm with provider"}
                    </strong>
                  </div>
                </div>
                <div className="amenity-list">
                  {modal.stay.hotel.amenities?.map((a) => (
                    <span key={a}>{a.replace(/_/g, " ").toLowerCase()}</span>
                  ))}
                </div>
                <p className="detail-notice">
                  {modal.stay.isMock
                    ? "This is a sample property with an illustrative price, not a real booking offer. Search real accommodation at this destination with the provider."
                    : "This is a search handoff, not a reservation. Confirm the property, final price, occupancy, and cancellation terms directly with the provider."}
                </p>
                <div className="dialog-actions">
                  <button
                    className="secondary-button"
                    onClick={() => toggleSave(modal.stay)}
                  >
                    <Heart size={15} />
                    {workspace.saved.some((s) => s.id === modal.stay.id)
                      ? "Remove saved stay"
                      : "Save stay"}
                  </button>
                  {modal.stay.isMock ? (
                    <a
                      className="primary-button"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://www.booking.com/searchresults.html?${new URLSearchParams({ ss: modal.stay.search.cityName, checkin: modal.stay.search.checkIn, checkout: modal.stay.search.checkOut, group_adults: String(modal.stay.search.adults) })}`}
                    >
                      Find real stays <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    <ProviderLink stay={modal.stay} />
                  )}
                </div>
              </>
            )}
            {modal?.type === "settings" && (
              <>
                <Dialog.Title className="dialog-title">
                  Your travel space
                </Dialog.Title>
                <p className="dialog-subtitle">
                  A few things to make yourself at home.
                </p>
                <div className="settings-box">
                  <ShieldCheck size={22} />
                  <div>
                    <h3>Personal. On this device.</h3>
                    <p>
                      Your conversations, saved stays, and itineraries live in
                      this browser. They aren’t synced across devices. Export a
                      backup to keep them safe.
                    </p>
                  </div>
                </div>
                <div className="settings-stats">
                  <span>
                    <strong>{workspace.trips.length}</strong> trips
                  </span>
                  <span>
                    <strong>{workspace.saved.length}</strong> saved stays
                  </span>
                  <span>
                    <strong>{workspace.folders.length}</strong> folders
                  </span>
                </div>
                <div className="settings-box">
                  <Sparkles size={22} />
                  <div>
                    <h3>Niva, at your pace</h3>
                    <p>
                      Basic planning understands supported destinations, dates,
                      guests, budgets, stars, and amenities. AI conversation is
                      enabled when the server has an OpenAI key. Hotel search
                      uses labeled samples until Amadeus is configured.
                    </p>
                  </div>
                </div>
                <div className="dialog-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      download(
                        "goniva-backup.json",
                        JSON.stringify(workspace, null, 2),
                      )
                    }
                  >
                    <ArrowDownToLine size={15} /> Export backup
                  </button>
                  <label className="primary-button import-label">
                    Restore backup
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          if (file.size > 5_000_000)
                            throw new Error("Backup must be smaller than 5 MB");
                          const restored = workspaceSchema.parse(
                            JSON.parse(await file.text()),
                          );
                          if (
                            !window.confirm(
                              "Replace the trips and stays on this device with this backup?",
                            )
                          )
                            return;
                          setWorkspace(restored);
                          clearStorageError();
                          setActiveId(null);
                          setCompare([]);
                          toast.success("Your travel space is restored");
                          setModal(null);
                        } catch {
                          toast.error("This file isn’t a valid GoNiva backup");
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
              </>
            )}
            {modal?.type === "trip" &&
              (() => {
                const t = workspace.trips.find((t) => t.id === modal.id);
                return t ? (
                  <>
                    <Dialog.Title className="dialog-title">
                      A place for your plans
                    </Dialog.Title>
                    <form
                      className="modal-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = new FormData(e.currentTarget);
                        const title = field(form, "title").trim();
                        if (!title) return;
                        updateTrip(t.id, (v) => ({
                          ...v,
                          title,
                          folder: field(form, "folder"),
                          pinned: form.get("pinned") === "on",
                        }));
                        setModal(null);
                        toast.success("Trip updated");
                      }}
                    >
                      <label>
                        Trip name
                        <input
                          name="title"
                          defaultValue={t.title}
                          required
                          maxLength={80}
                        />
                      </label>
                      <label>
                        Folder
                        <select name="folder" defaultValue={t.folder}>
                          <option value="">No folder</option>
                          {workspace.folders.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="pinned"
                          defaultChecked={t.pinned}
                        />
                        <Pin size={14} /> Pin this conversation
                      </label>
                      <div className="dialog-actions">
                        <button
                          type="button"
                          className="text-button danger"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete “${t.title}” and its conversation and itinerary? Saved stays will remain.`,
                              )
                            ) {
                              setWorkspace((w) => ({
                                ...w,
                                trips: w.trips.filter((v) => v.id !== t.id),
                              }));
                              if (activeId === t.id) setActiveId(null);
                              setModal(null);
                              toast.success("Trip deleted");
                            }
                          }}
                        >
                          <Trash2 size={15} /> Delete trip
                        </button>
                        <button className="primary-button">
                          Save changes <Check size={15} />
                        </button>
                      </div>
                    </form>
                  </>
                ) : null;
              })()}
            {modal?.type === "activity" && (
              <>
                <Dialog.Title className="dialog-title">
                  {modal.activity
                    ? "A little change of plans"
                    : "Make time for something good"}
                </Dialog.Title>
                <ActivityForm
                  activity={modal.activity}
                  day={modal.day}
                  onSave={(a) => {
                    updateTrip(modal.tripId, (t) => ({
                      ...t,
                      activities: modal.activity
                        ? t.activities.map((v) => (v.id === a.id ? a : v))
                        : [...t.activities, a],
                    }));
                    setModal(null);
                  }}
                />
              </>
            )}
            {modal?.type === "compare" && (
              <>
                <Dialog.Title className="dialog-title">
                  Find your favorite.
                </Dialog.Title>
                <p className="dialog-subtitle">
                  A little perspective makes the choice easier.
                </p>
                <div className="comparison-scroll">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th scope="col">Your shortlist</th>
                        {comparison.map((s) => (
                          <th scope="col" key={s.id}>
                            {s.hotel.name}
                            <small>
                              {s.search.cityName} {s.isMock && "· Sample"}
                            </small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: "Travel dates",
                          value: (s: SavedStay) =>
                            `${s.search.checkIn} → ${s.search.checkOut}`,
                        },
                        {
                          label: "Guests",
                          value: (s: SavedStay) => String(s.search.adults),
                        },
                        {
                          label: "Stars",
                          value: (s: SavedStay) =>
                            s.hotel.rating
                              ? `${s.hotel.rating} stars`
                              : "Unrated",
                        },
                        {
                          label: "Per night",
                          value: (s: SavedStay) =>
                            s.offer
                              ? money(
                                  Number(s.offer.price.total) /
                                    nights(s.search.checkIn, s.search.checkOut),
                                  s.offer.price.currency,
                                )
                              : "Not quoted",
                        },
                        {
                          label: "Stay total",
                          value: (s: SavedStay) =>
                            s.offer
                              ? money(
                                  s.offer.price.total,
                                  s.offer.price.currency,
                                )
                              : "Not quoted",
                        },
                        {
                          label: "Amenities",
                          value: (s: SavedStay) =>
                            s.hotel.amenities
                              ?.map((a) => a.toLowerCase())
                              .join(", ") ?? "Confirm with provider",
                        },
                        {
                          label: "Room",
                          value: (s: SavedStay) =>
                            s.offer?.room?.description ??
                            "Confirm with provider",
                        },
                        {
                          label: "Cancellation",
                          value: (s: SavedStay) =>
                            s.isMock
                              ? "Illustrative terms only"
                              : "Confirm with provider",
                        },
                      ].map((row) => (
                        <tr key={row.label}>
                          <th scope="row">{row.label}</th>
                          {comparison.map((s) => (
                            <td key={s.id}>{row.value(s)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="detail-notice">
                  Totals reflect each stay’s dates and guest count. Different
                  dates or occupancy may affect the comparison. Sample prices
                  are illustrative.
                </p>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <nav
        className="mobile-bottom-nav"
        aria-label="Quick navigation"
        inert={mobile}
      >
        {(
          [
            { id: "explore", label: "Discover", Icon: Compass },
            { id: "saved", label: "Saved", Icon: Heart },
            { id: "trips", label: "Trips", Icon: CalendarDays },
            { id: "cards", label: "Card perks", Icon: CreditCard },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            className={view === id ? "selected" : ""}
            aria-current={view === id ? "page" : undefined}
            onClick={() => nav(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
            {id === "saved" && workspace.saved.length > 0 && (
              <b>{workspace.saved.length}</b>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  emphasis,
  description,
}: {
  eyebrow: string;
  title: string;
  emphasis: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">✦ {eyebrow}</p>
      <h1>
        {title} <em>{emphasis}</em>
      </h1>
      <p>{description}</p>
    </div>
  );
}
function Empty({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-panel">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="secondary-button" onClick={onAction}>
          {action}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
function ActivityForm({
  activity,
  day,
  onSave,
}: {
  activity?: Activity;
  day: number;
  onSave: (a: Activity) => void;
}) {
  return (
    <form
      className="modal-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          id: activity?.id ?? uid(),
          day,
          time: field(f, "time"),
          title: field(f, "title").trim(),
          notes: field(f, "notes").trim(),
        });
      }}
    >
      <p className="dialog-subtitle">Day {day} · Your itinerary</p>
      <label>
        Activity
        <input
          name="title"
          defaultValue={activity?.title}
          required
          maxLength={150}
        />
      </label>
      <label>
        Time
        <input
          type="time"
          name="time"
          required
          defaultValue={activity?.time ?? "10:00"}
        />
      </label>
      <label>
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={activity?.notes}
          maxLength={1000}
          placeholder="A reservation, a reminder, or a little inspiration…"
        />
      </label>
      <button className="primary-button">
        Save activity <Check size={15} />
      </button>
    </form>
  );
}
import { hotelImage } from "~/lib/travel/model";
function hotelImageFor(s: SavedStay) {
  return hotelImage(s.hotel.hotelId);
}

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

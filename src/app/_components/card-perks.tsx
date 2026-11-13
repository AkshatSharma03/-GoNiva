"use client";
import { useState } from "react";
import { ArrowUpRight, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import {
  cards,
  cardPrograms,
  estimateCardBenefit,
  minimumNights,
  type CardId,
} from "~/lib/travel/cards";
import { money, nights, today, type Search } from "~/lib/travel/model";
export function CardPerks({
  selected,
  onChange,
  search,
}: {
  selected: CardId[];
  onChange: (ids: CardId[]) => void;
  search: Search;
}) {
  const [query, setQuery] = useState("");
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [eligible, setEligible] = useState<Record<string, boolean>>({});
  const programs = cardPrograms.filter((p) => selected.includes(p.cardId));
  const count = nights(search.checkIn, search.checkOut),
    date = today();
  const estimates = programs.map((p) => ({
    program: p,
    estimate:
      quotes[p.id] && balances[p.pool] !== undefined && balances[p.pool] !== ""
        ? estimateCardBenefit(p, {
            nights: count,
            bookingDate: date,
            quote: Number(quotes[p.id]),
            remaining: Number(balances[p.pool]),
            eligible: eligible[p.id] ?? false,
          })
        : null,
  }));
  const ranked = estimates
    .filter((e) => e.estimate !== null)
    .sort((a, b) => a.estimate!.net - b.estimate!.net);
  return (
    <section className="card-perks-page">
      <div className="page-heading">
        <p className="eyebrow">
          ✦ THE CARDS YOU HAVE. A LITTLE MORE POSSIBILITY.
        </p>
        <h1>
          Your cards. Your <em>travel perks.</em>
        </h1>
        <p>
          Find the booking paths worth checking before you choose your stay.
        </p>
      </div>
      <div className="card-privacy">
        <ShieldCheck size={19} />
        <p>
          Choose the card product you already own. We never need your card
          number, security code, bank login, or account details. This catalog
          currently covers four U.S. consumer cards.
        </p>
      </div>
      <div className="card-selector">
        <div className="section-heading">
          <div>
            <h2>
              What’s in your <em>wallet?</em>
            </h2>
            <p>You can also tell Niva “I have Amex Platinum.”</p>
          </div>
          <input
            aria-label="Find your credit card"
            placeholder="Find a card by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="owned-cards">
          {cards
            .filter((c) =>
              `${c.name} ${c.issuer}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c) => (
              <button
                key={c.id}
                className={`owned-card ${selected.includes(c.id) ? "selected" : ""}`}
                aria-pressed={selected.includes(c.id)}
                onClick={() =>
                  onChange(
                    selected.includes(c.id)
                      ? selected.filter((id) => id !== c.id)
                      : [...selected, c.id],
                  )
                }
              >
                <CreditCard size={23} />
                <span>
                  <small>{c.issuer}</small>
                  <strong>{c.name}</strong>
                </span>
                <span className="owned-card-check">
                  {selected.includes(c.id) ? "✓" : "+"}
                </span>
              </button>
            ))}
        </div>
        {query &&
          !cards.some((c) =>
            `${c.name} ${c.issuer}`.toLowerCase().includes(query.toLowerCase()),
          ) && (
            <p className="detail-notice">
              That card isn’t in the verified catalog yet. We won’t invent
              benefits for unsupported cards.
            </p>
          )}
      </div>
      {selected.length > 0 ? (
        <>
          <div className="perk-trip-context">
            <Sparkles size={16} />
            <span>
              Comparing for <strong>{search.cityName}</strong> · {count} nights
              · {search.adults} guests
            </span>
            <small>Change your trip in Discover</small>
          </div>
          <p className="data-notice">
            Issuer portals require sign-in for personalized prices. Enter
            comparable USD totals, including taxes and fees, from each portal.
            Only confirm eligibility after checking the exact property, room,
            payment terms, and available credit. These calculations compare the
            quotes you provide; they do not search member-only inventory.
          </p>
          {ranked.length > 0 && (
            <div className="perk-ranking">
              <p className="eyebrow">
                LOWEST ESTIMATED ROOM COST AMONG YOUR ENTERED QUOTES
              </p>
              <h3>
                {ranked[0]!.program.name}{" "}
                <strong>{money(ranked[0]!.estimate!.net)}</strong>
              </h3>
              <p>
                After {money(ranked[0]!.estimate!.credit)} of entered eligible
                credit. Confirmed property-spend perks and points are separate.
                No credits are added together.
              </p>
            </div>
          )}
          <div className="perk-grid">
            {estimates.map(({ program: p, estimate }) => {
              const min = minimumNights(p, date),
                tooShort = count < min,
                stale =
                  Date.parse(date) - Date.parse(p.checkedAt) > 30 * 86400000;
              return (
                <article className="perk-card" key={p.id}>
                  <p className="eyebrow">
                    {cards.find((c) => c.id === p.cardId)?.name}
                  </p>
                  <h2>{p.name}</h2>
                  <div className="perk-credit">
                    Up to <strong>{money(p.creditCap)}</strong>
                    <span>{p.creditPeriod}</span>
                  </div>
                  <p className="perk-conditions">{p.conditions}</p>
                  <div className="amenity-list">
                    {p.perks.map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </div>
                  <p
                    className={`perk-eligibility ${tooShort ? "form-error" : ""}`}
                  >
                    {tooShort
                      ? `Your ${count}-night stay is too short. This program requires ${min} nights.`
                      : `Stay-length rule met · ${min}-night minimum. Property eligibility still needs verification.`}
                  </p>
                  <div className="perk-inputs">
                    <label>
                      Portal total, incl. taxes · USD
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        aria-label={`${p.name} portal quote`}
                        placeholder="Enter actual quote"
                        value={quotes[p.id] ?? ""}
                        onChange={(e) =>
                          setQuotes((v) => ({ ...v, [p.id]: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Unused eligible credit · USD
                      <input
                        type="number"
                        min="0"
                        max={p.poolCap}
                        step="0.01"
                        aria-label={`${p.name} remaining credit`}
                        placeholder="Check your account"
                        value={balances[p.pool] ?? ""}
                        onChange={(e) =>
                          setBalances((v) => ({
                            ...v,
                            [p.pool]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="perk-confirm">
                    <input
                      type="checkbox"
                      checked={eligible[p.id] ?? false}
                      disabled={tooShort}
                      onChange={(e) =>
                        setEligible((v) => ({ ...v, [p.id]: e.target.checked }))
                      }
                    />
                    I verified this booking qualifies and the credit is
                    available.
                  </label>
                  {estimate ? (
                    <div className="perk-estimate">
                      <span>Estimated room cost after credit</span>
                      <strong>{money(estimate.net)}</strong>
                      <small>
                        {money(estimate.credit)} credit applied · No
                        property-spend credit or points deducted
                      </small>
                    </div>
                  ) : (
                    <div className="perk-pending">
                      {tooShort
                        ? "Not eligible for this trip length"
                        : "Add a portal quote, unused balance, and eligibility confirmation to compare."}
                    </div>
                  )}
                  <div className="perk-source">
                    <a
                      href={p.source}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Official terms <ArrowUpRight size={12} />
                    </a>
                    <span>
                      {stale ? "Needs rechecking · " : "Reviewed · "}
                      {p.checkedAt}
                    </span>
                  </div>
                  <a
                    className="secondary-button"
                    href={p.portal}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Check issuer portal <ArrowUpRight size={14} />
                  </a>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-panel">
          <CreditCard />
          <h3>Your next trip may already have a little extra.</h3>
          <p>
            Select a card to see its booking programs and compare eligible
            credits.
          </p>
        </div>
      )}
    </section>
  );
}

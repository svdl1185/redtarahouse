"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { formatMoney } from "@/lib/dates";
import type { QuoteResult } from "@/lib/types";

type AvailabilityPayload = {
  settings: {
    weekdayRateCents: number;
    weekendRateCents: number;
    minNights: number;
    maxNights: number;
    maxGuests: number;
    maxPets: number;
    currency: string;
  };
  occupied: { startDate: string; endDate: string }[];
};

function overlaps(
  checkIn: string,
  checkOut: string,
  occupied: AvailabilityPayload["occupied"],
) {
  return occupied.some((r) => checkIn < r.endDate && checkOut > r.startDate);
}

export function BookingForm() {
  const router = useRouter();
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(
    null,
  );
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [pets, setPets] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/quote")
      .then((r) => r.json())
      .then((data) => setAvailability(data))
      .catch(() => setError("Unable to load availability"));
  }, []);

  const maxGuests = availability?.settings.maxGuests ?? 10;
  const maxPets = availability?.settings.maxPets ?? 2;

  const dateConflict = useMemo(() => {
    if (!checkIn || !checkOut || !availability) return false;
    return overlaps(checkIn, checkOut, availability.occupied);
  }, [checkIn, checkOut, availability]);

  const refreshQuote = useCallback(async () => {
    if (!checkIn || !checkOut) {
      setQuote(null);
      return;
    }
    setLoadingQuote(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn, checkOut, guests, pets }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuote(null);
        setError(data.error || "Unable to quote");
        return;
      }
      setQuote(data.quote);
    } catch {
      setError("Unable to quote stay");
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, [checkIn, checkOut, guests, pets]);

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshQuote();
    }, 250);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn,
          checkOut,
          guests,
          pets,
          guestName,
          guestEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
        return;
      }
      router.push(data.redirect || `/book/requested?booking=${data.bookingId}`);
    } catch {
      setError("Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section book-section">
      <div className="section-heading">
        <p className="eyebrow">Stay with us</p>
        <h2>Reservation</h2>
        <p>
          Request your dates — we review each stay, then send a secure payment
          link when approved.
        </p>
      </div>

      <form className="booking-form" onSubmit={onSubmit}>
        <div className="booking-grid">
          <label>
            <span>Check-in</span>
            <input
              type="date"
              required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>
          <label>
            <span>Checkout</span>
            <input
              type="date"
              required
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>
          <label>
            <span>Guests</span>
            <input
              type="number"
              min={1}
              max={maxGuests}
              required
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            />
          </label>
          <label>
            <span>Pets</span>
            <input
              type="number"
              min={0}
              max={maxPets}
              value={pets}
              onChange={(e) => setPets(Number(e.target.value))}
            />
          </label>
          <label className="span-2">
            <span>Full name</span>
            <input
              type="text"
              required
              autoComplete="name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </label>
          <label className="span-2">
            <span>Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </label>
        </div>

        <div className="booking-quote" aria-live="polite">
          {loadingQuote && <p className="muted">Calculating…</p>}
          {!loadingQuote && quote && (
            <>
              <h3 className="quote-grid-title">Nightly rates</h3>
              <div className="night-price-grid" role="list">
                {quote.nightBreakdown.map((night) => {
                  const discounted =
                    night.discountedRateCents < night.rateCents;
                  return (
                    <div
                      key={night.date}
                      className={`night-price-cell${night.isWeekend ? " is-weekend" : ""}${discounted ? " is-discounted" : ""}`}
                      role="listitem"
                    >
                      <span className="night-price-day">
                        {format(parseISO(night.date), "EEE")}
                      </span>
                      <span className="night-price-date">
                        {format(parseISO(night.date), "MMM d")}
                      </span>
                      {discounted && (
                        <span className="night-price-was">
                          {formatMoney(night.rateCents, quote.currency)}
                        </span>
                      )}
                      <strong className="night-price-amount">
                        {formatMoney(
                          night.discountedRateCents,
                          quote.currency,
                        )}
                      </strong>
                    </div>
                  );
                })}
              </div>
              <ul className="quote-lines">
                {quote.lines.map((line) => (
                  <li key={line.label}>
                    <span>{line.label}</span>
                    <strong>
                      {formatMoney(line.amountCents, quote.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
              <p className="quote-total">
                <span>Total</span>
                <strong>{formatMoney(quote.totalCents, quote.currency)}</strong>
              </p>
              <p className="muted">
                Submitting requests a stay. Payment is only collected after we
                approve.
              </p>
            </>
          )}
          {dateConflict && (
            <p className="form-error">Those dates are not available.</p>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>

        <button
          className="button booking-submit"
          type="submit"
          disabled={submitting || !quote || Boolean(error) || dateConflict}
        >
          {submitting ? "Sending request…" : "Request reservation"}
        </button>
      </form>
    </section>
  );
}

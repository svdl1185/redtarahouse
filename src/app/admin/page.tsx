"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ListingSettings } from "@/lib/types";
import { formatMoney } from "@/lib/dates";

type Booking = {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  pets: number;
  guestName: string;
  guestEmail: string;
  totalCents: number;
  currency: string;
  status: string;
  createdAt: string;
};

type Block = {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
};

type Override = {
  id: string;
  startDate: string;
  endDate: string;
  weekdayRate: number;
  weekendRate: number;
  note: string | null;
};

type IcalSource = {
  id: string;
  name: string;
  url: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  _count: { blocks: number };
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dollarsToCents(value: string): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<ListingSettings | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [sources, setSources] = useState<IcalSource[]>([]);
  const [outboundUrl, setOutboundUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockNote, setBlockNote] = useState("");
  const [overrideForm, setOverrideForm] = useState({
    startDate: "",
    endDate: "",
    weekdayRate: "700",
    weekendRate: "900",
    note: "",
  });
  const [icalForm, setIcalForm] = useState({ name: "", url: "" });

  const loadAll = useCallback(async () => {
    const auth = await fetch("/api/admin/auth").then((r) => r.json());
    if (!auth.isAdmin) {
      router.replace("/admin/login");
      return;
    }

    const [s, b, bl, o, i] = await Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/bookings").then((r) => r.json()),
      fetch("/api/admin/blocks").then((r) => r.json()),
      fetch("/api/admin/overrides").then((r) => r.json()),
      fetch("/api/admin/ical").then((r) => r.json()),
    ]);

    setSettings(s.settings);
    setBookings(b.bookings || []);
    setBlocks(bl.blocks || []);
    setOverrides(o.overrides || []);
    setSources(i.sources || []);
    setOutboundUrl(i.outboundUrl || "");
    setReady(true);
  }, [router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save settings");
      return;
    }
    setSettings(data.settings);
    setMessage("Settings saved");
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  }

  async function bookingAction(
    id: string,
    action: "approve" | "decline" | "cancel",
    refund = false,
  ) {
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, refund }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Action failed");
      return;
    }
    if (action === "approve") {
      setMessage(
        data.paymentUrl
          ? `Approved — payment link created${data.paymentUrl ? ` (${data.paymentUrl})` : ""}`
          : "Approved",
      );
    } else if (action === "decline") {
      setMessage("Request declined");
    } else {
      setMessage(refund ? "Booking cancelled with refund" : "Booking cancelled");
    }
    await loadAll();
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: blockStart,
        endDate: blockEnd,
        note: blockNote || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add block");
      return;
    }
    setBlockStart("");
    setBlockEnd("");
    setBlockNote("");
    setMessage("Dates blocked");
    await loadAll();
  }

  async function addOverride(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: overrideForm.startDate,
        endDate: overrideForm.endDate,
        weekdayRate: dollarsToCents(overrideForm.weekdayRate),
        weekendRate: dollarsToCents(overrideForm.weekendRate),
        note: overrideForm.note || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add override");
      return;
    }
    setOverrideForm({
      startDate: "",
      endDate: "",
      weekdayRate: "700",
      weekendRate: "900",
      note: "",
    });
    setMessage("Rate override added");
    await loadAll();
  }

  async function addIcal(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/ical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(icalForm),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add calendar");
      return;
    }
    setIcalForm({ name: "", url: "" });
    setMessage("Calendar source added");
    await loadAll();
  }

  async function syncIcal(id?: string) {
    const res = await fetch("/api/admin/ical", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Sync failed");
      return;
    }
    setMessage("Calendar sync complete");
    await loadAll();
  }

  if (!ready || !settings) {
    return (
      <main className="admin-shell">
        <p className="muted">Loading admin…</p>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <div className="admin-top">
        <div>
          <h1>Red Tara admin</h1>
          <p className="muted">Pricing, rules, calendars, and bookings</p>
        </div>
        <button className="button button-secondary" type="button" onClick={logout}>
          Log out
        </button>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <form className="admin-card" onSubmit={saveSettings}>
        <h2>Rates and fees</h2>
        <div className="admin-grid">
          <label>
            <span>Weekday rate ($)</span>
            <input
              type="number"
              step="0.01"
              value={centsToDollars(settings.weekdayRateCents)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  weekdayRateCents: dollarsToCents(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Fri/Sat rate ($)</span>
            <input
              type="number"
              step="0.01"
              value={centsToDollars(settings.weekendRateCents)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  weekendRateCents: dollarsToCents(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Cleaning fee ($)</span>
            <input
              type="number"
              step="0.01"
              value={centsToDollars(settings.cleaningFeeCents)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  cleaningFeeCents: dollarsToCents(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Short-stay cleaning ($)</span>
            <input
              type="number"
              step="0.01"
              value={
                settings.shortStayCleaningFeeCents == null
                  ? ""
                  : centsToDollars(settings.shortStayCleaningFeeCents)
              }
              placeholder="Optional"
              onChange={(e) =>
                setSettings({
                  ...settings,
                  shortStayCleaningFeeCents: e.target.value
                    ? dollarsToCents(e.target.value)
                    : null,
                })
              }
            />
          </label>
          <label>
            <span>Short-stay night threshold</span>
            <input
              type="number"
              value={settings.shortStayNightsThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  shortStayNightsThreshold: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Pet fee ($)</span>
            <input
              type="number"
              step="0.01"
              value={centsToDollars(settings.petFeeCents)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  petFeeCents: dollarsToCents(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Pet fee mode</span>
            <select
              value={settings.petFeeMode}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  petFeeMode: e.target.value as ListingSettings["petFeeMode"],
                })
              }
            >
              <option value="per_stay">Per stay</option>
              <option value="per_pet">Per pet</option>
              <option value="per_pet_night">Per pet per night</option>
            </select>
          </label>
          <label>
            <span>Included guests</span>
            <input
              type="number"
              value={settings.includedGuests}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  includedGuests: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Extra guest fee / night ($)</span>
            <input
              type="number"
              step="0.01"
              value={centsToDollars(settings.extraGuestFeeCents)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  extraGuestFeeCents: dollarsToCents(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Tax percent</span>
            <input
              type="number"
              step="0.01"
              value={settings.taxPercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  taxPercent: Number(e.target.value),
                })
              }
            />
          </label>
        </div>

        <h3>Trip length and availability</h3>
        <div className="admin-grid">
          <label>
            <span>Min nights</span>
            <input
              type="number"
              value={settings.minNights}
              onChange={(e) =>
                setSettings({ ...settings, minNights: Number(e.target.value) })
              }
            />
          </label>
          <label>
            <span>Max nights</span>
            <input
              type="number"
              value={settings.maxNights}
              onChange={(e) =>
                setSettings({ ...settings, maxNights: Number(e.target.value) })
              }
            />
          </label>
          <label>
            <span>Max guests</span>
            <input
              type="number"
              value={settings.maxGuests}
              onChange={(e) =>
                setSettings({ ...settings, maxGuests: Number(e.target.value) })
              }
            />
          </label>
          <label>
            <span>Max pets</span>
            <input
              type="number"
              value={settings.maxPets}
              onChange={(e) =>
                setSettings({ ...settings, maxPets: Number(e.target.value) })
              }
            />
          </label>
          <label>
            <span>Advance notice (days)</span>
            <input
              type="number"
              value={settings.advanceNoticeDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  advanceNoticeDays: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Prep nights before</span>
            <input
              type="number"
              value={settings.prepDaysBefore}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  prepDaysBefore: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Prep nights after</span>
            <input
              type="number"
              value={settings.prepDaysAfter}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  prepDaysAfter: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Availability window (months)</span>
            <input
              type="number"
              value={settings.availabilityWindowMonths}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  availabilityWindowMonths: Number(e.target.value),
                })
              }
            />
          </label>
        </div>

        <h3>Min nights by check-in day (0 = use global min)</h3>
        <div className="admin-grid seven">
          {WEEKDAYS.map((day, idx) => (
            <label key={day}>
              <span>{day}</span>
              <input
                type="number"
                value={settings.minNightsByCheckInDay[idx] ?? 0}
                onChange={(e) => {
                  const next = [...settings.minNightsByCheckInDay];
                  next[idx] = Number(e.target.value);
                  setSettings({ ...settings, minNightsByCheckInDay: next });
                }}
              />
            </label>
          ))}
        </div>

        <h3>Promos</h3>
        <div className="admin-grid">
          <label>
            <span>Last-minute window (days)</span>
            <input
              type="number"
              value={settings.lastMinuteDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  lastMinuteDays: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Last-minute discount %</span>
            <input
              type="number"
              value={settings.lastMinutePercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  lastMinutePercent: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Early-bird after (days)</span>
            <input
              type="number"
              value={settings.earlyBirdDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  earlyBirdDays: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Early-bird discount %</span>
            <input
              type="number"
              value={settings.earlyBirdPercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  earlyBirdPercent: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Long stay after (nights)</span>
            <input
              type="number"
              value={settings.longStayNights}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  longStayNights: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Long stay discount %</span>
            <input
              type="number"
              value={settings.longStayPercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  longStayPercent: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Extended stay after (nights)</span>
            <input
              type="number"
              value={settings.extendedStayNights}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  extendedStayNights: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Extended stay discount %</span>
            <input
              type="number"
              value={settings.extendedStayPercent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  extendedStayPercent: Number(e.target.value),
                })
              }
            />
          </label>
        </div>
        <p className="muted">
          Last-minute applies when check-in is within the window; early-bird when
          farther out than the early-bird threshold (not both). Extended stay
          replaces long stay when both thresholds are met. Discounts apply to
          night rates before fees.
        </p>

        <button className="button" type="submit">
          Save settings
        </button>
      </form>

      <section className="admin-card">
        <h2>Rate overrides</h2>
        <form className="admin-grid" onSubmit={addOverride}>
          <label>
            <span>Start</span>
            <input
              type="date"
              required
              value={overrideForm.startDate}
              onChange={(e) =>
                setOverrideForm({ ...overrideForm, startDate: e.target.value })
              }
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="date"
              required
              value={overrideForm.endDate}
              onChange={(e) =>
                setOverrideForm({ ...overrideForm, endDate: e.target.value })
              }
            />
          </label>
          <label>
            <span>Weekday $</span>
            <input
              type="number"
              step="0.01"
              required
              value={overrideForm.weekdayRate}
              onChange={(e) =>
                setOverrideForm({ ...overrideForm, weekdayRate: e.target.value })
              }
            />
          </label>
          <label>
            <span>Fri/Sat $</span>
            <input
              type="number"
              step="0.01"
              required
              value={overrideForm.weekendRate}
              onChange={(e) =>
                setOverrideForm({ ...overrideForm, weekendRate: e.target.value })
              }
            />
          </label>
          <label className="span-2">
            <span>Note</span>
            <input
              value={overrideForm.note}
              onChange={(e) =>
                setOverrideForm({ ...overrideForm, note: e.target.value })
              }
            />
          </label>
          <button className="button" type="submit">
            Add override
          </button>
        </form>
        <ul className="admin-list">
          {overrides.map((o) => (
            <li key={o.id}>
              <span>
                {o.startDate} → {o.endDate}: weekday{" "}
                {formatMoney(o.weekdayRate)}, weekend{" "}
                {formatMoney(o.weekendRate)}
                {o.note ? ` (${o.note})` : ""}
              </span>
              <button
                type="button"
                className="linkish"
                onClick={async () => {
                  await fetch(`/api/admin/overrides?id=${o.id}`, {
                    method: "DELETE",
                  });
                  await loadAll();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Manual blocks</h2>
        <form className="admin-grid" onSubmit={addBlock}>
          <label>
            <span>Start</span>
            <input
              type="date"
              required
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
            />
          </label>
          <label>
            <span>End (checkout exclusive)</span>
            <input
              type="date"
              required
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
            />
          </label>
          <label className="span-2">
            <span>Note</span>
            <input
              value={blockNote}
              onChange={(e) => setBlockNote(e.target.value)}
            />
          </label>
          <button className="button" type="submit">
            Block dates
          </button>
        </form>
        <ul className="admin-list">
          {blocks.map((b) => (
            <li key={b.id}>
              <span>
                {b.startDate} → {b.endDate}
                {b.note ? ` — ${b.note}` : ""}
              </span>
              <button
                type="button"
                className="linkish"
                onClick={async () => {
                  await fetch(`/api/admin/blocks?id=${b.id}`, {
                    method: "DELETE",
                  });
                  await loadAll();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>OTA calendar sync</h2>
        <p className="muted">
          Paste export iCal URLs from Airbnb, Booking.com, and VRBO here. Then
          import our outbound feed into each platform:
        </p>
        <p>
          <code>{outboundUrl}</code>
        </p>
        <form className="admin-grid" onSubmit={addIcal}>
          <label>
            <span>Name</span>
            <input
              required
              placeholder="Airbnb"
              value={icalForm.name}
              onChange={(e) => setIcalForm({ ...icalForm, name: e.target.value })}
            />
          </label>
          <label className="span-2">
            <span>iCal URL</span>
            <input
              required
              type="url"
              value={icalForm.url}
              onChange={(e) => setIcalForm({ ...icalForm, url: e.target.value })}
            />
          </label>
          <button className="button" type="submit">
            Add source
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => syncIcal()}
          >
            Sync all now
          </button>
        </form>
        <ul className="admin-list">
          {sources.map((s) => (
            <li key={s.id}>
              <span>
                <strong>{s.name}</strong> · {s._count.blocks} blocks
                {s.lastSyncedAt
                  ? ` · synced ${new Date(s.lastSyncedAt).toLocaleString()}`
                  : ""}
                {s.lastError ? ` · error: ${s.lastError}` : ""}
              </span>
              <span className="admin-actions">
                <button type="button" className="linkish" onClick={() => syncIcal(s.id)}>
                  Sync
                </button>
                <button
                  type="button"
                  className="linkish"
                  onClick={async () => {
                    await fetch(`/api/admin/ical?id=${s.id}`, {
                      method: "DELETE",
                    });
                    await loadAll();
                  }}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Bookings</h2>
        <ul className="admin-list">
          {bookings.length === 0 && <li>No bookings yet.</li>}
          {bookings.map((b) => (
            <li key={b.id} className="booking-row">
              <div>
                <strong>
                  {b.guestName} · {b.status}
                </strong>
                <div className="muted">
                  {b.checkIn} → {b.checkOut} · {b.guests} guests · {b.pets} pets
                  · {formatMoney(b.totalCents, b.currency)}
                </div>
                <div className="muted">{b.guestEmail}</div>
              </div>
              <span className="admin-actions">
                {b.status === "requested" && (
                  <>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => bookingAction(b.id, "approve")}
                    >
                      Approve + send payment
                    </button>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => bookingAction(b.id, "decline")}
                    >
                      Decline
                    </button>
                  </>
                )}
                {b.status === "awaiting_payment" && (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => bookingAction(b.id, "decline")}
                  >
                    Cancel request
                  </button>
                )}
                {b.status === "confirmed" && (
                  <>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => bookingAction(b.id, "cancel", false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => bookingAction(b.id, "cancel", true)}
                    >
                      Cancel + refund
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

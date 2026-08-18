"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PayClient() {
  const params = useSearchParams();
  const bookingId = params.get("booking") || "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startPayment() {
    if (!bookingId) {
      setError("Missing booking");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to start payment");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No payment URL returned");
    } catch {
      setError("Unable to start payment");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bookingId) {
      void startPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  return (
    <main className="success-page">
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Payment</p>
          <h2>Complete your booking</h2>
          <p className="muted">
            {loading
              ? "Redirecting to secure checkout…"
              : "If you were not redirected, use the button below."}
          </p>
          {error && <p className="form-error">{error}</p>}
          <p>
            <button
              className="button"
              type="button"
              disabled={loading || !bookingId}
              onClick={() => void startPayment()}
            >
              {loading ? "Opening Stripe…" : "Pay now"}
            </button>
          </p>
          <p>
            <Link href="/">Back home</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

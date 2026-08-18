import { addDays, addHours } from "date-fns";
import type { Booking } from "@prisma/client";
import { getStripe } from "./stripe";
import type { QuoteResult } from "./types";

export async function createPaymentCheckoutSession(booking: Booking) {
  const quote = JSON.parse(booking.quoteSnapshot) as QuoteResult;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: quote.currency,
          unit_amount: quote.totalCents,
          product_data: {
            name: "Stay at Red Tara Sanctuary",
            description: `${booking.checkIn} → ${booking.checkOut} · ${booking.guests} guest${booking.guests === 1 ? "" : "s"}${booking.pets ? ` · ${booking.pets} pet${booking.pets === 1 ? "" : "s"}` : ""}`,
          },
        },
      },
    ],
    metadata: {
      bookingId: booking.id,
    },
    success_url: `${siteUrl}/book/success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/book/pay?booking=${booking.id}`,
    expires_at: Math.floor(addHours(new Date(), 23).getTime() / 1000),
  });

  return session;
}

/** Soft-hold window while waiting for host approval. */
export function requestHoldUntil(): Date {
  return addDays(new Date(), 7);
}

/** Soft-hold while guest completes payment after approval. */
export function paymentHoldUntil(): Date {
  return addHours(new Date(), 24);
}

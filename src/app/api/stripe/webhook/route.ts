import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendBookingConfirmedToHost } from "@/lib/email";
import { getStripe } from "@/lib/stripe";
import type { QuoteResult } from "@/lib/types";
import type Stripe from "stripe";

export const runtime = "nodejs";

async function confirmBooking(bookingId: string, session: Stripe.Checkout.Session) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  if (booking.status === "confirmed") return;

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "confirmed",
      holdUntil: null,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? booking.stripePaymentIntentId,
    },
  });

  let quote: QuoteResult | null = null;
  try {
    quote = JSON.parse(updated.quoteSnapshot) as QuoteResult;
  } catch {
    quote = null;
  }

  if (quote) {
    try {
      await sendBookingConfirmedToHost({
        guestName: updated.guestName,
        guestEmail: updated.guestEmail,
        quote,
        bookingId: updated.id,
      });
    } catch (err) {
      console.error("Failed to send booking notification", err);
    }
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.includes("placeholder")) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      await confirmBooking(bookingId, session);
    }
  }

  return NextResponse.json({ received: true });
}

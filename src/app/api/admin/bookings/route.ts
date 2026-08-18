import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  sendDeclineToGuest,
  sendPaymentLinkToGuest,
} from "@/lib/email";
import {
  createPaymentCheckoutSession,
  paymentHoldUntil,
} from "@/lib/payments";
import { getAdminSession } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import type { QuoteResult } from "@/lib/types";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ bookings });
}

const actionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "decline", "cancel"]),
  refund: z.boolean().optional(),
});

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.id },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.action === "approve") {
    if (booking.status !== "requested") {
      return NextResponse.json(
        { error: "Only requested bookings can be approved" },
        { status: 400 },
      );
    }
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Configure Stripe before approving (needed for payment link)" },
        { status: 503 },
      );
    }

    let session;
    try {
      session = await createPaymentCheckoutSession(booking);
    } catch (err) {
      console.error(err);
      return NextResponse.json(
        { error: "Could not create payment link" },
        { status: 502 },
      );
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a payment URL" },
        { status: 502 },
      );
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "awaiting_payment",
        stripeSessionId: session.id,
        holdUntil: paymentHoldUntil(),
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
        await sendPaymentLinkToGuest({
          guestName: updated.guestName,
          guestEmail: updated.guestEmail,
          quote,
          bookingId: updated.id,
          paymentUrl: session.url,
        });
      } catch (err) {
        console.error("Failed to email payment link", err);
      }
    }

    return NextResponse.json({
      booking: updated,
      paymentUrl: session.url,
    });
  }

  if (parsed.data.action === "decline") {
    if (booking.status !== "requested" && booking.status !== "awaiting_payment") {
      return NextResponse.json(
        { error: "This booking cannot be declined" },
        { status: 400 },
      );
    }
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "declined", holdUntil: null },
    });
    try {
      await sendDeclineToGuest({
        guestName: updated.guestName,
        guestEmail: updated.guestEmail,
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
      });
    } catch (err) {
      console.error(err);
    }
    return NextResponse.json({ booking: updated });
  }

  // cancel
  if (parsed.data.refund && booking.stripePaymentIntentId && stripeConfigured()) {
    try {
      const stripe = getStripe();
      await stripe.refunds.create({
        payment_intent: booking.stripePaymentIntentId,
      });
    } catch (err) {
      console.error(err);
      return NextResponse.json(
        { error: "Refund failed. Booking was not cancelled." },
        { status: 502 },
      );
    }
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "cancelled", holdUntil: null },
  });

  return NextResponse.json({ booking: updated });
}

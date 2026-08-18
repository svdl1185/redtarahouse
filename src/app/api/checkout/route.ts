import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createPaymentCheckoutSession, paymentHoldUntil } from "@/lib/payments";
import { stripeConfigured } from "@/lib/stripe";

/** Guest resumes Stripe Checkout after host approval. */
export async function POST(request: Request) {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Payments are not configured yet." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
    if (!bookingId) {
      return NextResponse.json({ error: "Missing booking" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (booking.status !== "awaiting_payment") {
      return NextResponse.json(
        { error: "This booking is not ready for payment" },
        { status: 400 },
      );
    }

    const session = await createPaymentCheckoutSession(booking);
    if (!session.url) {
      return NextResponse.json({ error: "Unable to start payment" }, { status: 502 });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripeSessionId: session.id,
        holdUntil: paymentHoldUntil(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}

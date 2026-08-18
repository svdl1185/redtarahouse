import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/dates";
import { getStripe, stripeConfigured } from "@/lib/stripe";

type Props = {
  searchParams: Promise<{ booking?: string; session_id?: string }>;
};

export default async function BookingSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const bookingId = params.booking;
  const sessionId = params.session_id;

  let booking = bookingId
    ? await prisma.booking.findUnique({ where: { id: bookingId } })
    : null;

  if (
    booking &&
    (booking.status === "awaiting_payment" || booking.status === "pending") &&
    sessionId &&
    stripeConfigured()
  ) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid" && session.metadata?.bookingId === booking.id) {
        booking = await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "confirmed",
            holdUntil: null,
            stripeSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : undefined,
          },
        });
      }
    } catch {
      // webhook may still confirm
    }
  }

  return (
    <main className="success-page">
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Confirmed</p>
          <h2>
            {booking?.status === "confirmed"
              ? "Your stay is booked"
              : "Thanks — we are confirming your payment"}
          </h2>
          {booking ? (
            <p>
              {booking.guestName}, your reservation for{" "}
              <strong>
                {booking.checkIn} → {booking.checkOut}
              </strong>{" "}
              ({booking.guests} guest{booking.guests === 1 ? "" : "s"}
              {booking.pets
                ? `, ${booking.pets} pet${booking.pets === 1 ? "" : "s"}`
                : ""}
              ) totals{" "}
              <strong>
                {formatMoney(booking.totalCents, booking.currency)}
              </strong>
              . A receipt will come from Stripe to {booking.guestEmail}.
            </p>
          ) : (
            <p>
              We could not load this booking yet. If you were charged, email us
              with your Stripe receipt and we will sort it out.
            </p>
          )}
          <p>
            <Link className="button" href="/#sanctuary">
              Read the guest guide
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

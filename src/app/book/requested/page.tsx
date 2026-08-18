import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/dates";

type Props = {
  searchParams: Promise<{ booking?: string }>;
};

export default async function BookingRequestedPage({ searchParams }: Props) {
  const params = await searchParams;
  const booking = params.booking
    ? await prisma.booking.findUnique({ where: { id: params.booking } })
    : null;

  return (
    <main className="success-page">
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Request received</p>
          <h2>We will review your stay</h2>
          {booking ? (
            <p>
              Thanks, {booking.guestName}. Your request for{" "}
              <strong>
                {booking.checkIn} → {booking.checkOut}
              </strong>{" "}
              ({formatMoney(booking.totalCents, booking.currency)}) is waiting
              for host approval. We will email {booking.guestEmail} with a
              payment link if approved, or let you know if we cannot host these
              dates.
            </p>
          ) : (
            <p>
              Your request was submitted. Watch your email for an approval and
              payment link.
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

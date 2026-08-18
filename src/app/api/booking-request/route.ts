import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, isRangeAvailable } from "@/lib/availability";
import { prisma } from "@/lib/db";
import { sendBookingRequestToHost } from "@/lib/email";
import { requestHoldUntil } from "@/lib/payments";
import { computeQuote, validateStayRules } from "@/lib/pricing";
import { HOLDING_STATUSES } from "@/lib/types";

const bodySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(20),
  pets: z.number().int().min(0).max(5),
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email().max(200),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid booking details" }, { status: 400 });
    }

    const { checkIn, checkOut, guests, pets, guestName, guestEmail } = parsed.data;
    const settings = await getSettings();
    const ruleError = validateStayRules({ checkIn, checkOut, guests, pets, settings });
    if (ruleError) {
      return NextResponse.json({ error: ruleError }, { status: 400 });
    }

    const available = await isRangeAvailable(checkIn, checkOut);
    if (!available) {
      return NextResponse.json(
        { error: "Those dates are not available" },
        { status: 409 },
      );
    }

    const overrides = await prisma.rateOverride.findMany();
    const quote = computeQuote({
      checkIn,
      checkOut,
      guests,
      pets,
      settings,
      overrides: overrides.map((o) => ({
        startDate: o.startDate,
        endDate: o.endDate,
        weekdayRate: o.weekdayRate,
        weekendRate: o.weekendRate,
      })),
    });

    if (quote.totalCents < 50) {
      return NextResponse.json(
        { error: "Total must be at least $0.50" },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.create({
      data: {
        checkIn,
        checkOut,
        guests,
        pets,
        guestName,
        guestEmail,
        nightsSubtotal: quote.nightsSubtotal,
        cleaningFee: quote.cleaningFee,
        petFee: quote.petFee,
        extraGuestFee: quote.extraGuestFee,
        taxAmount: quote.taxAmount,
        totalCents: quote.totalCents,
        currency: quote.currency,
        status: "requested",
        holdUntil: requestHoldUntil(),
        quoteSnapshot: JSON.stringify(quote),
      },
    });

    const stillAvailable = await isRangeAvailable(checkIn, checkOut, {
      excludeBookingId: booking.id,
    });
    const otherHolds = await prisma.booking.findMany({
      where: {
        status: { in: [...HOLDING_STATUSES] },
        id: { not: booking.id },
        OR: [{ holdUntil: null }, { holdUntil: { gt: new Date() } }],
      },
    });
    const holdConflict = otherHolds.some(
      (b) => checkIn < b.checkOut && checkOut > b.checkIn,
    );

    if (!stillAvailable || holdConflict) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "expired" },
      });
      return NextResponse.json(
        { error: "Those dates were just taken. Please choose other dates." },
        { status: 409 },
      );
    }

    try {
      await sendBookingRequestToHost({
        guestName,
        guestEmail,
        quote,
        bookingId: booking.id,
      });
    } catch (err) {
      console.error("Failed to notify host", err);
    }

    return NextResponse.json({
      bookingId: booking.id,
      status: booking.status,
      redirect: `/book/requested?booking=${booking.id}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to submit booking request" },
      { status: 500 },
    );
  }
}

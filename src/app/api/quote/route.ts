import { NextResponse } from "next/server";
import { z } from "zod";
import { getOccupiedRanges, getSettings } from "@/lib/availability";
import { prisma } from "@/lib/db";
import { computeQuote, validateStayRules } from "@/lib/pricing";
import { addDaysISO, todayISO } from "@/lib/dates";

const bodySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(20),
  pets: z.number().int().min(0).max(5),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const settings = await getSettings();
    const ruleError = validateStayRules({ ...parsed.data, settings });
    if (ruleError) {
      return NextResponse.json({ error: ruleError }, { status: 400 });
    }

    const available = !(await getOccupiedRanges({ includePendingHolds: true })).some(
      (r) =>
        parsed.data.checkIn < r.endDate && parsed.data.checkOut > r.startDate,
    );
    if (!available) {
      return NextResponse.json(
        { error: "Those dates are not available" },
        { status: 409 },
      );
    }

    const overrides = await prisma.rateOverride.findMany();
    const quote = computeQuote({
      ...parsed.data,
      settings,
      overrides: overrides.map((o) => ({
        startDate: o.startDate,
        endDate: o.endDate,
        weekdayRate: o.weekdayRate,
        weekendRate: o.weekendRate,
      })),
    });

    return NextResponse.json({ quote });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unable to quote stay" }, { status: 500 });
  }
}

export async function GET() {
  const settings = await getSettings();
  const from = todayISO();
  const to = addDaysISO(from, settings.availabilityWindowMonths * 31);
  const occupied = await getOccupiedRanges({ includePendingHolds: true });

  return NextResponse.json({
    settings: {
      weekdayRateCents: settings.weekdayRateCents,
      weekendRateCents: settings.weekendRateCents,
      minNights: settings.minNights,
      maxNights: settings.maxNights,
      maxGuests: settings.maxGuests,
      maxPets: settings.maxPets,
      advanceNoticeDays: settings.advanceNoticeDays,
      availabilityWindowMonths: settings.availabilityWindowMonths,
      currency: settings.currency,
      cleaningFeeCents: settings.cleaningFeeCents,
      petFeeCents: settings.petFeeCents,
      petFeeMode: settings.petFeeMode,
    },
    from,
    to,
    occupied: occupied.map((r) => ({
      startDate: r.startDate,
      endDate: r.endDate,
    })),
  });
}

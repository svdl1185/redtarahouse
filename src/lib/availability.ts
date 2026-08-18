import { prisma } from "./db";
import { addDaysISO, dateInRangeExclusive, rangesOverlap } from "./dates";
import type { AvailabilityRange, ListingSettings } from "./types";
import { DEFAULT_SETTINGS, HOLDING_STATUSES } from "./types";

export async function getSettings(): Promise<ListingSettings> {
  const row = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(row.data) as Record<string, unknown>;
    delete parsed.disallowCheckInWeekdays;
    delete parsed.disallowCheckOutWeekdays;
    return { ...DEFAULT_SETTINGS, ...parsed } as ListingSettings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: ListingSettings): Promise<void> {
  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", data: JSON.stringify(settings) },
    update: { data: JSON.stringify(settings) },
  });
}

type OccupancySource = AvailabilityRange & { kind: string };

export async function getOccupiedRanges(options?: {
  excludeBookingId?: string;
  includePendingHolds?: boolean;
}): Promise<OccupancySource[]> {
  const settings = await getSettings();
  const now = new Date();
  const ranges: OccupancySource[] = [];

  const manual = await prisma.blockedDate.findMany();
  for (const b of manual) {
    ranges.push({
      startDate: b.startDate,
      endDate: b.endDate,
      kind: "manual",
    });
  }

  const external = await prisma.externalBlock.findMany();
  for (const b of external) {
    ranges.push({
      startDate: b.startDate,
      endDate: b.endDate,
      kind: "external",
    });
  }

  const statuses = options?.includePendingHolds
    ? ["confirmed", ...HOLDING_STATUSES]
    : ["confirmed"];

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: [...statuses] },
      ...(options?.excludeBookingId
        ? { id: { not: options.excludeBookingId } }
        : {}),
    },
  });

  for (const booking of bookings) {
    const isHold = (HOLDING_STATUSES as readonly string[]).includes(
      booking.status,
    );
    if (isHold && booking.holdUntil && booking.holdUntil < now) {
      continue;
    }

    const start = addDaysISO(booking.checkIn, -settings.prepDaysBefore);
    const end = addDaysISO(booking.checkOut, settings.prepDaysAfter);
    ranges.push({
      startDate: start,
      endDate: end,
      kind: isHold ? "hold" : "booking",
    });
  }

  return ranges;
}

export async function isRangeAvailable(
  checkIn: string,
  checkOut: string,
  options?: { excludeBookingId?: string },
): Promise<boolean> {
  const occupied = await getOccupiedRanges({
    excludeBookingId: options?.excludeBookingId,
    includePendingHolds: true,
  });
  return !occupied.some((r) =>
    rangesOverlap(checkIn, checkOut, r.startDate, r.endDate),
  );
}

export async function getBlockedNightSet(
  from: string,
  to: string,
): Promise<Set<string>> {
  const occupied = await getOccupiedRanges({ includePendingHolds: true });
  const blocked = new Set<string>();
  let cursor = from;
  while (cursor < to) {
    for (const range of occupied) {
      if (dateInRangeExclusive(cursor, range.startDate, range.endDate)) {
        blocked.add(cursor);
        break;
      }
    }
    cursor = addDaysISO(cursor, 1);
  }
  return blocked;
}

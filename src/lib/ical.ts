import ICAL from "ical.js";
import { format } from "date-fns";
import { prisma } from "./db";
import { addDaysISO } from "./dates";

type IcalTime = {
  isDate: boolean;
  year: number;
  month: number;
  day: number;
  toJSDate: () => Date;
};

function toDateString(value: IcalTime): string {
  if (value.isDate) {
    return format(
      new Date(value.year, value.month - 1, value.day),
      "yyyy-MM-dd",
    );
  }
  return format(value.toJSDate(), "yyyy-MM-dd");
}

export type ParsedEvent = {
  uid: string;
  startDate: string;
  endDate: string;
  summary: string;
};

export function parseIcal(text: string): ParsedEvent[] {
  const jcal = ICAL.parse(text);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");
  const events: ParsedEvent[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    if (!event.startDate) continue;

    const startDate = toDateString(event.startDate as IcalTime);
    let endDate = event.endDate
      ? toDateString(event.endDate as IcalTime)
      : addDaysISO(startDate, 1);

    if (endDate <= startDate) {
      endDate = addDaysISO(startDate, 1);
    }

    events.push({
      uid: event.uid || `${startDate}-${endDate}-${event.summary}`,
      startDate,
      endDate,
      summary: event.summary || "Blocked",
    });
  }

  return events;
}

export async function syncIcalSource(sourceId: string): Promise<number> {
  const source = await prisma.icalSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("iCal source not found");

  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "RedTaraSanctuaryCalendarSync/1.0" },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Fetch failed (${res.status})`);
    }
    const text = await res.text();
    const events = parseIcal(text);

    await prisma.$transaction(async (tx) => {
      await tx.externalBlock.deleteMany({ where: { sourceId } });
      if (events.length > 0) {
        await tx.externalBlock.createMany({
          data: events.map((e) => ({
            sourceId,
            uid: e.uid,
            startDate: e.startDate,
            endDate: e.endDate,
            summary: e.summary,
          })),
        });
      }
      await tx.icalSource.update({
        where: { id: sourceId },
        data: { lastSyncedAt: new Date(), lastError: null },
      });
    });

    return events.length;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await prisma.icalSource.update({
      where: { id: sourceId },
      data: { lastError: message },
    });
    throw err;
  }
}

export async function syncAllIcalSources(): Promise<{ id: string; count: number; error?: string }[]> {
  const sources = await prisma.icalSource.findMany();
  const results: { id: string; count: number; error?: string }[] = [];
  for (const source of sources) {
    try {
      const count = await syncIcalSource(source.id);
      results.push({ id: source.id, count });
    } catch (err) {
      results.push({
        id: source.id,
        count: 0,
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }
  return results;
}

function icalDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function buildOutboundIcal(): Promise<string> {
  const site = process.env.NEXT_PUBLIC_SITE_NAME || "Red Tara Sanctuary";
  const bookings = await prisma.booking.findMany({
    where: { status: "confirmed" },
    orderBy: { checkIn: "asc" },
  });
  const blocks = await prisma.blockedDate.findMany({
    orderBy: { startDate: "asc" },
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeText(site)}//Direct Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const booking of bookings) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:booking-${booking.id}@redtarasanctuary.com`);
    lines.push(`DTSTART;VALUE=DATE:${icalDate(booking.checkIn)}`);
    lines.push(`DTEND;VALUE=DATE:${icalDate(booking.checkOut)}`);
    lines.push(`SUMMARY:${escapeText(`Booked — ${booking.guestName}`)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  for (const block of blocks) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:block-${block.id}@redtarasanctuary.com`);
    lines.push(`DTSTART;VALUE=DATE:${icalDate(block.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${icalDate(block.endDate)}`);
    lines.push(
      `SUMMARY:${escapeText(block.note ? `Blocked — ${block.note}` : "Blocked")}`,
    );
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

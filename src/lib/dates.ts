import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
} from "date-fns";

/** Inclusive stay nights: check-in night through night before checkout. */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  const nights: string[] = [];
  let cursor = start;
  while (isBefore(cursor, end)) {
    nights.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 1);
  }
  return nights;
}

export function nightCount(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
}

export function isWeekendNight(dateStr: string): boolean {
  const day = parseISO(dateStr).getDay();
  // Friday (5) and Saturday (6) nights
  return day === 5 || day === 6;
}

export function todayISO(): string {
  return format(startOfDay(new Date()), "yyyy-MM-dd");
}

export function addDaysISO(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), "yyyy-MM-dd");
}

export function addMonthsISO(dateStr: string, months: number): string {
  return format(addMonths(parseISO(dateStr), months), "yyyy-MM-dd");
}

export function weekdayIndex(dateStr: string): number {
  return parseISO(dateStr).getDay();
}

/** Ranges are [start, end) in checkout-exclusive form. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function dateInRangeExclusive(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date < end;
}

export function expandRangeNights(startDate: string, endDate: string): string[] {
  return eachNight(startDate, endDate);
}

export function assertValidStay(checkIn: string, checkOut: string): void {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid dates");
  }
  if (!isBefore(start, end) && !isEqual(start, end)) {
    throw new Error("Checkout must be after check-in");
  }
  if (!isBefore(start, end)) {
    throw new Error("Stay must include at least one night");
  }
}

export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

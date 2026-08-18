import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  addDaysISO,
  assertValidStay,
  eachNight,
  isWeekendNight,
  nightCount,
  todayISO,
  weekdayIndex,
} from "./dates";
import type {
  ListingSettings,
  QuoteResult,
  RateOverrideInput,
} from "./types";

function rateForNight(
  date: string,
  settings: ListingSettings,
  overrides: RateOverrideInput[],
): number {
  const match = overrides.find((o) => date >= o.startDate && date <= o.endDate);
  if (match) {
    return isWeekendNight(date) ? match.weekendRate : match.weekdayRate;
  }
  return isWeekendNight(date)
    ? settings.weekendRateCents
    : settings.weekdayRateCents;
}

export function minNightsForCheckIn(
  checkIn: string,
  settings: ListingSettings,
): number {
  const day = weekdayIndex(checkIn);
  const custom = settings.minNightsByCheckInDay[day] ?? 0;
  return custom > 0 ? custom : settings.minNights;
}

function daysUntilCheckIn(checkIn: string): number {
  return differenceInCalendarDays(parseISO(checkIn), parseISO(todayISO()));
}

export function computeQuote(input: {
  checkIn: string;
  checkOut: string;
  guests: number;
  pets: number;
  settings: ListingSettings;
  overrides?: RateOverrideInput[];
}): QuoteResult {
  const { checkIn, checkOut, guests, pets, settings } = input;
  const overrides = input.overrides ?? [];
  assertValidStay(checkIn, checkOut);

  const nights = nightCount(checkIn, checkOut);
  const nightDates = eachNight(checkIn, checkOut);
  const baseNights = nightDates.map((date) => ({
    date,
    rateCents: rateForNight(date, settings, overrides),
    isWeekend: isWeekendNight(date),
  }));

  const nightsSubtotal = baseNights.reduce((sum, n) => sum + n.rateCents, 0);

  let cleaningFee = settings.cleaningFeeCents;
  if (
    settings.shortStayCleaningFeeCents != null &&
    nights <= settings.shortStayNightsThreshold
  ) {
    cleaningFee = settings.shortStayCleaningFeeCents;
  }

  let petFee = 0;
  if (pets > 0 && settings.petFeeCents > 0) {
    switch (settings.petFeeMode) {
      case "per_pet":
        petFee = settings.petFeeCents * pets;
        break;
      case "per_pet_night":
        petFee = settings.petFeeCents * pets * nights;
        break;
      case "per_stay":
      default:
        petFee = settings.petFeeCents;
        break;
    }
  }

  const extraGuests = Math.max(0, guests - settings.includedGuests);
  const extraGuestFee = extraGuests * settings.extraGuestFeeCents * nights;

  // Timing promo: last-minute (within N days) OR early-bird (beyond M days)
  const daysOut = daysUntilCheckIn(checkIn);
  let timingDiscountCents = 0;
  let timingDiscountLabel: string | null = null;
  if (daysOut <= settings.lastMinuteDays && settings.lastMinutePercent > 0) {
    timingDiscountCents = Math.round(
      (nightsSubtotal * settings.lastMinutePercent) / 100,
    );
    timingDiscountLabel = `Last-minute (${settings.lastMinutePercent}% off)`;
  } else if (daysOut > settings.earlyBirdDays && settings.earlyBirdPercent > 0) {
    timingDiscountCents = Math.round(
      (nightsSubtotal * settings.earlyBirdPercent) / 100,
    );
    timingDiscountLabel = `Early bird (${settings.earlyBirdPercent}% off)`;
  }

  const afterTiming = nightsSubtotal - timingDiscountCents;

  // Length-of-stay: longer than extended threshold wins over long-stay
  let lengthDiscountCents = 0;
  let lengthDiscountLabel: string | null = null;
  if (nights > settings.extendedStayNights && settings.extendedStayPercent > 0) {
    lengthDiscountCents = Math.round(
      (afterTiming * settings.extendedStayPercent) / 100,
    );
    lengthDiscountLabel = `Extended stay (${settings.extendedStayPercent}% off)`;
  } else if (nights > settings.longStayNights && settings.longStayPercent > 0) {
    lengthDiscountCents = Math.round(
      (afterTiming * settings.longStayPercent) / 100,
    );
    lengthDiscountLabel = `Long stay (${settings.longStayPercent}% off)`;
  }

  const discountedNights = afterTiming - lengthDiscountCents;

  // Spread stay-level discounts across nights so tiles show what guests pay per night
  const nightBreakdown = baseNights.map((night, index) => {
    if (nightsSubtotal <= 0) {
      return { ...night, discountedRateCents: night.rateCents };
    }
    if (index === baseNights.length - 1) {
      const prior = baseNights.slice(0, -1).reduce((sum, n) => {
        return sum + Math.round((n.rateCents * discountedNights) / nightsSubtotal);
      }, 0);
      return {
        ...night,
        discountedRateCents: Math.max(0, discountedNights - prior),
      };
    }
    return {
      ...night,
      discountedRateCents: Math.round(
        (night.rateCents * discountedNights) / nightsSubtotal,
      ),
    };
  });

  const subtotalBeforeTax =
    discountedNights + cleaningFee + petFee + extraGuestFee;
  const taxAmount = Math.round(
    (subtotalBeforeTax * Math.max(0, settings.taxPercent)) / 100,
  );
  const totalCents = subtotalBeforeTax + taxAmount;

  const lines: QuoteResult["lines"] = [
    {
      label: `${nights} night${nights === 1 ? "" : "s"}`,
      amountCents: nightsSubtotal,
    },
  ];
  if (timingDiscountCents > 0 && timingDiscountLabel) {
    lines.push({ label: timingDiscountLabel, amountCents: -timingDiscountCents });
  }
  if (lengthDiscountCents > 0 && lengthDiscountLabel) {
    lines.push({ label: lengthDiscountLabel, amountCents: -lengthDiscountCents });
  }
  if (cleaningFee > 0) {
    lines.push({ label: "Cleaning fee", amountCents: cleaningFee });
  }
  if (petFee > 0) {
    lines.push({ label: "Pet fee", amountCents: petFee });
  }
  if (extraGuestFee > 0) {
    lines.push({ label: "Extra guest fee", amountCents: extraGuestFee });
  }
  if (taxAmount > 0) {
    lines.push({
      label: `Tax (${settings.taxPercent}%)`,
      amountCents: taxAmount,
    });
  }

  return {
    checkIn,
    checkOut,
    nights,
    guests,
    pets,
    nightsSubtotal,
    timingDiscountCents,
    timingDiscountLabel,
    lengthDiscountCents,
    lengthDiscountLabel,
    cleaningFee,
    petFee,
    extraGuestFee,
    taxAmount,
    totalCents,
    currency: settings.currency,
    nightBreakdown,
    lines,
  };
}

export function validateStayRules(input: {
  checkIn: string;
  checkOut: string;
  guests: number;
  pets: number;
  settings: ListingSettings;
}): string | null {
  const { checkIn, checkOut, guests, pets, settings } = input;

  try {
    assertValidStay(checkIn, checkOut);
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid dates";
  }

  const nights = nightCount(checkIn, checkOut);
  const minNights = minNightsForCheckIn(checkIn, settings);
  if (nights < minNights) {
    return `Minimum stay is ${minNights} nights for this check-in day`;
  }
  if (nights > settings.maxNights) {
    return `Maximum stay is ${settings.maxNights} nights`;
  }
  if (guests < 1 || guests > settings.maxGuests) {
    return `Guests must be between 1 and ${settings.maxGuests}`;
  }
  if (pets < 0 || pets > settings.maxPets) {
    return `Pets must be between 0 and ${settings.maxPets}`;
  }

  const today = todayISO();
  const earliestCheckIn = addDaysISO(today, settings.advanceNoticeDays);
  if (checkIn < earliestCheckIn) {
    return `Check-in must be on or after ${earliestCheckIn}`;
  }

  const latestCheckIn = addDaysISO(
    today,
    settings.availabilityWindowMonths * 30,
  );
  if (checkIn > latestCheckIn) {
    return "Check-in is outside the booking window";
  }

  return null;
}

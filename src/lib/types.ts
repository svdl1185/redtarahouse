export type PetFeeMode = "per_stay" | "per_pet" | "per_pet_night";

export type ListingSettings = {
  weekdayRateCents: number;
  weekendRateCents: number;
  cleaningFeeCents: number;
  shortStayCleaningFeeCents: number | null;
  shortStayNightsThreshold: number;
  petFeeCents: number;
  petFeeMode: PetFeeMode;
  includedGuests: number;
  extraGuestFeeCents: number;
  taxPercent: number;
  minNights: number;
  maxNights: number;
  minNightsByCheckInDay: number[];
  maxGuests: number;
  maxPets: number;
  advanceNoticeDays: number;
  prepDaysBefore: number;
  prepDaysAfter: number;
  availabilityWindowMonths: number;
  /** Check-in within this many days → last-minute promo */
  lastMinuteDays: number;
  lastMinutePercent: number;
  /** Check-in more than this many days out → early-bird promo */
  earlyBirdDays: number;
  earlyBirdPercent: number;
  /** Stay longer than this many nights → weekly-style discount */
  longStayNights: number;
  longStayPercent: number;
  /** Stay longer than this many nights → monthly-style discount (replaces longStay) */
  extendedStayNights: number;
  extendedStayPercent: number;
  currency: string;
};

export const DEFAULT_SETTINGS: ListingSettings = {
  weekdayRateCents: 700_00,
  weekendRateCents: 900_00,
  cleaningFeeCents: 0,
  shortStayCleaningFeeCents: null,
  shortStayNightsThreshold: 2,
  petFeeCents: 0,
  petFeeMode: "per_stay",
  includedGuests: 10,
  extraGuestFeeCents: 0,
  taxPercent: 0,
  minNights: 3,
  maxNights: 90,
  minNightsByCheckInDay: [0, 0, 0, 0, 0, 0, 0],
  maxGuests: 10,
  maxPets: 2,
  advanceNoticeDays: 1,
  prepDaysBefore: 0,
  prepDaysAfter: 0,
  availabilityWindowMonths: 12,
  lastMinuteDays: 14,
  lastMinutePercent: 10,
  earlyBirdDays: 60,
  earlyBirdPercent: 10,
  longStayNights: 7,
  longStayPercent: 5,
  extendedStayNights: 28,
  extendedStayPercent: 10,
  currency: "usd",
};

export type RateOverrideInput = {
  startDate: string;
  endDate: string;
  weekdayRate: number;
  weekendRate: number;
};

export type QuoteLine = {
  label: string;
  amountCents: number;
};

export type QuoteResult = {
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pets: number;
  nightsSubtotal: number;
  timingDiscountCents: number;
  timingDiscountLabel: string | null;
  lengthDiscountCents: number;
  lengthDiscountLabel: string | null;
  cleaningFee: number;
  petFee: number;
  extraGuestFee: number;
  taxAmount: number;
  totalCents: number;
  currency: string;
  nightBreakdown: {
    date: string;
    rateCents: number;
    discountedRateCents: number;
    isWeekend: boolean;
  }[];
  lines: QuoteLine[];
};

export type AvailabilityRange = {
  startDate: string;
  endDate: string;
};

/** Statuses that soft-block the calendar until resolved. */
export const HOLDING_STATUSES = [
  "requested",
  "awaiting_payment",
  "pending", // legacy
] as const;

export const CONFIRMED_STATUSES = ["confirmed"] as const;

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings, saveSettings } from "@/lib/availability";
import { getAdminSession } from "@/lib/session";
import type { ListingSettings, PetFeeMode } from "@/lib/types";

async function requireAdminResponse() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

const settingsSchema = z.object({
  weekdayRateCents: z.number().int().min(0),
  weekendRateCents: z.number().int().min(0),
  cleaningFeeCents: z.number().int().min(0),
  shortStayCleaningFeeCents: z.number().int().min(0).nullable(),
  shortStayNightsThreshold: z.number().int().min(1).max(14),
  petFeeCents: z.number().int().min(0),
  petFeeMode: z.enum(["per_stay", "per_pet", "per_pet_night"]),
  includedGuests: z.number().int().min(1).max(20),
  extraGuestFeeCents: z.number().int().min(0),
  taxPercent: z.number().min(0).max(100),
  minNights: z.number().int().min(1).max(60),
  maxNights: z.number().int().min(1).max(365),
  minNightsByCheckInDay: z.array(z.number().int().min(0).max(60)).length(7),
  maxGuests: z.number().int().min(1).max(20),
  maxPets: z.number().int().min(0).max(10),
  advanceNoticeDays: z.number().int().min(0).max(30),
  prepDaysBefore: z.number().int().min(0).max(7),
  prepDaysAfter: z.number().int().min(0).max(7),
  availabilityWindowMonths: z.number().int().min(1).max(24),
  lastMinuteDays: z.number().int().min(0).max(60),
  lastMinutePercent: z.number().min(0).max(100),
  earlyBirdDays: z.number().int().min(0).max(365),
  earlyBirdPercent: z.number().min(0).max(100),
  longStayNights: z.number().int().min(1).max(60),
  longStayPercent: z.number().min(0).max(100),
  extendedStayNights: z.number().int().min(1).max(365),
  extendedStayPercent: z.number().min(0).max(100),
  currency: z.string().min(3).max(3),
});

export async function GET() {
  const denied = await requireAdminResponse();
  if (denied) return denied;
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const denied = await requireAdminResponse();
  if (denied) return denied;

  const json = await request.json();
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const settings = parsed.data as ListingSettings;
  await saveSettings(settings);
  return NextResponse.json({ settings });
}

export type { PetFeeMode };

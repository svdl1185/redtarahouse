# OTA calendar wiring

Direct bookings and OTA calendars stay aligned via iCal (no channel-manager fee).

## Outbound (our site → OTAs)

1. Open `/admin` and copy the outbound iCal URL (`/api/calendar`).
2. Import that URL into:
   - Airbnb → Listing → Calendar → Availability settings → Sync calendars → Import calendar
   - Booking.com → Calendar → Sync calendars → Import
   - VRBO / Vrbo → Calendar → Import calendar
3. Name it “Red Tara direct” (or similar) so you recognize blocks from the website.

## Inbound (OTAs → our site)

1. Export/calendar sync URL from each platform.
2. In `/admin` → **OTA calendar sync**, add each URL (Airbnb, Booking.com, VRBO).
3. Click **Sync all now**, or wait for the Vercel cron (every 30 minutes).

## Notes

- Sync is not instant. Avoid back-to-back bookings that leave no buffer; use prep nights in admin if needed.
- After a direct booking is confirmed, it appears on `/api/calendar` for OTAs to pull.
- After an OTA booking, our site blocks those nights once the inbound feed syncs.

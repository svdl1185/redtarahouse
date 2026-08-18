# Red Tara Sanctuary

Direct booking website for Red Tara Sanctuary in Catskill, NY — with guest guide, Stripe checkout, admin pricing/rules, and iCal sync for Airbnb / Booking.com / VRBO.

## Stack

- Next.js (App Router)
- PostgreSQL via Prisma (Neon in production)
- Stripe Checkout for payments
- Vercel Cron for calendar sync

## Setup

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

### Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma DB URL (`file:./dev.db` locally) |
| `SESSION_SECRET` | 32+ char secret for admin cookies |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin login |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Payments |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (used in Checkout + iCal) |
| `CRON_SECRET` | Protects `/api/cron/sync-ical` |
| `SMTP_*` / `NOTIFY_EMAIL` | Optional host notification email |

### Stripe webhook

Point Stripe to `https://your-domain/api/stripe/webhook` for `checkout.session.completed`.

### Calendar sync (OTA agendas)

1. In each OTA, copy the **export/calendar** iCal URL.
2. In `/admin`, add those URLs (Airbnb, Booking.com, VRBO).
3. Copy the outbound feed shown in admin (`/api/calendar`) and **import** it into each OTA so direct bookings block those calendars.
4. Vercel Cron runs sync every 30 minutes; you can also click **Sync all now**.

iCal sync is eventually consistent — rare double-books are possible in the sync window. Advance notice and prep nights help.

### Production database

For Vercel, use Neon Postgres (already configured as the Prisma provider):

1. Create a Neon database and set `DATABASE_URL` in Vercel env vars.
2. Run against production: `npx prisma db push` then `npm run db:seed`.

### Deploy (Vercel)

1. Import the GitHub repo into Vercel.
2. Set all env vars from `.env.example`.
3. Set `CRON_SECRET` (Vercel Cron sends it as `Authorization: Bearer …`).
4. Point `redtarasanctuary.com` DNS to Vercel (remove GitHub Pages).
5. Configure the Stripe webhook on the production URL.

Private access details (door codes, Wi-Fi passwords) must not be committed to this public repository.

## Booking flow

1. Guest requests dates (no charge yet) — dates are soft-held.
2. Host approves or declines in `/admin`.
3. On approve, Stripe Checkout link is emailed; guest pays to confirm.
4. Webhook marks the booking confirmed and updates the outbound iCal feed.

## Promos (editable in admin)

- **Last-minute:** 10% off night rates when check-in is within 14 days
- **Early bird:** 10% off when check-in is more than 60 days out
- **Long stay:** 5% off for stays longer than 7 nights
- **Extended stay:** 10% off for stays longer than 28 nights (replaces long-stay %)

## Docs

- [OTA calendar setup](docs/ota-calendar-setup.md)

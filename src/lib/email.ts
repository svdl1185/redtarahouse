import nodemailer from "nodemailer";
import { formatMoney } from "./dates";
import type { QuoteResult } from "./types";

function transporterOrNull() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
}

function quoteText(quote: QuoteResult): string {
  const lines = quote.lines
    .map((l) => `${l.label}: ${formatMoney(l.amountCents, quote.currency)}`)
    .join("\n");
  return [
    `Stay: ${quote.checkIn} to ${quote.checkOut} (${quote.nights} nights)`,
    `Guests: ${quote.guests}`,
    `Pets: ${quote.pets}`,
    "",
    lines,
    `Total: ${formatMoney(quote.totalCents, quote.currency)}`,
  ].join("\n");
}

export async function sendBookingRequestToHost(input: {
  guestName: string;
  guestEmail: string;
  quote: QuoteResult;
  bookingId: string;
}): Promise<void> {
  const to = process.env.NOTIFY_EMAIL;
  const transporter = transporterOrNull();
  if (!to || !transporter) {
    console.info("Host notification skipped (email not configured)", {
      bookingId: input.bookingId,
    });
    return;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await transporter.sendMail({
    from: process.env.SMTP_USER || to,
    to,
    replyTo: input.guestEmail,
    subject: `Booking request: ${input.guestName} (${input.quote.checkIn} → ${input.quote.checkOut})`,
    text: [
      "A guest requested a stay. Approve or decline in admin.",
      `${siteUrl}/admin`,
      "",
      `Booking ID: ${input.bookingId}`,
      `Guest: ${input.guestName} <${input.guestEmail}>`,
      "",
      quoteText(input.quote),
    ].join("\n"),
  });
}

export async function sendPaymentLinkToGuest(input: {
  guestName: string;
  guestEmail: string;
  quote: QuoteResult;
  bookingId: string;
  paymentUrl: string;
}): Promise<void> {
  const transporter = transporterOrNull();
  const from = process.env.SMTP_USER || process.env.NOTIFY_EMAIL;
  if (!transporter || !from) {
    console.info("Guest payment email skipped (email not configured)", {
      bookingId: input.bookingId,
      paymentUrl: input.paymentUrl,
    });
    return;
  }

  await transporter.sendMail({
    from,
    to: input.guestEmail,
    subject: "Your Red Tara Sanctuary stay was approved — complete payment",
    text: [
      `Hi ${input.guestName},`,
      "",
      "Good news — your stay request was approved. Complete payment to finalize your booking:",
      input.paymentUrl,
      "",
      quoteText(input.quote),
      "",
      "This payment link expires if not completed in time. Reply to this email with questions.",
      "",
      "Red Tara Sanctuary",
    ].join("\n"),
  });
}

export async function sendDeclineToGuest(input: {
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
}): Promise<void> {
  const transporter = transporterOrNull();
  const from = process.env.SMTP_USER || process.env.NOTIFY_EMAIL;
  if (!transporter || !from) {
    console.info("Decline email skipped (email not configured)", input);
    return;
  }

  await transporter.sendMail({
    from,
    to: input.guestEmail,
    subject: "Update on your Red Tara Sanctuary request",
    text: [
      `Hi ${input.guestName},`,
      "",
      `Unfortunately we cannot host your stay from ${input.checkIn} to ${input.checkOut}.`,
      "Please try different dates or email us if you have questions.",
      "",
      "Red Tara Sanctuary",
    ].join("\n"),
  });
}

export async function sendBookingConfirmedToHost(input: {
  guestName: string;
  guestEmail: string;
  quote: QuoteResult;
  bookingId: string;
}): Promise<void> {
  const to = process.env.NOTIFY_EMAIL;
  const transporter = transporterOrNull();
  if (!to || !transporter) {
    console.info("Confirmation host email skipped", {
      bookingId: input.bookingId,
    });
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER || to,
    to,
    replyTo: input.guestEmail,
    subject: `Paid booking confirmed: ${input.guestName}`,
    text: [
      `Booking ID: ${input.bookingId}`,
      `Guest: ${input.guestName} <${input.guestEmail}>`,
      "",
      quoteText(input.quote),
    ].join("\n"),
  });
}

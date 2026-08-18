import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm";

export const metadata: Metadata = {
  title: "Reservation | Red Tara Sanctuary",
  description:
    "Request dates at Red Tara Sanctuary in Catskill, NY. We review each stay, then send a secure payment link when approved.",
};

export default function BookPage() {
  return (
    <main id="top">
      <BookingForm />
    </main>
  );
}

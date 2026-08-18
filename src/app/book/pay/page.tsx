import Link from "next/link";
import { Suspense } from "react";
import PayClient from "./PayClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="success-page">
          <section className="section">
            <p className="muted">Loading payment…</p>
            <Link href="/">Back home</Link>
          </section>
        </main>
      }
    >
      <PayClient />
    </Suspense>
  );
}

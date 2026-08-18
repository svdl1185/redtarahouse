import { GuideContent } from "@/components/GuideContent";

export const metadata = {
  title: "Your stay | Red Tara Sanctuary",
  description:
    "Guest guide for Red Tara Sanctuary in Catskill, NY — house notes, checkout, nearby food, and practical tips.",
};

export default function StayPage() {
  return (
    <>
      <main id="top">
        <section className="hero">
          <div className="hero-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="hero-brand-image"
              src="/redtara.png"
              alt=""
              width={1044}
              height={1018}
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <h1>
            ཨོཾ་ཏཱ་རེ་ཏུཏྟཱ་རེ་ཏུ་རེ་སཾ་ཏཱ་རེ་ཏཱ་ར་ཎི་ཧྲཱིཿ སྭཱ་ཧཱ།
          </h1>
        </section>

        <GuideContent />
      </main>

      <div className="bottom-art-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="bottom-art"
          src="/bottom.png"
          alt=""
          width={536}
          height={186}
          loading="lazy"
          decoding="async"
        />
      </div>

      <footer className="footer">
        <p>
          Red Tara Sanctuary, Catskill, NY 12414 ·{" "}
          <a href="mailto:redtarahouse@gmail.com">redtarahouse@gmail.com</a>
        </p>
      </footer>
    </>
  );
}

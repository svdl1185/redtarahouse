import Link from "next/link";
import { getListingImages } from "@/lib/listing-images";

const INTRO = `Red Tara Sanctuary is a place I would like to share with people who want to relax body and mind in nature.

I have always wanted a space where I could retreat and meditate. When I saw this beautiful cabin in the Catskills, I knew this was the place I was looking for.

I hope you will be blessed by the loving energy of the house.

Have a joyful time with your family, friends, and loved ones.`;

export default function HomePage() {
  const images = getListingImages();

  return (
    <>
      <main id="top" className="home-page">
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

        <section className="home-intro">
          <div className="home-intro-copy">
            {INTRO.split("\n\n").map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
            <p className="home-signoff">Red Tara</p>
            <div className="home-intro-cta">
              <Link className="button" href="/book">
                Make a reservation
              </Link>
              <Link className="button button-secondary" href="/stay">
                Guest book
              </Link>
            </div>
          </div>
        </section>

        {images.length > 0 && (
          <section className="home-gallery" aria-label="Property photos">
            <div className="home-gallery-grid">
              {images.map((src, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  className="home-gallery-image"
                  src={src}
                  alt=""
                  width={1200}
                  height={800}
                  loading={index < 6 ? "eager" : "lazy"}
                  decoding="async"
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          Red Tara Sanctuary, Catskill, NY 12414 ·{" "}
          <a href="mailto:redtarahouse@gmail.com">redtarahouse@gmail.com</a>
        </p>
      </footer>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export function HomeHeroCarousel({ slides = [] }) {
  const safeSlides = useMemo(() => (Array.isArray(slides) && slides.length ? slides : []), [slides]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safeSlides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % safeSlides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [safeSlides.length]);

  if (!safeSlides.length) return null;

  const current = safeSlides[index];
  const next = safeSlides[(index + 1) % safeSlides.length] || current;

  return (
    <div className="hero-carousel">
      {safeSlides.length > 1 ? (
        <article className="hero-card hero-card--tease" aria-hidden="true">
          <img src={next.image} alt="" width="960" height="1120" className="hero-image" />
        </article>
      ) : null}

      <article className="hero-card hero-card--active" key={`${index}-${current.image}`}>
        <img src={current.image} alt={current.title} width="960" height="1120" className="hero-image" />
        <div className="hero-overlay" />
        <div className="hero-copy">
          <p className="hero-kicker">{current.eyebrow}</p>
          <h1>{current.title}</h1>
          <p className="hero-subtitle">{current.subtitle}</p>
          <div className="hero-actions">
            <Link href="/category" className="hero-cta">
              Shop Now
            </Link>
            <div className="hero-meta">
              <span>{safeSlides.length > 1 ? "Featured Drop" : "New Season"}</span>
              <strong>{current.progress}</strong>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

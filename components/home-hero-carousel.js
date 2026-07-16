"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

function toRgb(color) {
  const value = String(color || "").trim();
  const hex = value.startsWith("#") ? value.slice(1) : value;
  if (hex.length === 3) {
    const [r, g, b] = hex.split("");
    return `${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}`;
  }
  if (hex.length === 6) {
    return `${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}`;
  }
  return "18, 16, 22";
}

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
  const overlayRgb = toRgb(current.overlayColor);
  const currentCaption = String(current.caption || "").trim();

  return (
    <div className="hero-carousel">
      {safeSlides.length > 1 ? (
        <article className="hero-card hero-card--tease" aria-hidden="true">
          <Image
            src={next.image}
            alt=""
            fill
            unoptimized
            priority={index === 0}
            loading={index === 0 ? "eager" : undefined}
            fetchPriority={index === 0 ? "high" : undefined}
            sizes="(max-width: 768px) 90vw, 640px"
            className="hero-image"
          />
        </article>
      ) : null}

      <article className="hero-card hero-card--active" key={`${index}-${current.image}`}>
        <Image
          src={current.image}
          alt={currentCaption || "Kanxi Collection banner"}
          fill
          unoptimized
          priority={index === 0}
          sizes="(max-width: 768px) 90vw, 640px"
          fetchPriority={index === 0 ? "high" : undefined}
          className="hero-image"
        />
        <div
          className="hero-overlay"
          style={{
            background: `linear-gradient(180deg, rgba(${overlayRgb}, 0) 0%, rgba(${overlayRgb}, 0.08) 22%, rgba(${overlayRgb}, 0.28) 44%, rgba(${overlayRgb}, 0.62) 68%, rgba(${overlayRgb}, 1) 100%)`,
          }}
        />
        {currentCaption ? (
          <div className="hero-copy">
            <h1>{currentCaption}</h1>
          </div>
        ) : null}
      </article>
    </div>
  );
}

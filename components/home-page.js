import Image from "next/image";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { CountdownPill } from "@/components/countdown";
import { ProductCard } from "@/components/product-card";
import { BadgePlus, Droplets, Footprints, Grid2x2, Palette, Scissors, ShoppingBag, Shirt, Sparkles, SprayCan, SunMedium } from "lucide-react";
import Link from "next/link";

const CATEGORY_ICONS = {
  shirt: Shirt,
  sparkles: Sparkles,
  "spray-can": SprayCan,
  "shopping-bag": ShoppingBag,
  scissors: Scissors,
  footprints: Footprints,
  palette: Palette,
  droplets: Droplets,
  "sun-medium": SunMedium,
  "badge-plus": BadgePlus,
  sparkle: Sparkles,
  "grid-2x2": Grid2x2,
};

function CategoryVisual({ item }) {
  if (item.image) {
    return <Image src={item.image} alt="" fill unoptimized sizes="(max-width: 768px) 16vw, 72px" className="quick-link-image" />;
  }
  const Icon = CATEGORY_ICONS[item.iconKey] || Grid2x2;
  return <Icon className="quick-link-lucide" />;
}

export function HomePage({ data }) {
  return (
    <>
      <section className="hero-stack">
        <HomeHeroCarousel slides={data.heroSlides?.length ? data.heroSlides : [data.hero]} />
      </section>

      <section className="quick-links" aria-label="Categories">
        {data.quickLinks.map((item) => (
          <Link href={item.href || "/category"} className="quick-link-card" key={item.label}>
            <span className="quick-link-icon" aria-hidden="true">
              <CategoryVisual item={item} />
            </span>
            <span className="quick-link-label">{item.label}</span>
          </Link>
        ))}
      </section>

      {data.featuredBrands?.length ? (
        <section className="section-block">
          <div className="section-header">
            <h2>{data.brandsTitle || "Shop by Brand"}</h2>
            <Link href="/category" className="section-arrow" aria-label="Open brands">
              →
            </Link>
          </div>
          <div className="brand-strip" aria-label="Featured brands">
            {data.featuredBrands.map((brand) => (
              <div className="brand-tile" key={brand.id}>
                <div className="brand-tile-logo">
                  {brand.logo ? (
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 40vw, 220px"
                      className="brand-tile-image"
                    />
                  ) : (
                    <span>{brand.name}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.featuredSections.map((section) => {
        const isFlashSale = section.sourceType === "offers" || /flash sale/i.test(section.title || "");
        return (
          <section className={`section-block${isFlashSale ? " section-block--highlight" : ""}`} key={section.id}>
            <div className={`section-header${isFlashSale ? " section-header--pink" : ""}`}>
              <div className="section-header-copy">
                <h2>{section.title}</h2>
                {isFlashSale ? (
                  <div className="time-sale-meta">
                    <CountdownPill />
                    <span>Limited time beauty picks</span>
                  </div>
                ) : null}
              </div>
              <Link href={section.href || "/category"} className="section-arrow" aria-label={`Open ${section.title}`}>
                →
              </Link>
            </div>
            <div className="product-grid product-grid--home">
              {section.products.map((product, index) => (
                <ProductCard key={`${section.id}-${product.id}`} product={product} priority={index < 3} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

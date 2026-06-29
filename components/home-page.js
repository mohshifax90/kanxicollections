import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { ProductCard } from "@/components/product-card";
import Link from "next/link";

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
              {item.image ? <img src={item.image} alt="" className="quick-link-image" /> : item.icon}
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
                  {brand.logo ? <img src={brand.logo} alt={brand.name} className="brand-tile-image" /> : <span>{brand.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.featuredSections.map((section) => (
        <section className="section-block" key={section.id}>
          <div className="section-header">
            <h2>{section.title}</h2>
            <Link href={section.href || "/category"} className="section-arrow" aria-label={`Open ${section.title}`}>
              →
            </Link>
          </div>
          <div className="product-grid product-grid--home">
            {section.products.map((product) => (
              <ProductCard key={`${section.id}-${product.id}`} product={product} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

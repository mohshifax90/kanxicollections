import { ProductCard } from "@/components/product-card";

export function CategoryListingPage({ category, products }) {
  return (
    <section className="listing-page">
      <div className="page-title-row">
        <div>
          <h1>{category?.title || category?.name || "Products"}</h1>
          <p className="page-copy">{category?.description || "Browse curated picks in the new storefront UI."}</p>
        </div>
      </div>

      <div className="filter-row">
        <span className="filter-chip active">Trending</span>
        <span className="filter-chip">Best sellers</span>
        <span className="filter-chip">New drops</span>
        <span className="filter-chip">{products.length} items</span>
      </div>

      <div className="listing-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} compact />
        ))}
      </div>
    </section>
  );
}

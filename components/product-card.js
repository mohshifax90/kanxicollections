import Link from "next/link";

export function ProductCard({ product, compact = false }) {
  return (
    <Link href={`/product/${product.id}`} className={`product-card${compact ? " compact" : ""}`}>
      <div className="product-visual">
        <img src={product.image} alt={product.name} width="320" height="320" loading="lazy" />
      </div>
      <div className="product-copy">
        <p className="product-brand">{product.brand}</p>
        <h3>{product.name}</h3>
        {product.variantCount > 1 ? <p className="product-variants">{product.variantCount} variants</p> : null}
        <div className="product-price-row">
          <strong>MVR {Math.round(product.price || 0)}</strong>
          {product.discountPercent ? <em>{product.discountPercent}%</em> : null}
        </div>
        {product.oldPrice ? <p className="product-old-price">MVR {Math.round(product.oldPrice)}</p> : null}
        {product.tag ? <p className="product-tagline">{product.tag}</p> : null}
      </div>
    </Link>
  );
}

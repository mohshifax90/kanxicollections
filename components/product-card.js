import Image from "next/image";
import Link from "next/link";
import { shouldUnoptimizeImage } from "@/lib/image-utils";

export function ProductCard({ product, compact = false, priority = false }) {
  const bypassOptimizer = shouldUnoptimizeImage(product.image);
  return (
    <Link href={`/product/${product.id}`} className={`product-card${compact ? " compact" : ""}`}>
      <div className="product-visual">
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized={bypassOptimizer}
          priority={priority}
          loading={priority ? "eager" : undefined}
          fetchPriority={priority ? "high" : undefined}
          sizes="(max-width: 768px) 31vw, 184px"
          quality={80}
        />
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

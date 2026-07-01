"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bookmark, ChevronLeft, Menu, Send } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { ProductCard } from "@/components/product-card";
import { useStorefrontData } from "@/components/storefront-data-provider";

export function ProductDetailPage({ product, related = [] }) {
  const router = useRouter();
  const { addItem, count } = useCart();
  const { bootstrap } = useStorefrontData();
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.id || null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [qty, setQty] = useState(1);

  const selectedVariant = useMemo(
    () => product.variants?.find((variant) => variant.id === selectedVariantId) || null,
    [product.variants, selectedVariantId],
  );
  const hasVisualVariantType = product.variantType === "shade";
  const selectedGallery =
    hasVisualVariantType && selectedVariant?.gallery?.length
      ? selectedVariant.gallery
      : product.gallery || [product.image];
  const selectedImage = selectedGallery[selectedImageIndex] || selectedGallery[0] || product.image;
  const primaryImage = product.image || selectedImage;
  const selectedPrice = Number(selectedVariant?.price || product.basePrice || product.price || 0);
  const selectedStock = Number(selectedVariant?.stock ?? product.baseStock ?? product.stockTotal ?? 0);
  const variantLabel = selectedVariant ? `${product.variantType}: ${selectedVariant.value}` : "Default";
  const isClothing = product.categorySlug === "clothing";
  const optionLabel =
    product.variantType === "shade"
      ? "Color"
      : product.variantType === "size"
        ? "Size"
        : product.variantType === "volume"
          ? "Volume"
          : product.variantType === "none"
            ? ""
            : "Options";
  const logo = bootstrap?.logo || "";
  const hasVisualVariants = hasVisualVariantType && Boolean(product.variants?.some((variant) => variant.image));

  const addCurrentToCart = (redirect = false) => {
    if (selectedStock <= 0) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      name: product.name,
      brand: product.brand,
      image: primaryImage,
      primaryImage,
      qty,
      price: selectedPrice,
      stock: selectedStock,
      variantLabel,
    });
    if (redirect) router.push("/checkout");
  };

  return (
    <section className="product-page-shell">
      <div className="product-shop-header">
        <button type="button" className="product-head-icon" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft />
        </button>
        <div className="product-shop-avatar" aria-hidden="true">
          {logo ? <img src={logo} alt="" /> : <span>{String(product.brand || "K").charAt(0)}</span>}
        </div>
        <div className="product-shop-meta">
          <p>
            {product.brand}
            <BadgeCheck />
          </p>
          <Link href={product.categorySlug ? `/category/${product.categorySlug}` : "/"}>View shop</Link>
        </div>
        <div className="product-shop-spacer" />
        <Link href="/checkout" className="product-head-icon product-head-icon--bag" aria-label="Bag">
          <img src="/assets/nav-bag.svg" alt="" />
          {count ? <span className="product-bag-count">{count}</span> : null}
        </Link>
        <button type="button" className="product-head-icon" aria-label="Menu">
          <Menu />
        </button>
      </div>

      <section className="detail-page">

        <div className={`detail-gallery-card${isClothing ? " detail-gallery-card--clothing" : ""}`}>
          <img
            src={selectedImage}
            alt={product.name}
            className={`detail-hero-image${isClothing ? " detail-hero-image--clothing" : ""}`}
            width="900"
            height="1100"
          />
          {selectedGallery.length > 1 ? (
            <div className="detail-gallery-dots" aria-hidden="true">
              {selectedGallery.map((image, index) => (
                <span key={image} className={`detail-gallery-dot${index === selectedImageIndex ? " active" : ""}`} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-copy">
          <div className="detail-title-row">
            <div>
              <h1>{product.name}</h1>
            </div>
            <div className="detail-actions">
              <button type="button" className="detail-action-button" aria-label="Share product">
                <Send />
              </button>
              <button type="button" className="detail-action-button" aria-label="Save product">
                <Bookmark />
              </button>
            </div>
          </div>
          <div className="detail-price-row">
            <strong>MVR {Math.round(selectedPrice)}</strong>
            {product.oldPrice ? <span>MVR {Math.round(product.oldPrice)}</span> : null}
            {product.discountPercent ? <em>{product.discountPercent}%</em> : null}
          </div>
        </div>

        {selectedGallery.length > 1 ? (
          <div className="detail-thumb-row detail-thumb-row--product">
            {selectedGallery.map((image, index) => (
              <button
                type="button"
                className={`detail-thumb${index === selectedImageIndex ? " active" : ""}`}
                key={image}
                onClick={() => setSelectedImageIndex(index)}
              >
                <img src={image} alt={`${product.name} ${index + 1}`} width="84" height="84" />
              </button>
            ))}
          </div>
        ) : null}

        {product.variants?.length ? (
          <section className="detail-section">
            <div className="detail-section-head">
              <h2>{optionLabel}{selectedVariant ? `: ${selectedVariant.value}` : ""}</h2>
              <span>{selectedStock > 0 ? `${selectedStock} left` : "Out of stock"}</span>
            </div>
            <div className={`variant-grid${product.variantType === "shade" ? " variant-grid--swatch" : ""}${hasVisualVariants ? " variant-grid--preview" : ""}`}>
              {product.variants.map((variant) => (
                <button
                  type="button"
                  key={variant.id}
                  className={`variant-chip${selectedVariantId === variant.id ? " active" : ""}`}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setQty(1);
                    setSelectedImageIndex(0);
                  }}
                  disabled={variant.stock <= 0}
                >
                  {hasVisualVariantType && variant.image ? <img src={variant.image} alt="" className="variant-chip-image" /> : null}
                  {variant.color && (!hasVisualVariantType || !variant.image) ? <span className="shade-dot" style={{ background: variant.color }} /> : null}
                  <span className="variant-chip-label">{variant.value}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="detail-section">
          <div className="detail-section-head">
            <h2>Quantity</h2>
            <span>{selectedStock > 0 ? `${selectedStock} in stock` : "Out of stock"}</span>
          </div>
          <div className="qty-stepper next">
            <button type="button" onClick={() => setQty((value) => Math.max(1, value - 1))}>
              −
            </button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty((value) => Math.min(selectedStock || 1, value + 1))}>
              +
            </button>
          </div>
        </section>

        <div className="detail-inline-actions">
          <button type="button" className="secondary-cta" onClick={() => addCurrentToCart(false)} disabled={selectedStock <= 0}>
            Add to cart
          </button>
          <button type="button" className="primary-cta" onClick={() => addCurrentToCart(true)} disabled={selectedStock <= 0}>
            Buy now
          </button>
        </div>

        {product.description || product.details?.length ? (
          <section className="detail-section detail-section--copy">
            <div className="detail-section-head">
              <h2>Product details</h2>
            </div>
            {product.description ? <p className="detail-description">{product.description}</p> : null}
            <ul className="detail-bullets">
              {(product.details || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length ? (
          <section className="detail-related">
            <div className="detail-section-head">
              <h2>More like this</h2>
            </div>
            <div className="product-scroll product-scroll--detail">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Send } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { ProductCard } from "@/components/product-card";

export function ProductDetailPage({ product, related = [] }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants?.[0]?.id || null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [qty, setQty] = useState(1);

  const selectedVariant = useMemo(
    () => product.variants?.find((variant) => variant.id === selectedVariantId) || null,
    [product.variants, selectedVariantId],
  );
  const selectedGallery = selectedVariant?.gallery?.length ? selectedVariant.gallery : product.gallery || [product.image];
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
    <section className="detail-page">
      <div className="detail-nav">
        <Link href={product.categorySlug ? `/category/${product.categorySlug}` : "/category"} className="back-link">
          ←
        </Link>
        <div className="detail-brand-lockup">
          <p>{product.brand}</p>
          <span>View shop</span>
        </div>
      </div>

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
            <p className="detail-brand-line">
              From {product.brand}
              {selectedStock > 0 ? " · In stock" : " · Out of stock"}
            </p>
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
        <div className="detail-thumb-row">
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
            <h2>{optionLabel}</h2>
            <span>{selectedStock > 0 ? `${selectedStock} left` : "Out of stock"}</span>
          </div>
          <div className={`variant-grid${product.variantType === "shade" ? " variant-grid--swatch" : ""}`}>
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
                {variant.color ? <span className="shade-dot" style={{ background: variant.color }} /> : null}
                <span>{variant.value}</span>
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

      {product.description || product.details?.length ? (
        <section className="detail-section">
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

      <div className="detail-buybar">
        <button type="button" className="secondary-cta" onClick={() => addCurrentToCart(false)} disabled={selectedStock <= 0}>
          Add to bag
        </button>
        <button type="button" className="primary-cta" onClick={() => addCurrentToCart(true)} disabled={selectedStock <= 0}>
          Buy now
        </button>
      </div>

      {related.length ? (
        <section className="section-block">
          <div className="section-header">
            <h2>You May Like</h2>
          </div>
          <div className="product-scroll">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

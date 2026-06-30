"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductDetailPage } from "@/components/product-detail-page";
import { useStorefrontData } from "@/components/storefront-data-provider";

export function StorefrontProductRoute({ id }) {
  const { bootstrap, ensureProduct, productsById } = useStorefrontData();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      await ensureProduct(id);
      if (!cancelled) setLoading(false);
    }

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [ensureProduct, id]);

  const productData = productsById.get(id) || null;
  const related = useMemo(() => {
    const product = productData?.product;
    if (!product || !bootstrap?.categories?.length) return [];

    const category = bootstrap.categories.find((item) => item.slug === product.categorySlug || item.id === product.categoryId);
    const candidates = category?.products || [];
    return candidates.filter((item) => item.id !== product.id).slice(0, 8);
  }, [bootstrap, productData]);

  if ((loading && !productData) || !productData?.product) {
    return <div className="page-loading">Loading product…</div>;
  }

  return <ProductDetailPage product={productData.product} related={productData.related?.length ? productData.related : related} />;
}

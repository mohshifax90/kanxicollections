"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductDetailPage } from "@/components/product-detail-page";
import { useStorefrontData } from "@/components/storefront-data-provider";

export function StorefrontProductRoute({ id, initialData = null }) {
  const { bootstrap, ensureProduct, productsById } = useStorefrontData();
  const [loading, setLoading] = useState(!initialData?.product);
  const [localData, setLocalData] = useState(initialData);

  useEffect(() => {
    if (initialData?.product?.id === id) {
      setLocalData(initialData);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      const data = await ensureProduct(id);
      if (!cancelled) {
        setLocalData(data);
        setLoading(false);
      }
    }

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [ensureProduct, id, initialData]);

  const productData = productsById.get(id) || localData || null;
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

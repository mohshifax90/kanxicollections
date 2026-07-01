"use client";

import { CategoryBrowserPage } from "@/components/category-browser-page";
import { useStorefrontData } from "@/components/storefront-data-provider";

export function StorefrontCategoryRoute({ initialSlug = "", initialData = null }) {
  const { loading, bootstrap } = useStorefrontData();
  const baseCategories = initialData?.categories || bootstrap?.categories || [];
  const productsById = initialData?.productsById || {};
  const categories = initialData?.productsById
    ? baseCategories.map((category) => ({
        ...category,
        products: (category.productIds || []).map((id) => productsById[id]).filter(Boolean),
      }))
    : baseCategories;
  const fallbackSlug = initialSlug || initialData?.initialSlug || categories[0]?.slug || "";

  if ((loading && !initialData) || !categories.length) {
    return <div className="page-loading">Loading categories…</div>;
  }

  return <CategoryBrowserPage categories={categories} initialSlug={fallbackSlug} />;
}

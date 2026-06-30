"use client";

import { CategoryBrowserPage } from "@/components/category-browser-page";
import { useStorefrontData } from "@/components/storefront-data-provider";

export function StorefrontCategoryRoute({ initialSlug = "" }) {
  const { loading, bootstrap } = useStorefrontData();
  const categories = bootstrap?.categories || [];
  const fallbackSlug = initialSlug || categories[0]?.slug || "";

  if (loading || !categories.length) {
    return <div className="page-loading">Loading categories…</div>;
  }

  return <CategoryBrowserPage categories={categories} initialSlug={fallbackSlug} />;
}

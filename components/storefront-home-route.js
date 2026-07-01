"use client";

import { HomePage } from "@/components/home-page";
import { useStorefrontData } from "@/components/storefront-data-provider";

export function StorefrontHomeRoute({ initialData = null }) {
  const { loading, bootstrap } = useStorefrontData();
  const homeData = initialData || bootstrap?.home || null;
  const hydratedHomeData = homeData
    ? {
        ...homeData,
        featuredSections: (homeData.featuredSections || []).map((section) => ({
          ...section,
          products: (section.productIds || []).map((id) => homeData.productCards?.[id]).filter(Boolean),
        })),
      }
    : null;

  if ((loading && !hydratedHomeData) || !hydratedHomeData) {
    return <div className="page-loading">Loading storefront…</div>;
  }

  return <HomePage data={hydratedHomeData} />;
}

"use client";

import { HomePage } from "@/components/home-page";
import { useStorefrontData } from "@/components/storefront-data-provider";

export function StorefrontHomeRoute() {
  const { loading, bootstrap } = useStorefrontData();

  if (loading || !bootstrap?.home) {
    return <div className="page-loading">Loading storefront…</div>;
  }

  return <HomePage data={bootstrap.home} />;
}

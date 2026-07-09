import { HomePage } from "@/components/home-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function Page() {
  const initialData = await getStorefrontData();
  const hydratedData = {
    ...initialData,
    featuredSections: (initialData.featuredSections || []).map((section) => ({
      ...section,
      products: (section.productIds || []).map((id) => initialData.productCards?.[id]).filter(Boolean),
    })),
  };
  return (
    <StorefrontShell active="/" brand={hydratedData.brand} logo={hydratedData.logo}>
      <HomePage data={hydratedData} />
    </StorefrontShell>
  );
}

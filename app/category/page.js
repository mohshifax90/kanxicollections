import { StorefrontCategoryRoute } from "@/components/storefront-category-route";
import { StorefrontShell } from "@/components/storefront-shell";
import { getCategoryBrowser } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function CategoryPage() {
  const initialData = await getCategoryBrowser();
  return (
    <StorefrontShell active="/category" brand={initialData.brand} logo={initialData.logo}>
      <StorefrontCategoryRoute initialData={initialData} />
    </StorefrontShell>
  );
}

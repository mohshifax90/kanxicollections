import { CategoryBrowserPage } from "@/components/category-browser-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getCategoryBrowser } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function CategoryPage() {
  const data = await getCategoryBrowser();

  return (
    <StorefrontShell active="/category" brand={data.brand} logo={data.logo}>
      <CategoryBrowserPage categories={data.categories} initialSlug={data.initialSlug} />
    </StorefrontShell>
  );
}

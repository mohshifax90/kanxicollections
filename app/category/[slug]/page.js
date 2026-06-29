import { CategoryBrowserPage } from "@/components/category-browser-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getCategoryBrowser } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function CategorySlugPage({ params }) {
  const { slug } = await params;
  const data = await getCategoryBrowser(slug);

  return (
    <StorefrontShell active="/category" brand={data.brand} logo={data.logo}>
      <CategoryBrowserPage categories={data.categories} initialSlug={data.initialSlug} />
    </StorefrontShell>
  );
}

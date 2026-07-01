import { StorefrontCategoryRoute } from "@/components/storefront-category-route";
import { StorefrontShell } from "@/components/storefront-shell";
import { getCategoryBrowser, getStoreShellData } from "@/lib/storefront-data";

export const revalidate = 30;

export async function generateStaticParams() {
  const data = await getStoreShellData();
  return (data.categories || []).map((category) => ({
    slug: category.slug,
  }));
}

export default async function CategorySlugPage({ params }) {
  const { slug } = await params;
  const initialData = await getCategoryBrowser(slug);

  return (
    <StorefrontShell active="/category">
      <StorefrontCategoryRoute initialSlug={slug} initialData={initialData} />
    </StorefrontShell>
  );
}

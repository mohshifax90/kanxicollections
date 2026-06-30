import { StorefrontCategoryRoute } from "@/components/storefront-category-route";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStoreShellData } from "@/lib/storefront-data";

export const revalidate = 30;

export async function generateStaticParams() {
  const data = await getStoreShellData();
  return (data.categories || []).map((category) => ({
    slug: category.slug,
  }));
}

export default async function CategorySlugPage({ params }) {
  const { slug } = await params;

  return (
    <StorefrontShell active="/category">
      <StorefrontCategoryRoute initialSlug={slug} />
    </StorefrontShell>
  );
}

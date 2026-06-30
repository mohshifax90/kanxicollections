import { StorefrontCategoryRoute } from "@/components/storefront-category-route";
import { StorefrontShell } from "@/components/storefront-shell";

export const revalidate = 30;

export default function CategoryPage() {
  return (
    <StorefrontShell active="/category">
      <StorefrontCategoryRoute />
    </StorefrontShell>
  );
}

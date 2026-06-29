import { PlaceholderPage } from "@/components/placeholder-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function WishlistPage() {
  const data = await getStorefrontData();

  return (
    <StorefrontShell active="/wishlist" brand={data.brand} logo={data.logo}>
      <PlaceholderPage
        title="Wishlist"
        copy="Saved products can be restyled here with the same soft card language as the new home feed."
        items={[
          { title: "Saved Drops", copy: "Collections of favorites with stock and price badges.", icon: "♡" },
          { title: "Gift List", copy: "Shared favorites and curated picks.", icon: "🎁" },
        ]}
      />
    </StorefrontShell>
  );
}

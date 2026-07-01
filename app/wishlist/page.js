import { PlaceholderPage } from "@/components/placeholder-page";
import { StorefrontShell } from "@/components/storefront-shell";

export const revalidate = 30;

export default function WishlistPage() {
  return (
    <StorefrontShell active="/wishlist">
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

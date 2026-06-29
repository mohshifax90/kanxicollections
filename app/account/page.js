import { PlaceholderPage } from "@/components/placeholder-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function AccountPage() {
  const data = await getStorefrontData();

  return (
    <StorefrontShell active="/account" brand={data.brand} logo={data.logo}>
      <PlaceholderPage
        title="Account"
        copy="Profile, addresses, orders, and payment methods can be folded into this new shell without the old static page sprawl."
        items={[
          { title: "Orders", copy: "Track order history with the new softer mobile layout.", icon: "📦" },
          { title: "Addresses", copy: "Manage saved locations and preferred delivery setup.", icon: "📍" },
          { title: "Payments", copy: "See saved methods and checkout defaults.", icon: "💳" },
        ]}
      />
    </StorefrontShell>
  );
}

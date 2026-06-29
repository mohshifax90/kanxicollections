import { PlaceholderPage } from "@/components/placeholder-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function PlaygroundPage() {
  const data = await getStorefrontData();

  return (
    <StorefrontShell active="/playground" brand={data.brand} logo={data.logo}>
      <PlaceholderPage
        title="Playground"
        copy="This route is ready for promos, game mechanics, and rewards modules styled to the new storefront direction."
        items={[
          { title: "Rewards", copy: "Tier and points experiences can live here.", icon: "🪙" },
          { title: "Events", copy: "Campaign launches and timed challenges.", icon: "🎉" },
          { title: "Drops", copy: "Short-lived promo cards and countdowns.", icon: "⏰" },
        ]}
      />
    </StorefrontShell>
  );
}

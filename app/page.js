import { StorefrontHomeRoute } from "@/components/storefront-home-route";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function Page() {
  const initialData = await getStorefrontData();
  return (
    <StorefrontShell active="/" brand={initialData.brand} logo={initialData.logo}>
      <StorefrontHomeRoute initialData={initialData} />
    </StorefrontShell>
  );
}

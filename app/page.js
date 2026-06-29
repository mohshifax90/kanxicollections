import { HomePage } from "@/components/home-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function Page() {
  const data = await getStorefrontData();

  return (
    <StorefrontShell active="/" brand={data.brand} logo={data.logo}>
      <HomePage data={data} />
    </StorefrontShell>
  );
}

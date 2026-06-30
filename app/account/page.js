import { AccountPageClient } from "@/components/account-page-client";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function AccountPage() {
  const data = await getStorefrontData();

  return (
    <StorefrontShell active="/account" brand={data.brand} logo={data.logo}>
      <AccountPageClient />
    </StorefrontShell>
  );
}

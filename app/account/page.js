import { AccountPageClient } from "@/components/account-page-client";
import { StorefrontShell } from "@/components/storefront-shell";

export const revalidate = 30;

export default function AccountPage() {
  return (
    <StorefrontShell active="/account">
      <AccountPageClient />
    </StorefrontShell>
  );
}

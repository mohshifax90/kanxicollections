import { StorefrontHomeRoute } from "@/components/storefront-home-route";
import { StorefrontShell } from "@/components/storefront-shell";

export const revalidate = 30;

export default function Page() {
  return (
    <StorefrontShell active="/">
      <StorefrontHomeRoute />
    </StorefrontShell>
  );
}

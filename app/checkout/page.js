import { CheckoutPage } from "@/components/checkout-page";
import { StorefrontShell } from "@/components/storefront-shell";

export const revalidate = 30;

export default function CheckoutRoute() {
  return (
    <StorefrontShell active="/checkout">
      <CheckoutPage />
    </StorefrontShell>
  );
}

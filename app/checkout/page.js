import { CheckoutPage } from "@/components/checkout-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getCheckoutData } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function CheckoutRoute() {
  const data = await getCheckoutData();

  return (
    <StorefrontShell active="/checkout" brand={data.brand} logo={data.logo}>
      <CheckoutPage
        paymentMethods={data.paymentMethods}
        deliveryMethods={data.deliveryMethods}
        bankTransfer={data.bankTransfer}
      />
    </StorefrontShell>
  );
}

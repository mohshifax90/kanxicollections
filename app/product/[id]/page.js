import { StorefrontProductRoute } from "@/components/storefront-product-route";
import { StorefrontShell } from "@/components/storefront-shell";
import { getProductDetail, getProductIds } from "@/lib/storefront-data";

export const revalidate = 30;

export async function generateStaticParams() {
  const ids = await getProductIds();
  return ids.map((id) => ({ id }));
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const initialData = await getProductDetail(id);

  return (
    <StorefrontShell hideHeader>
      <StorefrontProductRoute id={id} initialData={initialData} />
    </StorefrontShell>
  );
}

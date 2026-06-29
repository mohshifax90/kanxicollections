import { ProductDetailPage } from "@/components/product-detail-page";
import { StorefrontShell } from "@/components/storefront-shell";
import { getProductDetail } from "@/lib/storefront-data";

export const revalidate = 30;

export default async function ProductPage({ params }) {
  const { id } = await params;
  const data = await getProductDetail(id);

  return (
    <StorefrontShell brand={data.brand} logo={data.logo}>
      <ProductDetailPage product={data.product} related={data.related} />
    </StorefrontShell>
  );
}

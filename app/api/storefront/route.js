import { getCheckoutData, getProductDetail, getStoreShellData } from "@/lib/storefront-data";

export async function GET(request) {
  const view = request.nextUrl.searchParams.get("view") || "bootstrap";

  if (view === "product") {
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!id) {
      return Response.json({ error: "Missing product id." }, { status: 400 });
    }
    const data = await getProductDetail(id);
    return Response.json(data);
  }

  if (view === "checkout") {
    const data = await getCheckoutData();
    return Response.json(data);
  }

  const data = await getStoreShellData();
  return Response.json(data);
}

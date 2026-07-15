function parseProductsParam(products = "") {
  const input = String(products || "").trim();
  if (!input) {
    throw new Error("Missing products parameter.");
  }

  return input.split(",").reduce((result, entry) => {
    const [productIdRaw, quantityRaw] = String(entry || "").split(":");
    const productId = String(productIdRaw || "").trim();
    const quantity = Number.parseInt(String(quantityRaw || "").trim(), 10);

    if (!productId || Number.isNaN(quantity) || quantity < 1) {
      throw new Error(`Invalid product entry: "${entry}"`);
    }

    result[productId] = quantity;
    return result;
  }, {});
}

export async function GET(request) {
  try {
    const products = request.nextUrl.searchParams.get("products") || "";
    const coupon = request.nextUrl.searchParams.get("coupon");

    const productQuantities = parseProductsParam(products);

    return Response.json({
      products: productQuantities,
      coupon: coupon ? coupon : "No coupon applied",
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Invalid checkout request.",
      },
      { status: 400 },
    );
  }
}

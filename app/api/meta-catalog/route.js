import { fetchRawStoreData } from "@/lib/storefront-data";

const DEFAULT_BRAND = "Kanxi Collection";
const DEFAULT_CONDITION = "new";

function stripText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImage(value) {
  return String(value || "").trim();
}

function escapeField(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function productLink(origin, productId) {
  return `${origin}/product/${encodeURIComponent(productId)}`;
}

function activeBatchFor(productId, variantId, batches = []) {
  const exact = batches
    .filter((batch) => batch.productId === productId && (batch.variantId || null) === (variantId || null))
    .sort((a, b) => Number(a.date || 0) - Number(b.date || 0));
  const available = exact.find((batch) => Number(batch.stock || 0) > 0);
  return available || exact[exact.length - 1] || null;
}

function categoryMap(categories = []) {
  return new Map(
    categories.map((category) => [
      category.id,
      {
        name: category.name || "",
        slug: category.slug || "",
      },
    ]),
  );
}

function subcategoryMap(subcategories = []) {
  return new Map(
    subcategories.map((subcategory) => [
      subcategory.id,
      {
        name: subcategory.name || "",
      },
    ]),
  );
}

function baseImageForProduct(product = {}) {
  return (
    normalizeImage(product.image) ||
    normalizeImage(Array.isArray(product.images) ? product.images[0] : "") ||
    normalizeImage(product.photo) ||
    ""
  );
}

function galleryForProduct(product = {}, variant = null) {
  const variantImages = [
    normalizeImage(variant?.image),
    ...(Array.isArray(variant?.images) ? variant.images.map(normalizeImage) : []),
  ].filter(Boolean);
  const productImages = [
    baseImageForProduct(product),
    ...(Array.isArray(product.images) ? product.images.map(normalizeImage) : []),
  ].filter(Boolean);
  return [...new Set([...variantImages, ...productImages])];
}

function rowForProduct({ product, variant = null, batch, origin, categoryInfo, subcategoryInfo }) {
  const gallery = galleryForProduct(product, variant);
  const mainImage = gallery[0] || "";
  const extraImages = gallery.slice(1, 20).join(",");
  const price = Number(batch?.sellingPrice || product.price || 0);
  const oldPrice = Number(product.oldPrice || 0);
  const stock = Math.max(0, Number(batch?.stock || 0));
  const id = variant?.id ? `${product.id}_${variant.id}` : product.id;
  const title = [product.brand || DEFAULT_BRAND, product.name || "Product", variant?.value || ""]
    .filter(Boolean)
    .join(" - ");
  const description = stripText(product.description || product.caption || product.name || "Kanxi Collection product");
  const customLabel0 = categoryInfo?.name || "";
  const customLabel1 = subcategoryInfo?.name || "";
  const customLabel2 = Array.isArray(product.tags) ? product.tags.join(",") : "";

  return [
    id,
    title,
    description,
    stock > 0 ? "in stock" : "out of stock",
    DEFAULT_CONDITION,
    `${price.toFixed(2)} MVR`,
    productLink(origin, product.id),
    mainImage,
    product.brand || DEFAULT_BRAND,
    oldPrice > price && price > 0 ? `${oldPrice.toFixed(2)} MVR` : "",
    extraImages,
    variant?.id ? product.id : "",
    categoryInfo?.name || "",
    variant?.color || "",
    variant?.value || "",
    customLabel0,
    customLabel1,
    customLabel2,
  ];
}

export async function GET(request) {
  const data = await fetchRawStoreData();
  const categories = categoryMap(Array.isArray(data.categories) ? data.categories : []);
  const subcategories = subcategoryMap(Array.isArray(data.subcategories) ? data.subcategories : []);
  const products = Array.isArray(data.products) ? data.products : [];
  const batches = Array.isArray(data.batches) ? data.batches : [];
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/\/$/, "")?.replace(/^/, "https://") ||
    request.nextUrl.origin;

  const header = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
    "sale_price",
    "additional_image_link",
    "item_group_id",
    "product_type",
    "color",
    "size",
    "custom_label_0",
    "custom_label_1",
    "custom_label_2",
  ];

  const rows = products
    .filter((product) => product && product.status !== "archived")
    .flatMap((product) => {
      const categoryInfo = categories.get(product.categoryId) || null;
      const subcategoryInfo = subcategories.get(product.subId) || null;
      const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];

      if (variants.length) {
        return variants.map((variant) =>
          rowForProduct({
            product,
            variant,
            batch: activeBatchFor(product.id, variant.id, batches),
            origin,
            categoryInfo,
            subcategoryInfo,
          }),
        );
      }

      return [
        rowForProduct({
          product,
          variant: null,
          batch: activeBatchFor(product.id, null, batches),
          origin,
          categoryInfo,
          subcategoryInfo,
        }),
      ];
    });

  const body = [header, ...rows]
    .map((cols) => cols.map(escapeField).join("\t"))
    .join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/tab-separated-values; charset=utf-8",
      "Cache-Control": "s-maxage=900, stale-while-revalidate=3600",
      "Content-Disposition": 'inline; filename="kanxi-meta-catalog.tsv"',
    },
  });
}

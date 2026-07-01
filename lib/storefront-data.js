import {
  buildStorefrontSnapshot,
  CATEGORY_BROWSER_ROW_ID,
  CHECKOUT_ROW_ID,
  FULL_ROW_ID,
  HOME_ROW_ID,
  productDetailRowId,
  SHELL_ROW_ID,
  STOREFRONT_ROW_ID,
} from "@/lib/storefront-snapshot";

const SUPABASE_URL = "https://kssztommozejlnvtwokn.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZF1BVt1m6KpuiRDZlgF0mw_OxC0L1rb";
const TABLE = "kanxi_site_data";
const STORE_TTL_MS = 30_000;
const STORE_REVALIDATE_SECONDS = 10;
const MAX_STOREFRONT_BYTES = 1_990_000;
const IS_DEV = process.env.NODE_ENV !== "production";
const SUPABASE_TIMEOUT_MS = IS_DEV ? 8_000 : 1_200;
let lastSuccessfulStore = null;
let lastSuccessfulStoreAt = 0;
let inflightStorePromise = null;
let lastSuccessfulFullStore = null;
let lastSuccessfulFullStoreAt = 0;
let inflightFullStorePromise = null;
const routeRowCache = new Map();
const inflightRouteRows = new Map();
let lastDerivedSummarySource = null;
let lastDerivedSummary = null;
let lastDerivedDetailSource = null;
let lastDerivedDetail = null;
const BLANK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'%3E%3Crect width='640' height='640' rx='48' fill='%23f4f1ea'/%3E%3Ccircle cx='230' cy='210' r='52' fill='%23f7b3d5' fill-opacity='.55'/%3E%3Ccircle cx='426' cy='258' r='92' fill='%23fde68a' fill-opacity='.5'/%3E%3Cpath d='M175 416c52-90 112-136 179-136s123 37 169 111l20 25H149z' fill='%23d8d4cc'/%3E%3C/svg%3E";

function cleanImage(value) {
  const src = String(value || "").trim();
  if (!src || src.includes("images.unsplash.com/")) return "";
  return src;
}

function hashValue(value) {
  return String(value || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function tagMap(tags = []) {
  return new Map(tags.map((tag) => [tag.id, tag.name]));
}

function defaultStoreData() {
  return {
    categories: [],
    subcategories: [],
    tags: [],
    products: [],
    batches: [],
    homepage: {
      menu: { items: [] },
      collections: { cards: [] },
      sections: [],
    },
    paymentSettings: {
      methods: [],
      bankTransfer: { bankName: "", accountNumber: "" },
    },
    deliverySettings: { methods: [] },
  };
}

function buildFallbackData() {
  const hero = {
    eyebrow: "Haruharu Wonder",
    title: "Buy 1 Get Toner",
    subtitle: "SNS Sensation | UP TO 25%",
    progress: "14 | 18",
    image: BLANK_IMAGE,
  };
  return {
    brand: "kanxi.collection",
    menu: ["Beauty Awards", "Ranking", "Welcome", "Member", "Sun Care"],
    hero,
    heroSlides: [hero, hero, hero],
    quickLinks: [
      { label: "Suncare", icon: "☀️", href: "/category/skincare" },
      { label: "Serum", icon: "💧", href: "/category/skincare" },
      { label: "Lip", icon: "💄", href: "/category/makeup" },
      { label: "Cream", icon: "🧴", href: "/category/skincare" },
      { label: "Cleansing", icon: "✨", href: "/category/skincare" },
      { label: "Eye", icon: "🖊️", href: "/category/makeup" },
      { label: "MGS", icon: "✈️", href: "/category/skincare" },
      { label: "Ranking", icon: "🫧", href: "/category/makeup" },
      { label: "Game", icon: "🎮", href: "/category/clothing" },
      { label: "Link & Earn", icon: "🪙", href: "/category/bags" },
      { label: "Cushion", icon: "🩷", href: "/category/makeup" },
      { label: "Toner", icon: "🧊", href: "/category/skincare" },
    ],
    featuredSections: [],
  };
}

function hasRouteCategories(row) {
  return !!(row && Array.isArray(row.categories) && row.categories.length);
}

function iconForLabel(label) {
  const value = String(label || "").toLowerCase();
  if (value.includes("sun")) return "☀️";
  if (value.includes("serum")) return "💧";
  if (value.includes("lip")) return "💄";
  if (value.includes("cream")) return "🧴";
  if (value.includes("clean")) return "✨";
  if (value.includes("eye")) return "🖊️";
  if (value.includes("rank")) return "🫧";
  if (value.includes("game")) return "🎮";
  if (value.includes("earn")) return "🪙";
  if (value.includes("bag")) return "👜";
  if (value.includes("watch")) return "⌚";
  if (value.includes("skin")) return "🧼";
  return "◻️";
}

function categoryIconKey(value) {
  const label = String(value || "").toLowerCase();
  if (label.includes("cloth") || label.includes("apparel")) return "shirt";
  if (label.includes("skin")) return "sparkles";
  if (label.includes("frag")) return "spray-can";
  if (label.includes("bag")) return "shopping-bag";
  if (label.includes("hair")) return "scissors";
  if (label.includes("shoe")) return "footprints";
  if (label.includes("make")) return "palette";
  if (label.includes("serum")) return "droplets";
  if (label.includes("sun")) return "sun-medium";
  if (label.includes("cream")) return "badge-plus";
  if (label.includes("clean")) return "sparkle";
  return "grid-2x2";
}

function activeBatchFor(productId, variantId, batches = []) {
  const exact = batches
    .filter((batch) => batch.productId === productId && (batch.variantId || null) === (variantId || null))
    .sort((a, b) => Number(a.date || 0) - Number(b.date || 0));
  const available = exact.find((batch) => Number(batch.stock || 0) > 0);
  return available || exact[exact.length - 1] || null;
}

function productPrimaryImage(product, variant) {
  const firstVariant = Array.isArray(product.variants) && product.variants.length ? product.variants[0] : null;
  return (
    cleanImage(variant?.image) ||
    cleanImage((variant?.images || [])[0]) ||
    cleanImage(product.image) ||
    cleanImage(product.photo) ||
    cleanImage(firstVariant?.image) ||
    cleanImage((firstVariant?.images || [])[0]) ||
    BLANK_IMAGE
  );
}

function explicitVariantImage(variant) {
  return cleanImage(variant?.image) || cleanImage((variant?.images || [])[0]) || "";
}

function galleryFor(product, variant) {
  const variantImages = [
    ...((variant?.images || []).map(cleanImage).filter(Boolean) || []),
    cleanImage(variant?.image),
  ].filter(Boolean);
  const productImages = [
    ...((product.images || []).map(cleanImage).filter(Boolean) || []),
    cleanImage(product.image),
    cleanImage(product.photo),
  ].filter(Boolean);
  const gallery = [...variantImages, ...productImages].filter(Boolean);
  return gallery.length ? [...new Set(gallery)] : [BLANK_IMAGE];
}

function productSummary(product, data, tags, categoriesById, subcategoriesById) {
  const hash = hashValue(product.id);
  const firstVariant = Array.isArray(product.variants) && product.variants.length ? product.variants[0] : null;
  const leadBatch = activeBatchFor(product.id, firstVariant?.id || null, data.batches);
  const basePrice = Number(leadBatch?.sellingPrice || product.price || 0);
  const oldPrice = Number(product.oldPrice || 0);
  const hasDiscount = oldPrice > basePrice && basePrice > 0;
  const discountPercent = hasDiscount ? Math.round(((oldPrice - basePrice) / oldPrice) * 100) : 0;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const stockTotal = variants.length
    ? variants.reduce((sum, variant) => sum + Math.max(0, Number(activeBatchFor(product.id, variant.id, data.batches)?.stock || 0)), 0)
    : Math.max(0, Number(activeBatchFor(product.id, null, data.batches)?.stock || 0));

  return {
    id: product.id,
    slug: product.id,
    name: product.name || "Kanxi Pick",
    brand: product.brand || "Kanxi Collection",
    image: productPrimaryImage(product),
    price: basePrice,
    oldPrice,
    tag: (product.tags || []).map((id) => tags.get(id)).find(Boolean) || "",
    categoryId: product.categoryId || "",
    categorySlug: categoriesById.get(product.categoryId)?.slug || "",
    categoryName: categoriesById.get(product.categoryId)?.name || "",
    subcategoryId: product.subId || "",
    subcategoryName: subcategoriesById.get(product.subId)?.name || "",
    discountPercent,
    likes: 700 + (hash % 24000),
    rating: (4.6 + ((hash % 5) * 0.1)).toFixed(1),
    reviews: 2 + (hash % 7600),
    variantCount: variants.length,
    perks: [hasDiscount ? `Get for MVR ${Math.round(basePrice * 0.7)}` : "", "Freebie"].filter(Boolean),
    gallery: galleryFor(product),
    stockTotal,
  };
}

function buildProductDetail(product, data, tags, categoriesById, subcategoriesById) {
  const summary = productSummary(product, data, tags, categoriesById, subcategoriesById);
  const variants = (product.variants || []).map((variant) => {
    const batch = activeBatchFor(product.id, variant.id, data.batches);
    return {
      id: variant.id,
      value: variant.value,
      color: variant.color || null,
      sku: variant.sku || "",
      image: explicitVariantImage(variant),
      gallery: galleryFor(product, variant),
      stock: Math.max(0, Number(batch?.stock || 0)),
      price: Number(batch?.sellingPrice || product.price || 0),
    };
  });

  const baseBatch = activeBatchFor(product.id, null, data.batches);

  return {
    ...summary,
    description: product.description || "",
    details: Array.isArray(product.details) ? product.details : [],
    variantType: product.variantType || "none",
    variants,
    baseStock: variants.length ? summary.stockTotal : Math.max(0, Number(baseBatch?.stock || 0)),
    basePrice: variants.length ? summary.price : Number(baseBatch?.sellingPrice || product.price || 0),
    heroImage: variants[0]?.image || summary.image,
  };
}

function findProductsBySource(data, section) {
  const products = data.products || [];
  if (!section) return products;
  const sourceValue = String(section.sourceValue || "").toLowerCase();

  if (section.sourceType === "category") {
    const category = (data.categories || []).find(
      (item) => item.slug === sourceValue || item.id === section.sourceValue,
    );
    return products.filter((item) => item.categoryId === category?.id);
  }

  if (section.sourceType === "tag") {
    return products.filter((item) => (item.tags || []).includes(section.sourceValue));
  }

  if (section.sourceType === "offers") {
    return products.filter((item) => item.oldPrice && item.oldPrice > item.price);
  }

  if (section.sourceType === "new_arrivals") {
    return products.filter((item) => (item.tags || []).includes("t1"));
  }

  if (section.sourceType === "bestsellers") {
    return products.filter((item) => (item.tags || []).includes("t3"));
  }

  if (section.sourceType === "trending") {
    return products
      .filter((item) => item.status === "active")
      .sort((a, b) => hashValue(b.id) - hashValue(a.id));
  }

  if (section.sourceType === "recommended") {
    return [...products]
      .filter((item) => item.status === "active")
      .sort((a, b) => hashValue(`${a.id}-rec`) - hashValue(`${b.id}-rec`));
  }

  return products;
}

async function supabaseFetchRow(rowId, useNextCache = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(rowId)}&select=data&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      ...(useNextCache ? { next: { revalidate: STORE_REVALIDATE_SECONDS } } : { cache: "no-store" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
    const payload = await response.json();
    return payload?.[0]?.data || null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRouteRow(rowId) {
  const cached = routeRowCache.get(rowId);
  if (cached && Date.now() - cached.at < STORE_TTL_MS) {
    return cached.data;
  }
  if (inflightRouteRows.has(rowId)) {
    return inflightRouteRows.get(rowId);
  }

  const promise = (async () => {
    try {
      const data = await supabaseFetchRow(rowId, false);
      if (data) routeRowCache.set(rowId, { data, at: Date.now() });
      return data;
    } catch {
      return cached?.data || null;
    } finally {
      inflightRouteRows.delete(rowId);
    }
  })();

  inflightRouteRows.set(rowId, promise);
  return promise;
}

async function fetchFullStoreData() {
  if (lastSuccessfulFullStore && Date.now() - lastSuccessfulFullStoreAt < STORE_TTL_MS) {
    return lastSuccessfulFullStore;
  }
  if (inflightFullStorePromise) return inflightFullStorePromise;

  inflightFullStorePromise = (async () => {
    try {
      const data = await supabaseFetchRow(FULL_ROW_ID, false);
      if (data) {
        lastSuccessfulFullStore = data;
        lastSuccessfulFullStoreAt = Date.now();
      }
      return data || lastSuccessfulFullStore || defaultStoreData();
    } catch (error) {
      try {
        const fallbackStorefront = await supabaseFetchRow(STOREFRONT_ROW_ID, false);
        if (fallbackStorefront && Array.isArray(fallbackStorefront.products) && fallbackStorefront.products.length) {
          lastSuccessfulStore = fallbackStorefront;
          lastSuccessfulStoreAt = Date.now();
          return fallbackStorefront;
        }
      } catch (_fallbackError) {}
      if (error?.name !== "AbortError") {
        console.error("full storefront data error", error);
      }
      return lastSuccessfulFullStore || defaultStoreData();
    } finally {
      inflightFullStorePromise = null;
    }
  })();

  return inflightFullStorePromise;
}

async function persistStorefrontSnapshot(data) {
  const snapshot = buildStorefrontSnapshot(data);
  await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: STOREFRONT_ROW_ID,
      data: snapshot,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  return snapshot;
}

async function persistRouteDatasets(data) {
  const datasets = buildRouteDatasets(data);
  const updatedAt = new Date().toISOString();
  const rows = [
    { id: STOREFRONT_ROW_ID, data: datasets.storefrontSnapshot },
    { id: SHELL_ROW_ID, data: datasets.shell },
    { id: HOME_ROW_ID, data: datasets.home },
    { id: CATEGORY_BROWSER_ROW_ID, data: datasets.categoryBrowser },
    { id: CHECKOUT_ROW_ID, data: datasets.checkout },
    ...datasets.productRows,
  ];

  await Promise.all(
    rows.map((row) =>
      fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: row.id,
          data: row.data,
          updated_at: updatedAt,
        }),
        cache: "no-store",
      }),
    ),
  );
}

function snapshotTooLarge(data) {
  try {
    return JSON.stringify(data || {}).length > MAX_STOREFRONT_BYTES;
  } catch {
    return true;
  }
}

export async function fetchRawStoreData() {
  if (IS_DEV) {
    const full = await fetchFullStoreData();
    if (full && Array.isArray(full.products) && full.products.length) {
      lastSuccessfulStore = full;
      lastSuccessfulStoreAt = Date.now();
      return full;
    }
    return full || lastSuccessfulStore || defaultStoreData();
  }

  if (lastSuccessfulStore && Date.now() - lastSuccessfulStoreAt < STORE_TTL_MS) {
    return lastSuccessfulStore;
  }
  if (inflightStorePromise) return inflightStorePromise;

  let timeout;
  inflightStorePromise = (async () => {
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 4000);
      let data = null;
      try {
        data = await supabaseFetchRow(STOREFRONT_ROW_ID, false);
      } catch (_error) {
        data = null;
      }

      if (data && snapshotTooLarge(data)) data = null;

      const finalData = data || defaultStoreData();
      if (Array.isArray(finalData.products) && finalData.products.length) {
        lastSuccessfulStore = finalData;
        lastSuccessfulStoreAt = Date.now();
      }
      return finalData;
    } catch (error) {
      if (error?.name !== "AbortError") console.error("storefront data error", error);
      return lastSuccessfulStore || defaultStoreData();
    } finally {
      if (timeout) clearTimeout(timeout);
      inflightStorePromise = null;
    }
  })();

  return inflightStorePromise;
}

export function primeStorefrontCaches(fullData = null, datasets = null) {
  const now = Date.now();
  if (fullData && typeof fullData === "object") {
    lastSuccessfulFullStore = fullData;
    lastSuccessfulFullStoreAt = now;
  }

  if (datasets?.storefrontSnapshot) {
    lastSuccessfulStore = datasets.storefrontSnapshot;
    lastSuccessfulStoreAt = now;
    routeRowCache.set(STOREFRONT_ROW_ID, { data: datasets.storefrontSnapshot, at: now });
  }
  if (datasets?.shell) routeRowCache.set(SHELL_ROW_ID, { data: datasets.shell, at: now });
  if (datasets?.home) routeRowCache.set(HOME_ROW_ID, { data: datasets.home, at: now });
  if (datasets?.categoryBrowser) routeRowCache.set(CATEGORY_BROWSER_ROW_ID, { data: datasets.categoryBrowser, at: now });
  if (datasets?.checkout) routeRowCache.set(CHECKOUT_ROW_ID, { data: datasets.checkout, at: now });
  for (const row of datasets?.productRows || []) {
    if (row?.id && row?.data) routeRowCache.set(row.id, { data: row.data, at: now });
  }
}

function buildDerivedStore(data, options = {}) {
  const includeProductDetails = options.includeProductDetails === true;
  if (includeProductDetails && lastDerivedDetailSource === data && lastDerivedDetail) {
    return lastDerivedDetail;
  }
  if (!includeProductDetails && lastDerivedSummarySource === data && lastDerivedSummary) {
    return lastDerivedSummary;
  }
  const tags = tagMap(data.tags);
  const categoriesById = new Map((data.categories || []).map((category) => [category.id, category]));
  const categoriesBySlug = new Map((data.categories || []).map((category) => [category.slug, category]));
  const subcategoriesById = new Map((data.subcategories || []).map((subcategory) => [subcategory.id, subcategory]));

  const categories = (data.categories || [])
    .filter((category) => category.active !== false)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon || "",
      image: cleanImage(category.image) || "",
      title: category.title || category.name,
      href: `/category/${category.slug}`,
      subcategories: (data.subcategories || [])
        .filter((subcategory) => subcategory.categoryId === category.id)
        .map((subcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
          image: cleanImage(subcategory.image) || "",
        })),
      brands: Array.isArray(category.brands)
        ? category.brands.map((brand) => ({
            id: brand.id,
            name: brand.name || "",
            logo: cleanImage(brand.logo) || "",
          }))
        : [],
    }));

  const allBrands = categories.flatMap((category) =>
    (category.brands || []).map((brand) => ({
      ...brand,
      categoryId: category.id,
      categoryName: category.name,
    })),
  );
  const allBrandsById = new Map(allBrands.map((brand) => [brand.id, brand]));

  const productSummaries = (data.products || []).map((product) =>
    productSummary(product, data, tags, categoriesById, subcategoriesById),
  );
  const productSummaryMap = new Map(productSummaries.map((product) => [product.id, product]));

  const productDetails = includeProductDetails
    ? productSummaries.map((summary) => {
        const raw = (data.products || []).find((product) => product.id === summary.id);
        return buildProductDetail(raw, data, tags, categoriesById, subcategoriesById);
      })
    : productSummaries;

  const productDetailMap = new Map(productDetails.map((product) => [product.id, product]));

  const homepage = data.homepage || {};
  const collections = homepage.collections?.cards || [];
  const heroSource = collections[0] || {};
  const heroProducts = findProductsBySource(data, homepage.sections?.[0]).map((product) =>
    productSummary(product, data, tags, categoriesById, subcategoriesById),
  );
  const heroProduct = heroProducts[0] || productSummaries[0] || {};
  const heroImage = cleanImage(heroSource.image) || heroProduct.image || BLANK_IMAGE;
  const heroSlides = (collections.length ? collections : [heroSource])
    .map((card, index) => {
      const fallbackProduct = heroProducts[index] || productSummaries[index] || heroProduct || {};
      const slideImage = cleanImage(card?.image) || fallbackProduct.image || BLANK_IMAGE;
      return {
        eyebrow: fallbackProduct.brand || "Kanxi Collection",
        title: card?.caption || fallbackProduct.name || "Shop the latest",
        subtitle: fallbackProduct.oldPrice
          ? `Save on selected picks | UP TO ${Math.max(
              10,
              Math.round(((fallbackProduct.oldPrice - fallbackProduct.price) / fallbackProduct.oldPrice) * 100),
            )}%`
          : "Fresh drops curated for your routine",
        progress: `${Math.min(index + 1, Math.max(collections.length || 1, 1))} | ${Math.max(collections.length || 1, 1)}`,
        image: slideImage,
        overlayColor: card?.overlayColor || "#121016",
      };
    })
    .filter((slide) => slide.image);

  const menuCategoryLinks = (homepage.menu?.items || [])
    .map((item) => {
      const category = categoriesBySlug.get(String(item.linkValue || "").toLowerCase());
      if (!category) return null;
      return {
        label: item.label || category.name || "Kanxi",
        icon: iconForLabel(item.label || category.name),
        iconKey: categoryIconKey(item.label || category.name || category.slug || ""),
        image: category.image || "",
        href: `/category/${category.slug}`,
        slug: category.slug,
      };
    })
    .filter(Boolean);

  const remainingCategoryLinks = categories
    .filter((category) => !menuCategoryLinks.some((item) => item.slug === category.slug))
    .map((category) => ({
      label: category.name || "Kanxi",
      icon: iconForLabel(category.name),
      iconKey: categoryIconKey(category.name || category.slug || ""),
      image: category.image || "",
      href: `/category/${category.slug}`,
      slug: category.slug,
    }));

  const quickLinks = [...menuCategoryLinks, ...remainingCategoryLinks]
    .slice(0, 12)
    .map((item) => {
      const category = categoriesBySlug.get(item.slug) || categories.find((category) => category.slug === item.slug);
      return {
        label: item.label || item.name || "Kanxi",
        icon: iconForLabel(item.label || item.name),
        iconKey: categoryIconKey(item.label || item.name || category?.slug || ""),
        image: category?.image || "",
        href: category ? `/category/${category.slug}` : "/category",
      };
    });

  const featuredBrands = (((homepage.brands && homepage.brands.brandIds) || []).map((brandId) => allBrandsById.get(brandId)).filter(Boolean));

  const baseSections = (homepage.sections || [])
    .filter((section) => section.enabled !== false)
    .map((section) => {
      const sourceProducts = findProductsBySource(data, section)
        .slice(0, Number(section.limit || 6))
        .map((product) => productSummaryMap.get(product.id) || productSummary(product, data, tags, categoriesById, subcategoriesById));
      const category = section.sourceType === "category" ? categoriesBySlug.get(String(section.sourceValue || "").toLowerCase()) : null;
      return {
        id: section.id,
        title: section.title || "Featured",
        sourceType: section.sourceType || "category",
        href: category ? `/category/${category.slug}` : category?.href || "/category",
        products: sourceProducts,
      };
    })
    .filter((section) => section.products.length);

  const featuredSections = baseSections;

  const derived = {
    raw: data,
    categories,
    categoriesBySlug,
    products: productSummaries,
    productMap: productDetailMap,
    paymentMethods: (data.paymentSettings?.methods || []).filter((method) => method.enabled !== false),
    deliveryMethods: (data.deliverySettings?.methods || []).filter((method) => method.enabled !== false),
    homepage: {
      brand: "kanxi.collection",
      logo: cleanImage(homepage.header?.logo) || "",
      menu: (homepage.menu?.items || []).map((item) => item.label).filter(Boolean).slice(0, 5),
      hero: {
        eyebrow: heroProduct.brand || "Kanxi Collection",
        title: heroSource.caption || heroProduct.name || "Shop the latest",
        subtitle: heroProduct.oldPrice
          ? `Save on selected picks | UP TO ${Math.max(
              10,
              Math.round(((heroProduct.oldPrice - heroProduct.price) / heroProduct.oldPrice) * 100),
            )}%`
          : "Fresh drops curated for your routine",
        progress: `${Math.min((data.products || []).length, 14)} | ${Math.max((data.products || []).length, 18)}`,
        image: heroImage,
        overlayColor: heroSource.overlayColor || "#121016",
      },
      heroSlides: heroSlides.length
        ? heroSlides
        : [
            {
              eyebrow: heroProduct.brand || "Kanxi Collection",
              title: heroSource.caption || heroProduct.name || "Shop the latest",
              subtitle: heroProduct.oldPrice
                ? `Save on selected picks | UP TO ${Math.max(
                    10,
                    Math.round(((heroProduct.oldPrice - heroProduct.price) / heroProduct.oldPrice) * 100),
                  )}%`
                : "Fresh drops curated for your routine",
              progress: `${Math.min((data.products || []).length, 14)} | ${Math.max((data.products || []).length, 18)}`,
              image: heroImage,
              overlayColor: heroSource.overlayColor || "#121016",
            },
          ],
      quickLinks: quickLinks.length ? quickLinks : buildFallbackData().quickLinks,
      featuredBrands,
      brandsTitle: (homepage.brands && homepage.brands.title) || "Shop by Brand",
      featuredSections,
    },
  };

  if (includeProductDetails) {
    lastDerivedDetailSource = data;
    lastDerivedDetail = derived;
  } else {
    lastDerivedSummarySource = data;
    lastDerivedSummary = derived;
  }

  return derived;
}

function shellDataFromDerived(derived) {
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    categories: derived.categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      image: category.image || "",
    })),
  };
}

function homeDataFromDerived(derived) {
  if (!derived.products.length) return buildFallbackData();
  const featuredSectionProducts = new Map();
  derived.homepage.featuredSections.forEach((section) => {
    (section.products || []).forEach((product) => {
      if (!featuredSectionProducts.has(product.id)) featuredSectionProducts.set(product.id, product);
    });
  });
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    hero: derived.homepage.hero,
    heroSlides: derived.homepage.heroSlides?.length ? derived.homepage.heroSlides : buildFallbackData().heroSlides,
    quickLinks: derived.homepage.quickLinks.length ? derived.homepage.quickLinks : buildFallbackData().quickLinks,
    featuredBrands: derived.homepage.featuredBrands || [],
    brandsTitle: derived.homepage.brandsTitle || "Shop by Brand",
    productCards: Object.fromEntries(featuredSectionProducts.entries()),
    featuredSections: derived.homepage.featuredSections.map((section) => ({
      ...section,
      products: undefined,
      productIds: (section.products || []).map((product) => product.id),
    })),
  };
}

function categoryBrowserDataFromDerived(derived, initialSlug = "") {
  const productsById = Object.fromEntries(derived.products.map((product) => [product.id, product]));
  const categories = derived.categories.map((category) => ({
    ...category,
    productIds: derived.products.filter((product) => product.categorySlug === category.slug).map((product) => product.id),
  }));
  const selectedCategory =
    categories.find((category) => category.slug === initialSlug) || categories[0] || null;
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    productsById,
    categories,
    initialSlug: selectedCategory?.slug || "",
  };
}

function checkoutDataFromRaw(raw, derived) {
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    paymentMethods: derived.paymentMethods,
    deliveryMethods: derived.deliveryMethods,
    bankTransfer: raw.paymentSettings?.bankTransfer || { bankName: "", accountNumber: "" },
  };
}

function productDetailDataFromDerived(rawSummary, rawDetail, productId) {
  const derived = buildDerivedStore(rawSummary);
  const detailDerived = buildDerivedStore(rawDetail, { includeProductDetails: true });
  const product = detailDerived.productMap.get(productId) || detailDerived.products[0] || null;
  const related = derived.products
    .filter((item) => item.categoryId === product?.categoryId && item.id !== product?.id)
    .slice(0, 8);
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    product,
    related,
    paymentMethods: derived.paymentMethods,
    deliveryMethods: derived.deliveryMethods,
  };
}

export function buildRouteDatasets(fullData = {}) {
  const storefrontSnapshot = buildStorefrontSnapshot(fullData);
  const summaryDerived = buildDerivedStore(storefrontSnapshot);
  const detailDerived = buildDerivedStore(fullData, { includeProductDetails: true });

  const productRows = (fullData.products || []).map((product) => ({
    id: productDetailRowId(product.id),
    data: productDetailDataFromDerived(storefrontSnapshot, fullData, product.id),
  }));

  return {
    storefrontSnapshot,
    shell: shellDataFromDerived(summaryDerived),
    home: homeDataFromDerived(summaryDerived),
    categoryBrowser: categoryBrowserDataFromDerived(summaryDerived),
    checkout: checkoutDataFromRaw(fullData, summaryDerived),
    productRows,
    detailDerived,
  };
}

export async function getStorefrontData() {
  if (!IS_DEV) {
    const routeRow = await fetchRouteRow(HOME_ROW_ID);
    if (routeRow) return routeRow;
  }
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  return homeDataFromDerived(derived);
}

export async function getStorefrontBootstrap() {
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  const categories = derived.categories.map((category) => ({
    ...category,
    products: derived.products.filter((product) => product.categorySlug === category.slug),
  }));

  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    home: {
      brand: derived.homepage.brand,
      logo: derived.homepage.logo || "",
      menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
      hero: derived.homepage.hero,
      heroSlides: derived.homepage.heroSlides?.length ? derived.homepage.heroSlides : buildFallbackData().heroSlides,
      quickLinks: derived.homepage.quickLinks.length ? derived.homepage.quickLinks : buildFallbackData().quickLinks,
      featuredBrands: derived.homepage.featuredBrands || [],
      brandsTitle: derived.homepage.brandsTitle || "Shop by Brand",
      featuredSections: derived.homepage.featuredSections,
    },
    categories,
  };
}

export async function getStoreShellData() {
  if (!IS_DEV) {
    const routeRow = await fetchRouteRow(SHELL_ROW_ID);
    if (hasRouteCategories(routeRow)) return routeRow;
  }
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  return shellDataFromDerived(derived);
}

export async function getCategoryBrowser(initialSlug = "") {
  if (!IS_DEV) {
    const routeRow = await fetchRouteRow(CATEGORY_BROWSER_ROW_ID);
    if (hasRouteCategories(routeRow)) {
      const categories = routeRow.categories || [];
      const selectedCategory =
        categories.find((category) => category.slug === initialSlug) || categories[0] || null;
      return {
        ...routeRow,
        initialSlug: selectedCategory?.slug || routeRow.initialSlug || "",
      };
    }
  }
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  return categoryBrowserDataFromDerived(derived, initialSlug);
}

export async function getCategoryListing(slug) {
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  const category = derived.categoriesBySlug.get(slug) || derived.categories[0] || null;
  const products = derived.products.filter((product) => product.categorySlug === category?.slug);
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    category,
    products,
  };
}

export async function getProductDetail(id) {
  if (!IS_DEV) {
    const routeRow = await fetchRouteRow(productDetailRowId(id));
    if (routeRow?.product) return routeRow;
  }
  const [raw, full] = await Promise.all([fetchRawStoreData(), fetchFullStoreData()]);
  const source = full || raw;
  return productDetailDataFromDerived(raw, source, id);
}

export async function getProductIds() {
  if (!IS_DEV) {
    const routeRow = await fetchRouteRow(CATEGORY_BROWSER_ROW_ID);
    if (routeRow?.categories?.length) {
      return Array.from(
        new Set(
          routeRow.categories.flatMap((category) =>
            (category.productIds || category.products || [])
              .map((product) => (typeof product === "string" ? product : product?.id))
              .filter(Boolean),
          ),
        ),
      );
    }
  }
  const raw = await fetchRawStoreData();
  return (raw.products || []).map((product) => product.id).filter(Boolean);
}

export async function getCheckoutData() {
  if (!IS_DEV) {
    const routeRow = await fetchRouteRow(CHECKOUT_ROW_ID);
    if (routeRow) return routeRow;
  }
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  return checkoutDataFromRaw(raw, derived);
}

import { buildStorefrontSnapshot, FULL_ROW_ID, STOREFRONT_ROW_ID } from "@/lib/storefront-snapshot";

const SUPABASE_URL = "https://kssztommozejlnvtwokn.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZF1BVt1m6KpuiRDZlgF0mw_OxC0L1rb";
const TABLE = "kanxi_site_data";
const STORE_TTL_MS = 30_000;
const MAX_STOREFRONT_BYTES = 1_800_000;
let lastSuccessfulStore = null;
let lastSuccessfulStoreAt = 0;
let inflightStorePromise = null;
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
      image: productPrimaryImage(product, variant),
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

  if (section.sourceType === "bestsellers") {
    return products.filter((item) => (item.tags || []).includes("t3"));
  }

  return products;
}

async function supabaseFetchRow(rowId, useNextCache = false) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(rowId)}&select=data&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      ...(useNextCache ? { next: { revalidate: 30 } } : { cache: "no-store" }),
    },
  );
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  const payload = await response.json();
  return payload?.[0]?.data || null;
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

function snapshotTooLarge(data) {
  try {
    return JSON.stringify(data || {}).length > MAX_STOREFRONT_BYTES;
  } catch {
    return true;
  }
}

export async function fetchRawStoreData() {
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
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(STOREFRONT_ROW_ID)}&select=data&limit=1`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (response.ok) {
          const payload = await response.json();
          data = payload?.[0]?.data || null;
        }
      } catch (_error) {
        data = null;
      }

      if (!data || snapshotTooLarge(data)) {
        const full = await supabaseFetchRow(FULL_ROW_ID, false);
        if (full) {
          data = buildStorefrontSnapshot(full);
          persistStorefrontSnapshot(full).catch(() => {});
        }
      }

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

function buildDerivedStore(data) {
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
      description: category.description || "",
      href: `/category/${category.slug}`,
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

  const productDetails = productSummaries.map((summary) => {
    const raw = (data.products || []).find((product) => product.id === summary.id);
    return buildProductDetail(raw, data, tags, categoriesById, subcategoriesById);
  });

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
        eyebrow: card?.caption || fallbackProduct.brand || "Kanxi Collection",
        title: card?.caption || fallbackProduct.name || "Shop the latest",
        subtitle: fallbackProduct.oldPrice
          ? `Save on selected picks | UP TO ${Math.max(
              10,
              Math.round(((fallbackProduct.oldPrice - fallbackProduct.price) / fallbackProduct.oldPrice) * 100),
            )}%`
          : "Fresh drops curated for your routine",
        progress: `${Math.min(index + 1, Math.max(collections.length || 1, 1))} | ${Math.max(collections.length || 1, 1)}`,
        image: slideImage,
      };
    })
    .filter((slide) => slide.image);

  const quickLinks = (homepage.menu?.items || categories)
    .slice(0, 12)
    .map((item) => {
      const category = categoriesBySlug.get(item.linkValue) || categories.find((category) => category.slug === item.slug);
      return {
        label: item.label || item.name || "Kanxi",
        icon: iconForLabel(item.label || item.name),
        image: category?.image || "",
        href: category ? `/category/${category.slug}` : "/category",
      };
    });

  const featuredBrands = (((homepage.brands && homepage.brands.brandIds) || []).map((brandId) => allBrandsById.get(brandId)).filter(Boolean));

  const featuredSections = (homepage.sections || [])
    .filter((section) => section.enabled !== false)
    .map((section) => {
      const sourceProducts = findProductsBySource(data, section)
        .slice(0, Number(section.limit || 6))
        .map((product) => productDetailMap.get(product.id) || productSummary(product, data, tags, categoriesById, subcategoriesById));
      const category = section.sourceType === "category" ? categoriesBySlug.get(String(section.sourceValue || "").toLowerCase()) : null;
      return {
        id: section.id,
        title: section.title || "Featured",
        href: category ? `/category/${category.slug}` : category?.href || "/category",
        products: sourceProducts,
      };
    })
    .filter((section) => section.products.length);

  return {
    raw: data,
    categories,
    categoriesBySlug,
    products: productDetails,
    productMap: productDetailMap,
    paymentMethods: (data.paymentSettings?.methods || []).filter((method) => method.enabled !== false),
    deliveryMethods: (data.deliverySettings?.methods || []).filter((method) => method.enabled !== false),
    homepage: {
      brand: "kanxi.collection",
      logo: cleanImage(homepage.header?.logo) || "",
      menu: (homepage.menu?.items || []).map((item) => item.label).filter(Boolean).slice(0, 5),
      hero: {
        eyebrow: heroSource.caption || heroProduct.brand || "Kanxi Collection",
        title: heroSource.caption || heroProduct.name || "Shop the latest",
        subtitle: heroProduct.oldPrice
          ? `Save on selected picks | UP TO ${Math.max(
              10,
              Math.round(((heroProduct.oldPrice - heroProduct.price) / heroProduct.oldPrice) * 100),
            )}%`
          : "Fresh drops curated for your routine",
        progress: `${Math.min((data.products || []).length, 14)} | ${Math.max((data.products || []).length, 18)}`,
        image: heroImage,
      },
      heroSlides: heroSlides.length
        ? heroSlides
        : [
            {
              eyebrow: heroSource.caption || heroProduct.brand || "Kanxi Collection",
              title: heroSource.caption || heroProduct.name || "Shop the latest",
              subtitle: heroProduct.oldPrice
                ? `Save on selected picks | UP TO ${Math.max(
                    10,
                    Math.round(((heroProduct.oldPrice - heroProduct.price) / heroProduct.oldPrice) * 100),
                  )}%`
                : "Fresh drops curated for your routine",
              progress: `${Math.min((data.products || []).length, 14)} | ${Math.max((data.products || []).length, 18)}`,
              image: heroImage,
            },
          ],
      quickLinks: quickLinks.length ? quickLinks : buildFallbackData().quickLinks,
      featuredBrands,
      brandsTitle: (homepage.brands && homepage.brands.title) || "Shop by Brand",
      featuredSections,
    },
  };
}

export async function getStorefrontData() {
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  if (!derived.products.length) return buildFallbackData();
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    hero: derived.homepage.hero,
    heroSlides: derived.homepage.heroSlides?.length ? derived.homepage.heroSlides : buildFallbackData().heroSlides,
    quickLinks: derived.homepage.quickLinks.length ? derived.homepage.quickLinks : buildFallbackData().quickLinks,
    featuredBrands: derived.homepage.featuredBrands || [],
    brandsTitle: derived.homepage.brandsTitle || "Shop by Brand",
    featuredSections: derived.homepage.featuredSections,
  };
}

export async function getStoreShellData() {
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    categories: derived.categories,
  };
}

export async function getCategoryBrowser(initialSlug = "") {
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  const categories = derived.categories.map((category) => ({
    ...category,
    products: derived.products.filter((product) => product.categorySlug === category.slug),
  }));
  const selectedCategory =
    categories.find((category) => category.slug === initialSlug) || categories[0] || null;
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    categories,
    initialSlug: selectedCategory?.slug || "",
  };
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
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  const product = derived.productMap.get(id) || derived.products[0] || null;
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

export async function getCheckoutData() {
  const raw = await fetchRawStoreData();
  const derived = buildDerivedStore(raw);
  return {
    brand: derived.homepage.brand,
    logo: derived.homepage.logo || "",
    menu: derived.homepage.menu.length ? derived.homepage.menu : buildFallbackData().menu,
    products: derived.products,
    paymentMethods: derived.paymentMethods,
    deliveryMethods: derived.deliveryMethods,
    bankTransfer: raw.paymentSettings?.bankTransfer || { bankName: "", accountNumber: "" },
  };
}

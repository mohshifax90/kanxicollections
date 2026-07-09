export const FULL_ROW_ID = "main";
export const STOREFRONT_ROW_ID = "main_next_storefront";
export const SHELL_ROW_ID = "main_next_shell";
export const HOME_ROW_ID = "main_next_home";
export const CATEGORY_BROWSER_ROW_ID = "main_next_category_browser";
export const CHECKOUT_ROW_ID = "main_next_checkout";
export const MEDIA_ROW_ID = "main_next_media";
export const PRODUCT_DETAIL_ROW_PREFIX = "main_next_product_";

function mediaRef(kind, params = {}) {
  const search = new URLSearchParams({ kind });
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") search.set(key, String(value));
  });
  return `/api/media?${search.toString()}`;
}

export function productDetailRowId(productId = "") {
  return `${PRODUCT_DETAIL_ROW_PREFIX}${String(productId || "").trim()}`;
}

function buildHomepageSnapshot(homepage = {}) {
  const collections = Array.isArray(homepage.collections?.cards) ? homepage.collections.cards : [];
  const menuItems = Array.isArray(homepage.menu?.items) ? homepage.menu.items : [];
  const sections = Array.isArray(homepage.sections) ? homepage.sections : [];

  return {
    header: {
      logo: homepage.header?.logo ? mediaRef("header-logo") : "",
    },
    collections: {
      title: homepage.collections?.title || "Collections",
      cards: collections.map((card) => ({
        id: card.id,
        caption: card.caption || "",
        tagId: card.tagId || "",
        linkType: card.linkType || "",
        linkValue: card.linkValue || "",
        image: card.image ? mediaRef("home-card", { id: card.id }) : "",
        overlayColor: card.overlayColor || "#121016",
      })),
    },
    menu: {
      items: menuItems.map((item) => ({
        id: item.id,
        label: item.label || "",
        linkType: item.linkType || "",
        linkValue: item.linkValue || "",
      })),
    },
    brands: {
      title: homepage.brands?.title || "Shop by Brand",
      brandIds: Array.isArray(homepage.brands?.brandIds) ? homepage.brands.brandIds : [],
    },
    bestsellers: {
      title: homepage.bestsellers?.title || "Best Sellers",
      limit: homepage.bestsellers?.limit || 8,
    },
    offers: {
      title: homepage.offers?.title || "Offers",
      limit: homepage.offers?.limit || 8,
    },
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title || "",
      sourceType: section.sourceType || "",
      sourceValue: section.sourceValue || "",
      limit: section.limit || 8,
      enabled: section.enabled !== false,
    })),
  };
}

export function buildStorefrontSnapshot(data = {}) {
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const subcategories = Array.isArray(data.subcategories) ? data.subcategories : [];
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const batches = Array.isArray(data.batches) ? data.batches : [];
  const homepage = buildHomepageSnapshot(data.homepage || { menu: { items: [] }, collections: { cards: [] }, sections: [] });
  const paymentSettings = data.paymentSettings || { methods: [], bankTransfer: { bankName: "", accountNumber: "" } };
  const deliverySettings = data.deliverySettings || { methods: [] };

  return {
    _v: data._v || 1,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || "",
      image: category.image ? mediaRef("category", { id: category.id }) : "",
      active: category.active !== false,
      variantType: category.variantType || "none",
      cardType: category.cardType || "square",
      title: category.title || category.name || "",
      brands: Array.isArray(category.brands)
        ? category.brands.map((brand) => ({
            id: brand.id,
            name: brand.name || "",
            logo: brand.logo ? mediaRef("brand", { categoryId: category.id, id: brand.id }) : "",
          }))
        : [],
    })),
    subcategories: subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      categoryId: subcategory.categoryId,
      image: subcategory.image ? mediaRef("subcategory", { id: subcategory.id }) : "",
    })),
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
    })),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand || "",
      categoryId: product.categoryId,
      subId: product.subId || "",
      price: product.price || 0,
      oldPrice: product.oldPrice || 0,
      status: product.status || "active",
      tags: Array.isArray(product.tags) ? product.tags : [],
      image:
        product.image || (Array.isArray(product.images) ? product.images[0] : "") || product.photo
          ? mediaRef("product", { id: product.id })
          : "",
      variantType: product.variantType || "none",
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => ({
            id: variant.id,
            value: variant.value,
            color: variant.color || null,
          }))
        : [],
    })),
    batches: batches.map((batch) => ({
      id: batch.id,
      productId: batch.productId,
      variantId: batch.variantId || null,
      batchNo: batch.batchNo || "",
      costPrice: batch.costPrice || 0,
      sellingPrice: batch.sellingPrice || 0,
      stock: batch.stock || 0,
      expiry: batch.expiry || "",
      date: batch.date || 0,
    })),
    homepage,
    paymentSettings: {
      methods: Array.isArray(paymentSettings.methods)
        ? paymentSettings.methods.map((method) => ({
            key: method.key,
            label: method.label,
            enabled: method.enabled !== false,
          }))
        : [],
      bankTransfer: paymentSettings.bankTransfer
        ? {
            bankName: paymentSettings.bankTransfer.bankName || "",
            accountNumber: paymentSettings.bankTransfer.accountNumber || "",
          }
        : { bankName: "", accountNumber: "" },
    },
    deliverySettings: {
      methods: Array.isArray(deliverySettings.methods)
        ? deliverySettings.methods.map((method) => ({
            key: method.key,
            label: method.label,
            rate: method.rate || 0,
            enabled: method.enabled !== false,
          }))
        : [],
    },
  };
}

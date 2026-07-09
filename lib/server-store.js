import "server-only";
import { buildRouteDatasets, primeStorefrontCaches } from "@/lib/storefront-data";
import {
  CATEGORY_BROWSER_ROW_ID,
  CHECKOUT_ROW_ID,
  FULL_ROW_ID,
  HOME_ROW_ID,
  MEDIA_ROW_ID,
  SHELL_ROW_ID,
  STOREFRONT_ROW_ID,
} from "@/lib/storefront-snapshot";

const SUPABASE_URL = "https://kssztommozejlnvtwokn.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZF1BVt1m6KpuiRDZlgF0mw_OxC0L1rb";
const TABLE = "kanxi_site_data";
const ROW_TTL_MS = 30_000;
const rowCache = new Map();

function uid(prefix = "") {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
}

function phoneKey(value) {
  return String(value || "").replace(/\D/g, "");
}

function orderNumberValue(id) {
  const match = String(id || "").match(/^KNX-(\d{1,6})$/);
  return match ? Number(match[1]) : 0;
}

function nextOrderId(db) {
  const highest = Math.max(0, ...(db.orders || []).map((order) => orderNumberValue(order.id)));
  const next = Math.max(highest + 1, Number(db.orderSeq || 1));
  db.orderSeq = next + 1;
  return `KNX-${String(next).padStart(6, "0")}`;
}

function normalizeAddress(address, index = 0) {
  return {
    id: address?.id || uid("a_"),
    label: address?.label || `Address ${index + 1}`,
    line: address?.line || "",
    city: address?.city || "",
    atoll: address?.atoll || "",
    postcode: address?.postcode || "",
    country: address?.country || "Maldives",
    lat: address?.lat ?? null,
    lng: address?.lng ?? null,
    isDefault: !!address?.isDefault,
    deliveryType: address?.deliveryType || "address",
    deliveryInfo: {
      boatName: address?.deliveryInfo?.boatName || "",
      contactNumber: address?.deliveryInfo?.contactNumber || "",
      departureTime: address?.deliveryInfo?.departureTime || "",
      note: address?.deliveryInfo?.note || "",
    },
  };
}

function normalizeUser(user) {
  const addresses = (user?.addresses || []).map(normalizeAddress).filter(Boolean);
  if (addresses.length && !addresses.some((address) => address.isDefault)) addresses[0].isDefault = true;
  return {
    id: user?.id || uid("u_"),
    name: user?.name || "Kanxi Customer",
    phone: phoneKey(user?.phone),
    gender: user?.gender || "",
    dob: user?.dob || "",
    createdAt: user?.createdAt || Date.now(),
    addresses,
  };
}

function activeBatchOf(db, productId, variantId) {
  const batches = (db.batches || [])
    .filter((batch) => batch.productId === productId && (variantId == null ? true : (batch.variantId || null) === variantId))
    .slice()
    .sort((a, b) => Number(a.date || 0) - Number(b.date || 0));
  return batches.find((batch) => Number(batch.stock || 0) > 0) || batches[batches.length - 1] || null;
}

function validateOrderStock(db, items) {
  for (const item of items) {
    const active = activeBatchOf(db, item.productId, item.variantId || null);
    const stock = Math.max(0, Number(active?.stock || 0));
    if (stock < Number(item.qty || 0)) {
      throw new Error(stock <= 0 ? "This variant is out of stock" : `Only ${stock} left in stock`);
    }
  }
}

function decrementOrderStock(db, items) {
  for (const item of items) {
    const batch = activeBatchOf(db, item.productId, item.variantId || null);
    if (batch) batch.stock = Math.max(0, Number(batch.stock || 0) - Number(item.qty || 0));
  }
}

async function supabaseFetch(method, query = "", body) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(method === "POST" ? { Prefer: "resolution=merge-duplicates,return=minimal" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase ${method} failed`);
  return text ? JSON.parse(text) : null;
}

async function loadDataRow(rowId, fallback = null) {
  const cached = rowCache.get(rowId);
  if (cached && Date.now() - cached.at < ROW_TTL_MS) {
    return cached.data;
  }
  const rows = await supabaseFetch("GET", `?id=eq.${encodeURIComponent(rowId)}&select=data&limit=1`);
  const data = rows?.[0]?.data || fallback;
  rowCache.set(rowId, { data, at: Date.now() });
  return data;
}

export async function loadStoreRow() {
  return loadDataRow(FULL_ROW_ID, {
    users: [],
    orders: [],
    payments: [],
    batches: [],
    paymentSettings: {},
    deliverySettings: {},
    orderSeq: 1,
  });
}

export async function loadMediaRow() {
  const fallback = {
    headerLogo: "",
    homeCards: {},
    categories: {},
    subcategories: {},
    brands: {},
    products: {},
  };
  const media = await loadDataRow(MEDIA_ROW_ID, null);
  if (media && Object.keys(media).length) {
    return media;
  }

  const full = await loadStoreRow();
  const derived = buildRouteDatasets(full).media || fallback;
  rowCache.set(MEDIA_ROW_ID, { data: derived, at: Date.now() });
  return derived;
}

export async function saveStoreRow(data) {
  const datasets = buildRouteDatasets(data);
  const updatedAt = new Date().toISOString();
  const writes = [
    { id: FULL_ROW_ID, data },
    { id: STOREFRONT_ROW_ID, data: datasets.storefrontSnapshot },
    { id: SHELL_ROW_ID, data: datasets.shell },
    { id: HOME_ROW_ID, data: datasets.home },
    { id: CATEGORY_BROWSER_ROW_ID, data: datasets.categoryBrowser },
    { id: CHECKOUT_ROW_ID, data: datasets.checkout },
    { id: MEDIA_ROW_ID, data: datasets.media },
    ...datasets.productRows,
  ];
  await Promise.all(writes.map((row) => supabaseFetch("POST", "", { id: row.id, data: row.data, updated_at: updatedAt })));
  writes.forEach((row) => rowCache.set(row.id, { data: row.data, at: Date.now() }));
  primeStorefrontCaches(data, datasets);
}

export function findUserByPhone(db, phone) {
  const key = phoneKey(phone);
  if (!key) return null;
  return (db.users || []).find((user) => phoneKey(user.phone) === key) || null;
}

export function upsertUserByPhone(db, payload) {
  const normalized = normalizeUser(payload);
  const existingIndex = (db.users || []).findIndex((user) => phoneKey(user.phone) === phoneKey(normalized.phone));
  if (!db.users) db.users = [];
  if (existingIndex === -1) {
    db.users.push(normalized);
    return normalized;
  }
  const current = normalizeUser(db.users[existingIndex]);
  const merged = normalizeUser({
    ...current,
    ...normalized,
    id: current.id,
    createdAt: current.createdAt,
    addresses: normalized.addresses.length ? normalized.addresses : current.addresses,
  });
  db.users[existingIndex] = merged;
  return merged;
}

export function placeOrderInStore(db, payload) {
  const paymentSettings = db.paymentSettings || { methods: [], bankTransfer: { bankName: "", accountNumber: "" } };
  const paymentMethodKey = String(payload.payMethod || "transfer").toLowerCase();
  const paymentMethod =
    (paymentSettings.methods || []).find((method) => method.key === paymentMethodKey) ||
    { key: paymentMethodKey, label: paymentMethodKey === "cod" ? "Cash on Delivery" : "Bank Transfer", enabled: true };

  const items = (payload.items || []).map((item) => ({
    productId: item.productId,
    variantId: item.variantId || null,
    name: item.name,
    qty: Math.max(1, Number(item.qty || 1)),
    price: Number(item.price || 0),
    image: item.image || "",
    size: item.size || "",
  }));

  validateOrderStock(db, items);
  decrementOrderStock(db, items);

  const transfer = paymentMethodKey === "transfer";
  const cod = paymentMethodKey === "cod";
  const id = nextOrderId(db);
  const bankTransfer = paymentSettings.bankTransfer || { bankName: "", accountNumber: "" };
  const orderStatus = transfer ? "Pending Slip Verification" : cod ? "Order Accepted" : "Paid";
  const payStatus = transfer ? "Pending Slip Verification" : cod ? "Pending" : "Paid";

  const order = {
    id,
    userName: payload.userName || "Guest",
    userPhone: phoneKey(payload.userPhone),
    date: Date.now(),
    status: orderStatus,
    payStatus,
    payMethod: paymentMethod.label,
    payMethodKey: paymentMethodKey,
    items,
    addressMeta: payload.addressMeta || null,
    notifications: { confirmedAt: null, outForDeliveryAt: null, deliveredAt: null },
    publicRef: "",
    deliveryOtp: "",
    deliveryOtpSentAt: null,
    deliveryOtpVerifiedAt: null,
    stockAdjusted: true,
    stockRestored: false,
    stockAdjustedAt: Date.now(),
    stockRestoredAt: null,
    shipping: Number(payload.shipping || 0),
    address: payload.address || "",
    transferSlip: payload.transferSlip || "",
    bankName: transfer ? bankTransfer.bankName || "" : "",
    accountNumber: transfer ? bankTransfer.accountNumber || "" : "",
    deliveryType: payload.deliveryType || "address",
    deliveryInfo: payload.deliveryInfo || null,
  };

  const orderNumber = orderNumberValue(id);
  order.publicRef = `KC-${String(orderNumber).padStart(6, "0")}`;

  if (!db.orders) db.orders = [];
  if (!db.payments) db.payments = [];

  db.orders.push(order);
  db.payments.push({
    id: uid("p_"),
    orderId: id,
    amount: Number(payload.total || items.reduce((sum, item) => sum + item.price * item.qty, 0)),
    method: paymentMethod.label,
    status: payStatus,
    date: Date.now(),
    slipImage: payload.transferSlip || "",
    bankName: order.bankName || "",
    accountNumber: order.accountNumber || "",
    verifiedAt: payStatus === "Paid" ? Date.now() : null,
  });

  return order;
}

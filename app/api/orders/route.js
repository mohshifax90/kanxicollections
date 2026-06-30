import { loadStoreRow, placeOrderInStore, saveStoreRow, upsertUserByPhone } from "@/lib/server-store";

function phoneKey(value) {
  return String(value || "").replace(/\D/g, "");
}

export async function GET(request) {
  const phone = phoneKey(request.nextUrl.searchParams.get("phone") || "");
  if (!phone) return Response.json({ orders: [] });

  const db = await loadStoreRow();
  const orders = (db.orders || [])
    .filter((order) => phoneKey(order.userPhone) === phone)
    .sort((a, b) => Number(b.date || 0) - Number(a.date || 0));

  return Response.json({ orders });
}

export async function POST(request) {
  const payload = await request.json();
  const db = await loadStoreRow();

  if (payload.user && payload.saveProfile) {
    upsertUserByPhone(db, payload.user);
  }

  const order = placeOrderInStore(db, payload.order);
  await saveStoreRow(db);

  return Response.json({ order });
}

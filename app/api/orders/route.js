import { loadStoreRow, placeOrderInStore, saveStoreRow, upsertUserByPhone } from "@/lib/server-store";

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

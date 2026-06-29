import { findUserByPhone, loadStoreRow, saveStoreRow, upsertUserByPhone } from "@/lib/server-store";

export async function GET(request) {
  const phone = request.nextUrl.searchParams.get("phone") || "";
  if (!phone) return Response.json({ user: null });
  const db = await loadStoreRow();
  const user = findUserByPhone(db, phone);
  return Response.json({ user });
}

export async function POST(request) {
  const payload = await request.json();
  const db = await loadStoreRow();
  const user = upsertUserByPhone(db, payload);
  await saveStoreRow(db);
  return Response.json({ user });
}

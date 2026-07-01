import { loadStoreRow, saveStoreRow } from "@/lib/server-store";

export async function GET() {
  try {
    const data = await loadStoreRow();
    await saveStoreRow(data);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error?.message || "Could not rebuild storefront rows." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const data = payload?.data;
    if (!data || typeof data !== "object") {
      return Response.json({ error: "Missing store data." }, { status: 400 });
    }

    await saveStoreRow(data);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error?.message || "Could not sync storefront." }, { status: 500 });
  }
}

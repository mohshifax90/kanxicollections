import { loadStoreRow } from "@/lib/server-store";

const BLANK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" rx="48" fill="#f4f1ea"/><circle cx="230" cy="210" r="52" fill="#f7b3d5" fill-opacity=".55"/><circle cx="426" cy="258" r="92" fill="#fde68a" fill-opacity=".5"/><path d="M175 416c52-90 112-136 179-136s123 37 169 111l20 25H149z" fill="#d8d4cc"/></svg>`;

function decodeDataUri(value = "") {
  const match = String(value || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) return null;
  const [, mime = "application/octet-stream", base64Flag, payload = ""] = match;
  if (base64Flag) {
    return { mime, body: Buffer.from(payload, "base64") };
  }
  return { mime, body: Buffer.from(decodeURIComponent(payload), "utf8") };
}

function respondWithSource(source) {
  const value = String(source || "").trim();
  if (!value) {
    return new Response(BLANK_SVG, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
    });
  }

  if (/^https?:\/\//i.test(value)) {
    return Response.redirect(value, 307);
  }

  const dataUri = decodeDataUri(value);
  if (dataUri) {
    return new Response(dataUri.body, {
      headers: { "Content-Type": dataUri.mime, "Cache-Control": "public, max-age=3600" },
    });
  }

  return Response.redirect(value, 307);
}

export async function GET(request) {
  const kind = request.nextUrl.searchParams.get("kind") || "";
  const id = request.nextUrl.searchParams.get("id") || "";
  const categoryId = request.nextUrl.searchParams.get("categoryId") || "";
  const data = await loadStoreRow();

  if (kind === "header-logo") {
    return respondWithSource(data?.homepage?.header?.logo || "");
  }

  if (kind === "home-card") {
    const card = (((data?.homepage || {}).collections || {}).cards || []).find((item) => item.id === id);
    return respondWithSource(card?.image || "");
  }

  if (kind === "category") {
    const category = (data?.categories || []).find((item) => item.id === id);
    return respondWithSource(category?.image || "");
  }

  if (kind === "brand") {
    const category = (data?.categories || []).find((item) => item.id === categoryId);
    const brand = (category?.brands || []).find((item) => item.id === id);
    return respondWithSource(brand?.logo || "");
  }

  if (kind === "subcategory") {
    const subcategory = (data?.subcategories || []).find((item) => item.id === id);
    return respondWithSource(subcategory?.image || "");
  }

  if (kind === "product") {
    const product = (data?.products || []).find((item) => item.id === id);
    const source = product?.image || product?.images?.[0] || product?.photo || "";
    return respondWithSource(source);
  }

  return new Response("Not found", { status: 404 });
}

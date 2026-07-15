import { loadMediaRow } from "@/lib/server-store";

const BLANK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" rx="48" fill="#f4f1ea"/><circle cx="230" cy="210" r="52" fill="#f7b3d5" fill-opacity=".55"/><circle cx="426" cy="258" r="92" fill="#fde68a" fill-opacity=".5"/><path d="M175 416c52-90 112-136 179-136s123 37 169 111l20 25H149z" fill="#d8d4cc"/></svg>`;
const MEDIA_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

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
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": MEDIA_CACHE_CONTROL },
    });
  }

  if (/^https?:\/\//i.test(value)) {
    return fetch(value, {
      cache: "force-cache",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    })
      .then(async (upstream) => {
        if (!upstream.ok) {
          return new Response(null, {
            status: 307,
            headers: {
              Location: value,
              "Cache-Control": MEDIA_CACHE_CONTROL,
            },
          });
        }

        const body = await upstream.arrayBuffer();
        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        return new Response(body, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": MEDIA_CACHE_CONTROL,
          },
        });
      })
      .catch(
        () =>
          new Response(null, {
            status: 307,
            headers: {
              Location: value,
              "Cache-Control": MEDIA_CACHE_CONTROL,
            },
          }),
      );
  }

  const dataUri = decodeDataUri(value);
  if (dataUri) {
    return new Response(dataUri.body, {
      headers: { "Content-Type": dataUri.mime, "Cache-Control": MEDIA_CACHE_CONTROL },
    });
  }

  return new Response(null, {
    status: 307,
    headers: {
      Location: value,
      "Cache-Control": MEDIA_CACHE_CONTROL,
    },
  });
}

export async function GET(request) {
  const kind = request.nextUrl.searchParams.get("kind") || "";
  const id = request.nextUrl.searchParams.get("id") || "";
  const categoryId = request.nextUrl.searchParams.get("categoryId") || "";
  const media = await loadMediaRow();

  if (kind === "header-logo") {
    return respondWithSource(media?.headerLogo || "");
  }

  if (kind === "home-card") {
    return respondWithSource(media?.homeCards?.[id] || "");
  }

  if (kind === "category") {
    return respondWithSource(media?.categories?.[id] || "");
  }

  if (kind === "brand") {
    return respondWithSource(media?.brands?.[categoryId]?.[id] || "");
  }

  if (kind === "subcategory") {
    return respondWithSource(media?.subcategories?.[id] || "");
  }

  if (kind === "product") {
    return respondWithSource(media?.products?.[id] || "");
  }

  return new Response("Not found", { status: 404 });
}

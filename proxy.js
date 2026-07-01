import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/index.html") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/checkout.html" || pathname === "/cart.html") {
    return NextResponse.redirect(new URL("/checkout", request.url));
  }

  if (pathname === "/account.html" || pathname === "/login.html") {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  if (pathname === "/shop.html") {
    const category = (searchParams.get("cat") || "").trim();
    if (category) {
      return NextResponse.redirect(new URL(`/category/${encodeURIComponent(category)}`, request.url));
    }
    return NextResponse.redirect(new URL("/category", request.url));
  }

  if (pathname === "/post.html") {
    const productId = (searchParams.get("id") || "").trim();
    if (productId) {
      return NextResponse.redirect(new URL(`/product/${encodeURIComponent(productId)}`, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/index.html", "/checkout.html", "/cart.html", "/account.html", "/login.html", "/shop.html", "/post.html"],
};

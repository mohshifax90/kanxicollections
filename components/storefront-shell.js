"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useStorefrontData } from "@/components/storefront-data-provider";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "/assets/nav-home.svg" },
  { href: "/category", label: "Category", icon: "/assets/nav-categories.svg" },
  { href: "/wishlist", label: "Wishlist", icon: "/assets/nav-heart.svg" },
  { href: "/checkout", label: "Bag", icon: "/assets/nav-bag.svg" },
];

export function StorefrontShell({ active = "/", children, brand = "kanxi.collection", logo = "", hideHeader = false }) {
  const router = useRouter();
  const { count } = useCart();
  const { bootstrap } = useStorefrontData();
  const resolvedBrand = bootstrap?.brand || brand;
  const resolvedLogo = bootstrap?.logo || logo;

  useEffect(() => {
    NAV_ITEMS.forEach((item) => router.prefetch(item.href));
    (bootstrap?.categories || []).slice(0, 8).forEach((category) => {
      if (category?.slug) router.prefetch(`/category/${category.slug}`);
    });
  }, [bootstrap, router]);

  return (
    <main className="app-frame">
      <div className="screen-shell">
        {!hideHeader ? (
          <header className="topbar">
            <div className="brand-lockup">
              <Link href="/" className="brand-wordmark" aria-label={resolvedBrand}>
                {resolvedLogo ? (
                  <img src={resolvedLogo} alt={resolvedBrand} className="brand-logo-image" />
                ) : (
                  resolvedBrand
                )}
              </Link>
            </div>
            <div className="header-actions">
              <button className="icon-button" aria-label="Search">
                <Search />
              </button>
              <Link href="/account" className="icon-button" aria-label="Account">
                <UserRound aria-hidden="true" />
              </Link>
            </div>
          </header>
        ) : null}

        <div className="page-content">{children}</div>

        <nav className="bottom-nav" aria-label="Bottom navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href;
            return (
              <Link key={item.href} href={item.href} className={`bottom-link${isActive ? " active" : ""}`}>
                <span className="bottom-icon" aria-hidden="true">
                  <img src={item.icon} alt="" className="bottom-icon-image" />
                  {item.href === "/checkout" && count ? <span className="bottom-badge">{count}</span> : null}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </main>
  );
}

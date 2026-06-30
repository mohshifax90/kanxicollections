"use client";

import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "/assets/nav-home.svg" },
  { href: "/category", label: "Category", icon: "/assets/nav-categories.svg" },
  { href: "/wishlist", label: "Wishlist", icon: "/assets/nav-heart.svg" },
  { href: "/account", label: "Account", icon: "/assets/nav-profile.svg" },
];

export function StorefrontShell({ active = "/", children, brand = "kanxi.collection", logo = "" }) {
  const { count } = useCart();

  return (
    <main className="app-frame">
      <div className="screen-shell">
        <header className="topbar">
          <div className="brand-lockup">
            <Link href="/" className="brand-wordmark" aria-label={brand}>
              {logo ? (
                <img src={logo} alt={brand} className="brand-logo-image" />
              ) : (
                brand
              )}
            </Link>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Search">
              <Search />
            </button>
            <Link href="/checkout" className="icon-button bag-button" aria-label="Bag">
              <ShoppingBag aria-hidden="true" />
              {count ? <span className="bag-count">{count}</span> : null}
            </Link>
          </div>
        </header>

        <div className="page-content">{children}</div>

        <nav className="bottom-nav" aria-label="Bottom navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href;
            return (
              <Link key={item.href} href={item.href} className={`bottom-link${isActive ? " active" : ""}`}>
                <span className="bottom-icon" aria-hidden="true">
                  <img src={item.icon} alt="" className="bottom-icon-image" />
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

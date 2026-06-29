"use client";

import Link from "next/link";
import { Grid2x2, Heart, House, Search, ShoppingBag, UserRound } from "lucide-react";
import { useCart } from "@/components/cart-provider";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/category", label: "Category", icon: Grid2x2 },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account", label: "Account", icon: UserRound },
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
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`bottom-link${isActive ? " active" : ""}`}>
                <span className="bottom-icon" aria-hidden="true">
                  <Icon />
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

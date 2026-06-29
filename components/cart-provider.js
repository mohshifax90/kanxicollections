"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const CART_KEY = "kanxi-next-cart";

function readCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, ready]);

  const api = useMemo(() => {
    const addItem = (item) => {
      setItems((current) => {
        const index = current.findIndex(
          (entry) => entry.productId === item.productId && (entry.variantId || "") === (item.variantId || ""),
        );
        if (index === -1) return [...current, item];
        return current.map((entry, idx) =>
          idx === index ? { ...entry, qty: Math.min(entry.qty + item.qty, item.stock || entry.qty + item.qty) } : entry,
        );
      });
    };

    const updateQty = (productId, variantId, nextQty, stock) => {
      setItems((current) =>
        current
          .map((entry) => {
            if (entry.productId !== productId || (entry.variantId || "") !== (variantId || "")) return entry;
            return { ...entry, qty: Math.max(1, Math.min(nextQty, stock || nextQty)) };
          })
          .filter((entry) => entry.qty > 0),
      );
    };

    const removeItem = (productId, variantId) => {
      setItems((current) =>
        current.filter(
          (entry) => !(entry.productId === productId && (entry.variantId || "") === (variantId || "")),
        ),
      );
    };

    const clear = () => setItems([]);

    return {
      ready,
      items,
      count: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      subtotal: items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
      addItem,
      updateQty,
      removeItem,
      clear,
    };
  }, [items, ready]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

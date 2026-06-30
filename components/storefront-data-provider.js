"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const StorefrontDataContext = createContext(null);

function buildInitialState(initialBootstrap = null) {
  return {
    loading: !initialBootstrap,
    bootstrap: initialBootstrap,
    productsById: new Map(),
  };
}

export function StorefrontDataProvider({ children, initialBootstrap = null }) {
  const [state, setState] = useState(() => buildInitialState(initialBootstrap));

  useEffect(() => {
    let cancelled = false;

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/storefront?view=bootstrap", { cache: "force-cache" });
        const data = await response.json();
        if (!response.ok || cancelled) return;
        setState((current) => ({
          loading: false,
          bootstrap: data,
          productsById: current.productsById,
        }));
      } catch {
        if (!cancelled) {
          setState((current) => ({ ...current, loading: false }));
        }
      }
    }

    loadBootstrap();
    return () => {
      cancelled = true;
    };
  }, [initialBootstrap]);

  const api = useMemo(() => {
    async function ensureProduct(id) {
      if (!id) return null;
      const cached = state.productsById.get(id);
      if (cached) return cached;

      const response = await fetch(`/api/storefront?view=product&id=${encodeURIComponent(id)}`, { cache: "force-cache" });
      const data = await response.json();
      if (!response.ok || !data?.product) return null;

      setState((current) => {
        const nextMap = new Map(current.productsById);
        nextMap.set(id, data);
        return { ...current, productsById: nextMap };
      });

      return data;
    }

    return {
      loading: state.loading,
      bootstrap: state.bootstrap,
      productsById: state.productsById,
      ensureProduct,
    };
  }, [state]);

  return <StorefrontDataContext.Provider value={api}>{children}</StorefrontDataContext.Provider>;
}

export function useStorefrontData() {
  const value = useContext(StorefrontDataContext);
  if (!value) throw new Error("useStorefrontData must be used inside StorefrontDataProvider");
  return value;
}

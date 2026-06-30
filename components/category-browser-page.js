"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price_low", label: "Price: Low" },
  { value: "price_high", label: "Price: High" },
  { value: "name", label: "Name" },
];

export function CategoryBrowserPage({ categories = [], initialSlug = "" }) {
  const [selectedSlug, setSelectedSlug] = useState(initialSlug || categories[0]?.slug || "");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("all");
  const [brandFilter, setBrandFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState([]);
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTab, setFilterTab] = useState("brand");
  const [filterSearch, setFilterSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState("");
  const [draftBrandFilter, setDraftBrandFilter] = useState([]);
  const [draftTypeFilter, setDraftTypeFilter] = useState([]);

  const selectedCategory =
    categories.find((category) => category.slug === selectedSlug) || categories[0] || null;
  const useSubcategoryRail = Boolean(initialSlug && selectedCategory);
  const subcategoryItems = useMemo(() => {
    if (!useSubcategoryRail) return [];
    return [{ id: "all", name: "All", image: selectedCategory?.image || "" }, ...((selectedCategory?.subcategories || []).map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image || "",
    })) || [])];
  }, [selectedCategory, useSubcategoryRail]);

  const brandOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        (selectedCategory?.products || [])
          .filter((product) => !useSubcategoryRail || selectedSubcategoryId === "all" || product.subcategoryId === selectedSubcategoryId)
          .map((product) => product.brand)
          .filter(Boolean),
      ),
    );
    return values;
  }, [selectedCategory, selectedSubcategoryId, useSubcategoryRail]);

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set((selectedCategory?.products || []).map((product) => product.subcategoryName).filter(Boolean)),
    );
    return values;
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    const list = (selectedCategory?.products || []).filter((product) => {
      if (useSubcategoryRail && selectedSubcategoryId !== "all" && product.subcategoryId !== selectedSubcategoryId) return false;
      if (brandFilter.length && !brandFilter.includes(product.brand)) return false;
      if (typeFilter.length && !typeFilter.includes(product.subcategoryName)) return false;
      return true;
    });

    if (sortBy === "price_low") return [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === "price_high") return [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === "name") return [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    return list;
  }, [selectedCategory, brandFilter, typeFilter, sortBy, selectedSubcategoryId, useSubcategoryRail]);

  function selectCategory(slug) {
    setSelectedSlug(slug);
    setSelectedSubcategoryId("all");
    setBrandFilter([]);
    setTypeFilter([]);
    setDraftBrandFilter([]);
    setDraftTypeFilter([]);
    setSortBy("featured");
  }

  function openFilters() {
    setDraftBrandFilter(brandFilter);
    setDraftTypeFilter(typeFilter);
    setFilterSearch("");
    setFilterOpen(true);
  }

  function toggleDraftValue(kind, value) {
    if (kind === "brand") {
      setDraftBrandFilter((current) =>
        current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      );
      return;
    }
    setDraftTypeFilter((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function clearFilters() {
    setDraftBrandFilter([]);
    setDraftTypeFilter([]);
  }

  function applyFilters() {
    setBrandFilter(draftBrandFilter);
    setTypeFilter(draftTypeFilter);
    setFilterOpen(false);
  }

  const filterTabs = [
    { key: "brand", label: "Brand", options: brandOptions, selected: draftBrandFilter },
    { key: "type", label: "Type", options: typeOptions, selected: draftTypeFilter },
  ];
  const activeFilterTab = filterTabs.find((tab) => tab.key === filterTab) || filterTabs[0];
  const visibleFilterOptions = (activeFilterTab?.options || []).filter((option) =>
    String(option || "")
      .toLowerCase()
      .includes(filterSearch.trim().toLowerCase()),
  );
  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label || "Sort";

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") setMenuOpen("");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section className="category-browser">
      <div className="category-browser-layout">
        <aside className="category-rail" aria-label="Categories">
          {(useSubcategoryRail ? subcategoryItems : categories).map((category) => {
            const isActive = useSubcategoryRail
              ? category.id === selectedSubcategoryId
              : category.slug === selectedCategory?.slug;
            return (
              <button
                key={category.id || category.slug}
                type="button"
                className={`category-rail-item${isActive ? " active" : ""}`}
                onClick={() => {
                  if (useSubcategoryRail) {
                    setSelectedSubcategoryId(category.id);
                    setBrandFilter([]);
                    setTypeFilter([]);
                    setDraftBrandFilter([]);
                    setDraftTypeFilter([]);
                  } else {
                    selectCategory(category.slug);
                  }
                }}
              >
                <span className="category-rail-thumb">
                  {category.image ? (
                    <img src={category.image} alt="" />
                  ) : (
                    <span className="category-rail-initial">{String(category.name || "A").charAt(0)}</span>
                  )}
                </span>
                <span className="category-rail-label">{category.name}</span>
              </button>
            );
          })}
        </aside>

        <div className="category-browser-content">
          <div className="category-filter-strip">
            <div className={`category-filter-chip category-filter-chip--menu${menuOpen === "category" ? " open" : ""}`}>
              <button type="button" className="category-filter-trigger" onClick={() => setMenuOpen((current) => (current === "category" ? "" : "category"))}>
                <span>{selectedCategory?.name || "Category"}</span>
              </button>
              {menuOpen === "category" ? (
                <div className="category-filter-menu">
                  {categories.map((category) => (
                    <button
                      type="button"
                      key={category.id || category.slug}
                      className={`category-filter-option${selectedSlug === category.slug ? " active" : ""}`}
                      onClick={() => {
                        selectCategory(category.slug);
                        setMenuOpen("");
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="button" className="category-filter-chip" onClick={openFilters}>
              <span>Filters</span>
            </button>

            <div className={`category-filter-chip category-filter-chip--menu${menuOpen === "sort" ? " open" : ""}`}>
              <button type="button" className="category-filter-trigger" onClick={() => setMenuOpen((current) => (current === "sort" ? "" : "sort"))}>
                <span>{selectedSortLabel}</span>
              </button>
              {menuOpen === "sort" ? (
                <div className="category-filter-menu">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={`category-filter-option${sortBy === option.value ? " active" : ""}`}
                      onClick={() => {
                        setSortBy(option.value);
                        setMenuOpen("");
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="category-browser-meta">
            <strong>
              {useSubcategoryRail && selectedSubcategoryId !== "all"
                ? subcategoryItems.find((item) => item.id === selectedSubcategoryId)?.name || selectedCategory?.name || "Category"
                : selectedCategory?.name || "Category"}
            </strong>
            <span>{filteredProducts.length} items</span>
          </div>

          <div className="category-browser-grid">
          {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>

          {!filteredProducts.length ? (
            <div className="category-browser-empty">
              <p>No products match the current filters.</p>
              <Link href="/category" onClick={() => { setBrandFilter("all"); setTypeFilter("all"); }}>
                Reset filters
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {menuOpen ? <button type="button" className="category-filter-screen" onClick={() => setMenuOpen("")} aria-label="Close menu" /> : null}

      {filterOpen ? (
        <div className="filter-sheet-layer" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="filter-sheet-backdrop" onClick={() => setFilterOpen(false)} />
          <div className="filter-sheet">
            <div className="filter-sheet-handle" />
            <div className="filter-sheet-head">
              <h2>Filters</h2>
              <button type="button" className="filter-sheet-close" onClick={() => setFilterOpen(false)}>
                ×
              </button>
            </div>

            <div className="filter-search-wrap">
              <input
                type="text"
                value={filterSearch}
                onChange={(event) => setFilterSearch(event.target.value)}
                placeholder="Search across filters..."
                className="filter-search-input"
              />
            </div>

            <div className="filter-sheet-body">
              <div className="filter-sheet-tabs">
                {filterTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    className={`filter-sheet-tab${filterTab === tab.key ? " active" : ""}`}
                    onClick={() => setFilterTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="filter-sheet-options">
                {visibleFilterOptions.map((option) => {
                  const checked = activeFilterTab.selected.includes(option);
                  return (
                    <label className="filter-option-row" key={option}>
                      <span>{option}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDraftValue(activeFilterTab.key, option)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="filter-sheet-actions">
              <button type="button" className="filter-clear-button" onClick={clearFilters}>
                Clear Filter
              </button>
              <button type="button" className="filter-apply-button" onClick={applyFilters}>
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

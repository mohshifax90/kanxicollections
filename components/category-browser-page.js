"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";

export function CategoryBrowserPage({ categories = [], initialSlug = "" }) {
  const [selectedSlug, setSelectedSlug] = useState(initialSlug || categories[0]?.slug || "");
  const [brandFilter, setBrandFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState([]);
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTab, setFilterTab] = useState("brand");
  const [filterSearch, setFilterSearch] = useState("");
  const [draftBrandFilter, setDraftBrandFilter] = useState([]);
  const [draftTypeFilter, setDraftTypeFilter] = useState([]);

  const selectedCategory =
    categories.find((category) => category.slug === selectedSlug) || categories[0] || null;

  const brandOptions = useMemo(() => {
    const values = Array.from(
      new Set((selectedCategory?.products || []).map((product) => product.brand).filter(Boolean)),
    );
    return values;
  }, [selectedCategory]);

  const typeOptions = useMemo(() => {
    const values = Array.from(
      new Set((selectedCategory?.products || []).map((product) => product.subcategoryName).filter(Boolean)),
    );
    return values;
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    const list = (selectedCategory?.products || []).filter((product) => {
      if (brandFilter.length && !brandFilter.includes(product.brand)) return false;
      if (typeFilter.length && !typeFilter.includes(product.subcategoryName)) return false;
      return true;
    });

    if (sortBy === "price_low") return [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === "price_high") return [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === "name") return [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    return list;
  }, [selectedCategory, brandFilter, typeFilter, sortBy]);

  function selectCategory(slug) {
    setSelectedSlug(slug);
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

  return (
    <section className="category-browser">
      <div className="category-browser-layout">
        <aside className="category-rail" aria-label="Categories">
          {categories.map((category) => {
            const isActive = category.slug === selectedCategory?.slug;
            return (
              <button
                key={category.id}
                type="button"
                className={`category-rail-item${isActive ? " active" : ""}`}
                onClick={() => selectCategory(category.slug)}
              >
                <span className="category-rail-thumb">
                  {category.image ? <img src={category.image} alt="" /> : category.icon || "✦"}
                </span>
                <span className="category-rail-label">{category.name}</span>
              </button>
            );
          })}
        </aside>

        <div className="category-browser-content">
          <div className="category-filter-strip">
            <button type="button" className="category-filter-chip" onClick={openFilters}>
              <span>Filters</span>
            </button>

            <label className="category-filter-chip">
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price_low">Price: Low</option>
                <option value="price_high">Price: High</option>
                <option value="name">Name</option>
              </select>
            </label>

            <label className="category-filter-chip">
              <span>Brand</span>
              <select
                value={brandFilter[0] || "all"}
                onChange={(event) => setBrandFilter(event.target.value === "all" ? [] : [event.target.value])}
              >
                <option value="all">All</option>
                {brandOptions.map((brand) => (
                  <option value={brand} key={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="category-browser-meta">
            <strong>{selectedCategory?.name || "Category"}</strong>
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

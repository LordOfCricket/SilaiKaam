'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CategoryDto, ProductListResultDto, ProductSort } from '@silaikaam/types';
import { FormBanner } from '@/components/ui/FormBanner';
import { ApiError, NetworkError } from '@/lib/api-client';
import { marketplaceApi } from '../api';
import { ProductCard } from './ProductCard';
import styles from './MarketplaceView.module.css';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export function MarketplaceView() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sort, setSort] = useState<ProductSort>('relevance');
  const [page, setPage] = useState(1);

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [result, setResult] = useState<ProductListResultDto | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setQ(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    marketplaceApi
      .listCategories()
      .then(setCategories)
      .catch(() => setCategoriesError('Could not load categories.'));
  }, []);

  const load = useCallback(async () => {
    setLoadState({ kind: 'loading' });
    try {
      const data = await marketplaceApi.listProducts({
        q: q || undefined,
        category: category || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        size: size || undefined,
        color: color || undefined,
        sort,
        page,
      });
      setResult(data);
      setLoadState({ kind: 'ready' });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Could not load products. Please try again.';
      setLoadState({ kind: 'error', message });
    }
  }, [q, category, minPrice, maxPrice, size, color, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearFilters = () => {
    setSearchInput('');
    setQ('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSize('');
    setColor('');
    setSort('relevance');
    setPage(1);
  };

  const hasFilters = Boolean(
    q || category || minPrice || maxPrice || size || color || sort !== 'relevance',
  );
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Marketplace</h1>
          <p className={styles.subtitle}>
            Discover clothing that&apos;s ready to be measured and fitted to you.
          </p>
        </div>

        {categoriesError ? <FormBanner variant="error" message={categoriesError} /> : null}

        <div className={styles.filters}>
          <div className={`${styles.filterField} ${styles.searchField}`}>
            <label className={styles.filterLabel} htmlFor="mp-search">
              Search
            </label>
            <input
              id="mp-search"
              className={styles.input}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.currentTarget.value);
                setPage(1);
              }}
              placeholder="Search products…"
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="mp-category">
              Category
            </label>
            <select
              id="mp-category"
              className={styles.select}
              value={category}
              onChange={(e) => {
                setCategory(e.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <span className={styles.filterLabel}>Price</span>
            <div className={styles.priceRange}>
              <input
                className={`${styles.input} ${styles.priceInput}`}
                type="number"
                min={0}
                aria-label="Minimum price"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.currentTarget.value);
                  setPage(1);
                }}
              />
              <span aria-hidden="true">–</span>
              <input
                className={`${styles.input} ${styles.priceInput}`}
                type="number"
                min={0}
                aria-label="Maximum price"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.currentTarget.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="mp-size">
              Size
            </label>
            <input
              id="mp-size"
              className={styles.input}
              value={size}
              onChange={(e) => {
                setSize(e.currentTarget.value);
                setPage(1);
              }}
              placeholder="e.g. M"
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="mp-color">
              Color
            </label>
            <input
              id="mp-color"
              className={styles.input}
              value={color}
              onChange={(e) => {
                setColor(e.currentTarget.value);
                setPage(1);
              }}
              placeholder="e.g. blue"
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="mp-sort">
              Sort by
            </label>
            <select
              id="mp-sort"
              className={styles.select}
              value={sort}
              onChange={(e) => {
                setSort(e.currentTarget.value as ProductSort);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasFilters ? (
            <button type="button" className={styles.clearButton} onClick={clearFilters}>
              Clear search
            </button>
          ) : null}
        </div>

        {loadState.kind === 'loading' ? (
          <div className={styles.centerState} role="status" aria-live="polite">
            Loading products…
          </div>
        ) : loadState.kind === 'error' ? (
          <FormBanner variant="error" message={loadState.message} onRetry={() => void load()} />
        ) : result && result.items.length === 0 ? (
          <div className={styles.centerState}>
            <p>{hasFilters ? 'No products match your search.' : 'No products available yet.'}</p>
            {hasFilters ? (
              <button type="button" className={styles.clearButton} onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {result?.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {totalPages > 1 ? (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

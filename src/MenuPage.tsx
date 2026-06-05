import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type UIEvent
} from "react";
import type { MenuApiResponse, MenuCategory, MenuItem } from "./menuData";

const apiBaseUrl = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "/api").replace(/\/$/, "");

const initialVisibleCount = 10;
const visibleStep = 8;
const desktopPageSize = 8;

const priceFilters = [
  { id: "all", label: "Any price" },
  { id: "under-15", label: "Under $15" },
  { id: "15-25", label: "$15 - $25" },
  { id: "25-plus", label: "$25+" }
] as const;

type PriceFilterId = (typeof priceFilters)[number]["id"];

type NormalizedMenuCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

type NormalizedMenuItemPricing = {
  label: string;
  amount: number;
  currency: string;
};

type NormalizedMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  displayDescription?: string;
  pricing: NormalizedMenuItemPricing[];
  tags?: string[];
  isFeatured?: boolean;
};

type NormalizedMenuResponse = {
  categories: NormalizedMenuCategory[];
  items: NormalizedMenuItem[];
};

export function MenuPage() {
  const [menuData, setMenuData] = useState<MenuApiResponse>({
    categories: [],
    items: []
  });

  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [priceFilter, setPriceFilter] = useState<PriceFilterId>("all");
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [desktopPage, setDesktopPage] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");

  const resultsRef = useRef<HTMLDivElement>(null);

  const menuCategories = menuData.categories;
  const menuItems = menuData.items;
  const normalizedQuery = query.trim().toLowerCase();

  const activeCategory =
    menuCategories.find((category) => category.id === categoryId) ?? menuCategories[0];

  const itemCountsByCategory = useMemo(() => getCategoryCounts(menuItems), [menuItems]);

  const categoryItems = useMemo(
    () =>
      activeCategory
        ? menuItems.filter((item) => item.categoryId === activeCategory.id)
        : [],
    [activeCategory, menuItems]
  );

  const searchableItems = normalizedQuery ? menuItems : categoryItems;

  const availableRegions = useMemo(() => {
    const regions = new Set(
      searchableItems
        .map((item) => item.region)
        .filter((region): region is string => Boolean(region))
    );

    return ["All", ...[...regions].sort((first, second) => first.localeCompare(second))];
  }, [searchableItems]);

  const filteredItems = useMemo(() => {
    return searchableItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.region, item.note]
          .concat([item.displayDescription, item.description])
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));

      const matchesRegion = selectedRegion === "All" || item.region === selectedRegion;
      const matchesPrice = matchesPriceFilter(item, priceFilter);

      return matchesQuery && matchesRegion && matchesPrice;
    });
  }, [normalizedQuery, priceFilter, searchableItems, selectedRegion]);

  const desktopTotalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / desktopPageSize)
  );

  const desktopPageIndex = Math.min(desktopPage, desktopTotalPages - 1);
  const desktopPageStart = desktopPageIndex * desktopPageSize;

  const desktopPageItems = filteredItems.slice(
    desktopPageStart,
    desktopPageStart + desktopPageSize
  );

  const mobileVisibleItems = filteredItems.slice(0, visibleCount);
  const visibleItems = isDesktop ? desktopPageItems : mobileVisibleItems;

  const selectedItem =
    filteredItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    filteredItems[0];

  const hasMore = visibleCount < filteredItems.length;

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenu() {
      try {
        setIsMenuLoading(true);
        setMenuError("");

        const response = await fetch(`${apiBaseUrl}/menus/watsons/liquor`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Menu request failed with status ${response.status}`);
        }

        const nextMenuData = mapNormalizedMenuResponse(
          (await response.json()) as NormalizedMenuResponse
        );

        setMenuData(nextMenuData);

        setCategoryId((currentCategoryId) =>
          nextMenuData.categories.some(
            (category) => category.id === currentCategoryId
          )
            ? currentCategoryId
            : nextMenuData.categories[0]?.id ?? ""
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setMenuError(
          error instanceof Error ? error.message : "Unable to load menu data."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsMenuLoading(false);
        }
      }
    }

    void loadMenu();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    function handleMediaChange() {
      setIsDesktop(mediaQuery.matches);
    }

    handleMediaChange();
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
    setDesktopPage(0);
    setSelectedItemId(null);

    if (resultsRef.current) {
      resultsRef.current.scrollTop = 0;
    }
  }, [categoryId, priceFilter, query, selectedRegion]);

  function handleResultsScroll(event: UIEvent<HTMLDivElement>) {
    if (isDesktop) {
      return;
    }

    const target = event.currentTarget;
    const distanceFromBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceFromBottom < 220 && visibleCount < filteredItems.length) {
      setVisibleCount((count) =>
        Math.min(count + visibleStep, filteredItems.length)
      );
    }
  }

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setQuery("");
    setSelectedRegion("All");
    setPriceFilter("all");
  }

  function handleDesktopPageChange(nextPage: number) {
    const boundedPage = Math.max(0, Math.min(nextPage, desktopTotalPages - 1));
    const firstItemOnPage = filteredItems[boundedPage * desktopPageSize];

    setDesktopPage(boundedPage);
    setSelectedItemId(firstItemOnPage?.id ?? null);

    if (resultsRef.current) {
      resultsRef.current.scrollTop = 0;
    }
  }

  function handleItemSelect(itemId: string) {
    setSelectedItemId(itemId);
  }

  function MenuLoading() {
    return (
      <section className="mt-4 flex min-h-[16rem] items-center justify-center rounded-lg bg-[#10110f] px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-watsons-cream/15 border-t-watsons-gold"
            aria-hidden="true"
          />

          <p className="sr-only">Loading menu</p>
        </div>
      </section>
    );
  }
  return (
    <div className="min-h-screen overflow-x-hidden bg-watsons-dark text-watsons-cream selection:bg-watsons-gold selection:text-watsons-dark lg:h-screen lg:overflow-hidden">
      <Header />

      <main className="mx-auto w-full max-w-[92rem] px-3 pb-8 pt-3 sm:px-8 lg:flex lg:h-[calc(100dvh-5rem)] lg:flex-col lg:overflow-hidden lg:pb-5 lg:pt-5">
        <Hero />

        {isMenuLoading ? (
          <MenuLoading />
        ) : menuError ? (
          <MenuStatus
            title="Menu unavailable"
            detail="The database menu could not be loaded."
          />
        ) : !activeCategory ? (
          <MenuStatus
            title="No menu data found"
            detail="The database did not return any displayable menu items."
          />
        ) : (
          <section className="flex min-w-0 flex-col gap-3 lg:mt-4">
            <FilterPanel
              activeCategoryId={categoryId}
              availableRegions={availableRegions}
              categories={menuCategories}
              itemCountsByCategory={itemCountsByCategory}
              priceFilter={priceFilter}
              query={query}
              selectedRegion={selectedRegion}
              onCategoryChange={handleCategoryChange}
              onPriceFilterChange={setPriceFilter}
              onQueryChange={setQuery}
              onRegionChange={setSelectedRegion}
            />

            <div className="sticky top-[5.75rem] z-30 -mx-1 bg-watsons-dark/95 px-1 pb-3 pt-3 backdrop-blur-xl lg:hidden">
              <SelectedPour item={selectedItem} compact />
            </div>

            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_23rem]">
              <section className="mt-1 flex min-w-0 flex-col overflow-hidden rounded-lg bg-[#0f100e] shadow-[0_18px_60px_rgba(0,0,0,0.2)] lg:mt-0 lg:max-h-none">
                <div className="flex shrink-0 flex-col gap-1 px-3 pb-2 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-5 sm:pt-5 lg:px-5 lg:py-3">
                  {!normalizedQuery ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-gold sm:text-xs sm:tracking-[0.3em]">
                        {activeCategory.eyebrow ?? "Menu"}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 px-3 py-2 sm:px-5 sm:py-3 lg:px-5 lg:py-2">
                  <ResultsCount
                    desktopPageIndex={desktopPageIndex}
                    desktopPageStart={desktopPageStart}
                    desktopPageSize={desktopPageSize}
                    filteredCount={filteredItems.length}
                    isDesktop={isDesktop}
                    visibleCount={visibleCount}
                  />

                  {hasActiveFilters(query, selectedRegion, priceFilter) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setSelectedRegion("All");
                        setPriceFilter("all");
                      }}
                      className="shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-watsons-cream/45 transition hover:text-watsons-gold sm:text-xs"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>

                {visibleItems.length > 0 ? (
                  <div
                    ref={resultsRef}
                    onScroll={handleResultsScroll}
                    className="max-h-[calc(100dvh-18.5rem)] overflow-y-auto overscroll-contain px-3 pb-3 pt-1 sm:px-5 sm:pb-5 lg:max-h-[calc(100dvh-24rem)] lg:overflow-y-auto lg:px-4 lg:pb-4 lg:pr-3 lg:[scrollbar-gutter:stable]"
                  >
                    <div className="grid gap-2.5 xl:grid-cols-2">
                      {visibleItems.map((item) => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          isSelected={selectedItem?.id === item.id}
                          onSelect={() => handleItemSelect(item.id)}
                        />
                      ))}
                    </div>

                    <div className="py-5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-watsons-cream/35 lg:hidden">
                      {hasMore ? "Scroll for more pours" : "All matching pours shown"}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5">
                    <EmptyState />
                  </div>
                )}

                <DesktopPagination
                  currentPage={desktopPageIndex}
                  totalItems={filteredItems.length}
                  totalPages={desktopTotalPages}
                  onPageChange={handleDesktopPageChange}
                />
              </section>

              <div className="hidden min-h-0 lg:sticky lg:top-24 lg:block">
                <SelectedPour item={selectedItem} />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

type ResultsCountProps = {
  desktopPageIndex: number;
  desktopPageStart: number;
  desktopPageSize: number;
  filteredCount: number;
  isDesktop: boolean;
  visibleCount: number;
};

function ResultsCount({
  desktopPageIndex,
  desktopPageStart,
  desktopPageSize,
  filteredCount,
  isDesktop,
  visibleCount
}: ResultsCountProps) {
  if (filteredCount === 0) {
    return (
      <p className="text-xs text-watsons-cream/55 sm:text-sm">
        Showing <span className="font-bold text-watsons-gold">0</span> pours
      </p>
    );
  }

  if (isDesktop) {
    const pageEnd = Math.min(desktopPageStart + desktopPageSize, filteredCount);

    return (
      <p className="text-xs text-watsons-cream/55 sm:text-sm">
        Showing{" "}
        <span className="font-bold text-watsons-gold">
          {desktopPageStart + 1}-{pageEnd}
        </span>{" "}
        of <span className="font-bold text-watsons-gold">{filteredCount}</span>
        <span className="ml-3 hidden text-watsons-cream/35 xl:inline">
          Page {desktopPageIndex + 1}
        </span>
      </p>
    );
  }

  return (
    <p className="text-xs text-watsons-cream/55 sm:text-sm">
      Showing{" "}
      <span className="font-bold text-watsons-gold">
        {Math.min(visibleCount, filteredCount)}
      </span>{" "}
      of <span className="font-bold text-watsons-gold">{filteredCount}</span>
    </p>
  );
}

type DesktopPaginationProps = {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function DesktopPagination({
  currentPage,
  totalItems,
  totalPages,
  onPageChange
}: DesktopPaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="hidden shrink-0 items-center justify-between gap-4 border-t border-watsons-cream/5 px-5 py-3 lg:flex">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-watsons-cream/42">
        Page <span className="text-watsons-gold">{currentPage + 1}</span> of{" "}
        <span className="text-watsons-gold">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-transparent px-4 text-xs font-bold uppercase tracking-[0.16em] text-watsons-cream/72 transition hover:border-watsons-gold/45 hover:text-watsons-gold disabled:cursor-not-allowed disabled:border-transparent disabled:text-watsons-cream/25"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Prev
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-watsons-gold bg-watsons-gold px-4 text-xs font-bold uppercase tracking-[0.16em] text-watsons-dark transition hover:bg-watsons-goldHover disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-watsons-cream/25"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-watsons-cream/5 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[92rem] items-center justify-between px-3 py-4 sm:px-8 sm:py-5">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-watsons-cream/65 transition hover:text-watsons-gold sm:gap-3 sm:text-xs sm:tracking-[0.22em]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Home
        </a>

        <a
          href="/"
          className="font-serif text-xl uppercase tracking-[0.24em] text-watsons-cream sm:text-3xl sm:tracking-[0.28em]"
        >
          Watson's
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hidden gap-5 border-b border-transparent pb-3 lg:grid lg:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.34em] text-watsons-gold">
          Menu
        </p>
        <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-[0.94] text-watsons-cream">
          Choose the mood, then the bottle.
        </h1>
      </div>
    </section>
  );
}

type FilterPanelProps = {
  activeCategoryId: string;
  availableRegions: string[];
  categories: MenuCategory[];
  itemCountsByCategory: Map<string, number>;
  priceFilter: PriceFilterId;
  query: string;
  selectedRegion: string;
  onCategoryChange: (categoryId: string) => void;
  onPriceFilterChange: (priceFilter: PriceFilterId) => void;
  onQueryChange: (query: string) => void;
  onRegionChange: (region: string) => void;
};

function FilterPanel({
  activeCategoryId,
  availableRegions,
  categories,
  itemCountsByCategory,
  priceFilter,
  query,
  selectedRegion,
  onCategoryChange,
  onPriceFilterChange,
  onQueryChange,
  onRegionChange
}: FilterPanelProps) {
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const activeCategory = categories.find((category) => category.id === activeCategoryId);

  useEffect(() => {
    function handleDocumentPointerDown(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, []);

  function handleCategorySelect(nextCategoryId: string) {
    onCategoryChange(nextCategoryId);
    setIsCategoryMenuOpen(false);
  }

  return (
    <section className="min-w-0 rounded-lg bg-[#10110f] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-5 lg:p-3">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-4">
        <div ref={categoryDropdownRef} className="relative block min-w-0">
          <span
            id="category-label"
            className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-cream/45 sm:mb-2 sm:text-[11px]"
          >
            Category
          </span>

          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isCategoryMenuOpen}
            aria-labelledby="category-label"
            onClick={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsCategoryMenuOpen(false);
              }
            }}
            className="relative flex h-11 w-full items-center justify-between rounded-lg border border-transparent bg-black/35 px-4 pr-10 text-left text-sm font-bold text-watsons-cream outline-none shadow-[inset_0_0_0_1px_rgba(200,155,66,0.22)] transition hover:bg-watsons-card/80 hover:shadow-[inset_0_0_0_1px_rgba(200,155,66,0.34)] focus:ring-2 focus:ring-watsons-gold/15 sm:h-12"
          >
            <span className="truncate">{activeCategory?.label ?? "Menu"}</span>
            <ChevronDown
              className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-watsons-gold transition ${isCategoryMenuOpen ? "rotate-180" : ""
                }`}
              aria-hidden="true"
            />
          </button>

          {isCategoryMenuOpen ? (
            <div
              role="listbox"
              aria-labelledby="category-label"
              className="absolute left-0 top-[calc(100%+0.35rem)] z-50 max-h-80 w-full overflow-y-auto rounded-lg bg-[#0d0f0d] p-1.5 shadow-[0_24px_72px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(200,155,66,0.12)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((category) => {
                const isDisabled = !itemCountsByCategory.has(category.id);
                const isSelected = activeCategoryId === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => handleCategorySelect(category.id)}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm font-bold transition ${isSelected
                      ? "bg-watsons-gold/10 text-watsons-gold shadow-[inset_2px_0_0_rgba(200,155,66,0.9)]"
                      : "text-watsons-cream/76 hover:bg-watsons-gold/8 hover:text-watsons-cream"
                      } disabled:cursor-not-allowed disabled:text-watsons-cream/24`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-cream/45 sm:mb-2 sm:text-[11px]">
            Search
          </span>

          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-watsons-cream/42"
              aria-hidden="true"
            />

            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Bottle, region, cask..."
              className="h-11 w-full appearance-none rounded-lg border border-transparent bg-black/35 pl-10 pr-10 text-base text-watsons-cream outline-none transition [color-scheme:dark] placeholder:text-watsons-cream/35 focus:border-watsons-gold/45 focus:ring-2 focus:ring-watsons-gold/15 sm:h-12 sm:text-sm"
            />

            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-watsons-cream/45 transition hover:text-watsons-gold"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:mt-5 lg:mt-2 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-5">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-cream/45 sm:mb-3 sm:text-[11px]">
            <SlidersHorizontal className="h-4 w-4 text-watsons-gold" aria-hidden="true" />
            Region
          </div>

          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {availableRegions.map((region) => (
              <FilterChip
                key={region}
                label={region}
                selected={selectedRegion === region}
                onClick={() => onRegionChange(region)}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-watsons-cream/45 sm:mb-3 sm:text-[11px]">
            Price
          </p>

          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 lg:flex-nowrap lg:justify-end [&::-webkit-scrollbar]:hidden">
            {priceFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => onPriceFilterChange(filter.id)}
                className={`h-9 shrink-0 rounded-full border px-4 text-[11px] font-bold transition sm:h-10 sm:text-xs lg:px-3 ${priceFilter === filter.id
                  ? "border-watsons-gold bg-watsons-gold text-watsons-dark"
                  : "border-transparent bg-black/24 text-watsons-cream/72 hover:border-watsons-gold/45 hover:text-watsons-gold"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
};

function FilterChip({ label, selected, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full border px-4 text-[11px] font-bold transition sm:h-10 sm:text-xs ${selected
        ? "border-watsons-gold bg-watsons-gold text-watsons-dark"
        : "border-transparent bg-watsons-card/70 text-watsons-cream/72 hover:border-watsons-gold/45 hover:text-watsons-gold"
        }`}
    >
      {label}
    </button>
  );
}

type MenuCardProps = {
  item: MenuItem;
  isSelected: boolean;
  onSelect: () => void;
};

function MenuCard({ item, isSelected, onSelect }: MenuCardProps) {
  return (
    <button
      type="button"
      data-result-card
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`group w-full rounded-lg border border-x-transparent border-t-transparent p-3 text-left transition duration-200 sm:p-4 lg:p-3 ${isSelected
          ? "border-watsons-gold bg-watsons-gold/10 shadow-[0_0_0_3px_rgba(200,155,66,0.12)]"
          : "border-b-watsons-cream/10 bg-watsons-card/58 hover:border-watsons-gold/42 hover:bg-watsons-card"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-watsons-cream/45">
              {item.region ?? "Back bar"}
            </span>
          </div>

          <h3 className="text-[1.05rem] font-semibold leading-snug tracking-[-0.01em] text-watsons-cream sm:text-lg lg:text-[1.05rem]">
            {item.name}
          </h3>
        </div>

        <p className="shrink-0 text-sm font-bold text-watsons-gold">
          {item.price}
        </p>
      </div>
    </button>
  );
}

type SelectedPourProps = {
  item?: MenuItem;
  compact?: boolean;
};

function SelectedPour({ item, compact = false }: SelectedPourProps) {
  if (!item) {
    return (
      <aside className="rounded-lg bg-watsons-card/50 p-4 text-sm text-watsons-cream/55 sm:p-5 lg:sticky lg:top-24">
        Select a pour to see the details.
      </aside>
    );
  }

  return (
    <aside
      className={`rounded-lg border border-watsons-gold/25 bg-[linear-gradient(180deg,rgba(20,58,47,0.42),rgba(21,23,21,0.96))] shadow-[0_20px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl lg:sticky lg:top-24 ${compact ? "p-3" : "p-4 sm:p-5"
        }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-watsons-gold sm:text-[11px]">
        Selected pour
      </p>

      <div className="mt-1.5 flex items-start justify-between gap-3 sm:mt-2 lg:block">
        <div className="min-w-0">
          <h3
            className={`font-serif leading-tight text-watsons-cream ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}
          >
            {item.name}
          </h3>

          <div className={compact ? "mt-1" : "mt-2 flex flex-wrap gap-2 sm:mt-4"}>
            <span className="text-[11px] font-bold text-watsons-cream/70 sm:text-xs">
              {item.region ?? "Back bar"}
            </span>
          </div>
        </div>
      </div>

      <p
        className={`text-sm text-watsons-cream/72 ${compact
          ? "mt-2 line-clamp-2 leading-5"
          : "mt-3 leading-6 sm:mt-5 sm:leading-7"
          }`}
      >
        {getDisplayDescription(item)}
      </p>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="mt-4 rounded-lg bg-watsons-card/45 px-6 py-12 text-center">
      <p className="font-serif text-3xl text-watsons-cream">No pours found.</p>
      <p className="mt-2 text-sm text-watsons-cream/55">
        Try clearing a filter or searching a broader bottle name.
      </p>
    </div>
  );
}

function MenuStatus({ title, detail }: { title?: string; detail?: string }) {
  return (
    <section className="mt-4 rounded-lg bg-[#10110f] px-6 py-12 text-center">
      <p className="font-serif text-3xl text-watsons-cream">{title}</p>
      {detail ? (
        <p className="mt-2 text-sm text-watsons-cream/55">{detail}</p>
      ) : null}
    </section>
  );
}

function getCategoryCounts(menuItems: MenuItem[]) {
  const counts = new Map<string, number>();

  for (const item of menuItems) {
    counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
  }

  return counts;
}

function matchesPriceFilter(item: MenuItem, filter: PriceFilterId) {
  const price = parsePrice(item.price);

  if (Number.isNaN(price)) {
    return filter === "all";
  }

  if (filter === "under-15") return price < 15;
  if (filter === "15-25") return price >= 15 && price <= 25;
  if (filter === "25-plus") return price > 25;

  return true;
}

function parsePrice(price: string) {
  const firstAmount = price.match(/\d+(\.\d+)?/);

  return firstAmount ? Number(firstAmount[0]) : Number.NaN;
}

function hasActiveFilters(
  query: string,
  selectedRegion: string,
  priceFilter: PriceFilterId
) {
  return query.trim() !== "" || selectedRegion !== "All" || priceFilter !== "all";
}

function getDisplayDescription(item: MenuItem) {
  return (
    item.displayDescription ??
    item.description ??
    item.note ??
    "A back-bar pour worth asking the bartender about."
  );
}

function mapNormalizedMenuResponse(data: NormalizedMenuResponse): MenuApiResponse {
  const categoriesById = new Map(
    data.categories.map((category) => [category.id, category])
  );

  return {
    categories: data.categories.map((category) => ({
      id: category.slug,
      label: category.name,
      eyebrow: category.name,
      description: normalizeOptionalText(category.description)
    })),

    items: data.items.map((item) => {
      const category = categoriesById.get(item.categoryId);

      return {
        id: item.id,
        categoryId: category?.slug ?? item.categoryId,
        name: item.name,
        price: formatPricing(item.pricing),
        description: normalizeOptionalText(item.description),
        displayDescription: normalizeOptionalText(item.displayDescription),
        region: inferItemRegion(item.description),
        note: normalizeOptionalText(item.description),
        featured: item.isFeatured
      };
    })
  };
}

function formatPricing(pricing: NormalizedMenuItemPricing[]) {
  if (pricing.length === 0) {
    return "Market";
  }

  if (pricing.length === 1) {
    return formatCurrencyAmount(pricing[0].amount);
  }

  return pricing
    .map((price) => {
      const amount = formatCurrencyAmount(price.amount);

      return price.label && price.label !== "Regular"
        ? `${price.label} ${amount}`
        : amount;
    })
    .join(" / ");
}

function formatCurrencyAmount(amount: number) {
  return `$${amount.toLocaleString("en-CA", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

function inferItemRegion(description: string | undefined) {
  const cleanedDescription = normalizeOptionalText(description);

  if (
    !cleanedDescription ||
    /[,.;:]/.test(cleanedDescription) ||
    cleanedDescription.split(/\s+/).length > 3
  ) {
    return undefined;
  }

  return cleanedDescription;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ");

  return normalized || undefined;
}
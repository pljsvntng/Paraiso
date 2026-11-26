export type CatalogEntry = {
  id: string;
  title: string;
  category: string;
  searchText: string;
  capacity?: number;
  price?: number;
  amenities?: string[];
};
export type CatalogFilters = {
  query: string;
  category: string;
  guests: string;
  maxPrice: string;
  amenity: string;
};
export const emptyCatalogFilters: CatalogFilters = {
  query: "",
  category: "",
  guests: "",
  maxPrice: "",
  amenity: "",
};

export function filterCatalog<T extends CatalogEntry>(
  items: readonly T[],
  filters: CatalogFilters,
): T[] {
  const words = filters.query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return items.filter(
    (item) =>
      (!filters.category || item.category === filters.category) &&
      words.every((word) =>
        `${item.title} ${item.searchText}`.toLocaleLowerCase().includes(word),
      ) &&
      (!filters.guests ||
        (item.capacity !== undefined &&
          item.capacity >= Number(filters.guests))) &&
      (!filters.maxPrice ||
        (item.price !== undefined && item.price <= Number(filters.maxPrice))) &&
      (!filters.amenity || item.amenities?.includes(filters.amenity)),
  );
}

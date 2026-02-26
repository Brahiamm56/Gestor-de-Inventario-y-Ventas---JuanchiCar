import { useState, useMemo } from "react"

interface UsePaginationOptions {
  pageSize?: number
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { pageSize = 20 } = options
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  // Resetear a página 1 si los items cambian y la página actual queda fuera de rango
  const safePage = currentPage > totalPages ? 1 : currentPage

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  function goToPage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  function nextPage() {
    goToPage(safePage + 1)
  }

  function prevPage() {
    goToPage(safePage - 1)
  }

  // Resetear a página 1 cuando cambian los items (ej: búsqueda)
  function resetPage() {
    setCurrentPage(1)
  }

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    totalItems: items.length,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  }
}

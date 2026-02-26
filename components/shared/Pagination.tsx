"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  hasNextPage,
  hasPrevPage,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
      <p className="text-sm text-slate-500">
        Mostrando {start}–{end} de {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let page: number
          if (totalPages <= 5) {
            page = i + 1
          } else if (currentPage <= 3) {
            page = i + 1
          } else if (currentPage >= totalPages - 2) {
            page = totalPages - 4 + i
          } else {
            page = currentPage - 2 + i
          }

          return (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`h-8 w-8 p-0 ${page === currentPage ? "bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]" : ""}`}
            >
              {page}
            </Button>
          )
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

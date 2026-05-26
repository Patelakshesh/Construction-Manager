import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

// Build the visible page number array with ellipsis markers
function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items = [];

  if (currentPage <= 4) {
    // Near the start: 1 2 3 4 5 … last
    for (let i = 1; i <= 5; i++) items.push(i);
    items.push("...");
    items.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    // Near the end: first … last-4 last-3 last-2 last-1 last
    items.push(1);
    items.push("...");
    for (let i = totalPages - 4; i <= totalPages; i++) items.push(i);
  } else {
    // Middle: first … prev current next … last
    items.push(1);
    items.push("...");
    items.push(currentPage - 1);
    items.push(currentPage);
    items.push(currentPage + 1);
    items.push("...");
    items.push(totalPages);
  }

  return items;
}

/**
 * Industry-standard pagination bar.
 *
 * Props:
 *  - pageNumber   : current 1-based page
 *  - pageSize     : items per page
 *  - totalCount   : total record count
 *  - onPageChange : (nextPage: number) => void
 */
function Pagination({ pageNumber, pageSize, totalCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount === 0) return null;

  const displayStart = (pageNumber - 1) * pageSize + 1;
  const displayEnd = Math.min(pageNumber * pageSize, totalCount);

  const isFirst = pageNumber === 1;
  const isLast = pageNumber === totalPages;

  const items = buildPageItems(pageNumber, totalPages);

  const navBtnBase =
    "inline-flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D36BE] focus-visible:ring-offset-1";
  const navBtnActive =
    "border-gray-200 bg-white text-gray-600 hover:border-[#3D36BE] hover:bg-[#F0EFFF] hover:text-[#2A2585]";
  const navBtnDisabled =
    "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed";

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
      {/* Record count info */}
      <p className="text-sm text-gray-500 select-none">
        Showing{" "}
        <span className="font-medium text-gray-700">{displayStart}</span>
        {" – "}
        <span className="font-medium text-gray-700">{displayEnd}</span>
        {" of "}
        <span className="font-medium text-gray-700">{totalCount}</span>
        {" results"}
      </p>

      {/* Page controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
          {/* First page */}
          <button
            type="button"
            aria-label="First page"
            onClick={() => onPageChange(1)}
            disabled={isFirst}
            className={`${navBtnBase} ${isFirst ? navBtnDisabled : navBtnActive}`}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Previous page */}
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={isFirst}
            className={`${navBtnBase} ${isFirst ? navBtnDisabled : navBtnActive}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          <div className="flex flex-wrap items-center justify-center gap-1">
            {items.map((item, idx) =>
              item === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="inline-flex h-8 w-8 items-center justify-center text-xs text-gray-400 select-none sm:h-9 sm:w-9 sm:text-sm"
                >
                  ···
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === pageNumber ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D36BE] focus-visible:ring-offset-1 sm:h-9 sm:w-9 sm:text-sm ${
                    item === pageNumber
                      ? "border-[#3D36BE] bg-[#3D36BE] text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[#3D36BE] hover:bg-[#F0EFFF] hover:text-[#2A2585]"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          {/* Next page */}
          <button
            type="button"
            aria-label="Next page"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={isLast}
            className={`${navBtnBase} ${isLast ? navBtnDisabled : navBtnActive}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            type="button"
            aria-label="Last page"
            onClick={() => onPageChange(totalPages)}
            disabled={isLast}
            className={`${navBtnBase} ${isLast ? navBtnDisabled : navBtnActive}`}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Pagination;

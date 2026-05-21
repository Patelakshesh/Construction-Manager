const buildPageRange = (currentPage, totalPages) => {
  const maxButtons = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    start = 1;
    end = Math.min(totalPages, maxButtons);
  }

  if (currentPage >= totalPages - 2) {
    start = Math.max(1, totalPages - (maxButtons - 1));
    end = totalPages;
  }

  const pages = [];
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return {
    pages,
    showStartEllipsis: start > 1,
    showEndEllipsis: end < totalPages,
  };
};

function Pagination({ pageNumber, pageSize, totalCount, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const { pages, showStartEllipsis, showEndEllipsis } = buildPageRange(
    pageNumber,
    totalPages,
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
        disabled={pageNumber === 1}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Prev
      </button>

      {showStartEllipsis && (
        <button
          type="button"
          onClick={() => onPageChange(1)}
          className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-100"
        >
          1
        </button>
      )}
      {showStartEllipsis && <span className="px-1">...</span>}

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`rounded-md border px-3 py-1.5 transition-colors ${
            page === pageNumber
              ? "border-[#FDB71A] bg-[#FDB71A10] text-[#8A5200]"
              : "border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          {page}
        </button>
      ))}

      {showEndEllipsis && <span className="px-1">...</span>}
      {showEndEllipsis && (
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-100"
        >
          {totalPages}
        </button>
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
        disabled={pageNumber === totalPages}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;

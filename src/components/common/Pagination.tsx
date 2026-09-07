import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  currentPage,
  pageCount,
  totalRecords,
  pageSize,
  itemLabel = "records",
  onPageChange
}: {
  currentPage: number;
  pageCount: number;
  totalRecords: number;
  pageSize: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}) {
  const pageNumbers = getVisiblePageNumbers(currentPage, pageCount);
  const firstRecordNumber = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecordNumber = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="flex flex-col gap-3 border-t border-line p-4 text-sm text-textSecondary sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {firstRecordNumber} - {lastRecordNumber} of {totalRecords} {itemLabel}
      </span>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNumbers.map((pageNumber, index) =>
          pageNumber === "..." ? (
            <span key={`${pageNumber}-${index}`} className="inline-flex h-9 w-9 items-center justify-center text-sm font-semibold text-textSecondary">
              ...
            </span>
          ) : (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={
                pageNumber === currentPage
                  ? "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brandGold text-sm font-semibold text-ink shadow-soft"
                  : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-sm font-semibold text-textPrimary transition hover:bg-gray-50"
              }
            >
              {pageNumber}
            </button>
          )
        )}
        <button type="button" disabled={currentPage === pageCount} onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function getVisiblePageNumbers(currentPage: number, pageCount: number): Array<number | "..."> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, "...", pageCount - 2, pageCount - 1, pageCount];
  if (currentPage >= pageCount - 2) return [1, 2, 3, "...", pageCount - 2, pageCount - 1, pageCount];
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", pageCount];
}

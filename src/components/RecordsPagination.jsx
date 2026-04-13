import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function RecordsPagination({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange = () => {},
  itemsPerPage = 10,
  totalItems = 0,
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/30 rounded-b-lg">
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems} records
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-secondary text-foreground'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <select
        value={itemsPerPage}
        onChange={(e) => onPageChange(1, parseInt(e.target.value))}
        className="px-3 py-1 border border-border rounded text-sm bg-background"
      >
        <option value={5}>5 per page</option>
        <option value={10}>10 per page</option>
        <option value={25}>25 per page</option>
        <option value={50}>50 per page</option>
      </select>
    </div>
  );
}
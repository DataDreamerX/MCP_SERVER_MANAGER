import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="flex items-center justify-center mt-8" aria-label="Pagination">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-l-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      <div className="hidden md:flex">
        {pageNumbers.map(number => (
          <button
            key={number}
            onClick={() => onPageChange(number)}
            className={`px-4 py-2 text-sm font-medium border-t border-b ${
              currentPage === number
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-300'
            } transition-colors`}
            aria-current={currentPage === number ? 'page' : undefined}
          >
            {number}
          </button>
        ))}
      </div>
       <div className="flex md:hidden px-4 py-2 text-sm font-medium bg-white text-gray-600 border-t border-b border-gray-300">
          Page {currentPage} of {totalPages}
       </div>


      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-r-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </nav>
  );
};